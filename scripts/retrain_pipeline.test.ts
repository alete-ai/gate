import { describe, it, expect } from 'vitest';
import { normalizeUrl, normalizeMarkdown, generateContentHash } from './retrain_pipeline.js';

describe('Retrain Pipeline Helper Functions', () => {
  it('should normalize URLs by lowercasing and stripping tracking query params', () => {
    const input = 'HTTPS://www.Example.com/Path/To/Page?utm_source=test&fbclid=123&keep=true';
    const output = normalizeUrl(input);
    // Lowercase host, keep search params not in tracking list, strip tracking params, no trailing slash
    expect(output).toBe('https://www.example.com/Path/To/Page?keep=true');
  });

  it('should normalize markdown by stripping comments and standardizing spacing', () => {
    const input = '  Line 1  \r\n<!-- comment -->\n\n  Line 2  ';
    const output = normalizeMarkdown(input);
    expect(output).toBe('Line 1\nLine 2');
  });

  it('should generate content hash from url and markdown deterministically', () => {
    const url = 'https://example.com';
    const markdown = 'hello world';
    const hash1 = generateContentHash(url, markdown);
    const hash2 = generateContentHash(url, markdown);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 is 64 hex chars
  });
});
