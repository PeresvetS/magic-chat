-- AlterTable
ALTER TABLE "CampaignMailing" ADD COLUMN     "isSecondaryAgentActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "modelName" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
ADD COLUMN     "openaiApiKey" TEXT,
ADD COLUMN     "secondaryPromptId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "openaiApiKey" TEXT;

-- CreateTable
CREATE TABLE "ConversationState" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "lastMessage" TEXT NOT NULL,
    "pendingReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConversationState_leadId_key" ON "ConversationState"("leadId");

-- AddForeignKey
ALTER TABLE "CampaignMailing" ADD CONSTRAINT "CampaignMailing_secondaryPromptId_fkey" FOREIGN KEY ("secondaryPromptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationState" ADD CONSTRAINT "ConversationState_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
