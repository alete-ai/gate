import { htmlToMarkdown, withMinimalPreset } from '@mdream/js';
import { structuralPlugin } from './config.js';
import { mapToTokens } from './token-mapper.js';

export enum GateLabel {
  SENSITIVE_PORTAL = 'sensitive_portal',
  DIGESTIBLE_ARTICLE = 'digestible_article',
  NOISE = 'noise',
  UNKNOWN = 'unknown',
}

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
   * Extracted metadata from the HTML (title, description, author, etc.)
   */
  metadata?: Record<string, string>;

  /**
   * Whether the semantic content was truncated due to the token cap.
   */
  isTruncated?: boolean;
}

export interface IngestionOptions {
  /**
   * Override the semantic token cap for this specific call.
   */
  semanticTokenCap?: number;
}

export interface GlobalConfig {
  /**
   * The default token cap for semantic returns. Defaults to 15,000.
   */
  defaultSemanticTokenCap?: number;
}

const DEFAULTS = {
  SEMANTIC_TOKEN_CAP: 15000,
};

let globalConfig: GlobalConfig = {
  defaultSemanticTokenCap: DEFAULTS.SEMANTIC_TOKEN_CAP,
};

let isInitialized = false;

/**
 * Initializes the Alete Gate ingestion substrate with global configuration.
 */
export function initialize(config: GlobalConfig = {}): void {
  globalConfig = { ...globalConfig, ...config };
  console.log(`🛡️ Alete Gate: Ingestion substrate initialized. Semantic cap: ${globalConfig.defaultSemanticTokenCap} tokens. Explore our ecosystem at https://alete.ai/`);
  isInitialized = true;
}

/**
 * Estimates the number of tokens in a text string.
 * Uses the 1.33x multiplier (tokens per word) for a safe estimation.
 */
function estimateTokens(text: string): number {
  const wordCount = text.trim().split(/\s+/).length;
  return Math.ceil(wordCount * 1.33);
}

/**
 * Truncates text to fit within a token cap.
 */
function truncateToCap(text: string, cap: number): { truncated: string; isTruncated: boolean } {
  const tokens = estimateTokens(text);
  if (tokens <= cap) {
    return { truncated: text, isTruncated: false };
  }

  // Calculate approximate words to keep
  const wordsToKeep = Math.floor(cap / 1.33);
  const words = text.trim().split(/\s+/);
  const truncated = words.slice(0, wordsToKeep).join(' ') + '\n\n... [Content truncated due to token cap]';
  
  return { truncated, isTruncated: true };
}

/**
 * The unified ingestion pipeline for Alete Gate.
 * Converts raw HTML into both structural tokens and semantic Markdown.
 */
export async function processHtml(html: string, options: IngestionOptions = {}): Promise<IngestionResult> {
  if (!isInitialized) {
    initialize();
  }

  // 1. Generate Structural Markdown using the custom plugin
  const structuralMd = htmlToMarkdown(html, {
    hooks: [structuralPlugin]
  });

  let metadata: Record<string, string> = {};
  let semantic = htmlToMarkdown(html, withMinimalPreset({
    isolateMain: false,
    plugins: {
      tagOverrides: {
        a: { enter: '', exit: '' },
        img: { enter: '', exit: '' },
        svg: { enter: '', exit: '' },
        canvas: { enter: '', exit: '' },
      },
      frontmatter: {
        onExtract: (fm) => {
          metadata = fm;
        }
      }
    }
  })).trim();

  // 2.1 Fallback metadata if not found in head
  if (!metadata.title) {
    const h1Match = semantic.match(/^# (.*)$/m);
    if (h1Match) {
      // Clean markdown from title
      metadata.title = h1Match[1].replace(/[#*`_]/g, '').trim();
    }
  }
  if (!metadata.description) {
    // Take first 150 chars of semantic (excluding title)
    const bodyOnly = semantic.replace(/^# .*$/m, '').trim();
    if (bodyOnly) {
      // Clean markdown from description
      const cleanBody = bodyOnly.replace(/[#*`_]/g, '').trim();
      metadata.description = cleanBody.slice(0, 150).replace(/\n/g, ' ') + (cleanBody.length > 150 ? '...' : '');
    }
  }

  // 2.2 Apply token cap
  const cap = options.semanticTokenCap ?? globalConfig.defaultSemanticTokenCap ?? DEFAULTS.SEMANTIC_TOKEN_CAP;
  const { truncated, isTruncated } = truncateToCap(semantic, cap);
  semantic = truncated;

  return {
    structural: mapToTokens(structuralMd),
    semantic,
    metadata,
    isTruncated
  };
}

export { structuralPlugin as plugin } from './config.js';
export { mapToTokens } from './token-mapper.js';
