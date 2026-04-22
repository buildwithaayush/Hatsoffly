import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TemplateVoice } from "@prisma/client";

export type TemplateVariant = "location_only" | "with_provider";

const VERSION = "v1";

export function templatePath(voice: TemplateVoice, variant: TemplateVariant): string {
  return join(process.cwd(), "config", "templates", VERSION, `${voice}.${variant}.txt`);
}

export function loadTemplate(voice: TemplateVoice, variant: TemplateVariant): string {
  const p = templatePath(voice, variant);
  return readFileSync(p, "utf-8").trim();
}

export function interpolateTestSms(opts: {
  voice: TemplateVoice;
  variant: TemplateVariant;
  custFirst: string;
  bizName: string;
  provFirst?: string;
  shortLink: string;
}): string {
  let raw = loadTemplate(opts.voice, opts.variant);
  raw = raw
    .replace(/\{cust_first\}/g, opts.custFirst || "there")
    .replace(/\{biz_name\}/g, truncate(opts.bizName, 30))
    .replace(/\{prov_first\}/g, opts.provFirst ?? "your technician")
    .replace(/\{short_link\}/g, opts.shortLink);
  return raw;
}

function truncate(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, max - 1) + "…";
}
