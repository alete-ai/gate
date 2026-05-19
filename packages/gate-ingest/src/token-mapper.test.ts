import { mapToTokens } from './token-mapper'
import { describe, expect, it } from 'vitest'

describe('token-mapper', () => {
  it('should map [FORM_START] to structFormStart', () => {
    const input = '\n[FORM_START]\n'
    expect(mapToTokens(input)).toContain('structFormStart')
  })

  it('should map [LINK:url] to structLinkElement', () => {
    const input = '[LINK:https://example.com]Click me'
    expect(mapToTokens(input)).toContain('structLinkElement')
  })

  it('should map [INPUT:type:name:placeholder] to structInputType', () => {
    const input = '[INPUT:text:username:Enter name]'
    expect(mapToTokens(input)).toContain('structInputTextusername')
  })

  it('should map headers to sysHeader', () => {
    const input = '# Main Title\n## Sub Title'
    const result = mapToTokens(input)
    expect(result).toContain('sysHeader1 MainTitle')
    expect(result).toContain('sysHeader2 SubTitle')
  })

  it('should strip natural language noise', () => {
    const input = 'this is some normal text structLinkElement and more text'
    const result = mapToTokens(input)
    expect(result).toBe('structLinkElement')
  })
})
