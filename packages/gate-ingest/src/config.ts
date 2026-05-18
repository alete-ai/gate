import { createPlugin } from '@mdream/js/plugins';

/**
 * Custom mdream plugin to retain structural artifacts.
 * This preserves the "structural footprint" of sensitive portals
 * by injecting intermediate markers with attribute context.
 */
export const structuralPlugin = createPlugin({
  onNodeEnter(element) {
    const tag = element.name;
    const attrs = element.attributes || {};

    switch (tag) {
      case 'form':
        return '\n[FORM_START]\n';
      case 'input': {
        const type = attrs.type || 'text';
        const name = attrs.name || attrs.id || '';
        const placeholder = attrs.placeholder || '';
        return `[INPUT:${type}:${name}:${placeholder}]`;
      }
      case 'select':
        return '[SELECT_START]';
      case 'option':
        return ' (OPTION:';
      case 'button':
        return '[BUTTON:';
      case 'label':
        return 'LABEL[';
      case 'nav':
        return '\n[NAV_START]\n';
      case 'a': {
        const href = attrs.href || '#';
        return `[LINK:${href}]`;
      }
      default:
        return undefined;
    }
  },

  onNodeExit(element) {
    const tag = element.name;
    switch (tag) {
      case 'form':
        return '\n[FORM_END]\n';
      case 'select':
        return '[SELECT_END]';
      case 'option':
        return ') ';
      case 'button':
        return ']';
      case 'label':
        return ']';
      case 'nav':
        return '\n[NAV_END]\n';
      default:
        return undefined;
    }
  }
});
