import { processHtml } from '@alete/gate-ingest';
import fs from 'node:fs/promises';
import path from 'node:path';

const RAW_DIR = 'data/raw';
const PROCESSED_DIR = 'data/processed';

async function synthesize() {
  // Ensure directories exist
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.mkdir(PROCESSED_DIR, { recursive: true });

  const files = await fs.readdir(RAW_DIR);
  const trainingSet = [];

  if (files.length === 0) {
    console.warn(`No raw HTML files found in ${RAW_DIR}. Please add some for synthesis.`);
    return;
  }

  for (const file of files) {
    if (!file.endsWith('.html')) continue;

    const filePath = path.join(RAW_DIR, file);
    const html = await fs.readFile(filePath, 'utf-8');

    // Convert HTML into both structural tokens and semantic Markdown
    const { structural, semantic } = processHtml(html);

    // Inference for basic labels based on filename/content for the initial bootstrapping
    let label = 'noise';
    if (file.includes('portal') || file.includes('login') || file.includes('form') || file.includes('bank') || file.includes('health')) {
      label = 'sensitive_portal';
    } else if (file.includes('article') || file.includes('blog') || file.includes('substack') || file.includes('news')) {
      label = 'digestible_article';
    }

    trainingSet.push({
      text: structural,
      semantic: semantic,
      label: label
    });
  }

  const jsonOutputPath = path.join(PROCESSED_DIR, 'training_set.json');
  await fs.writeFile(jsonOutputPath, JSON.stringify(trainingSet, null, 2));
  console.log(`Synthesized ${trainingSet.length} samples to ${jsonOutputPath}`);
}

synthesize().catch(console.error);
