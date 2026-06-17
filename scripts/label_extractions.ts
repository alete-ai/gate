import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';

const DEV_ENV_PATH = '/Users/stoyan/git/vedai/worktrees/chore/edge_retrain/apps/analysis-service/.env.development';
const INPUT_FILE = path.resolve('data/raw_staging_extractions.json');
const OUTPUT_FILE = path.resolve('data/raw_staging_labeled.json');
const MODEL_ID = 'gemini-2.5-pro';
const LOCATION = 'us-central1';
const CONCURRENCY = 30; // Process 30 items concurrently

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hostname = parsed.hostname.toLowerCase();
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'fbclid',
      'gclid',
    ];
    trackingParams.forEach((param) => parsed.searchParams.delete(param));
    let normalized = parsed.toString();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

function normalizeMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function generateContentHash(url: string, markdown: string): string {
  const combined = `${normalizeUrl(url)}|${normalizeMarkdown(markdown)}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

function getGoogleProjectId(): string {
  if (!fs.existsSync(DEV_ENV_PATH)) {
    throw new Error(`.env.development not found at ${DEV_ENV_PATH}`);
  }
  const content = fs.readFileSync(DEV_ENV_PATH, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('GOOGLE_CLOUD_PROJECT=')) {
      return trimmed.substring('GOOGLE_CLOUD_PROJECT='.length).trim();
    }
  }
  throw new Error('GOOGLE_CLOUD_PROJECT not found in .env.development');
}

async function labelItem(ai: GoogleGenAI, item: any, index: number, total: number): Promise<any> {
  const contentSnippet = (item.content_markdown || '').substring(0, 2000);
  const structuralSnippet = (item.structural_markdown || '').substring(0, 2000);

  const prompt = `You are an expert data labeling assistant for a local, edge-based privacy gatekeeper.
Your task is to classify the following web extraction into exactly one of these four categories:
1. \`deep_work\`: Pages representing creation, authoring, editing, coding, designing, or modeling (e.g., GitHub pull request files, Google Doc editing, Jupyter notebooks, local IDEs, Figma design canvas, local code compilers).
2. \`informational\`: Pages representing research, reading, learning, or knowledge acquisition (e.g., StackOverflow questions/answers, technical blogs, Wikipedia articles, library documentation, documentation books).
3. \`communication\`: Pages representing team collaboration, messaging, meetings, or emails (e.g., Slack channels, Microsoft Teams, Discord servers, Gmail composer or inbox, Zoom links).
4. \`noise\`: Pages representing non-productive distractions or transaction/landing/loading noise (e.g., Twitter/X feeds, YouTube video lists, e-commerce shopping, empty loading screen placeholders, browser new-tab screens).

EXAMPLES:
- URL: https://github.com/alete-ai/gate/pull/2/files
  Title: chore(gate): retrain edge classifier by StoyanD
  Label: deep_work
- URL: https://stackoverflow.com/questions/11227809/how-to-read-a-file-in-nodejs
  Title: node.js - How to read a file - Stack Overflow
  Label: informational
- URL: https://app.slack.com/client/T012345/C67890
  Title: Slack | general | Alete Workspace
  Label: communication
- URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  Title: Rick Astley - Never Gonna Give You Up (Official Music Video)
  Label: noise

INPUT DATA:
URL: ${item.url}
Title: ${item.title || 'N/A'}

Content Markdown Snippet:
"""
${contentSnippet}
"""

Structural Markdown Snippet:
"""
${structuralSnippet}
"""

You MUST reply with exactly one of the four labels: \`deep_work\`, \`informational\`, \`communication\`, or \`noise\`. Do not include any other text, reasoning, or markdown formatting.`;

  let attempts = 0;
  let success = false;
  let label = 'unknown';
  const validLabels = new Set(['deep_work', 'informational', 'communication', 'noise']);

  while (attempts < 3 && !success) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = (response.text || '').trim().toLowerCase();
      
      let matchedLabel = '';
      if (text.includes('deep_work')) matchedLabel = 'deep_work';
      else if (text.includes('informational')) matchedLabel = 'informational';
      else if (text.includes('communication')) matchedLabel = 'communication';
      else if (text.includes('noise')) matchedLabel = 'noise';

      if (matchedLabel && validLabels.has(matchedLabel)) {
        label = matchedLabel;
        success = true;
      } else {
        attempts++;
      }
    } catch (err: any) {
      attempts++;
      if (attempts < 3) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  if (!success) {
    label = 'noise';
  }

  console.log(`[${index}/${total}] Labeled: "${item.title || 'Untitled'}" -> ${label}`);
  return {
    ...item,
    label,
  };
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const projectId = getGoogleProjectId();
  console.log(`Resolved GOOGLE_CLOUD_PROJECT: ${projectId}`);

  console.log('Initializing Google Gen AI in Vertex AI mode...');
  const ai = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: LOCATION,
  });

  const extractions = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${extractions.length} raw extractions to label.`);

  // Load existing labels for checkpointing
  const cache = new Map<string, string>();
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
      const validLabels = new Set(['deep_work', 'informational', 'communication', 'noise']);
      for (const item of existing) {
        const hash = item.hash || generateContentHash(item.url, item.content_markdown);
        if (item.label && validLabels.has(item.label)) {
          cache.set(hash, item.label);
        }
      }

      console.log(`Loaded ${cache.size} existing labels from cache.`);
    } catch (err) {
      console.warn('Could not read existing labeled file, starting fresh labeling.', err);
    }
  }

  const labeledResults: any[] = [];
  
  // Process in batches
  for (let i = 0; i < extractions.length; i += CONCURRENCY) {
    const batch = extractions.slice(i, i + CONCURRENCY);
    console.log(`\nProcessing batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(extractions.length / CONCURRENCY)}...`);
    
    const promises = batch.map(async (item, offset) => {
      const hash = item.hash || generateContentHash(item.url, item.content_markdown);
      const index = i + offset + 1;
      if (cache.has(hash)) {
        const label = cache.get(hash)!;
        console.log(`[${index}/${extractions.length}] Cached: "${item.title || 'Untitled'}" -> ${label}`);
        return { ...item, label };
      }
      return labelItem(ai, item, index, extractions.length);
    });
    
    const results = await Promise.all(promises);
    labeledResults.push(...results);

    // Save incrementally
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(labeledResults, null, 2), 'utf-8');
  }

  // Calculate metrics
  let countDeepWork = 0;
  let countInformational = 0;
  let countCommunication = 0;
  let countNoise = 0;
  for (const item of labeledResults) {
    if (item.label === 'deep_work') countDeepWork++;
    else if (item.label === 'informational') countInformational++;
    else if (item.label === 'communication') countCommunication++;
    else if (item.label === 'noise') countNoise++;
  }

  console.log(`\n✅ Labeling Complete! Labeled records saved to ${OUTPUT_FILE}`);
  console.log(`--- Label Summary ---`);
  console.log(`Deep Work:     ${countDeepWork}`);
  console.log(`Informational: ${countInformational}`);
  console.log(`Communication: ${countCommunication}`);
  console.log(`Noise:         ${countNoise}`);
  console.log(`Total:         ${labeledResults.length}`);
}

run().catch(console.error);
