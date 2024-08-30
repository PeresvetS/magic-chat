/*
  Warnings:

  - You are about to drop the column `amoCrmWebhookId` on the `AmoCrmIntegration` table. All the data in the column will be lost.
  - You are about to drop the column `bitrixWebhookId` on the `BitrixIntegration` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AmoCrmIntegration_amoCrmWebhookId_key";

-- DropIndex
DROP INDEX "BitrixIntegration_bitrixWebhookId_key";

-- AlterTable
ALTER TABLE "AmoCrmIntegration" DROP COLUMN "amoCrmWebhookId";

-- AlterTable
ALTER TABLE "BitrixIntegration" DROP COLUMN "bitrixWebhookId";
