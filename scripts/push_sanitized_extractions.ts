import fs from 'node:fs';
import path from 'node:path';
import { MongoClient, ObjectId } from 'mongodb';

const ENV_PATH = '/Users/stoyan/git/vedai/worktrees/chore/edge_retrain/apps/analysis-service/.env.staging';
const LABELED_FILE = path.resolve('data/raw_staging_labeled.json');

function getStagingCredentials() {
  if (!fs.existsSync(ENV_PATH)) {
    throw new Error(`.env.staging not found at ${ENV_PATH}`);
  }
  const content = fs.readFileSync(ENV_PATH, 'utf-8');
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

async function run() {
  if (!fs.existsSync(LABELED_FILE)) {
    console.error(`Labeled file not found at ${LABELED_FILE}`);
    process.exit(1);
  }

  const sanitizedRecords = JSON.parse(fs.readFileSync(LABELED_FILE, 'utf-8'));
  console.log(`Loaded ${sanitizedRecords.length} sanitized records to push.`);

  console.log('Resolving staging credentials...');
  const { user, pass } = getStagingCredentials();
  const escapedPass = encodeURIComponent(pass);
  const stagingHost = 'vedai-cluster-staging.952n7om.mongodb.net';
  const uri = `mongodb+srv://${user}:${escapedPass}@${stagingHost}/vedai_db?retryWrites=true&w=majority`;

  console.log('Connecting to staging MongoDB...');
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB staging cluster.');

    const db = client.db('vedai_db');
    const collection = db.collection('raw_staging_extractions');

    console.log('Pushing updates to staging database...');
    let updatedCount = 0;

    for (let i = 0; i < sanitizedRecords.length; i++) {
      const item = sanitizedRecords[i];
      if (!item._id) {
        console.warn(`Record at index ${i} lacks _id. Skipping.`);
        continue;
      }

      // Convert string _id to ObjectId
      const filter = { _id: new ObjectId(item._id) };
      const update = {
        $set: {
          content_markdown: item.content_markdown,
          structural_markdown: item.structural_markdown,
          local_pred_label: item.label,
          local_pred_confidence: 1.0, // Mark as high confidence sanitized ground truth
          updatedAt: new Date()
        }
      };

      const result = await collection.updateOne(filter, update);
      if (result.matchedCount > 0) {
        updatedCount++;
      }
    }

    console.log(`\n✅ Database Synchronization Complete!`);
    console.log(`Updated ${updatedCount} / ${sanitizedRecords.length} records in the raw_staging_extractions collection.`);
  } catch (error: any) {
    console.error('Error during data push:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Staging database connection closed.');
  }
}

run().catch(console.error);
