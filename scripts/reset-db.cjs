const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const tables = [
  '"AdminAuditLog"',
  '"CommentLike"',
  '"DirectConversation"',
  '"DirectMessage"',
  '"Event"',
  '"EventChatMessage"',
  '"EventChatParticipant"',
  '"EventTicket"',
  '"EventTicketAccessLog"',
  '"EventTicketType"',
  '"EventView"',
  '"Follow"',
  '"Group"',
  '"GroupInvite"',
  '"GroupJoinRequest"',
  '"GroupMembership"',
  '"GroupMessage"',
  '"Notification"',
  '"PasswordResetToken"',
  '"PaymentCheckout"',
  '"Post"',
  '"PostComment"',
  '"PostLike"',
  '"PushDelivery"',
  '"PushSubscription"',
  '"RateLimitBucket"',
  '"SecurityEvent"',
  '"Session"',
  '"Story"',
  '"TicketPurchase"',
  '"User"',
  '"UserBlock"',
  '"UserReport"',
  '"UsernameChange"',
  '"VenueDoorStaff"',
  '"VenueRequest"',
  '"VenueStripePayout"',
];

async function main() {
  const truncateSql = `TRUNCATE TABLE ${tables
    .map((table) => `public.${table}`)
    .join(", ")} RESTART IDENTITY CASCADE;`;

  await prisma.$executeRawUnsafe(truncateSql);
  console.log("Database data cleared. Schema and migrations remain intact.");
}

main()
  .catch((error) => {
    console.error("Failed to clear database data.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
