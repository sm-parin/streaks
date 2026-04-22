/** Returns a stable display name. Falls back to "Guest{5-digit}" derived from the user's UUID. */
export function getDisplayName(user: { username?: string; id: string }): string {
  if (user.username?.trim()) return user.username.trim();
  const hex = user.id.replace(/-/g, "").slice(-8);
  const num = (parseInt(hex, 16) % 90000) + 10000; // always 10000-99999
  return `Guest${num}`;
}

export function getInitials(displayName: string): string {
  return displayName.slice(0, 2).toUpperCase();
}
