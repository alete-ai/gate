import { processHtml } from './dist/index.browser.js';

try {
  console.log('Fetching Mashable article...');
  const html = await fetch('https://mashable.com/tech/wwdc-2026-apple-ceo-tim-cook-john-ternus').then(r => r.text());
  console.log('Running processHtml...');
  const result = await processHtml(html);
  console.log('Result:', {
    semanticLength: result.semantic.length,
    semanticPreview: result.semantic.slice(0, 500),
    metadata: result.metadata,
    tokensLength: result.structural.length,
    tokensPreview: result.structural.slice(0, 500),
  });
} catch (err) {
  console.error('Error:', err);
}
