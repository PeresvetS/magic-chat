/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Message` table. All the data in the column will be lost.
  - Made the column `userRequest` on table `Message` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Message_dialogId_idx";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "updatedAt",
ALTER COLUMN "userRequest" SET NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MessageQueue" ADD COLUMN     "recipientPhoneNumber" TEXT;
