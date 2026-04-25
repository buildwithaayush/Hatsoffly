-- CreateTable
CREATE TABLE "ReportDispatch" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "cycle" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "sentTo" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportDispatch_businessId_cycle_periodStart_key" ON "ReportDispatch"("businessId", "cycle", "periodStart");

-- CreateIndex
CREATE INDEX "ReportDispatch_cycle_periodStart_idx" ON "ReportDispatch"("cycle", "periodStart");

-- CreateIndex
CREATE INDEX "ReportDispatch_businessId_sentAt_idx" ON "ReportDispatch"("businessId", "sentAt");

-- AddForeignKey
ALTER TABLE "ReportDispatch" ADD CONSTRAINT "ReportDispatch_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
