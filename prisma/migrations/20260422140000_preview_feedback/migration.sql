-- CreateTable
CREATE TABLE "PreviewFeedback" (
    "id" TEXT NOT NULL,
    "previewToken" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "privateMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreviewFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PreviewFeedback_previewToken_key" ON "PreviewFeedback"("previewToken");
