"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { clearSessionCookie, deleteSession, getSessionToken } from "@/lib/auth";
import type { ActionState } from "@/lib/http";
import { loginSchema, registerSchema } from "@/features/auth/auth.schemas";
import { loginUser, registerUser } from "@/features/auth/auth.service";
import { assertRateLimit } from "@/lib/rate-limit";
import { createPasswordResetToken, getPasswordResetTokenRecord } from "@/lib/password-reset";
import { requireAuth } from "@/lib/permissions";
import { sendEmail } from "@/lib/email";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export async function registerAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    await assertRateLimit({
      key: `auth:register:${email || "anonymous"}`,
      limit: 5,
      windowMs: 10 * 60 * 1000,
      message: "Demasiados intentos de registro. Espera unos minutos.",
    });

    const input = registerSchema.parse({
      displayName: formData.get("displayName"),
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const user = await registerUser(input);
    redirect(user.role === "VENUE" ? "/local/dashboard" : user.role === "VENUE_PENDING" ? "/venue/pending" : "/dashboard");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "No se pudo completar el registro",
    };
  }
}

export async function loginAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    await assertRateLimit({
      key: `auth:login:${email || "anonymous"}`,
      limit: 8,
      windowMs: 10 * 60 * 1000,
      message: "Demasiados intentos de acceso. Espera unos minutos.",
    });

    const input = loginSchema.parse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    const user = await loginUser(input);
    redirect(user.role === "VENUE" ? "/local/dashboard" : user.role === "VENUE_PENDING" ? "/venue/pending" : "/dashboard");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    return {
      error: error instanceof Error ? error.message : "No se pudo iniciar sesión",
    };
  }
}

export async function logoutAction() {
  const token = await getSessionToken();
  if (token) {
    await deleteSession(token);
  }
  await clearSessionCookie();
  redirect("/");
}

export async function sendPasswordResetEmailAction(
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  try {
    const user = await requireAuth();
    await assertRateLimit({
      key: `password-reset:request:${user.id}`,
      limit: 3,
      windowMs: 30 * 60 * 1000,
      message: "Ya has solicitado demasiados correos de cambio de contraseña. Espera un poco.",
      userId: user.id,
    });

    const { token } = await createPasswordResetToken(user.id);
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: user.email,
      subject: "Cambiar contraseña en Eventro",
      text: `Has solicitado cambiar tu contraseña.\n\nUsa este enlace: ${resetUrl}\n\nCaduca en 1 hora.`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
          <h2 style="margin:0 0 16px">Cambiar contraseña</h2>
          <p>Has solicitado cambiar tu contraseña de Eventro.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:12px;background:#0ea5e9;color:white;text-decoration:none;font-weight:600">
              Cambiar contraseña
            </a>
          </p>
          <p>Si no has sido tú, puedes ignorar este mensaje.</p>
          <p>Este enlace caduca en 1 hora.</p>
        </div>
      `,
    });

    return { success: "Te hemos enviado un correo para cambiar la contraseña." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo enviar el correo de cambio de contraseña.",
    };
  }
}

export async function resetPasswordWithTokenAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const token = String(formData.get("token") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!token) {
      return { error: "El enlace no es válido." };
    }

    if (password.length < 8) {
      return { error: "La contraseña debe tener al menos 8 caracteres." };
    }

    if (password !== confirmPassword) {
      return { error: "Las contraseñas no coinciden." };
    }

    const record = await getPasswordResetTokenRecord(token);
    if (!record) {
      return { error: "El enlace ha expirado o ya no es válido." };
    }

    const passwordHash = await hashPassword(password);

    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      db.passwordResetToken.deleteMany({
        where: { userId: record.userId },
      }),
      db.session.deleteMany({
        where: { userId: record.userId },
      }),
    ]);

    revalidatePath("/login");
    return { success: "Contraseña actualizada. Ya puedes iniciar sesión con la nueva." };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "No se pudo cambiar la contraseña.",
    };
  }
}
