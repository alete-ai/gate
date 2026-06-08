import fs from 'node:fs';
import path from 'node:path';
import { MongoClient } from 'mongodb';

const ENV_PATH = '/Users/stoyan/git/vedai/worktrees/chore/edge_retrain/apps/analysis-service/.env.staging';
const OUTPUT_DIR = path.resolve('data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'raw_staging_extractions.json');

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
    
    console.log('Fetching raw staging extractions...');
    const extractions = await collection.find({}).toArray();
    
    console.log(`Successfully fetched ${extractions.length} records.`);
    
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Write records to JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(extractions, null, 2), 'utf-8');
    console.log(`Saved extractions to ${OUTPUT_FILE}`);
  } catch (error: any) {
    console.error('Error during data pull:', error.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Staging database connection closed.');
  }
}

run().catch(console.error);
