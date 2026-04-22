import { randomBytes } from "node:crypto";

export function newPendingVerificationToken(): string {
  return `pvt_${randomBytes(18).toString("hex")}`;
}

export function newPreviewToken(): string {
  return randomBytes(16).toString("hex");
}
