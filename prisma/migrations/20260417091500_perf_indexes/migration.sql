-- Improve the most common feed, map and notification queries.
CREATE INDEX "Event_published_date_idx" ON "Event"("published", "date");
CREATE INDEX "Event_published_city_date_idx" ON "Event"("published", "city", "date");
CREATE INDEX "Post_hiddenAt_createdAt_idx" ON "Post"("hiddenAt", "createdAt");
CREATE INDEX "Story_expiresAt_createdAt_idx" ON "Story"("expiresAt", "createdAt");
CREATE INDEX "Follow_followingId_createdAt_idx" ON "Follow"("followingId", "createdAt");
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");
