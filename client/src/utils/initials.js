/**
 * Get the display initials for a member.
 * If the member has a custom `initials` value, use it.
 * Otherwise fall back to the first letter of each word in the member's name.
 */
export function getMemberInitials(member) {
  if (!member) return '?';
  if (member.initials?.trim?.()) return member.initials.trim();
  if (!member.name) return '?';
  return member.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
