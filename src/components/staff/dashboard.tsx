"use client";

import { AdminDashboard } from "./admin-dashboard";
import { DoctorDashboard } from "./doctor-dashboard";
import { ReceptionistDashboard } from "./receptionist-dashboard";

export function StaffDashboard({ user }: { user: { name: string; role: string; email?: string } }) {
  if (user.role === "admin") {
    return <AdminDashboard user={user} />;
  }

  if (user.role === "clinician") {
    return <DoctorDashboard user={user} />;
  }

  if (user.role === "receptionist") {
    return <ReceptionistDashboard user={user} />;
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#f8fafc] text-[#0f172a] p-6 text-center">
      <div className="max-w-md rounded-3xl border border-[#e2e8f0] bg-white p-8 shadow-xl">
        <h2 className="text-[24px] font-semibold text-[#0f172a]">Access Restricted</h2>
        <p className="mt-2 text-[14px] text-[#475569]">
          Your account role does not have permission to view staff administrative consoles.
        </p>
        <a
          href="/"
          className="mt-6 inline-block rounded-xl bg-[#0284c7] px-5 py-2.5 text-[15px] font-medium text-white hover:bg-[#0369a1] shadow-xs"
        >
          Return to Patient Portal
        </a>
      </div>
    </div>
  );
}
