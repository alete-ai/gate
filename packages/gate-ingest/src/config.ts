/**
 * Custom tag overrides for @mdream/js to retain structural HTML tags.
 * This preserves the "structural footprint" of sensitive portals.
 */
export const STRUCTURAL_TAG_OVERRIDES: any = {
  'form': {
    enter: '\n[FORM_START]\n',
    exit: '\n[FORM_END]\n',
    spacing: [2, 2],
  },
  'input': (element: any) => {
    const type = element.attributes.type || 'text';
    const name = element.attributes.name || '';
    const placeholder = element.attributes.placeholder || '';
    return `[INPUT:${type}:${name}:${placeholder}]`;
  },
  'select': {
    enter: '[SELECT_START]',
    exit: '[SELECT_END]',
  },
  'option': {
    enter: ' (OPTION:',
    exit: ') ',
  },
  'button': {
    enter: '[BUTTON:',
    exit: ']',
  },
  'label': {
    enter: 'LABEL[',
    exit: ']',
  },
  'nav': {
    enter: '\n[NAV_START]\n',
    exit: '\n[NAV_END]\n',
    spacing: [2, 2],
  },
  'a': (element: any) => {
    const href = element.attributes.href || '#';
    return `[LINK:${href}]`;
  }
};
