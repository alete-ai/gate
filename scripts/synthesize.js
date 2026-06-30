import fs from 'node:fs/promises';
import path from 'node:path';
import { processHtml } from '../packages/gate-ingest/dist/index.js';

const RAW_DIR = 'data/raw';
const OUTPUT_DIR = 'data/processed';

function parseFilenameMetadata(filename) {
  const nameWithoutExt = filename.replace(/\.html$/, '');
  const firstUnderscore = nameWithoutExt.indexOf('_');
  if (firstUnderscore === -1) {
    return { urlHost: '', urlPathKeywords: [] };
  }
  
  const prefix = nameWithoutExt.substring(0, firstUnderscore);
  let rest = nameWithoutExt.substring(firstUnderscore + 1);
  
  if (rest.startsWith('www_')) {
    rest = rest.substring(4);
  }
  
  const parts = rest.split('_');
  let hostParts = [];
  let pathParts = [];
  
  const suffixes = new Set(['com', 'org', 'net', 'co', 'gov', 'edu', 'info', 'io', 'tv', 'us', 'me']);
  let suffixIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    if (suffixes.has(parts[i])) {
      suffixIndex = i;
      break;
    }
  }
  
  if (suffixIndex !== -1) {
    hostParts = parts.slice(0, suffixIndex + 1);
    pathParts = parts.slice(suffixIndex + 1);
  } else {
    hostParts = [parts[0]];
    pathParts = parts.slice(1);
  }
  
  const urlHost = hostParts.join('.');
  const urlPathKeywords = pathParts.filter(w => {
    if (w.length <= 1) return false;
    if (/^\d+$/.test(w)) return false;
    if (/^[0-9a-f]{8,}$/i.test(w)) return false;
    return true;
  });
  
  return { urlHost, urlPathKeywords };
}

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
    const { structural, semantic, metadata } = await processHtml(html, { keepNaturalLanguage: true });

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
    } else if (file.includes('communication') || file.includes('slack') || file.includes('mail') || file.includes('teams') || file.includes('discord')) {
      label = 'communication';
    }

    const hasSensitiveInfo = label === 'sensitive_portal';
    const { urlHost, urlPathKeywords } = parseFilenameMetadata(file);
    const title = metadata?.title || '';

    trainingSet.push({
      structural,
      semantic,
      label,
      hasSensitiveInfo,
      url: urlHost ? `https://${urlHost}/${urlPathKeywords.join('/')}` : '',
      metadata: {
        ...metadata,
        title,
        urlHost,
        urlPathKeywords
      }
    });
  }

  const jsonOutputPath = path.join(OUTPUT_DIR, 'training_set.json');
  await fs.writeFile(jsonOutputPath, JSON.stringify(trainingSet, null, 2));
  console.log(`💎 Alete Gate: Synthesized ${trainingSet.length} samples to ${jsonOutputPath}`);
}

synthesize().catch(console.error);
