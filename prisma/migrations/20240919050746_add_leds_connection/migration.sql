/*
  Warnings:

  - A unique constraint covering the columns `[leadId]` on the table `Dialog` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `leadId` to the `Dialog` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Dialog" ADD COLUMN     "leadId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "dialogId" INTEGER;

-- AlterTable
ALTER TABLE "MessageQueue" ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Dialog_leadId_key" ON "Dialog"("leadId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_dialogId_fkey" FOREIGN KEY ("dialogId") REFERENCES "Dialog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
