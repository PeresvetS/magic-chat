-- DropForeignKey
ALTER TABLE "AmoCrmIntegration" DROP CONSTRAINT "AmoCrmIntegration_userId_fkey";

-- DropForeignKey
ALTER TABLE "BitrixIntegration" DROP CONSTRAINT "BitrixIntegration_userId_fkey";

-- AlterTable
ALTER TABLE "AmoCrmIntegration" ALTER COLUMN "userId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "BitrixIntegration" ALTER COLUMN "userId" SET DATA TYPE BIGINT;

-- AddForeignKey
ALTER TABLE "BitrixIntegration" ADD CONSTRAINT "BitrixIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmoCrmIntegration" ADD CONSTRAINT "AmoCrmIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;
