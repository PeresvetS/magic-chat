-- AlterTable
ALTER TABLE "CampaignMailing" ADD COLUMN     "promptId" INTEGER;

-- CreateTable
CREATE TABLE "Prompt" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_name_key" ON "Prompt"("name");

-- AddForeignKey
ALTER TABLE "CampaignMailing" ADD CONSTRAINT "CampaignMailing_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
