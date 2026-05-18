import { htmlToMarkdown } from '@mdream/js';
import { STRUCTURAL_TAG_OVERRIDES } from './config.js';
import { mapToTokens } from './token-mapper.js';

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
}

/**
 * The unified ingestion pipeline for Alete Gate.
 * Converts raw HTML into both structural tokens and semantic Markdown.
 */
export function processHtml(html: string): IngestionResult {
  // 1. Generate Structural Markdown
  const structuralMd = htmlToMarkdown(html, {
    plugins: {
      tagOverrides: STRUCTURAL_TAG_OVERRIDES
    }
  });

  // 2. Generate Semantic Markdown (Clean default)
  const semantic = htmlToMarkdown(html);

  return {
    structural: mapToTokens(structuralMd),
    semantic: semantic.trim()
  };
}

export { STRUCTURAL_TAG_OVERRIDES as TAG_OVERRIDES } from './config.js';
export { mapToTokens } from './token-mapper.js';
