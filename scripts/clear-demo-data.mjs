/**
 * Deletes all Hatsoffly app rows (users, businesses, previews, pending signup, feedback).
 * Use before a client demo so the same phone/email can sign up again.
 *
 * Safety: requires ALLOW_DEMO_RESET=1 OR pass --yes
 *
 *   ALLOW_DEMO_RESET=1 npm run db:clear-demo
 *   npm run db:clear-demo -- --yes
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const allowed =
  process.env.ALLOW_DEMO_RESET === "1" ||
  process.argv.includes("--yes");

if (!allowed) {
  console.error(
    "Refusing to clear data. Set ALLOW_DEMO_RESET=1 or run with --yes:\n" +
      "  ALLOW_DEMO_RESET=1 npm run db:clear-demo\n" +
      "  npm run db:clear-demo -- --yes",
  );
  process.exit(1);
}

async function main() {
  const counts = await prisma.$transaction(async (tx) => {
    const previewFeedback = await tx.previewFeedback.deleteMany();
    const previewLink = await tx.previewLink.deleteMany();
    const pendingVerification = await tx.pendingVerification.deleteMany();
    const business = await tx.business.deleteMany();
    const user = await tx.user.deleteMany();
    return {
      previewFeedback: previewFeedback.count,
      previewLink: previewLink.count,
      pendingVerification: pendingVerification.count,
      business: business.count,
      user: user.count,
    };
  });

  console.log("Demo data cleared:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
