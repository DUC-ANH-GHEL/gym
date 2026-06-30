import { createHmac, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isAdminIdentifier } from "@/lib/admin-config";
import { ensureDefaultWorkoutDays } from "@/lib/setup";
import { authSchema } from "@/lib/validators";

const SESSION_COOKIE = "gym_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

export type RegisterErrorCode = "invalid" | "admin" | "exists" | "server";

function getSecret() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("Missing NEXTAUTH_SECRET");
  }

  return secret;
}

function base64Url(input: string) {
  return Buffer.from(input).toString("base64url");
}

function unbase64Url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = JSON.stringify({ userId, nonce: randomBytes(8).toString("hex") });
  const encoded = base64Url(payload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  if (sign(encoded) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(unbase64Url(encoded)) as { userId?: string };
    return typeof payload.userId === "string" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string) {
  const token = createSessionToken(userId);
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    expires,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}

export async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { gymProfile: true },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function getCurrentUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: { gymProfile: true },
  });
}

export async function registerUser(formData: FormData) {
  const parsed = authSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return {
      error: "Vui l\u00f2ng nh\u1eadp t\u00ean \u0111\u0103ng nh\u1eadp t\u1eeb 3 k\u00fd t\u1ef1 v\u00e0 m\u1eadt kh\u1ea9u t\u1eeb 8 k\u00fd t\u1ef1.",
      errorCode: "invalid" as RegisterErrorCode,
    };
  }

  if (isAdminIdentifier(parsed.data.identifier)) {
    return {
      error: "T\u00e0i kho\u1ea3n admin kh\u00f4ng th\u1ec3 \u0111\u0103ng k\u00fd c\u00f4ng khai.",
      errorCode: "admin" as RegisterErrorCode,
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.identifier },
  });

  if (existingUser) {
    return {
      error: "T\u00ean \u0111\u0103ng nh\u1eadp n\u00e0y \u0111\u00e3 \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng.",
      errorCode: "exists" as RegisterErrorCode,
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  let user;

  try {
    user = await prisma.user.create({
      data: {
        email: parsed.data.identifier,
        name: parsed.data.name || null,
        passwordHash,
        gymProfile: {
          create: {
            displayName: parsed.data.name || null,
            timezone: "Asia/Bangkok",
          },
        },
      },
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return {
        error: "T\u00ean \u0111\u0103ng nh\u1eadp n\u00e0y \u0111\u00e3 \u0111\u01b0\u1ee3c s\u1eed d\u1ee5ng.",
        errorCode: "exists" as RegisterErrorCode,
      };
    }

    return {
      error: "Ch\u01b0a t\u1ea1o \u0111\u01b0\u1ee3c t\u00e0i kho\u1ea3n. Th\u1eed l\u1ea1i sau.",
      errorCode: "server" as RegisterErrorCode,
    };
  }

  await ensureDefaultWorkoutDays(user.id);
  await setSessionCookie(user.id);

  return { success: true };
}

export async function loginUser(formData: FormData) {
  const parsed = authSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
    name: "",
  });

  if (!parsed.success) {
    return { error: "T\u00ean \u0111\u0103ng nh\u1eadp ho\u1eb7c m\u1eadt kh\u1ea9u kh\u00f4ng h\u1ee3p l\u1ec7." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.identifier },
  });

  if (!user) {
    return { error: "T\u00ean \u0111\u0103ng nh\u1eadp ho\u1eb7c m\u1eadt kh\u1ea9u kh\u00f4ng \u0111\u00fang." };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "T\u00ean \u0111\u0103ng nh\u1eadp ho\u1eb7c m\u1eadt kh\u1ea9u kh\u00f4ng \u0111\u00fang." };
  }

  await setSessionCookie(user.id);
  return { success: true };
}

export async function logoutUser() {
  await clearSessionCookie();
}
