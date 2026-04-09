import { db } from "@/lib/db";

export function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export async function generateUniqueUsername(baseValue: string) {
  const base = normalizeUsername(baseValue) || `user${Math.random().toString(36).slice(2, 8)}`;
  let username = base;
  let counter = 1;

  while (await db.user.findUnique({ where: { username } })) {
    counter += 1;
    username = `${base}${counter}`;
  }

  return username;
}
