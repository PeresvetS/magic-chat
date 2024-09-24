/*
  Warnings:

  - A unique constraint covering the columns `[dialogId]` on the table `Message` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "userRequest" DROP NOT NULL,
ALTER COLUMN "assistantResponse" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Message_dialogId_key" ON "Message"("dialogId");
