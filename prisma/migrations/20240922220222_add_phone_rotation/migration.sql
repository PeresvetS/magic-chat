/*
  Warnings:

  - You are about to drop the column `name` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "name";

-- CreateTable
CREATE TABLE "LeadProfile" (
    "id" SERIAL NOT NULL,
    "leadId" INTEGER NOT NULL,
    "name" TEXT,
    "status" TEXT,
    "address" TEXT,
    "businessType" TEXT,
    "leadGenerationMethod" TEXT,
    "mainPains" TEXT,
    "location" TEXT,
    "interests" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneNumberRotation" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "platform" TEXT NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneNumberRotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadProfile_leadId_key" ON "LeadProfile"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumberRotation_userId_campaignId_platform_key" ON "PhoneNumberRotation"("userId", "campaignId", "platform");

-- AddForeignKey
ALTER TABLE "LeadProfile" ADD CONSTRAINT "LeadProfile_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
