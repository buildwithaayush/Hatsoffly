/** Human-readable labels for dashboard / API storage keys. */

const TOOL: Record<string, string> = {
  quickbooks: "QuickBooks",
  jobber: "Jobber",
  square: "Square",
  housecall: "Housecall Pro",
  other: "Other",
};

const TRIGGER: Record<string, string> = {
  payment: "Payment received",
  job: "Job completed",
  appointment: "Appointment finished",
  other_trigger: "Custom",
};

const SETUP: Record<string, string> = {
  self_serve: "Self-serve (in app)",
  concierge: "Hatsoffly concierge",
};

export function formatActivationTool(
  tool: string | null | undefined,
  other: string | null | undefined,
): string {
  if (!tool) return "—";
  if (tool === "other" && other?.trim()) return other.trim();
  return TOOL[tool] ?? tool;
}

export function formatActivationTrigger(
  trigger: string | null | undefined,
  other: string | null | undefined,
): string {
  if (!trigger) return "—";
  if (trigger === "other_trigger" && other?.trim()) return other.trim();
  return TRIGGER[trigger] ?? trigger;
}

export function formatSetupPath(path: string | null | undefined): string {
  if (!path) return "—";
  return SETUP[path] ?? path;
}

const INDUSTRY: Record<string, string> = {
  hvac_plumbing_electrical: "HVAC / plumbing / electrical",
  roofing_exterior: "Roofing / exterior",
  auto_services: "Auto services",
  dental_medical_vet: "Dental / medical / vet",
  home_services: "Home services",
  restaurant_hospitality: "Restaurant / hospitality",
  retail_local: "Retail / local",
  other: "Other",
};

export function formatIndustry(slug: string): string {
  return INDUSTRY[slug] ?? slug.replace(/_/g, " ");
}
