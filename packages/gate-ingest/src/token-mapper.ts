/**
 * Maps structural Markdown/HTML artifacts to explicit alphanumeric tokens.
 * This prevents Apple's NLTokenizer from stripping critical punctuation.
 * We use camelCase because NLTokenizer splits snake_case (STRUCT_FORM_START -> STRUCT, FORM, START).
 */
export function mapToTokens(text: string, keepNaturalLanguage: boolean = false): string {
  // 1. Process explicit markers from structuralPlugin
  // We handle potential escaping from mdream
  let processed = text
    .replace(/\\?\[FORM_START\\?\]/g, 'structFormStart')
    .replace(/\\?\[FORM_END\\?\]/g, 'structFormEnd')
    .replace(/\\?\[SELECT_START\\?\]/g, 'structSelectStart')
    .replace(/\\?\[SELECT_END\\?\]/g, 'structSelectEnd')
    .replace(/\\?\[NAV_START\\?\]/g, 'structNavStart')
    .replace(/\\?\[NAV_END\\?\]/g, 'structNavEnd');

  // 1.1 Process Label marker
  processed = processed.replace(/LABEL\\?\[/g, 'structLabel ');

  // 2. Process attribute-based markers
  processed = processed
    // Inputs: [INPUT:type:name:placeholder] -> structInputType {type} {name}
    .replace(/\\?\[INPUT:([^:]+):([^:]*):([^\\\]]*)\\?\]/g, (_, type, name) => {
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      return `structInput${type.charAt(0).toUpperCase() + type.slice(1)}${cleanName}`;
    })
    // Links: [LINK:url] -> structLink
    .replace(/\\?\[LINK:[^\\\]]+\\?\]/g, () => 'structLinkElement')
    // Buttons: [BUTTON:text] -> structButton {text}
    .replace(/\\?\[BUTTON:([^\\\]]+)\\?\]/g, (_, text) => {
      const clean = text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
      return `structButton${clean}`;
    });

  // 3. Process Standard Markdown artifacts (if any remain) into clean tokens
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

  // 4. Process Headers into clean tokens
  processed = processed
    .replace(/^# (.*$)/gm, (_, content) => {
      const clean = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
      return `sysHeader1 ${clean}`;
    })
    .replace(/^## (.*$)/gm, (_, content) => {
      const clean = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
      return `sysHeader2 ${clean}`;
    })
    .replace(/^### (.*$)/gm, (_, content) => {
      const clean = content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[^a-zA-Z0-9]/g, '').slice(0, 30);
      return `sysHeader3 ${clean}`;
    });

  // 5. Final cleaning: remove URLs and punctuation (including colons now)
  processed = processed
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/[#*`_\[\]():]/g, ' '); // Remove remaining markdown chars + colons

  // 6. Aggressively strip remaining natural language noise unless keepNaturalLanguage is true
  return processed
    .split(/\s+/)
    .filter(word => {
      if (keepNaturalLanguage) {
        return word.length > 0;
      }
      return word.startsWith('struct') || 
             word.startsWith('sys') || 
             (/^[A-Z]/.test(word) && word.length > 2); // Keep capitalized words (titles, labels) > 2 chars
    })
    .join(' ')
    .trim();
}
