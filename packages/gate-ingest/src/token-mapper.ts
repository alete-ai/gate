/**
 * Maps structural Markdown/HTML artifacts to explicit alphanumeric tokens.
 * This prevents Apple's NLTokenizer from stripping critical punctuation.
 */
export function mapToTokens(text: string): string {
  return text
    // Structural Tags
    .replace(/\[FORM_START\]/g, 'STRUCT_FORM_START')
    .replace(/\[FORM_END\]/g, 'STRUCT_FORM_END')
    .replace(/\[SELECT_START\]/g, 'STRUCT_SELECT_START')
    .replace(/\[SELECT_END\]/g, 'STRUCT_SELECT_END')
    .replace(/\[NAV_START\]/g, 'STRUCT_NAV_START')
    .replace(/\[NAV_END\]/g, 'STRUCT_NAV_END')
    
    // Complex Components (Capturing type/name context)
    .replace(/\[INPUT:([^:]+):([^:]*):([^\]]*)\]/g, (_, type, name, placeholder) => {
      return `STRUCT_INPUT_${type.toUpperCase()} ${name.toUpperCase()} ${placeholder.toUpperCase()}`;
    })
    .replace(/\[BUTTON:([^\]]*)\]/g, (_, content) => {
      return `STRUCT_BUTTON ${content.toUpperCase()}`;
    })
    .replace(/\[LINK:([^\]]*)\]/g, 'STRUCT_LINK_ELEMENT')
    
    // Headers
    .replace(/^# (.*$)/gm, 'SYS_HEADER_1 $1')
    .replace(/^## (.*$)/gm, 'SYS_HEADER_2 $1')
    .replace(/^### (.*$)/gm, 'SYS_HEADER_3 $1')
    
    // Clean up remaining punctuation that might confuse MaxEnt
    .replace(/[#*`_\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
