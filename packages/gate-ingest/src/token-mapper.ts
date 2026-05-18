/**
 * Maps structural Markdown/HTML artifacts to explicit alphanumeric tokens.
 * This prevents Apple's NLTokenizer from stripping critical punctuation.
 * We use camelCase because NLTokenizer splits snake_case (STRUCT_FORM_START -> STRUCT, FORM, START).
 */
export function mapToTokens(text: string): string {
  return text
    // Structural Tags
    .replace(/\[FORM_START\]/g, 'structFormStart')
    .replace(/\[FORM_END\]/g, 'structFormEnd')
    .replace(/\[SELECT_START\]/g, 'structSelectStart')
    .replace(/\[SELECT_END\]/g, 'structSelectEnd')
    .replace(/\[NAV_START\]/g, 'structNavStart')
    .replace(/\[NAV_END\]/g, 'structNavEnd')
    
    // Complex Components (Capturing type/name context)
    .replace(/\[INPUT:([^:]+):([^:]*):([^\]]*)\]/g, (_, type, name, placeholder) => {
      const cleanType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
      const cleanName = name.replace(/[^a-zA-Z0-9]/g, '').split(/[-_ ]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      const cleanPlaceholder = placeholder.replace(/[^a-zA-Z0-9]/g, '').split(/[-_ ]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      return `structInput${cleanType} ${cleanName} ${cleanPlaceholder}`;
    })
    .replace(/\[BUTTON:([^\]]*)\]/g, (_, content) => {
      const cleanContent = content.replace(/[^a-zA-Z0-9]/g, '').split(/[-_ ]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      return `structButton ${cleanContent}`;
    })
    .replace(/\[LINK:([^\]]*)\]/g, 'structLinkElement')
    
    // Headers
    .replace(/^# (.*$)/gm, (_, content) => {
      const clean = content.replace(/[^a-zA-Z0-9]/g, '').split(/[-_ ]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      return `sysHeader1 ${clean}`;
    })
    .replace(/^## (.*$)/gm, (_, content) => {
      const clean = content.replace(/[^a-zA-Z0-9]/g, '').split(/[-_ ]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      return `sysHeader2 ${clean}`;
    })
    .replace(/^### (.*$)/gm, (_, content) => {
      const clean = content.replace(/[^a-zA-Z0-9]/g, '').split(/[-_ ]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      return `sysHeader3 ${clean}`;
    })

    // Labels
    .replace(/LABEL\[([^\]]*)\]/g, (_, content) => {
      const clean = content.replace(/[^a-zA-Z0-9]/g, '').split(/[-_ ]/).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
      return `structLabel ${clean}`;
    })
    
    // Clean up remaining punctuation that might confuse MaxEnt
    .replace(/[#*`_\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
