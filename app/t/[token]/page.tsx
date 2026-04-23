import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerReviewFlow } from "@/components/preview/customer-review-flow";

export const runtime = "nodejs";

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ owner?: string | string[] }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const ownerRaw = sp.owner;
  const ownerFlag = Array.isArray(ownerRaw) ? ownerRaw[0] : ownerRaw;
  const isOwnerPreview =
    ownerFlag === "1" || ownerFlag === "true" || ownerFlag === "yes";

  const row = await prisma.previewLink.findUnique({
    where: { token },
  });

  if (!row || row.expiresAt.getTime() < Date.now()) {
    notFound();
  }

  const reviewHref = row.googleReviewUrl ?? "https://www.google.com/maps";

  return (
    <CustomerReviewFlow
      businessName={row.businessName}
      firstName={row.firstName}
      reviewHref={reviewHref}
      token={token}
      isOwnerPreview={isOwnerPreview}
    />
  );
}
