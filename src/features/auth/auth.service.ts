import bcrypt from "bcryptjs";
import type { LoginInput, RegisterInput } from "@/features/auth/auth.schemas";
import { createSession, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { USER_ROLE } from "@/lib/roles";
import { normalizeUsername } from "@/lib/username";

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase();
  const username = normalizeUsername(input.username);

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error("Ya existe una cuenta con ese email");
  }

  const existingUsername = await db.user.findUnique({ where: { username } });
  if (existingUsername) {
    throw new Error("Ese nombre de usuario ya esta ocupado");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name: input.displayName,
      username,
      role: USER_ROLE.USER,
    },
  });

  const session = await createSession(user.id);
  await setSessionCookie(session.token, user.role);
  return user;
}

export async function loginUser(input: LoginInput) {
  const user = await db.user.findUnique({
    where: { email: input.email.toLowerCase() },
  });

  if (!user) {
    throw new Error("Credenciales invalidas");
  }

  if (user.suspendedAt) {
    throw new Error(user.suspensionReason || "Tu cuenta esta suspendida temporalmente.");
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw new Error("Credenciales invalidas");
  }

  const session = await createSession(user.id);
  await setSessionCookie(session.token, user.role);
  return user;
}
