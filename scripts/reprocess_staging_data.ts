import fs from 'node:fs';
import path from 'node:path';
import { processHtml } from '../packages/gate-ingest/src/index.ts';

const INPUT_FILE = path.resolve('data/raw_staging_extractions.json');
const OUTPUT_FILE = path.resolve('data/raw_staging_reprocessed.json');
const CONCURRENCY = 20; // Fetch 20 URLs concurrently

// List of authenticated/private domains we cannot re-fetch
const privateDomains = [
  'slack.com', 'github.com', 'google.com/document', 'docs.google.com',
  'mail.google.com', 'drive.google.com', 'figma.com', 'discord.com',
  'zoom.us', 'localhost', '127.0.0.1', 'appstoreconnect', 'trello', 'jira'
];

async function reprocessItem(item: any, index: number, total: number): Promise<any> {
  const url = item.url || '';
  const isPrivate = privateDomains.some(dom => url.toLowerCase().includes(dom)) || url.startsWith('file://');

  if (isPrivate) {
    console.log(`[${index}/${total}] Skipped (Private): ${url}`);
    return item;
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[${index}/${total}] Fetch failed (HTTP ${res.status}): ${url}`);
      return item;
    }
    const html = await res.text();
    const result = await processHtml(html);

    console.log(`[${index}/${total}] Reprocessed: "${item.title || 'Untitled'}" (${result.semantic.length} chars, ${result.structural.length} tokens)`);
    return {
      ...item,
      content_markdown: result.semantic,
      structural_markdown: result.structural,
      title: result.metadata?.title || item.title
    };
  } catch (err: any) {
    console.warn(`[${index}/${total}] Fetch failed (Error): ${url} - ${err.message}`);
    return item;
  }
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const extractions = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${extractions.length} raw extractions to reprocess.`);

  const reprocessedResults: any[] = [];

  for (let i = 0; i < extractions.length; i += CONCURRENCY) {
    const batch = extractions.slice(i, i + CONCURRENCY);
    console.log(`\nProcessing batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(extractions.length / CONCURRENCY)}...`);
    
    const promises = batch.map((item, offset) => reprocessItem(item, i + offset + 1, extractions.length));
    const results = await Promise.all(promises);
    reprocessedResults.push(...results);

    // Incremental write
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(reprocessedResults, null, 2), 'utf-8');
  }

  console.log(`\n✅ Reprocessing Complete! Reprocessed records saved to ${OUTPUT_FILE}`);
}

run().catch(console.error);
