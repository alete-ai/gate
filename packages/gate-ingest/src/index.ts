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

  /**
   * Extracted metadata from the HTML (title, description, author, etc.)
   */
  metadata?: Record<string, string>;
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

  let metadata: Record<string, string> = {};
  let semantic = htmlToMarkdown(html, {
    plugins: {
      frontmatter: {
        onExtract: (fm) => {
          metadata = fm;
        }
      }
    }
  }).trim();

  // 2.1 Fallback metadata if not found in head
  if (!metadata.title) {
    const h1Match = semantic.match(/^# (.*)$/m);
    if (h1Match) {
      // Clean markdown from title (e.g. [text](url) -> text)
      metadata.title = h1Match[1].replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*`_]/g, '').trim();
    }
  }
  if (!metadata.description) {
    // Take first 150 chars of semantic (excluding title)
    const bodyOnly = semantic.replace(/^# .*$/m, '').trim();
    if (bodyOnly) {
      // Clean markdown from description
      const cleanBody = bodyOnly.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[#*`_]/g, '').trim();
      metadata.description = cleanBody.slice(0, 150).replace(/\n/g, ' ') + (cleanBody.length > 150 ? '...' : '');
    }
  }

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
    hasSensitiveInfo,
    metadata
  };
}

export { structuralPlugin as plugin } from './config.js';
export { mapToTokens } from './token-mapper.js';
export { Redactor, type RedactorOptions };
