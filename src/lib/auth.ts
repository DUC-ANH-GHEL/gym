import { randomBytes, createHmac } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { authSchema } from "@/lib/validators";
import { isAdminEmail } from "@/lib/admin-config";

const SESSION_COOKIE = "gym_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 400;

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

async function createDefaultWorkoutDays(userId: string) {
  await prisma.workoutDay.createMany({
    data: [
      { userId, dayOfWeek: 1, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 2, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 3, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 4, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 5, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 6, title: "Ngày nghỉ", isRestDay: true },
      { userId, dayOfWeek: 0, title: "Ngày nghỉ", isRestDay: true },
    ],
    skipDuplicates: true,
  });
}

export async function registerUser(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: "Vui lòng nhập email và mật khẩu hợp lệ." };
  }

  if (isAdminEmail(parsed.data.email)) {
    return { error: "Email admin không thể đăng ký công khai." };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existingUser) {
    return { error: "Email này đã được sử dụng." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
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

  await createDefaultWorkoutDays(user.id);
  await setSessionCookie(user.id);

  return { success: true };
}

export async function loginUser(formData: FormData) {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: "",
  });

  if (!parsed.success) {
    return { error: "Email hoặc mật khẩu không hợp lệ." };
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  await setSessionCookie(user.id);
  return { success: true };
}

export async function logoutUser() {
  await clearSessionCookie();
}
