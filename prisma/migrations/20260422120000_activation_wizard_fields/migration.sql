-- AlterTable
ALTER TABLE "Business" ADD COLUMN "activationTool" TEXT;
ALTER TABLE "Business" ADD COLUMN "activationToolOther" TEXT;
ALTER TABLE "Business" ADD COLUMN "activationTrigger" TEXT;
ALTER TABLE "Business" ADD COLUMN "activationTriggerOther" TEXT;
ALTER TABLE "Business" ADD COLUMN "activationSetupPath" TEXT;
ALTER TABLE "Business" ADD COLUMN "activationCompletedAt" TIMESTAMP(3);
