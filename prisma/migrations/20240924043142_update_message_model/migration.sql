-- DropIndex
DROP INDEX "Message_dialogId_key";

-- CreateIndex
CREATE INDEX "Message_dialogId_idx" ON "Message"("dialogId");
