/**
 * Atlas (tree) URL helpers — hybrid name + ID URLs.
 *
 * Format: /atlas/<slugified-name>-<id>
 * Example: /atlas/john-doe-42
 *
 * The name part is cosmetic / SEO-friendly; the numeric ID at the end
 * is what the app actually uses to fetch data.
 */

/**
 * Build a people profile URL from a member object.
 */
export function buildMemberUrl(member) {
  const id = member?.id ?? member;
  const name = member?.name ?? 'member';
  const slug = slugifyName(name);
  return `/people/${slug}-${id}`;
}



/**
 * Convert a member name into a URL-safe slug segment.
 * Keeps Unicode letters/numbers, collapses separators chars into hyphens.
 */
export function slugifyName(name) {
  if (!name) return 'member';
  return name
    .toLowerCase()
    // Replace spaces, underscores, and punctuation runs with a single hyphen
    .replace(/[\s_]+/g, '-')
    // Keep letters (Unicode), numbers, and hyphens
    .replace(/[^\p{L}\p{N}-]/gu, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    || 'member';
}

/**
 * Build a tree URL from a member object.
 */
export function buildTreeUrl(member) {
  const id = member?.id ?? member;
  const name = member?.name ?? 'member';
  const slug = slugifyName(name);
  return `/atlas/${slug}-${id}`;
}

/**
 * Build a family tree URL from a family object.
 */
export function buildFamilyTreeUrl(family) {
  const slug = family?.slug ?? family?.id;
  return `/families/${slug}/tree`;
}

/**
 * Build a public (shareable) family tree URL from a family object.
 */
export function buildPublicFamilyTreeUrl(family) {
  const slug = family?.slug ?? family?.id;
  return `/public/families/${slug}/tree`;
}

/**
 * Parse a hybrid URL slug back into its numeric ID.
 * Accepts both old numeric slugs ("1") and new hybrid slugs ("john-doe-1").
 */
export function parseHybridSlug(slug) {
  if (!slug) return null;
  // Match the trailing numeric ID: supports "1" or "john-doe-1"
  const match = String(slug).match(/(\d+)$/);
  if (match) return Number(match[1]);
  // Fallback for old-style numeric-only slugs
  const numeric = Number(slug);
  return Number.isNaN(numeric) ? null : numeric;
}

/**
 * Alias for parseHybridSlug, kept for tree URL callers.
 * @deprecated Use parseHybridSlug for any hybrid slug format.
 */
export const parseTreeSlug = parseHybridSlug;
