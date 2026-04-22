import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const row = await prisma.previewLink.findUnique({
    where: { token },
  });

  if (!row || row.expiresAt.getTime() < Date.now()) {
    notFound();
  }

  const reviewHref = row.googleReviewUrl ?? "https://www.google.com/maps";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-lg flex-col gap-6 px-5 py-10">
        <div
          role="note"
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          This is a preview — tap “Leave a review” to visit your actual Google listing, or close
          this window to explore your dashboard.
        </div>
        <header>
          <p className="text-sm font-medium text-slate-600">{row.businessName}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            How was your experience today?
          </h1>
          <p className="mt-2 text-slate-600">
            Hi {row.firstName} — thanks for letting us serve you. Tap a rating to leave feedback.
          </p>
        </header>
        <div className="flex gap-3">
          {[5, 4, 3, 2, 1].map((n) => (
            <button
              key={n}
              type="button"
              className="flex h-14 min-w-[44px] flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white text-lg font-semibold shadow-sm hover:bg-slate-50"
              aria-label={`${n} stars`}
            >
              {n}★
            </button>
          ))}
        </div>
        <Link
          href={reviewHref}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-600 px-4 py-3 text-center text-base font-semibold text-white hover:bg-brand-700"
        >
          Leave a review
        </Link>
      </div>
    </div>
  );
}
