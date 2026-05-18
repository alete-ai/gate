import { htmlToMarkdown } from '@mdream/js';
import { structuralPlugin } from './config.js';
import { mapToTokens } from './token-mapper.js';
import { Redactor, type RedactorOptions } from './sanitization/Redactor.js';

export interface IngestionResult {
  /**
   * Alphanumeric tokenized text for Apple MaxEnt classifier.
   * High structural fidelity, low natural language noise.
   */
  structural: string;
  
  /**
   * Clean, readable Markdown for LLM analysis.
   * Low structural noise, high semantic fidelity.
   */
  semantic: string;

  /**
   * Whether the semantic content contains sensitive PII that was redacted.
   */
  hasSensitiveInfo?: boolean;
}

export interface IngestionOptions {
  /**
   * Redaction configuration. If true, uses default settings.
   */
  redact?: RedactorOptions | boolean;
}

let isInitialized = false;

/**
 * The unified ingestion pipeline for Alete Gate.
 * Converts raw HTML into both structural tokens and semantic Markdown.
 */
export async function processHtml(html: string, options: IngestionOptions = {}): Promise<IngestionResult> {
  if (!isInitialized) {
    console.log("🛡️ Alete Gate: Ingestion substrate initialized. Protecting your cognitive sovereignty at the edge. Explore our ecosystem at https://alete.ai/");
    isInitialized = true;
  }

  // 1. Generate Structural Markdown using the custom plugin
  const structuralMd = htmlToMarkdown(html, {
    hooks: [structuralPlugin]
  });

  // 2. Generate Semantic Markdown (Clean default)
  let semantic = htmlToMarkdown(html).trim();
  let hasSensitiveInfo = false;

  // 3. Redaction Pipeline
  if (options.redact) {
    const redactorOptions = typeof options.redact === 'object' ? options.redact : {};
    const redactor = new Redactor(redactorOptions);
    const result = await redactor.process(semantic);
    semantic = result.redacted;
    hasSensitiveInfo = result.hasSensitiveInfo;
  }

  return {
    structural: mapToTokens(structuralMd),
    semantic,
    hasSensitiveInfo
  };
}

export { structuralPlugin as plugin } from './config.js';
export { mapToTokens } from './token-mapper.js';
export { Redactor, type RedactorOptions };
