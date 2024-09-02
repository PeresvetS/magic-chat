-- Начало транзакции
BEGIN;

-- Добавляем новый столбец updatedAt, если его еще нет
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Lead' AND column_name = 'updatedAt') THEN
        ALTER TABLE "Lead" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Добавляем столбец campaignId, если его еще нет
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Lead' AND column_name = 'campaignId') THEN
        ALTER TABLE "Lead" ADD COLUMN "campaignId" INTEGER;
    END IF;
END $$;

-- Обновляем существующие записи, устанавливая updatedAt равным createdAt
UPDATE "Lead" SET "updatedAt" = "createdAt" WHERE "updatedAt" IS NULL;

-- Создаем индексы, если их еще нет
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Lead' AND indexname = 'Lead_campaignId_idx') THEN
        CREATE INDEX "Lead_campaignId_idx" ON "Lead"("campaignId");
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'Lead' AND indexname = 'Lead_userId_idx') THEN
        CREATE INDEX "Lead_userId_idx" ON "Lead"("userId");
    END IF;
END $$;

-- Добавляем внешние ключи, если их еще нет
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'Lead' AND constraint_name = 'Lead_campaignId_fkey') THEN
        ALTER TABLE "Lead" ADD CONSTRAINT "Lead_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "CampaignMailing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'Lead' AND constraint_name = 'Lead_userId_fkey') THEN
        ALTER TABLE "Lead" ADD CONSTRAINT "Lead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Удаляем значение по умолчанию для updatedAt
ALTER TABLE "Lead" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- Завершение транзакции
COMMIT;