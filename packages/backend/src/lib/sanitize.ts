// Matches HTML tags — requires tag name to start with a letter (won't match `< c >`)
const HTML_TAG_REGEX = /<\/?[a-zA-Z][^>]*>/g;

/**
 * Sanitize user input for plain text storage.
 *
 * Pipeline:
 * 1. Trim leading/trailing whitespace
 * 2. Collapse internal whitespace runs to single spaces
 * 3. Strip HTML tags (defense-in-depth — prevents injection if anything
 *    downstream ever renders as HTML)
 *
 * Note: We do NOT encode/decode HTML entities. The database stores the
 * user's actual text. React's default text rendering auto-escapes on
 * output, which is the correct XSS prevention layer.
 */
export function sanitize(input: string): string {
  // 1. Trim
  let result = input.trim();

  // 2. Collapse whitespace
  result = result.replace(/\s+/g, ' ');

  // 3. Strip HTML tags — loop until stable to prevent bypass via nested tags
  //    e.g. `<scr<script>ipt>` becomes `<script>` after one pass
  let prev: string;
  let iterations = 0;
  do {
    if (++iterations > 10) break;
    prev = result;
    result = result.replace(HTML_TAG_REGEX, '');
  } while (result !== prev);

  // Trim again in case tag stripping left leading/trailing spaces
  return result.trim();
}

/**
 * Validate sanitized description meets length requirements.
 * Returns null if valid, error message if invalid.
 */
export function validateDescription(sanitized: string): string | null {
  if (sanitized.length === 0) {
    return 'Description cannot be empty';
  }
  if (sanitized.length > 2000) {
    return 'Description cannot exceed 2000 characters';
  }
  return null;
}
