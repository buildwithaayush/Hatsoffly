import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerReviewFlow } from "@/components/preview/customer-review-flow";

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
    <CustomerReviewFlow
      businessName={row.businessName}
      firstName={row.firstName}
      reviewHref={reviewHref}
      token={token}
      isOwnerPreview
    />
  );
}
