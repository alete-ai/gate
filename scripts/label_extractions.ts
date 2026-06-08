import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

const DEV_ENV_PATH = '/Users/stoyan/git/vedai/worktrees/chore/edge_retrain/apps/analysis-service/.env.development';
const INPUT_FILE = path.resolve('data/raw_staging_extractions.json');
const OUTPUT_FILE = path.resolve('data/raw_staging_labeled.json');
const MODEL_ID = 'gemini-2.5-flash';
const LOCATION = 'us-central1';
const CONCURRENCY = 10; // Process 10 items concurrently

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
Your task is to classify the following web extraction into one of these three categories:
1. \`sensitive_portal\`: Login screens, payment pages, healthcare portals, dental plans, account settings, utility bill payment forms, checkout pages, and other interfaces containing highly sensitive PII.
2. \`digestible_article\`: Long-form news, essays, blogs, Medium/Substack articles, educational content, financial news (not portal), scientific publications, or readable story content.
3. \`noise\`: Marketing landing pages, Google search result pages, eBay/Amazon product listings, empty SPA templates, loading states, and other functional web noise.

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

You MUST reply with exactly one of the three labels: \`sensitive_portal\`, \`digestible_article\`, or \`noise\`. Do not include any other text, reasoning, or markdown formatting.`;

  let attempts = 0;
  let success = false;
  let label = 'unknown';

  while (attempts < 3 && !success) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = (response.text || '').trim().toLowerCase();
      
      if (text.includes('sensitive_portal')) {
        label = 'sensitive_portal';
        success = true;
      } else if (text.includes('digestible_article')) {
        label = 'digestible_article';
        success = true;
      } else if (text.includes('noise')) {
        label = 'noise';
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
  console.log(`Loaded ${extractions.length} raw extractions to label concurrently.`);

  const labeledResults: any[] = [];
  
  // Process in batches
  for (let i = 0; i < extractions.length; i += CONCURRENCY) {
    const batch = extractions.slice(i, i + CONCURRENCY);
    console.log(`\nProcessing batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(extractions.length / CONCURRENCY)}...`);
    
    const promises = batch.map((item, offset) => 
      labelItem(ai, item, i + offset + 1, extractions.length)
    );
    
    const results = await Promise.all(promises);
    labeledResults.push(...results);
  }

  // Calculate metrics
  let countPortals = 0;
  let countArticles = 0;
  let countNoise = 0;
  for (const item of labeledResults) {
    if (item.label === 'sensitive_portal') countPortals++;
    else if (item.label === 'digestible_article') countArticles++;
    else if (item.label === 'noise') countNoise++;
  }

  // Save labeled results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(labeledResults, null, 2), 'utf-8');
  console.log(`\n✅ Labeling Complete! Labeled records saved to ${OUTPUT_FILE}`);
  console.log(`--- Label Summary ---`);
  console.log(`Portals:   ${countPortals}`);
  console.log(`Articles:  ${countArticles}`);
  console.log(`Noise:     ${countNoise}`);
  console.log(`Total:     ${labeledResults.length}`);
}

run().catch(console.error);
