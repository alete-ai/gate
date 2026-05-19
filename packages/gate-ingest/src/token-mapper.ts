/**
 * Maps structural Markdown/HTML artifacts to explicit alphanumeric tokens.
 * This prevents Apple's NLTokenizer from stripping critical punctuation.
 * We use camelCase because NLTokenizer splits snake_case (STRUCT_FORM_START -> STRUCT, FORM, START).
 */
export function mapToTokens(text: string): string {
  // 1. Process explicit markers first
  let processed = text
    .replace(/\[FORM_START\]/g, 'structFormStart')
    .replace(/\[FORM_END\]/g, 'structFormEnd')
    .replace(/\[SELECT_START\]/g, 'structSelectStart')
    .replace(/\[SELECT_END\]/g, 'structSelectEnd')
    .replace(/\[NAV_START\]/g, 'structNavStart')
    .replace(/\[NAV_END\]/g, 'structNavEnd');

  // 2. Process Standard Markdown artifacts into clean tokens
  processed = processed
    // Links: [text](url) -> structLinkElement {text}
    .replace(/\[([^\]]*)\]\(([^)]+)\)/g, (_, content) => {
      const clean = content.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      return `structLinkElement${clean}`;
    })
    // Images: ![alt](url) -> structImage {alt}
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt) => {
      const clean = alt.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      return `structImage${clean}`;
    });

  // 3. Process Headers into clean tokens
  processed = processed
    .replace(/^# (.*$)/gm, (_, content) => {
      // Remove any leftover markdown links or punctuation from header content
      const clean = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
      return `sysHeader1${clean}`;
    })
    .replace(/^## (.*$)/gm, (_, content) => {
      const clean = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
      return `sysHeader2${clean}`;
    })
    .replace(/^### (.*$)/gm, (_, content) => {
      const clean = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
      return `sysHeader3${clean}`;
    });

  // 4. Final cleaning: remove URLs and punctuation
  processed = processed
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/[#*`_\[\]()]/g, ' '); // Remove remaining markdown chars

  // 5. Aggressively strip remaining natural language noise
  return processed
    .split(/\s+/)
    .filter(word => {
      return word.startsWith('struct') || 
             word.startsWith('sys') || 
             (/^[A-Z]/.test(word) && word.length > 2); // Keep capitalized words (titles, labels) > 2 chars
    })
    .join(' ')
    .trim();
}
