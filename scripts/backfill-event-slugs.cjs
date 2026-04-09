const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function main() {
  const events = await prisma.event.findMany({
    where: { slug: null },
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
  });

  for (const event of events) {
    const baseSlug = slugify(event.title) || `evento-${event.id.slice(-6)}`;
    let slug = baseSlug;
    let counter = 2;

    while (await prisma.event.findFirst({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }

    await prisma.event.update({
      where: { id: event.id },
      data: { slug },
    });
  }

  console.log(`Backfilled ${events.length} event slugs.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
