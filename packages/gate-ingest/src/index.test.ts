import { describe, it, expect } from 'vitest';
import { processHtml } from './index.js';

describe('gate-ingest pipeline', () => {
  it('processes a login form into structural tokens', async () => {
    const html = `
      <html>
        <body>
          <nav>
            <a href="/home">Home</a>
          </nav>
          <form action="/login" method="POST">
            <label for="username">Username:</label>
            <input type="text" name="username" id="username" placeholder="Enter username">
            <label for="password">Password:</label>
            <input type="password" name="password" id="password">
            <button type="submit">Login</button>
          </form>
        </body>
      </html>
    `;

    const { structural, semantic } = await processHtml(html);

    // Check structural tokens
    expect(structural).toContain('structNavStart');
    expect(structural).toContain('structLinkElement');
    expect(structural).toContain('structNavEnd');
    expect(structural).toContain('structFormStart');
    expect(structural).toContain('structLabel Username');
    expect(structural).toContain('structInputTextusername');
    expect(structural).toContain('structLabel Password');
    expect(structural).toContain('structButtonLogin');
    expect(structural).toContain('structFormEnd');

    // Check semantic markdown - Form elements are filtered by withMinimalPreset
    // so we don't expect them in the semantic output, only in structural.
    expect(semantic).not.toContain('STRUCT_FORM_START');
  });

  it('processes a news article into clean markdown', async () => {
    const html = `
      <html>
        <body>
          <h1>Breaking News</h1>
          <p>This is a <strong>major</strong> story about privacy.</p>
          <div class="sidebar">
            <a href="/related">Related article</a>
          </div>
        </body>
      </html>
    `;

    const { structural, semantic } = await processHtml(html);

    // Check structural tokens
    expect(structural).toContain('sysHeader1 BreakingNews');
    
    // Check semantic markdown
    expect(semantic).toContain('# Breaking News');
    expect(semantic).toContain('This is a **major** story about privacy.');
  });

  it('extracts page metadata', async () => {
    const html = `
      <html>
        <head>
          <title>Privacy Policy</title>
          <meta name="description" content="Our commitment to your data.">
        </head>
        <body>
          <p>We respect your privacy.</p>
        </body>
      </html>
    `;

    const { metadata } = await processHtml(html);

    expect(metadata).toBeDefined();
    expect(metadata?.title).toBe('Privacy Policy');
    expect(metadata?.description).toBe('Our commitment to your data.');
  });

  it('respects the semantic token cap', async () => {
    // Generate a long text with varied content
    const words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew'];
    const longText = Array(100).fill(0).map((_, i) => words[i % words.length]).join(' ');
    const html = `<html><body><main><p>${longText}</p></main></body></html>`;

    // 1.33 * 100 = 133 tokens. Cap at 50 tokens.
    const { semantic, isTruncated } = await processHtml(html, { semanticTokenCap: 50 });

    expect(isTruncated).toBe(true);
    expect(semantic).toContain('... [Content truncated due to token cap]');
    // 50 / 1.33 = 37.5 words
    const wordCount = semantic.split('...')[0].trim().split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(40);
  });
});

