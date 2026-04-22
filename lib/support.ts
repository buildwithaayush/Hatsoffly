/** Public support domain — defaults to Hatsoffly for production-like local URLs. */
export function supportDomain(): string {
  return process.env.NEXT_PUBLIC_SUPPORT_DOMAIN ?? "hatsoffly.com";
}

export function supportEmail(): string {
  return `support@${supportDomain()}`;
}

export function supportMailto(subject?: string): string {
  const base = `mailto:${supportEmail()}`;
  if (!subject?.trim()) return base;
  return `${base}?subject=${encodeURIComponent(subject)}`;
}
