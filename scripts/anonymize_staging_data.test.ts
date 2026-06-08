import { describe, it, expect } from 'vitest';
import { redactPII } from './anonymize_staging_data.js';

describe('PII Anonymization Logic', () => {
  it('should redact email addresses', () => {
    const input = 'My email is test.user@example.com, send updates there.';
    const output = redactPII(input);
    expect(output).toContain('[EMAIL]');
    expect(output).not.toContain('test.user@example.com');
  });

  it('should redact UUIDs', () => {
    const input = 'Session ID is 123e4567-e89b-12d3-a456-426614174000.';
    const output = redactPII(input);
    expect(output).toContain('[UUID]');
    expect(output).not.toContain('123e4567-e89b-12d3-a456-426614174000');
  });

  it('should redact URLs', () => {
    const input = 'Check out http://google.com or https://sensitive-portal.com/login?token=abc.';
    const output = redactPII(input);
    expect(output).toContain('[URL]');
    expect(output).not.toContain('http://google.com');
    expect(output).not.toContain('https://sensitive-portal.com/login');
  });

  it('should redact founder names', () => {
    const input = 'Created by Stoyan Dimitrov.';
    const output = redactPII(input);
    expect(output).toContain('User');
    expect(output).toContain('Name');
    expect(output).not.toContain('Stoyan');
    expect(output).not.toContain('Dimitrov');
  });

  it('should redact IP addresses', () => {
    const input = 'Client connected from 192.168.1.1.';
    const output = redactPII(input);
    expect(output).toContain('[IP_ADDRESS]');
    expect(output).not.toContain('192.168.1.1');
  });

  it('should redact phone numbers', () => {
    const input = 'Call me at 123-456-7890 or +1 987.654.3210.';
    const output = redactPII(input);
    expect(output).toContain('[PHONE]');
    expect(output).not.toContain('123-456-7890');
    expect(output).not.toContain('987.654.3210');
  });
});
