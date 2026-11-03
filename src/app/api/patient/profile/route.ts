import { z } from "zod";
import { getCurrentUser, requireUser, isStaff, assertOwnership, hashPassword } from "@/lib/auth/service";
import { db } from "@/db";
import { users, patientProfiles, auditLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { AppError, toSafeErrorPayload } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const user = requireUser(await getCurrentUser());
    const url = new URL(req.url);

    // If clinic staff (receptionist/admin/clinician) requests full directory of patient profiles
    if (isStaff(user) && (url.searchParams.get("list") === "true" || url.searchParams.get("all") === "true")) {
      const allPatients = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          profileId: patientProfiles.id,
          dateOfBirth: patientProfiles.dateOfBirth,
          gender: patientProfiles.gender,
          phone: patientProfiles.phone,
          address: patientProfiles.address,
          bloodGroup: patientProfiles.bloodGroup,
          allergies: patientProfiles.allergies,
          emergencyContactName: patientProfiles.emergencyContactName,
          emergencyContactPhone: patientProfiles.emergencyContactPhone,
          insuranceProvider: patientProfiles.insuranceProvider,
          insurancePolicyNumber: patientProfiles.insurancePolicyNumber,
          medicalHistory: patientProfiles.medicalHistory,
          updatedAt: patientProfiles.updatedAt,
        })
        .from(users)
        .leftJoin(patientProfiles, eq(patientProfiles.userId, users.id))
        .where(eq(users.role, "patient"))
        .orderBy(users.name);

      return Response.json({
        patients: allPatients.map((p) => ({
          ...p,
          createdAt: p.createdAt ? p.createdAt.toISOString() : undefined,
          updatedAt: p.updatedAt ? p.updatedAt.toISOString() : undefined,
        })),
      });
    }

    const targetPatientId = url.searchParams.get("patientId") ?? user.id;

    assertOwnership(user, targetPatientId);

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        profileId: patientProfiles.id,
        dateOfBirth: patientProfiles.dateOfBirth,
        gender: patientProfiles.gender,
        phone: patientProfiles.phone,
        address: patientProfiles.address,
        bloodGroup: patientProfiles.bloodGroup,
        allergies: patientProfiles.allergies,
        emergencyContactName: patientProfiles.emergencyContactName,
        emergencyContactPhone: patientProfiles.emergencyContactPhone,
        insuranceProvider: patientProfiles.insuranceProvider,
        insurancePolicyNumber: patientProfiles.insurancePolicyNumber,
        medicalHistory: patientProfiles.medicalHistory,
        updatedAt: patientProfiles.updatedAt,
      })
      .from(users)
      .leftJoin(patientProfiles, eq(patientProfiles.userId, users.id))
      .where(eq(users.id, targetPatientId))
      .limit(1);

    const patient = rows[0];
    if (!patient) throw new AppError("not_found", "Patient profile not found.");

    return Response.json({
      patient: {
        ...patient,
        updatedAt: patient.updatedAt ? patient.updatedAt.toISOString() : undefined,
      },
    });
  } catch (err) {
    const { body, status } = toSafeErrorPayload(err);
    return Response.json(body, { status });
  }
}

const UpdateProfileSchema = z
  .object({
    mode: z.enum(["create", "update"]).optional().nullable(),
    name: z.string().min(1).max(200).optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    dateOfBirth: z.string().max(50).optional().nullable(),
    gender: z.string().max(50).optional().nullable(),
    address: z.string().max(300).optional().nullable(),
    bloodGroup: z.string().max(20).optional().nullable(),
    allergies: z.string().max(300).optional().nullable(),
    emergencyContactName: z.string().max(200).optional().nullable(),
    emergencyContactPhone: z.string().max(50).optional().nullable(),
    insuranceProvider: z.string().max(200).optional().nullable(),
    insurancePolicyNumber: z.string().max(100).optional().nullable(),
    medicalHistory: z.string().max(2000).optional().nullable(),
    patientId: z.string().uuid().optional().nullable(),
  })
  .passthrough();

export async function POST(req: Request) {
  try {
    const user = requireUser(await getCurrentUser());

    // CRITICAL RBAC RULE:
    // In patient mode, patients must NOT edit their card. Patients may only view their card.
    // Only reception / clinic staff can file, edit, and update patient profiles and health cards.
    if (user.role === "patient") {
      throw new AppError(
        "forbidden",
        "Patients cannot edit their card. Profile updates and card filings must be performed by clinic reception."
      );
    }

    if (!isStaff(user)) {
      throw new AppError("forbidden", "Only clinic staff may file or edit patient profiles.");
    }

    const body = await req.json().catch(() => ({}));
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError("bad_request", "Invalid profile update data.");
    }

    let targetPatientId = parsed.data.patientId;
    let isNew = false;

    // Filing a new patient profile if mode is 'create' or no patientId provided
    if (parsed.data.mode === "create" || (!targetPatientId && parsed.data.email)) {
      const email = parsed.data.email?.toLowerCase().trim();
      if (!email) {
        throw new AppError("bad_request", "Patient email is required to file a new patient profile.");
      }

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing[0]) {
        targetPatientId = existing[0].id;
        if (parsed.data.name) {
          await db
            .update(users)
            .set({ name: parsed.data.name.trim() })
            .where(eq(users.id, targetPatientId));
        }
      } else {
        isNew = true;
        const [created] = await db
          .insert(users)
          .values({
            email,
            name: parsed.data.name?.trim() || email.split("@")[0],
            role: "patient",
            passwordHash: hashPassword("patient1234"),
            isSynthetic: true,
          })
          .returning({ id: users.id });

        if (!created) {
          throw new AppError("internal", "Failed to create patient account.");
        }
        targetPatientId = created.id;
      }
    }

    if (!targetPatientId) {
      throw new AppError("bad_request", "Patient ID or email is required to update or file a profile.");
    }

    // Update name in users table if provided
    if (parsed.data.name) {
      await db
        .update(users)
        .set({ name: parsed.data.name.trim() })
        .where(eq(users.id, targetPatientId));
    }

    // Upsert into patientProfiles
    await db
      .insert(patientProfiles)
      .values({
        userId: targetPatientId,
        dateOfBirth: parsed.data.dateOfBirth ?? "",
        gender: parsed.data.gender ?? "unspecified",
        phone: parsed.data.phone ?? "",
        address: parsed.data.address ?? "",
        bloodGroup: parsed.data.bloodGroup ?? "",
        allergies: parsed.data.allergies ?? "None reported",
        emergencyContactName: parsed.data.emergencyContactName ?? "",
        emergencyContactPhone: parsed.data.emergencyContactPhone ?? "",
        insuranceProvider: parsed.data.insuranceProvider ?? "",
        insurancePolicyNumber: parsed.data.insurancePolicyNumber ?? "",
        medicalHistory: parsed.data.medicalHistory ?? "",
      })
      .onConflictDoUpdate({
        target: patientProfiles.userId,
        set: {
          dateOfBirth: parsed.data.dateOfBirth ?? "",
          gender: parsed.data.gender ?? "unspecified",
          phone: parsed.data.phone ?? "",
          address: parsed.data.address ?? "",
          bloodGroup: parsed.data.bloodGroup ?? "",
          allergies: parsed.data.allergies ?? "None reported",
          emergencyContactName: parsed.data.emergencyContactName ?? "",
          emergencyContactPhone: parsed.data.emergencyContactPhone ?? "",
          insuranceProvider: parsed.data.insuranceProvider ?? "",
          insurancePolicyNumber: parsed.data.insurancePolicyNumber ?? "",
          medicalHistory: parsed.data.medicalHistory ?? "",
          updatedAt: new Date(),
        },
      });

    await db.insert(auditLogs).values({
      actorId: user.id,
      actorRole: user.role,
      action: isNew ? "patient_profile_filed_by_reception" : "patient_profile_updated_by_staff",
      entityType: "patient_profile",
      entityId: targetPatientId,
      meta: { targetPatientId, isNew, actorRole: user.role },
    });

    return Response.json({
      ok: true,
      message: isNew ? "Patient profile filed successfully by reception." : "Patient profile and health card updated successfully.",
      patientId: targetPatientId,
    });
  } catch (err) {
    const { body, status } = toSafeErrorPayload(err);
    return Response.json(body, { status });
  }
}
