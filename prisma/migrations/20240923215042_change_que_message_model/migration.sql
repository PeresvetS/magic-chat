/*
  Warnings:

  - You are about to drop the column `recipientPhoneNumber` on the `MessageQueue` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'new';

-- AlterTable
ALTER TABLE "MessageQueue" DROP COLUMN "recipientPhoneNumber",
ADD COLUMN     "leadId" INTEGER;

-- AddForeignKey
ALTER TABLE "MessageQueue" ADD CONSTRAINT "MessageQueue_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
