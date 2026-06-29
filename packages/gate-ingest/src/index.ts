import { htmlToMarkdown, withMinimalPreset } from '@mdream/js';
import { structuralPlugin } from './config.js';
import { mapToTokens } from './token-mapper.js';

export enum GateLabel {
  DEEP_WORK = 'deep_work',
  INFORMATIONAL = 'informational',
  COMMUNICATION = 'communication',
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

  const layoutNoiseSelectors = [
    // Core structural layout tags
    'header',
    'footer',
    'nav',
    'aside',
    'form[action*="consent.youtube.com"]',
    'c-wiz[class*="VfPpkd"]',
    'g-menu',

    // Role-based elements
    '[role="banner"]',
    '[role="navigation"]',
    '[role="contentinfo"]',
    '[role="complementary"]',
    '[aria-modal="true"]',
    '[data-text-ad]',

    // Class/attribute wildcard selectors (General noise)
    '[class*="header"]',
    '[class*="footer"]',
    '[class*="nav"]',
    '[class*="menu"]',
    '[class*="sidebar"]',
    '[class*="share"]',
    '[class*="ad"]',
    '[class*="social"]',
    '[class*="cookie"]',
    '[class*="banner"]',
    '[class*="modal"]',
    '[class*="sponsor"]',
    '[class*="gb_"]',

    // Global layout IDs and class names
    '#appbar',
    '#top_nav',
    '#foot',
    '#rhs',
    '#tads',
    '#bottomads',
    '.fbar',
    '.global-nav',
    '.global-footer',
    '.right-rail',
    '.left-rail',
    '.social-actions-bar',
    '.cookie-consent-banner',
    '.sign-in-modal',
    '.msg-overlay-container',

    // Google News / Google Search specific classes
    '.tQj5Y',
    '.gb_Na',
    '.gb_1e',
    '.Ax4B8',
    '.yNVtPc',
    '.SSPGKf',
    '.bwOy4d',
    '.iN1nBb',
    '.mN1ivc',
    '.jK4DKf',
    '.lG53Ec',
    '.W8yrY',
    '.XlKvRb',

    // YouTube specific tags/selectors
    'ytd-masthead',
    '#guide',
    'app-drawer',
    'ytd-mini-guide-renderer',
    '#secondary',
    'ytd-watch-next-secondary-results-renderer',
    'ytd-popup-container',
    'tp-yt-paper-dialog',
    'ytd-consent-bump-v2-renderer',
    'ytd-add-to-playlist-renderer',
    'ytd-unified-share-panel-renderer',
    '#player-ads',
    '.ytp-ad-module',
    'ytd-ad-slot-renderer',
    'ytd-promoted-sparkles-text-search-renderer',
    'ytd-in-feed-ad-layout-renderer',
    'ytd-feed-filter-chip-bar-renderer',
    'yt-upsell-dialog-renderer',
    '#chips',
    'ytd-menu-renderer',
    'ytd-sponsorships-button',

    // ZeroHedge specific classes/layout structures
    '.Header_siteHeader__TYYsX',
    '.Footer_container__pP_Gj',
    '.sidebar-left',
    '.sidebar-right',
    '.SidebarLeft_container__5EyEw',
    '.SidebarRight_container__mTgfh',
    '.ArticleFooter_footer__K4v3K',
    '.leaderboard-container',
    '.leaderboard',
    '.adv',
    '.banner',
    '.bottom-banner-container',
    '.sponsored',
    '.SimplePaginator_paginator__NsxDa',
    '.DebateButton_promoButtonSection__C1zdK',
    '.ZeroHedgeReads_container__dQSbV',
    '.MMWidgetFeb12_container__3UvjX',
    '.BlockSearch_container__TSPdm',
    '.TheMarketEarHomePageSidebar_container__M1KBo',
    '.TopPosts_posts__f0jV5',
  ];

  // 1. Generate Structural Markdown using the custom plugin
  const structuralMd = htmlToMarkdown(html, {
    plugins: {
      filter: {
        exclude: layoutNoiseSelectors,
        processChildren: false,
      },
    },
    hooks: [structuralPlugin],
  });

  let metadata: Record<string, string> = {};
  let semantic = htmlToMarkdown(
    html,
    withMinimalPreset({
      plugins: {
        isolateMain: false,
        filter: {
          exclude: [
            ...layoutNoiseSelectors,
            'form',
            'fieldset',
            'object',
            'embed',
            'iframe',
            'input',
            'textarea',
            'select',
            'button',
          ],
          processChildren: false,
        },
        tagOverrides: {
          a: { enter: '', exit: '' },
          img: { enter: '', exit: '' },
          svg: { enter: '', exit: '' },
          canvas: { enter: '', exit: '' },
        },
        frontmatter: {
          onExtract: (fm) => {
            metadata = fm;
          },
        },
      },
    })
  ).trim();

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
