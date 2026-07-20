/**
 * Determine the living status of a member based on dates.
 * Returns 'deceased' if a death date is present,
 * 'living' if only a birth date is present,
 * and 'unknown' if neither is present.
 */
export function getLivingStatus(member) {
  if (!member) return 'unknown';
  if (member.dod) return 'deceased';
  if (member.dob) return 'living';
  return 'unknown';
}
