import fs from 'node:fs/promises';
import path from 'node:path';

const PROCESSED_DIR = 'data/processed';

async function convertToCsv() {
  const jsonPath = path.join(PROCESSED_DIR, 'training_set.json');
  const csvPath = path.join(PROCESSED_DIR, 'training_set.csv');

  try {
    const data = JSON.parse(await fs.readFile(jsonPath, 'utf-8'));

    if (data.length === 0) {
      console.log('No data to convert.');
      return;
    }

    // Escape quotes and handle newlines for CSV
    const escape = (text) => `"${text.replace(/"/g, '""').replace(/\n/g, ' ')}"`;

    const header = 'text,label\n';
    const rows = data.map(item => `${escape(item.structural)},${escape(item.label)}`).join('\n');

    await fs.writeFile(csvPath, header + rows);
    console.log(`Converted to CSV at ${csvPath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`Error: ${jsonPath} not found. Run synthesis first.`);
    } else {
      throw error;
    }
  }
}

convertToCsv().catch(console.error);
