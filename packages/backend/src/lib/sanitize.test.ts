import { describe, it, expect } from 'vitest';
import { sanitize, validateDescription } from './sanitize.js';

describe('sanitize', () => {
  it('trims leading and trailing whitespace', () => {
    expect(sanitize('  hello  ')).toBe('hello');
  });

  it('collapses internal whitespace to single spaces', () => {
    expect(sanitize('hello   world')).toBe('hello world');
  });

  it('collapses mixed whitespace (tabs, newlines)', () => {
    expect(sanitize('hello\t\n  world')).toBe('hello world');
  });

  it('strips HTML tags', () => {
    expect(sanitize('<b>hello</b>')).toBe('hello');
  });

  it('strips nested HTML tags', () => {
    expect(sanitize('<div><p>hello</p></div>')).toBe('hello');
  });

  it('strips script tags', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('strips self-closing tags', () => {
    expect(sanitize('hello<br/>world')).toBe('helloworld');
  });

  it('preserves literal angle brackets that are not tags', () => {
    // < c > has a space after <, so it's not a valid tag
    expect(sanitize('a & b < c > d')).toBe('a & b < c > d');
  });

  it('preserves ampersands as-is (React handles output escaping)', () => {
    expect(sanitize('Tom & Jerry')).toBe('Tom & Jerry');
  });

  it('preserves quotes as-is', () => {
    expect(sanitize('say "hello" & \'goodbye\'')).toBe('say "hello" & \'goodbye\'');
  });

  it('preserves pre-encoded HTML entities as-is', () => {
    // &amp; is stored as literal text — React renders it correctly
    expect(sanitize('&amp;')).toBe('&amp;');
  });

  it('preserves &lt; and &gt; as literal text', () => {
    expect(sanitize('&lt;b&gt;')).toBe('&lt;b&gt;');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(sanitize('   ')).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitize('')).toBe('');
  });

  it('preserves normal text unchanged', () => {
    expect(sanitize('Buy groceries')).toBe('Buy groceries');
  });

  it('handles multi-byte UTF-8 characters', () => {
    expect(sanitize('Todo: 日本語テスト 🎉')).toBe('Todo: 日本語テスト 🎉');
  });

  it('handles long text without modification', () => {
    const long = 'a'.repeat(2000);
    expect(sanitize(long)).toBe(long);
  });

  it('trims whitespace left by tag stripping', () => {
    expect(sanitize('  <b>hello</b>  ')).toBe('hello');
  });

  it('handles tags with attributes', () => {
    expect(sanitize('<a href="http://evil.com">click me</a>')).toBe('click me');
  });

  it('strips nested/interleaved tags that bypass single-pass regex', () => {
    // After first pass, `<<script>script>` becomes `<script>` which must be caught
    expect(sanitize('<<script>script>alert(1)<</script>/script>')).toBe('alert(1)');
  });

  it('strips tags reconstructed from nested fragments', () => {
    // `<scr<script>ipt>` first pass eats `<scr<script>` as one match, leaving `ipt>alert(1)`
    // The loop ensures no new tags form from the remnants
    expect(sanitize('<scr<script>ipt>alert(1)</script>')).toBe('ipt>alert(1)');
  });

  it('strips img tag with onerror attribute', () => {
    expect(sanitize('<img onerror="alert(1)">')).toBe('');
  });
});

describe('validateDescription', () => {
  it('returns null for valid description', () => {
    expect(validateDescription('hello')).toBeNull();
  });

  it('returns error for empty string', () => {
    expect(validateDescription('')).toBe('Description cannot be empty');
  });

  it('returns error for too-long description', () => {
    expect(validateDescription('a'.repeat(2001))).toBe('Description cannot exceed 2000 characters');
  });

  it('returns null for exactly 2000 characters', () => {
    expect(validateDescription('a'.repeat(2000))).toBeNull();
  });

  it('returns null for exactly 1 character', () => {
    expect(validateDescription('a')).toBeNull();
  });
});
