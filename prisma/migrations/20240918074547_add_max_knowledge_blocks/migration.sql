-- AlterTable
ALTER TABLE "CampaignMailing" ADD COLUMN     "maxKnowledgeBlocks" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "KnowledgeBase" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pineconeId" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeBase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeBase_pineconeId_key" ON "KnowledgeBase"("pineconeId");

-- AddForeignKey
ALTER TABLE "KnowledgeBase" ADD CONSTRAINT "KnowledgeBase_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignMailing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
