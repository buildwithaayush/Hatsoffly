import type { Industry, TemplateVoice } from "@prisma/client";

/** Config-driven mapping (spec §12.1.1). */
export function primaryTypeToIndustry(primaryType: string | null | undefined): Industry {
  const t = (primaryType ?? "").toLowerCase();
  if (
    ["plumber", "hvac_contractor", "electrician", "electrical_contractor"].some((x) =>
      t.includes(x),
    )
  ) {
    return "hvac_plumbing_electrical";
  }
  if (["roofing_contractor", "general_contractor", "siding_contractor"].some((x) => t.includes(x))) {
    return "roofing_exterior";
  }
  if (
    ["car_repair", "auto_body_shop", "car_wash", "car_detailing_service"].some((x) =>
      t.includes(x),
    )
  ) {
    return "auto_services";
  }
  if (
    ["dentist", "doctor", "veterinary_care", "medical_clinic", "dental_clinic"].some((x) =>
      t.includes(x),
    )
  ) {
    return "dental_medical_vet";
  }
  if (
    ["house_cleaning_service", "lawn_care_service", "pest_control_service", "landscaper"].some(
      (x) => t.includes(x),
    )
  ) {
    return "home_services";
  }
  if (["restaurant", "cafe", "bar", "lodging", "hotel"].some((x) => t.includes(x))) {
    return "restaurant_hospitality";
  }
  if (
    ["clothing_store", "store", "shopping_mall", "hair_salon", "beauty_salon"].some((x) =>
      t.includes(x),
    )
  ) {
    return "retail_local";
  }
  return "other";
}

/** Addendum B §B.6 default voice per industry */
export function industryToTemplateVoice(industry: Industry): TemplateVoice {
  switch (industry) {
    case "dental_medical_vet":
      return "professional";
    case "restaurant_hospitality":
    case "retail_local":
      return "casual";
    default:
      return "friendly";
  }
}
