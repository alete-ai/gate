import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';

// Paths
const VEDAI_PATH = '/Users/stoyan/git/vedai/worktrees/chore/edge_retrain';
const DEV_ENV_PATH = path.join(VEDAI_PATH, 'apps/analysis-service/.env.development');
const STAGING_ENV_PATH = path.join(VEDAI_PATH, 'apps/analysis-service/.env.staging');
const DATA_DIR = path.resolve('data');
const LABELED_FILE = path.join(DATA_DIR, 'raw_staging_labeled.json');
const STAGING_TEST_FILE = path.join(DATA_DIR, 'staging_test_set.json');

// Interface for RawStagingExtraction
interface RawStagingExtraction {
  _id?: any;
  url: string;
  title?: string;
  content_markdown: string;
  structural_markdown: string;
  hash?: string;
  local_pred_label?: string;
  local_pred_confidence?: number;
}

// Hashing Helpers
export function normalizeUrl(url: string): string {
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

export function normalizeMarkdown(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

export function generateContentHash(url: string, markdown: string): string {
  const combined = `${normalizeUrl(url)}|${normalizeMarkdown(markdown)}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

export function validateExtractionLabels(extractions: any[]): void {
  const validLabels = new Set(['deep_work', 'informational', 'communication', 'noise']);
  for (const item of extractions) {
    if (!item.label || !validLabels.has(item.label)) {
      throw new Error(`Invalid label "${item.label}" detected for item: ${item.url || 'unknown'}`);
    }
  }
}


// Credential Resolvers
function getLocalUri(): string {
  if (fs.existsSync(DEV_ENV_PATH)) {
    const content = fs.readFileSync(DEV_ENV_PATH, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed.startsWith('MONGODB_URI=')) {
        return trimmed.substring('MONGODB_URI='.length).trim();
      }
    }
  }
  return 'mongodb://localhost:27017/vedai_db?directConnection=true';
}

function getStagingCredentials(): { user: string; pass: string } {
  if (!fs.existsSync(STAGING_ENV_PATH)) {
    throw new Error(`.env.staging not found at ${STAGING_ENV_PATH}`);
  }
  const content = fs.readFileSync(STAGING_ENV_PATH, 'utf-8');
  let user = '';
  let pass = '';
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('MONGODB_USER=')) {
      const val = trimmed.substring('MONGODB_USER='.length).trim();
      const hashIndex = val.indexOf('#');
      user = hashIndex !== -1 ? val.substring(0, hashIndex).trim() : val;
    } else if (trimmed.startsWith('MONGODB_PASSWORD=')) {
      const val = trimmed.substring('MONGODB_PASSWORD='.length).trim();
      const hashIndex = val.indexOf('#');
      pass = hashIndex !== -1 ? val.substring(0, hashIndex).trim() : val;
    }
  }
  if (!user || !pass) {
    throw new Error('Failed to parse MONGODB_USER or MONGODB_PASSWORD from env file.');
  }
  return { user, pass };
}

// Subprocess runner
function runCommand(command: string, silent: boolean): string {
  if (!silent) {
    console.log(`\n🏃 Executing: ${command}`);
  }
  try {
    const stdout = execSync(command, { stdio: silent ? 'pipe' : 'inherit', encoding: 'utf-8' });
    return stdout || '';
  } catch (err: any) {
    console.error(`❌ Command failed: ${command}`);
    if (silent && err.stderr) {
      console.error(err.stderr);
    }
    throw err;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const skipPush = args.includes('--skip-push');
  const skipLabeling = args.includes('--skip-labeling');
  const dryRun = args.includes('--dry-run');
  const silent = args.includes('--silent');

  console.log('🛡️ Alete Gate: Initializing Edge Classifier Retraining Pipeline CLI...');

  if (dryRun) {
    console.log('⚠️ Running in DRY-RUN mode. No actual writes, deletions, or training will occur.');
  }

  // Phase 1: Local-to-Staging Synchronization
  if (skipPush) {
    console.log('⏭️ Skipping Phase 1: Local-to-Staging Push (--skip-push)');
  } else {
    console.log('\n--- 📂 Phase 1: Local-to-Staging Integration ---');
    try {
      const localUri = getLocalUri();
      const { user, pass } = getStagingCredentials();
      const escapedPass = encodeURIComponent(pass);
      const stagingHost = 'vedai-cluster-staging.952n7om.mongodb.net';
      const stagingUri = `mongodb+srv://${user}:${escapedPass}@${stagingHost}/vedai_db?retryWrites=true&w=majority`;

      console.log('Connecting to databases...');
      const localClient = new MongoClient(localUri);
      const stagingClient = new MongoClient(stagingUri);

      await localClient.connect();
      await stagingClient.connect();

      const localDb = localClient.db('vedai_db');
      const stagingDb = stagingClient.db('vedai_db');

      const localColl = localDb.collection<RawStagingExtraction>('raw_staging_extractions');
      const stagingColl = stagingDb.collection<RawStagingExtraction>('raw_staging_extractions');

      const localExtractions = await localColl.find({}).toArray();
      console.log(`Found ${localExtractions.length} local extractions.`);

      if (localExtractions.length > 0) {
        if (dryRun) {
          console.log(`[Dry Run] Would push ${localExtractions.length} local extractions to staging and delete them locally.`);
        } else {
          console.log(`Pushing ${localExtractions.length} extractions to staging...`);
          let pushedCount = 0;
          for (const item of localExtractions) {
            const hash = item.hash || generateContentHash(item.url, item.content_markdown);
            await stagingColl.updateOne(
              { hash },
              {
                $set: {
                  url: item.url,
                  title: item.title,
                  content_markdown: item.content_markdown,
                  structural_markdown: item.structural_markdown,
                  hash,
                  local_pred_label: item.local_pred_label,
                  local_pred_confidence: item.local_pred_confidence,
                },
              },
              { upsert: true }
            );
            await localColl.deleteOne({ _id: item._id });
            pushedCount++;
          }
          console.log(`Successfully synced and cleared ${pushedCount} records locally.`);
        }
      } else {
        console.log('No local extractions found to push.');
      }

      await localClient.close();
      await stagingClient.close();
    } catch (err: any) {
      console.error('❌ Phase 1 database sync failed:', err.message);
      process.exit(1);
    }
  }

  // Phase 2: Pipeline Orchestration & Curation
  console.log('\n--- 📂 Phase 2: Pipeline Orchestration & Curation ---');

  if (dryRun) {
    console.log('[Dry Run] Would invoke pull, label, anonymize, and compile datasets scripts.');
  } else {
    // 2.1 Pull extractions
    console.log('Pulling extractions from staging...');
    runCommand('pnpm exec tsx scripts/pull_staging_extractions.ts', silent);

    // 2.2 Label extractions
    const runLabel = !skipLabeling || !fs.existsSync(LABELED_FILE);
    if (runLabel) {
      console.log('Labeling extractions via Vertex AI (Gemini)...');
      runCommand('pnpm exec tsx scripts/label_extractions.ts', silent);
    } else {
      console.log('⏭️ Skipping Gemini labeling (labeled file exists and --skip-labeling is set)');
    }

    // 2.3 Anonymize staging data
    console.log('Scrubbing PII and anonymizing text...');
    runCommand('pnpm exec tsx scripts/anonymize_staging_data.ts', silent);

    // 2.4 Compile datasets
    console.log('Compiling datasets and splitting training/holdout sets...');
    runCommand('pnpm exec tsx scripts/compile_datasets.ts', silent);
  }

  // Phase 3: Model Retraining & Verification
  console.log('\n--- 📂 Phase 3: Model Retraining & Verification ---');

  if (dryRun) {
    console.log('[Dry Run] Would retrain the model and evaluate it against validation and holdout sets.');
  } else {
    // 3.1 Retrain CreateML classifier
    console.log('Retraining Apple MaxEnt text classifier...');
    runCommand('swift scripts/train_model.swift', silent);

    // 3.2 Verify new model
    console.log('Evaluating new model metrics...');
    const verificationOutput = runCommand('swift scripts/verify_model.swift', true);

    // Parse and display a clean final report
    console.log('\n==================================================');
    console.log('🏆 RETRAINING PIPELINE REPORT');
    console.log('==================================================');

    const lines = verificationOutput.split('\n');
    let currentDataset = '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('🔍 Evaluating Dataset:')) {
        currentDataset = trimmed.replace('🔍 Evaluating Dataset:', '').trim();
        console.log(`\nDataset: ${currentDataset}`);
      } else if (trimmed.startsWith('✅ Accuracy:')) {
        console.log(`  - Accuracy:     ${trimmed.replace('✅ Accuracy:', '').trim()}`);
      } else if (trimmed.startsWith('⏱️ Avg Latency:')) {
        console.log(`  - Avg Latency:  ${trimmed.replace('⏱️ Avg Latency:', '').trim()}`);
      } else if (trimmed.startsWith('🔴 False Negs')) {
        console.log(`  - False Negatives (Leaks):  ${trimmed.replace('🔴 False Negs (Leaks):', '').trim()}`);
      } else if (trimmed.startsWith('🟡 False Pos')) {
        console.log(`  - False Positives (Blocks): ${trimmed.replace('🟡 False Pos (Blocks):', '').trim()}`);
      }
    }
    console.log('\n==================================================');
    console.log('✅ Retraining pipeline executed successfully.');
  }
}

main().catch((err) => {
  console.error('💥 Fatal error in pipeline execution:', err);
  process.exit(1);
});
