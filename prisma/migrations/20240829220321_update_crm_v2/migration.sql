-- AlterTable
ALTER TABLE "AmoCrmIntegration" ALTER COLUMN "amoCrmInboundUrl" DROP NOT NULL,
ALTER COLUMN "amoCrmOutboundToken" DROP NOT NULL;

-- AlterTable
ALTER TABLE "BitrixIntegration" ALTER COLUMN "bitrixInboundUrl" DROP NOT NULL,
ALTER COLUMN "bitrixOutboundToken" DROP NOT NULL;
