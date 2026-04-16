import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { normalizeUsername } from "@/lib/username";
import { assertRateLimit } from "@/lib/rate-limit";
import { jsonError, validateJsonApiRequest } from "@/lib/request-security";

type RegisterBody = {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  accountType?: "USER" | "VENUE";
  businessName?: string;
  city?: string;
  address?: string;
  category?: string;
  description?: string;
  phone?: string;
  website?: string;
  instagram?: string;
};

function normalize(value?: string) {
  return value?.trim() || "";
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: Request) {
  try {
    const validationError = validateJsonApiRequest(req);
    if (validationError) {
      return validationError;
    }

    const body = (await req.json()) as RegisterBody;

    const name = normalize(body.name);
    const email = normalize(body.email).toLowerCase();
    const username = normalizeUsername(body.username || "");
    const password = body.password?.trim() || "";
    const accountType = body.accountType;

    await assertRateLimit({
      key: `api-register:${email || "anonymous"}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
      message: "Demasiados intentos de registro. Espera unos minutos.",
    });

    if (!email || !password || !accountType || !username) {
      return jsonError("Faltan campos obligatorios.", 400);
    }

    if (!isValidEmail(email)) {
      return jsonError("Email no válido.", 400);
    }

    if (password.length < 8) {
      return jsonError("La contraseña debe tener al menos 8 caracteres.", 400);
    }

    if (accountType !== "USER" && accountType !== "VENUE") {
      return jsonError("Tipo de cuenta no válido.", 400);
    }

    if (username.length < 3) {
      return jsonError("El nombre de usuario debe tener al menos 3 caracteres válidos.", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return jsonError("Ya existe una cuenta con ese email.", 409);
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      return jsonError("Ese nombre de usuario ya está en uso.", 409);
    }

    const passwordHash = await hashPassword(password);

    if (accountType === "USER") {
      const user = await prisma.user.create({
        data: {
          name: name || null,
          username,
          email,
          passwordHash,
          role: "USER",
        },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      return NextResponse.json(
        { ok: true, user },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    const businessName = normalize(body.businessName);
    const city = normalize(body.city);

    if (!businessName || !city) {
      return jsonError("Nombre del negocio y ciudad son obligatorios.", 400);
    }

    const user = await prisma.user.create({
      data: {
        name: name || null,
        username,
        email,
        passwordHash,
        role: "VENUE_PENDING",
        venueRequest: {
          create: {
            businessName,
            city,
            address: normalize(body.address) || null,
            category: normalize(body.category) || null,
            description: normalize(body.description) || null,
            phone: normalize(body.phone) || null,
            website: normalize(body.website) || null,
            instagram: normalize(body.instagram) || null,
            status: "PENDING",
          },
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        user,
        message: "Solicitud enviada. Un administrador debe aprobar tu cuenta de local.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("Demasiados intentos")) {
      return jsonError(error.message, 429);
    }

    console.error("REGISTER_ERROR", error);

    return jsonError("Error interno del servidor.", 500);
  }
}
