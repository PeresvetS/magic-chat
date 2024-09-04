-- CreateTable
CREATE TABLE "WABAAccount" (
    "id" SERIAL NOT NULL,
    "phoneNumberId" INTEGER NOT NULL,
    "isAuthenticated" BOOLEAN NOT NULL DEFAULT false,
    "businessProfileId" TEXT,
    "contactsReachedToday" INTEGER NOT NULL DEFAULT 0,
    "contactsReachedTotal" INTEGER NOT NULL DEFAULT 0,
    "dailyLimit" INTEGER NOT NULL DEFAULT 1000,
    "totalLimit" INTEGER NOT NULL DEFAULT 1000,
    "messagesSentToday" INTEGER NOT NULL DEFAULT 0,
    "messagesSentTotal" INTEGER NOT NULL DEFAULT 0,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),

    CONSTRAINT "WABAAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WABASession" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WABASession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WABAAccount_phoneNumberId_key" ON "WABAAccount"("phoneNumberId");

-- CreateIndex
CREATE UNIQUE INDEX "WABASession_phoneNumber_key" ON "WABASession"("phoneNumber");

-- AddForeignKey
ALTER TABLE "WABAAccount" ADD CONSTRAINT "WABAAccount_phoneNumberId_fkey" FOREIGN KEY ("phoneNumberId") REFERENCES "PhoneNumber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
