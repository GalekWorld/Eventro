-- Vacia todos los datos de Eventro y mantiene intacto el esquema.
-- Deja tablas, enums, indices, constraints y migraciones de Prisma.

BEGIN;

TRUNCATE TABLE
  public."AdminAuditLog",
  public."CommentLike",
  public."DirectConversation",
  public."DirectMessage",
  public."Event",
  public."EventChatMessage",
  public."EventChatParticipant",
  public."EventTicket",
  public."EventTicketAccessLog",
  public."EventTicketType",
  public."EventView",
  public."Follow",
  public."Group",
  public."GroupInvite",
  public."GroupJoinRequest",
  public."GroupMembership",
  public."GroupMessage",
  public."Notification",
  public."PasswordResetToken",
  public."PaymentCheckout",
  public."Post",
  public."PostComment",
  public."PostLike",
  public."PushDelivery",
  public."PushSubscription",
  public."RateLimitBucket",
  public."SecurityEvent",
  public."Session",
  public."Story",
  public."TicketPurchase",
  public."User",
  public."UserBlock",
  public."UserReport",
  public."UsernameChange",
  public."VenueDoorStaff",
  public."VenueRequest",
  public."VenueStripePayout"
RESTART IDENTITY CASCADE;

COMMIT;
