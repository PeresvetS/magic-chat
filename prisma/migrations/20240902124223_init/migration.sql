-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'UNAVAILABLE', 'PROCESSED_NEGATIVE', 'PROCESSED_POSITIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "telegramId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Admin" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isRepeating" BOOLEAN NOT NULL DEFAULT false,
    "durationDays" INTEGER,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLimits" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "parsingLimit" INTEGER,
    "phonesLimit" INTEGER,
    "campaignsLimit" INTEGER,
    "contactsLimit" INTEGER,
    "leadsLimit" INTEGER,

    CONSTRAINT "UserLimits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneNumber" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "userId" INTEGER,
    "isBanned" BOOLEAN NOT NULL DEFAULT false,
    "banType" TEXT,
    "maxInactivityTime" INTEGER NOT NULL DEFAULT 3600,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhoneNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramAccount" (
    "id" SERIAL NOT NULL,
    "phoneNumberId" INTEGER NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "contactsReachedToday" INTEGER NOT NULL DEFAULT 0,
    "contactsReachedTotal" INTEGER NOT NULL DEFAULT 0,
    "dailyLimit" INTEGER NOT NULL DEFAULT 40,
    "totalLimit" INTEGER NOT NULL DEFAULT 40,
    "messagesSentToday" INTEGER NOT NULL DEFAULT 0,
    "messagesSentTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TelegramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappAccount" (
    "id" SERIAL NOT NULL,
    "phoneNumberId" INTEGER NOT NULL,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "accountType" TEXT NOT NULL DEFAULT 'regular',
    "contactsReachedToday" INTEGER NOT NULL DEFAULT 0,
    "contactsReachedTotal" INTEGER NOT NULL DEFAULT 0,
    "dailyLimit" INTEGER NOT NULL DEFAULT 100,
    "totalLimit" INTEGER NOT NULL DEFAULT 100,
    "messagesSentToday" INTEGER NOT NULL DEFAULT 0,
    "messagesSentTotal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WhatsappAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignParsing" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "groups" TEXT NOT NULL,
    "audienceDescription" TEXT,
    "status" TEXT,
    "maxUsers" INTEGER,
    "depth" INTEGER,
    "totalParsed" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "isFullyProcessed" BOOLEAN NOT NULL DEFAULT false,
    "lastParsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignParsing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedUser" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "groupUsername" TEXT,
    "groupLink" TEXT,
    "userId" BIGINT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "bio" TEXT,
    "category" TEXT,
    "parsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3),
    "hasChannel" BOOLEAN NOT NULL DEFAULT false,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "processingStatus" TEXT,

    CONSTRAINT "ParsedUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneNumberContact" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneNumberContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageStat" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "bitrixId" TEXT,
    "leadsDBId" INTEGER NOT NULL,
    "campaignId" INTEGER,
    "userId" INTEGER,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadsDB" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadsDB_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignLeadsDB" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "leadsDBId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignLeadsDB_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMailing" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "message" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "platformPriority" TEXT NOT NULL DEFAULT 'telegram',
    "userId" INTEGER NOT NULL,
    "promptId" INTEGER,

    CONSTRAINT "CampaignMailing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneNumberCampaign" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,

    CONSTRAINT "PhoneNumberCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BitrixIntegration" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "bitrixInboundUrl" TEXT,
    "bitrixOutboundToken" TEXT,

    CONSTRAINT "BitrixIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmoCrmIntegration" (
    "id" SERIAL NOT NULL,
    "userId" BIGINT NOT NULL,
    "amoCrmInboundUrl" TEXT,
    "amoCrmOutboundToken" TEXT,

    CONSTRAINT "AmoCrmIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramSession" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappSession" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dialog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "contactId" TEXT NOT NULL,
    "contactPhone" TEXT,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dialog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "dialogId" INTEGER NOT NULL,
    "userRequest" TEXT NOT NULL,
    "assistantResponse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prompt" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLimits_userId_key" ON "UserLimits"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumber_phoneNumber_key" ON "PhoneNumber"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccount_phoneNumberId_key" ON "TelegramAccount"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappAccount_phoneNumberId_key" ON "WhatsappAccount"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumberContact_phoneNumber_userId_key" ON "PhoneNumberContact"("phoneNumber", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_bitrixId_key" ON "Lead"("bitrixId");

-- CreateIndex
CREATE INDEX "Lead_campaignId_idx" ON "Lead"("campaignId");

-- CreateIndex
CREATE INDEX "Lead_userId_idx" ON "Lead"("userId");

-- CreateIndex
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignLeadsDB_campaignId_leadsDBId_key" ON "CampaignLeadsDB"("campaignId", "leadsDBId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignMailing_name_key" ON "CampaignMailing"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PhoneNumberCampaign_phoneNumber_campaignId_key" ON "PhoneNumberCampaign"("phoneNumber", "campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "BitrixIntegration_userId_key" ON "BitrixIntegration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AmoCrmIntegration_userId_key" ON "AmoCrmIntegration"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramSession_phoneNumber_key" ON "TelegramSession"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_phoneNumber_key" ON "WhatsappSession"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Dialog_userId_contactId_platform_key" ON "Dialog"("userId", "contactId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "Prompt_name_key" ON "Prompt"("name");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLimits" ADD CONSTRAINT "UserLimits_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumber" ADD CONSTRAINT "PhoneNumber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAccount" ADD CONSTRAINT "TelegramAccount_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappAccount" ADD CONSTRAINT "WhatsappAccount_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignParsing" ADD CONSTRAINT "CampaignParsing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedUser" ADD CONSTRAINT "ParsedUser_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignParsing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_leadsDBId_fkey" FOREIGN KEY ("leadsDBId") REFERENCES "LeadsDB"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignMailing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadsDB" ADD CONSTRAINT "LeadsDB_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLeadsDB" ADD CONSTRAINT "CampaignLeadsDB_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignMailing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignLeadsDB" ADD CONSTRAINT "CampaignLeadsDB_leadsDBId_fkey" FOREIGN KEY ("leadsDBId") REFERENCES "LeadsDB"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMailing" ADD CONSTRAINT "CampaignMailing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMailing" ADD CONSTRAINT "CampaignMailing_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhoneNumberCampaign" ADD CONSTRAINT "PhoneNumberCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignMailing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BitrixIntegration" ADD CONSTRAINT "BitrixIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmoCrmIntegration" ADD CONSTRAINT "AmoCrmIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_dialogId_fkey" FOREIGN KEY ("dialogId") REFERENCES "Dialog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
