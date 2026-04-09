import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("eventro123", 12);

  const venueUser = await prisma.user.upsert({
    where: { email: "local@eventro.app" },
    update: {
      name: "Sala Eventro",
      role: UserRole.VENUE,
      passwordHash,
    },
    create: {
      name: "Sala Eventro",
      email: "local@eventro.app",
      passwordHash,
      role: UserRole.VENUE,
    },
  });

  await prisma.user.upsert({
    where: { email: "user@eventro.app" },
    update: {
      name: "Usuario Demo",
      role: UserRole.USER,
      passwordHash,
    },
    create: {
      name: "Usuario Demo",
      email: "user@eventro.app",
      passwordHash,
      role: UserRole.USER,
    },
  });

  await prisma.event.upsert({
    where: { id: "seed-tardeo-gran-via" },
    update: {
      title: "Tardeo en Gran Via",
      description: "Sesion de tarde con DJs invitados y acceso libre.",
      imageUrl:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
      location: "Gran Via 20",
      city: "Madrid",
      date: new Date("2026-04-18T18:00:00.000Z"),
      price: null,
      published: true,
      ownerId: venueUser.id,
    },
    create: {
      id: "seed-tardeo-gran-via",
      title: "Tardeo en Gran Via",
      description: "Sesion de tarde con DJs invitados y acceso libre.",
      imageUrl:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
      location: "Gran Via 20",
      city: "Madrid",
      date: new Date("2026-04-18T18:00:00.000Z"),
      price: null,
      published: true,
      ownerId: venueUser.id,
    },
  });

  await prisma.event.upsert({
    where: { id: "seed-techno-chamberi" },
    update: {
      title: "Techno Night Chamberi",
      description: "Noche de techno con aforo limitado y entrada anticipada.",
      imageUrl:
        "https://images.unsplash.com/photo-1571266028243-d220c9d94a39?auto=format&fit=crop&w=1200&q=80",
      location: "Calle Santa Engracia 45",
      city: "Madrid",
      date: new Date("2026-04-25T21:30:00.000Z"),
      price: 18,
      published: true,
      ownerId: venueUser.id,
    },
    create: {
      id: "seed-techno-chamberi",
      title: "Techno Night Chamberi",
      description: "Noche de techno con aforo limitado y entrada anticipada.",
      imageUrl:
        "https://images.unsplash.com/photo-1571266028243-d220c9d94a39?auto=format&fit=crop&w=1200&q=80",
      location: "Calle Santa Engracia 45",
      city: "Madrid",
      date: new Date("2026-04-25T21:30:00.000Z"),
      price: 18,
      published: true,
      ownerId: venueUser.id,
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
