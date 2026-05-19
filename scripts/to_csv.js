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
    const escape = (text) => `"${(text || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;

    const header = 'text,title,description,label\n';
    const rows = data.map(item => {
      const title = item.metadata?.title || '';
      const description = item.metadata?.description || '';
      const semantic = (item.semantic || '').slice(0, 2000);
      const structural = (item.structural || '').slice(0, 2000);
      
      // Concatenate metadata and semantic content into the primary text field.
      // We prioritize semantic content over structural substrate for narrative-heavy classification.
      let combinedText = '';
      if (title) combinedText += `${title}. `;
      if (description) combinedText += `${description}. `;
      if (semantic) combinedText += `${semantic}. `;
      combinedText += structural;
      
      const label = item.label;
      
      return `${escape(combinedText)},${escape(title)},${escape(description)},${escape(label)}`;
    }).join('\n');

    await fs.writeFile(csvPath, header + rows);
    console.log(`💎 Alete Gate: Converted substrate to CSV at ${csvPath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`❌ Alete Gate: Error - ${jsonPath} not found. Run substrate synthesis first.`);
    } else {
      throw error;
    }
  }
}

convertToCsv().catch(console.error);
