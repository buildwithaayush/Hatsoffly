const DISPOSABLE = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "yopmail.com",
  "tempmail.com",
  "10minutemail.com",
  "trashmail.com",
]);

export function isDisposableEmail(domain: string): boolean {
  return DISPOSABLE.has(domain.toLowerCase());
}
