import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const INPUT_FILE = path.resolve('data/raw_staging_anonymized.json');
const TEST_OUTPUT_FILE = path.resolve('data/staging_test_set.json');
const STAGING_TRAIN_FILE = path.resolve('data/processed/staging_training_set.json');
const CORE_TRAIN_JSON_FILE = path.resolve('data/processed/training_set.json');
const TRAIN_CSV_FILE = path.resolve('data/processed/training_set_flat.csv'); // git-ignored csv
const FLAT_JSON_FILE = path.resolve('data/processed/training_set_flat.json'); // git-ignored flat json

export function buildClassifierInput(
  urlHost: string | undefined,
  urlPathKeywords: string[] | undefined,
  title: string | undefined,
  structural: string
): string {
  let combined = '';
  
  if (urlHost) {
    const cleanHost = urlHost.toLowerCase().trim().replace(/^www\./, '');
    if (cleanHost) {
      combined += `urlHost_${cleanHost} `;
    }
  }

  if (urlPathKeywords && urlPathKeywords.length > 0) {
    combined += urlPathKeywords.map((w: string): string => `urlPath_${w}`).join(' ') + ' ';
  }
  
  if (title) {
    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim())
      .filter(w => w.length > 0);
    
    if (words.length > 0) {
      combined += words.map(w => `title_${w}`).join(' ') + ' ';
    }
  }
  
  combined += structural.trim();
  return combined.trim();
}

export function validateLabels(dataset: any[]): boolean {
  const validLabels = new Set(['deep_work', 'informational', 'communication', 'noise']);
  return dataset.every(item => validLabels.has(item.label));
}

export function isBalanced(dataset: any[]): boolean {
  const counts: Record<string, number> = {
    deep_work: 0,
    informational: 0,
    communication: 0,
    noise: 0
  };
  for (const item of dataset) {
    if (item.label in counts) {
      counts[item.label]++;
    }
  }
  const values = Object.values(counts);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === 0) return false;
  return (max / min) < 2.0;
}

export function stratifyAndSplit(extractions: any[], testRatio: number = 0.2) {
  const byLabel: Record<string, any[]> = {
    deep_work: [],
    informational: [],
    communication: [],
    noise: []
  };
  
  for (const item of extractions) {
    const label = item.label || 'noise';
    if (label in byLabel) {
      byLabel[label].push(item);
    } else {
      byLabel['noise'].push(item);
    }
  }
  
  const stagingTestSet: any[] = [];
  const stagingTrainSet: any[] = [];
  
  for (const label of Object.keys(byLabel)) {
    const list = byLabel[label];
    // Deterministically shuffle the list to avoid domain/sequential clustering
    list.sort((a, b) => {
      const hashA = crypto.createHash('sha256').update(JSON.stringify(a)).digest('hex');
      const hashB = crypto.createHash('sha256').update(JSON.stringify(b)).digest('hex');
      return hashA.localeCompare(hashB);
    });
    const testCount = Math.round(list.length * testRatio);
    const testItems = list.slice(0, testCount);
    const trainItems = list.slice(testCount);
    
    stagingTestSet.push(...testItems);
    stagingTrainSet.push(...trainItems);
  }
  
  return { stagingTestSet, stagingTrainSet };
}

export function partitionStagingData(extractions: any[]) {
  return stratifyAndSplit(extractions, 0.2);
}

export function mapLegacyLabel(label: string, url: string = ''): string {
  const clean = label.trim().toLowerCase();
  if (clean === 'digestible_article') return 'informational';
  if (clean === 'sensitive_portal') {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('slack') || urlLower.includes('mail') || urlLower.includes('teams') || urlLower.includes('discord')) {
      return 'communication';
    }
    if (urlLower.includes('github') || urlLower.includes('gitlab') || urlLower.includes('jira') || urlLower.includes('doc')) {
      return 'deep_work';
    }
    return 'deep_work'; // default to deep_work for work portals
  }
  if (clean === 'noise') return 'noise';
  return clean;
}

export function balanceTrainingSet(dataset: any[]): any[] {
  const byLabel: Record<string, any[]> = {
    deep_work: [],
    informational: [],
    communication: [],
    noise: []
  };
  
  for (const item of dataset) {
    const label = item.label;
    if (label in byLabel) {
      byLabel[label].push(item);
    }
  }
  
  const balancedDataset: any[] = [];
  
  for (const label of Object.keys(byLabel)) {
    let list = byLabel[label];
    
    if (list.length > 250) {
      list.sort((a, b) => (a.url || '').localeCompare(b.url || ''));
      list = list.slice(0, 250);
      console.log(`Downsampled class "${label}" from ${byLabel[label].length} to 250.`);
    } else if (list.length < 150 && list.length > 0) {
      const originalLength = list.length;
      while (list.length < 150) {
        const copy = { ...list[list.length % originalLength] };
        list.push(copy);
      }
      console.log(`Upsampled class "${label}" from ${originalLength} to 150.`);
    }
    
    balancedDataset.push(...list);
  }
  
  return balancedDataset;
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Anonymized staging file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const extractions = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${extractions.length} anonymized staging records.`);

  // 1. Partition staging data deterministically using stratified splitting
  const { stagingTestSet, stagingTrainSet } = partitionStagingData(extractions);

  console.log(`Partitioned staging data:`);
  console.log(`- Staging Test Set (20%):  ${stagingTestSet.length} records`);
  console.log(`- Staging Train Set (80%): ${stagingTrainSet.length} records`);

  // Save the staging test set
  fs.writeFileSync(TEST_OUTPUT_FILE, JSON.stringify(stagingTestSet, null, 2), 'utf-8');
  console.log(`Saved staging test set to ${TEST_OUTPUT_FILE}`);

  // Save the staging training split to local git-ignored file
  fs.writeFileSync(STAGING_TRAIN_FILE, JSON.stringify(stagingTrainSet, null, 2), 'utf-8');
  console.log(`Saved staging training set to ${STAGING_TRAIN_FILE}`);

  // 2. Load and map core dataset
  let coreTrainingSet: any[] = [];
  if (fs.existsSync(CORE_TRAIN_JSON_FILE)) {
    const rawCore = JSON.parse(fs.readFileSync(CORE_TRAIN_JSON_FILE, 'utf-8'));
    coreTrainingSet = rawCore.map((item: any) => ({
      ...item,
      label: mapLegacyLabel(item.label, item.url || '')
    }));
    console.log(`Loaded and mapped core training set containing ${coreTrainingSet.length} records.`);
  } else {
    console.warn(`Core training set not found at ${CORE_TRAIN_JSON_FILE}. Starting from scratch.`);
  }

  // Merge the staging training split in-memory and balance the training set
  const mergedTrainingSet = [...coreTrainingSet, ...stagingTrainSet];
  const balancedTrainingSet = balanceTrainingSet(mergedTrainingSet);
  console.log(`Combined and balanced training set contains ${balancedTrainingSet.length} records.`);

  // 3. Compile flat JSON for CreateML
  const flatJson = balancedTrainingSet.map((item: any) => {
    const title = item.metadata?.title || item.title || '';
    const urlHost = item.metadata?.urlHost || item.urlHost || '';
    const urlPathKeywords = item.metadata?.urlPathKeywords || item.urlPathKeywords || [];
    const structural = item.structural || '';
    
    const combinedText = buildClassifierInput(urlHost, urlPathKeywords, title, structural);
    
    return {
      text: combinedText,
      label: item.label
    };
  });

  fs.writeFileSync(FLAT_JSON_FILE, JSON.stringify(flatJson, null, 2), 'utf-8');
  console.log(`Saved flat JSON training set to ${FLAT_JSON_FILE}`);

  // 4. Compile CSV training set (for debugging / CreateML UI if needed)
  const escape = (text: string) => `"${(text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  const header = 'text,title,urlHost,label\n';
  
  const rows = balancedTrainingSet.map((item: any) => {
    const title = item.metadata?.title || item.title || '';
    const urlHost = item.metadata?.urlHost || item.urlHost || '';
    const urlPathKeywords = item.metadata?.urlPathKeywords || item.urlPathKeywords || [];
    const structural = item.structural || '';
    
    const combinedText = buildClassifierInput(urlHost, urlPathKeywords, title, structural);
    
    return `${escape(combinedText)},${escape(title)},${escape(urlHost)},${escape(item.label)}`;
  }).join('\n');

  fs.writeFileSync(TRAIN_CSV_FILE, header + rows, 'utf-8');
  console.log(`Saved CSV training set to ${TRAIN_CSV_FILE}`);
}

const isMain = process.argv[1] && (process.argv[1].endsWith('compile_datasets.ts') || process.argv[1].endsWith('compile_datasets.js') || process.argv[1].endsWith('compile_datasets'));
if (isMain) {
  run().catch(console.error);
}

