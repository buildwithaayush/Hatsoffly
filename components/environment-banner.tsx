import { getEnvironmentBanner } from "@/lib/env";

export function EnvironmentBanner() {
  const b = getEnvironmentBanner();
  if (!b) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex flex-col gap-0.5 border-b border-amber-800/20 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 px-4 py-2 text-center text-[13px] text-amber-50 sm:flex-row sm:items-center sm:justify-center sm:gap-3 sm:text-left"
    >
      <span className="font-semibold tracking-wide">{b.label} environment</span>
      <span className="text-amber-100/90">{b.subtle}</span>
    </div>
  );
}
