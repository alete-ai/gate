import { OpenRedaction, type OpenRedactionOptions, getPatternsByCategory } from 'openredaction';

export interface RedactorOptions {
  redactPii?: boolean;
  redactFinancials?: boolean;
  redactCredentials?: boolean;
  redactInfrastructure?: boolean;
  redactMedical?: boolean;
  customPlaceholders?: Record<string, string>;
}

/**
 * Sovereign wrapper for the PII Shield engine.
 * Adopts a "Narrative-First" strategy: Preserves names, dates, and locations
 * to maintain story coherence while redacting "Toxic Identifiers" (SSNs, Credit Cards, Secrets).
 */
export class Redactor {
  private engine: OpenRedaction;

  constructor(options: RedactorOptions = {}) {
    const patterns: string[] = [];
    
    // 1. Personal & Contact (excluding Names, Addresses, Dates)
    if (options.redactPii !== false) {
      patterns.push('EMAIL');
      patterns.push('PHONE_US', 'PHONE_UK', 'PHONE_INTERNATIONAL');
      patterns.push(...getPatternsByCategory('government').map(p => p.type));
    }

    // 2. Financial
    if (options.redactFinancials !== false) {
      patterns.push(...getPatternsByCategory('financial').map(p => p.type));
    }

    // 3. Credentials
    if (options.redactCredentials !== false) {
      patterns.push(...getPatternsByCategory('credentials').map(p => p.type));
    }

    // 4. Medical
    if (options.redactMedical !== false) {
      patterns.push(...getPatternsByCategory('healthcare').map(p => p.type));
    }

    // 5. Infrastructure
    if (options.redactInfrastructure !== false) {
      patterns.push(...getPatternsByCategory('network').map(p => p.type));
    }

    const engineOptions: OpenRedactionOptions = {
      patterns,
      // Narrative-First safety: Double-down on disabling entities
      includeNames: false,
      includeAddresses: false,
      
      redactionMode: 'placeholder',
      enableContextAnalysis: true,
      enableFalsePositiveFilter: true,
      falsePositiveThreshold: 0.7,
      deterministic: true,
    };

    this.engine = new OpenRedaction(engineOptions);
  }

  /**
   * Redacts sensitive information from the given text.
   */
  public async redact(text: string): Promise<string> {
    if (!text) return text;
    const result = await this.engine.detect(text);
    return result.redacted;
  }

  /**
   * Checks if the text contains any sensitive information without modifying it.
   */
  public async hasSensitiveInfo(text: string): Promise<boolean> {
    if (!text) return false;
    const result = await this.engine.detect(text);
    return result.detections.length > 0;
  }

  /**
   * Performs both detection and redaction in a single pass.
   */
  public async process(text: string): Promise<{ redacted: string, hasSensitiveInfo: boolean }> {
    if (!text) return { redacted: text, hasSensitiveInfo: false };
    const result = await this.engine.detect(text);
    return {
      redacted: result.redacted,
      hasSensitiveInfo: result.detections.length > 0
    };
  }
}
