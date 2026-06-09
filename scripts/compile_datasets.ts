import fs from 'node:fs';
import path from 'node:path';

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

export function partitionStagingData(extractions: any[]) {
  const stagingTestSet = extractions.filter((_: any, idx: number) => idx % 5 === 0);
  const stagingTrainSet = extractions.filter((_: any, idx: number) => idx % 5 !== 0);
  return { stagingTestSet, stagingTrainSet };
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Anonymized staging file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const extractions = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Loaded ${extractions.length} anonymized staging records.`);

  // 1. Partition staging data deterministically
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

  // 2. Load core dataset
  let coreTrainingSet: any[] = [];
  if (fs.existsSync(CORE_TRAIN_JSON_FILE)) {
    coreTrainingSet = JSON.parse(fs.readFileSync(CORE_TRAIN_JSON_FILE, 'utf-8'));
    console.log(`Loaded core training set containing ${coreTrainingSet.length} records.`);
  } else {
    console.warn(`Core training set not found at ${CORE_TRAIN_JSON_FILE}. Starting from scratch.`);
  }

  // Merge the staging training split in-memory only
  const mergedTrainingSet = [...coreTrainingSet, ...stagingTrainSet];
  console.log(`Combined training set contains ${mergedTrainingSet.length} records.`);

  // 3. Compile flat JSON for CreateML
  const flatJson = mergedTrainingSet.map((item: any) => {
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
  
  const rows = mergedTrainingSet.map((item: any) => {
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
