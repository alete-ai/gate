import fs from 'node:fs/promises';
import path from 'node:path';
import { processHtml } from '../packages/gate-ingest/dist/index.js';

const RAW_DIR = 'data/raw';
const OUTPUT_DIR = 'data/processed';

async function synthesize() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const files = await fs.readdir(RAW_DIR);

  if (files.length === 0) {
    console.warn(`⚠️  Alete Gate: No raw HTML files found in ${RAW_DIR}. Substrate synthesis aborted.`);
    return;
  }

  console.log(`🚀 Alete Gate: Synthesizing structural substrate from ${files.length} samples...`);

  const trainingSet = [];
  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const html = await fs.readFile(filePath, 'utf-8');

    // Convert HTML into both structural tokens and semantic Markdown
    const { structural, semantic, hasSensitiveInfo } = await processHtml(html, { redact: true });

    if (!structural || structural.trim().length === 0) {
      console.warn(`⚠️  Alete Gate: Skipping ${file} - No structural artifacts extracted.`);
      continue;
    }

    // Inference for basic labels based on filename/content for the initial bootstrapping
    let label = 'noise';
    if (file.includes('portal') || file.includes('login') || file.includes('form') || file.includes('bank') || file.includes('health')) {
      label = 'sensitive_portal';
    } else if (file.includes('article') || file.includes('blog') || file.includes('news') || file.includes('substack')) {
      label = 'digestible_article';
    }

    trainingSet.push({
      structural,
      semantic,
      label,
      hasSensitiveInfo
    });
  }

  const jsonOutputPath = path.join(OUTPUT_DIR, 'training_set.json');
  await fs.writeFile(jsonOutputPath, JSON.stringify(trainingSet, null, 2));
  console.log(`💎 Alete Gate: Synthesized ${trainingSet.length} samples to ${jsonOutputPath}`);
}

synthesize().catch(console.error);
