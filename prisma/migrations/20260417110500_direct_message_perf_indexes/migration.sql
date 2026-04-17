-- Improve direct message list, unread counts, and conversation open performance
CREATE INDEX "DirectConversation_userAId_updatedAt_idx" ON "DirectConversation"("userAId", "updatedAt");
CREATE INDEX "DirectConversation_userBId_updatedAt_idx" ON "DirectConversation"("userBId", "updatedAt");
CREATE INDEX "DirectMessage_conversationId_hiddenAt_createdAt_idx" ON "DirectMessage"("conversationId", "hiddenAt", "createdAt");
CREATE INDEX "DirectMessage_conversationId_senderId_readAt_hiddenAt_createdAt_idx"
ON "DirectMessage"("conversationId", "senderId", "readAt", "hiddenAt", "createdAt");
