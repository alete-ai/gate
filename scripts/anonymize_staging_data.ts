import fs from 'node:fs';
import path from 'node:path';

const INPUT_FILE = path.resolve('data/raw_staging_labeled.json');
const OUTPUT_FILE = path.resolve('data/raw_staging_anonymized.json');

export function redactPII(text: string): string {
  if (!text) return '';
  return text
    // Redact email addresses
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi, '[EMAIL]')
    // Redact UUIDs
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/gi, '[UUID]')
    // Redact founder names
    .replace(/stoyan/gi, 'User')
    .replace(/dimitrov/gi, 'Name')
    // Redact Phone numbers
    .replace(/(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE]')
    // Redact Credit Cards / SSNs
    .replace(/\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, '[REDACTED_CC]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED_SSN]')
    // Redact IP addresses
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP_ADDRESS]')
    // Redact typical API keys / long hex or base64 tokens (32+ chars)
    .replace(/\b[a-zA-Z0-9_-]{32,}\b/g, '[TOKEN]')
    // Redact absolute URLs in markdown and text
    .replace(/https?:\/\/[^\s\)\"\'\>]+/gi, '[URL]');
}

function getHostname(urlStr: string): string {
  try {
    if (!urlStr) return '';
    // Handle cases where protocol might be missing
    const hasProtocol = /^https?:\/\//i.test(urlStr);
    const parsed = new URL(hasProtocol ? urlStr : `https://${urlStr}`);
    return parsed.hostname;
  } catch {
    return 'unknown';
  }
}

export function getUrlPathKeywords(urlStr: string): string[] {
  try {
    if (!urlStr) return [];
    const hasProtocol = /^https?:\/\//i.test(urlStr);
    const parsed = new URL(hasProtocol ? urlStr : `https://${urlStr}`);
    
    // Decode percent-encoding
    const decodedPath = decodeURIComponent(parsed.pathname);
    
    // Split by non-alphanumeric characters
    const words = decodedPath
      .toLowerCase()
      .split(/[^a-z0-9]+/);
    
    return words.filter((w: string): boolean => {
      // Filter out empty, single character, purely numeric, or hex hashes/IDs
      if (w.length <= 1) return false;
      if (/^\d+$/.test(w)) return false; // purely numeric
      if (/^[0-9a-f]{8,}$/i.test(w)) return false; // hex string/hash (at least 8 chars)
      return true;
    });
  } catch {
    return [];
  }
}

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`Input file not found: ${INPUT_FILE}`);
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Starting PII audit and anonymization on ${rawData.length} records...`);

  const anonymizedData = rawData.map((item: any, idx: number) => {
    // Redact title and description in metadata
    const cleanTitle = redactPII(item.title || '');
    const cleanDescription = redactPII(item.description || '');

    // Extract hostname
    const urlHost = getHostname(item.url || '');

    // Extract path keywords
    const urlPathKeywords = getUrlPathKeywords(item.url || '');

    // Redact content and structural markdown
    const cleanSemantic = redactPII(item.content_markdown || '');
    const cleanStructural = redactPII(item.structural_markdown || '');

    return {
      structural: cleanStructural,
      semantic: cleanSemantic,
      label: item.label,
      metadata: {
        title: cleanTitle,
        description: cleanDescription,
        urlHost,
        urlPathKeywords,
      }
    };
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(anonymizedData, null, 2), 'utf-8');
  console.log(`\n✅ Anonymization Complete! Saved ${anonymizedData.length} scrubbed records to ${OUTPUT_FILE}`);
}

run().catch(console.error);
