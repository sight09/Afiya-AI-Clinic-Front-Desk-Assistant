/**
 * Authentication & authorization.
 *
 * - scrypt password hashing (node:crypto, no extra deps)
 * - opaque session tokens stored server-side, delivered via httpOnly cookie
 * - role guards enforce patient/clinician/admin access in backend code,
 *   never in prompts or UI alone
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";
import { AppError } from "@/lib/errors";

export const SESSION_COOKIE = "clinic_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "patient" | "clinician" | "admin" | "receptionist";
};

/* --------------------------------- hashing --------------------------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/* ----------------------------------- OTP ----------------------------------- */

type OtpRecord = {
  code: string;
  expiresAt: number;
  attempts: number;
};

// In-memory OTP storage mapping normalized email to code & metadata
const otpStore = new Map<string, OtpRecord>();

/**
 * Generate a 6-digit cryptographically random OTP code for password reset.
 * Valid for 10 minutes. Max 3 verification attempts.
 */
export function generatePasswordResetOtp(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const buf = randomBytes(4);
  const num = (buf.readUInt32BE(0) % 900000) + 100000;
  const code = num.toString();

  otpStore.set(normalizedEmail, {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
  });

  return code;
}

/**
 * Verify a 6-digit OTP code for a given email address.
 * Automatically increments attempt count and enforces single-use consumption.
 */
export function verifyPasswordResetOtp(
  email: string,
  inputCode: string
): { valid: boolean; reason?: string } {
  const normalizedEmail = email.toLowerCase().trim();
  const record = otpStore.get(normalizedEmail);

  if (!record) {
    return {
      valid: false,
      reason: "No active verification code found for this email. Please request a new code.",
    };
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(normalizedEmail);
    return {
      valid: false,
      reason: "The verification code has expired. Please request a new code.",
    };
  }

  if (record.attempts >= 3) {
    otpStore.delete(normalizedEmail);
    return {
      valid: false,
      reason: "Too many incorrect attempts. For security, please request a new verification code.",
    };
  }

  record.attempts += 1;

  if (record.code !== inputCode.trim()) {
    const remaining = 3 - record.attempts;
    return {
      valid: false,
      reason: `Invalid verification code (${remaining} attempt${remaining === 1 ? "" : "s"} remaining).`,
    };
  }

  // Successfully verified: consume the OTP so it cannot be re-used
  otpStore.delete(normalizedEmail);
  return { valid: true };
}

/* --------------------------------- sessions -------------------------------- */

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.insert(sessions).values({
    token,
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export async function getSessionUser(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
      })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** Read the session cookie inside route handlers / server components. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  return getSessionUser(store.get(SESSION_COOKIE)?.value);
}

/* ---------------------------------- guards --------------------------------- */

export function requireUser(user: SessionUser | null): SessionUser {
  if (!user) throw new AppError("unauthorized", "Please sign in to continue.");
  return user;
}

export function requireRole(user: SessionUser | null, roles: SessionUser["role"][]): SessionUser {
  const u = requireUser(user);
  if (!roles.includes(u.role)) {
    throw new AppError("forbidden", "Your account is not allowed to perform this action.");
  }
  return u;
}

/** Helper to check if a user belongs to clinic staff */
export function isStaff(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "clinician" || user.role === "admin" || user.role === "receptionist";
}

/** Ownership check: staff may access everything; patients only their own records. */
export function assertOwnership(user: SessionUser, ownerId: string | null | undefined): void {
  if (isStaff(user)) return;
  if (!ownerId || ownerId !== user.id) {
    throw new AppError("forbidden", "You can only access your own records.");
  }
}
