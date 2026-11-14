import { db } from "@/db";
import { clinicInfo, slots } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser, isStaff } from "@/lib/auth/service";
import { PatientPortal } from "@/components/chat/patient-portal";
import { redirect } from "next/navigation";
import { ensureBootstrapped } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  // Strict Role-Based Routing: Authenticated clinic workers (clinician, receptionist, admin)
  // have their own dedicated staff consoles (/staff) and are never directed to the patient portal.
  if (isStaff(user)) {
    redirect("/staff");
  }

  let info: Record<string, string> = {
    name: "Afiya Health Center",
    phone: "+251-11-667-8900",
    email: "care@afiyahealth.et",
    hours: "Monday - Saturday: 8:00 AM - 6:00 PM",
    address: "Bole Sub-City, Next to Millennium Hall, Addis Ababa, Ethiopia",
    emergency_note:
      "For medical emergencies, call 907 or go to the nearest emergency center immediately.",
  };
  let slotCount = 240;

  try {
    await ensureBootstrapped();
    const infoRows = await db.select().from(clinicInfo);
    if (infoRows.length > 0) {
      info = Object.fromEntries(infoRows.map((r) => [r.key, r.value]));
    }

    const [openCount] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(slots)
      .where(eq(slots.status, "open"));

    if (openCount?.n !== undefined) {
      slotCount = openCount.n;
    }
  } catch (err) {
    console.warn("[page] Database offline, using resilient clinic defaults:", err instanceof Error ? err.message : err);
  }

  return (
    <main className="h-screen h-[100dvh] w-screen overflow-hidden bg-[#f8fafc] text-[#0f172a] antialiased">
      <PatientPortal
        signedIn={!!user}
        currentUser={user ? { name: user.name, role: user.role, email: user.email } : null}
        clinicInfo={info}
        slotCount={slotCount}
      />
    </main>
  );
}
