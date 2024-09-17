-- CreateTable
CREATE TABLE "MessageQueue" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "recipientPhoneNumber" TEXT NOT NULL,
    "senderPhoneNumber" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageQueue_status_idx" ON "MessageQueue"("status");

-- CreateIndex
CREATE INDEX "MessageQueue_createdAt_idx" ON "MessageQueue"("createdAt");
