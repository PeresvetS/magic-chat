/*
  Warnings:

  - You are about to drop the column `source` on the `Lead` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LeadStatus" ADD VALUE 'SENT_MESSAGE';
ALTER TYPE "LeadStatus" ADD VALUE 'STARTED_CONVERSATION';

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "source";

-- AlterTable
ALTER TABLE "LeadProfile" ADD COLUMN     "source" TEXT;
