import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

const DEV_ENV_PATH = '/Users/stoyan/git/vedai/worktrees/chore/edge_retrain/apps/analysis-service/.env.development';
const INPUT_FILE = path.resolve('data/raw_staging_extractions.json');
const MODEL_ID = 'gemini-2.5-pro';
const LOCATION = 'us-central1';

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

// Extract class names from HTML
function extractClassesAndTags(html: string): { classes: string[]; tags: string[] } {
  const classSet = new Set<string>();
  const tagSet = new Set<string>();

  // Match class="..." or class='...'
  const classRegex = /class=["']([^"']+)["']/g;
  let match;
  while ((match = classRegex.exec(html)) !== null) {
    const classes = match[1].split(/\s+/);
    for (const c of classes) {
      if (c.trim()) classSet.add(c.trim());
    }
  }

  // Match tags
  const tagRegex = /<([a-zA-Z0-9:-]+)/g;
  while ((match = tagRegex.exec(html)) !== null) {
    tagSet.add(match[1].toLowerCase());
  }

  return {
    classes: Array.from(classSet).slice(0, 400), // Cap classes for token efficiency
    tags: Array.from(tagSet)
  };
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const projectId = getGoogleProjectId();
  console.log(`Resolved GOOGLE_CLOUD_PROJECT: ${projectId}`);

  const ai = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location: LOCATION,
  });

  const extractions = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${extractions.length} staging extractions.`);

  // Filter public URLs
  const privateDomains = [
    'slack.com', 'github.com', 'google.com/document', 'docs.google.com',
    'mail.google.com', 'drive.google.com', 'figma.com', 'discord.com',
    'zoom.us', 'localhost', '127.0.0.1', 'appstoreconnect', 'trello', 'jira'
  ];

  const publicUrlsByDomain: Record<string, string[]> = {};
  for (const item of extractions) {
    const url = item.url || '';
    const isPrivate = privateDomains.some(dom => url.toLowerCase().includes(dom)) || url.startsWith('file://');
    if (!isPrivate) {
      try {
        const parsed = new URL(url);
        const host = parsed.hostname;
        if (!publicUrlsByDomain[host]) publicUrlsByDomain[host] = [];
        publicUrlsByDomain[host].push(url);
      } catch {}
    }
  }

  // Find top public domains
  const sortedDomains = Object.entries(publicUrlsByDomain)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  console.log('\nTop 5 public domains to analyze:');
  sortedDomains.forEach(([domain, urls]) => {
    console.log(`- ${domain}: ${urls.length} URLs`);
  });

  const suggestedSelectors: string[] = [];

  for (const [domain, urls] of sortedDomains) {
    const sampleUrl = urls[0];
    console.log(`\nFetching sample URL for ${domain}: ${sampleUrl}`);
    
    let html = '';
    try {
      html = await fetch(sampleUrl).then(r => r.text());
    } catch (err: any) {
      console.warn(`Failed to fetch ${sampleUrl}: ${err.message}`);
      continue;
    }

    const { classes, tags } = extractClassesAndTags(html);
    console.log(`Found ${classes.length} classes and ${tags.length} tags.`);

    const prompt = `You are a web scraping and CSS selector optimization expert.
We are converting HTML pages from the domain "${domain}" into clean markdown for LLMs, and structural tokens for a classifier.
We want to strip out all site headers, site footers, global navigation bars, sidebars, social sharing widgets, cookie banners, menus, and ads.
We want to keep the main article/body content.

Here are some HTML tags found on the page:
${tags.join(', ')}

Here are some CSS classes found on the page:
${classes.join(', ')}

Suggest a list of CSS selectors (class names like ".header", tag names, or attribute selectors like "[class*='menu']") that represent layout noise (headers, footers, navs, sidebars, social share, ads) on this domain.
Output ONLY a JSON array of string selectors, for example:
[
  ".site-header",
  ".global-footer",
  "[class*='navigation']"
]
Do not include any other text, markdown formatting, or explain your decisions.`;

    try {
      console.log(`Calling LLM to discover selectors for ${domain}...`);
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const text = (response.text || '').trim();
      console.log(`LLM Response for ${domain}:\n${text}`);
      
      // Attempt to parse JSON
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      if (Array.isArray(parsed)) {
        suggestedSelectors.push(...parsed);
      }
    } catch (err: any) {
      console.error(`Error analyzing ${domain}:`, err.message);
    }
  }

  // De-duplicate selectors
  const uniqueSelectors = Array.from(new Set(suggestedSelectors));
  console.log('\n======================================');
  console.log('🎯 DISCOVERED SELECTORS SUMMARY');
  console.log('======================================');
  console.log(JSON.stringify(uniqueSelectors, null, 2));

  // Save to file for next steps
  fs.writeFileSync('data/discovered_selectors.json', JSON.stringify(uniqueSelectors, null, 2), 'utf-8');
  console.log('\nSaved discovered selectors to data/discovered_selectors.json');
}

run().catch(console.error);
