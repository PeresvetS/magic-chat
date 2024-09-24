/*
  Warnings:

  - You are about to drop the column `isBanned` on the `PhoneNumber` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PhoneNumber" DROP COLUMN "isBanned";

-- AlterTable
ALTER TABLE "TelegramAccount" ADD COLUMN     "isBanned" BOOLEAN NOT NULL DEFAULT false;
