/** First name for templates and salutations. */
export function firstNameFromFull(name: string): string {
  const t = name.trim().split(/\s+/)[0];
  return t || name.trim() || "there";
}
