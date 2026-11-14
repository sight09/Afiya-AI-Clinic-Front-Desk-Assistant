"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { RoleSwitcherModal } from "@/components/auth/role-switcher-modal";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Copy,
  CreditCard,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Pill,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { BotanicalCorner, ClinicLogoIcon } from "@/components/ui/botanical-art";
import { printCard } from "@/lib/print";
import {
  Appointment,
  fmt,
  fmtDate,
  NotificationItem,
  Provider,
  Summary,
  VisitRecord,
} from "./types";

type DoctorTab = "schedule" | "records" | "review" | "notifications" | "profile";

const DOCTOR_TABS = [
  { id: "schedule", label: "My Schedule & Visits", icon: CalendarDays },
  { id: "records", label: "Patient EHR & History", icon: Stethoscope },
  { id: "review", label: "AI Intake Review Queue", icon: ClipboardCheck },
  { id: "notifications", label: "Notifications & Alerts", icon: BellRing },
  { id: "profile", label: "Clinical Profile & Hours", icon: UserCheck },
] as const;

const TAB_DESCRIPTIONS: Record<DoctorTab, string> = {
  schedule: "Daily clinical calendar, scheduled consultations, and visit progress.",
  records: "Comprehensive electronic health records, diagnostic plans, and patient medical history.",
  review: "Review and verify AI-generated patient intake summaries and clinical risk flags.",
  notifications: "Urgent medical escalations, staff alerts, and appointment modification requests.",
  profile: "Physician medical credentials, clinic hours, consultation rates, and department assignment.",
};

export function DoctorDashboard({ user }: { user: { name: string; role: string; email?: string } }) {
  const [tab, setTab] = useState<DoctorTab>("schedule");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [records, setRecords] = useState<VisitRecord[]>([]);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const unreadNotifications = useMemo(() => notificationsList.filter((n) => !n.read).length, [notificationsList]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [copiedStaffId, setCopiedStaffId] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  // Clinical Document Visit Modal
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [newConsult, setNewConsult] = useState({
    patientId: "",
    providerId: "",
    appointmentId: "",
    chiefComplaint: "",
    clinicalNotes: "",
    diagnosis: "",
    treatmentPlan: "",
    bloodPressure: "120/80 mmHg",
    heartRate: "72 bpm",
    temperature: "98.6 °F",
    medication: "",
    dosage: "",
    followUpInstructions: "Follow up in 2 weeks or if symptoms persist.",
    createInvoice: true,
  });
  const [consultBusy, setConsultBusy] = useState(false);

  // Doctor Cancellation / Reschedule Request Modal
  const [requestModalAppt, setRequestModalAppt] = useState<Appointment | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestType, setRequestType] = useState<"cancellation" | "reschedule">("cancellation");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [a, r, s, p, n] = await Promise.all([
      fetch("/api/appointments").then((res) => (res.ok ? res.json() : { appointments: [] })),
      fetch("/api/records").then((res) => (res.ok ? res.json() : { records: [] })),
      fetch("/api/summaries").then((res) => (res.ok ? res.json() : { summaries: [] })),
      fetch("/api/providers").then((res) => (res.ok ? res.json() : { providers: [] })),
      fetch("/api/notifications").then((res) => (res.ok ? res.json() : { notifications: [], unreadCount: 0 })),
    ]);
    setAppointments(a.appointments ?? []);
    setRecords(r.records ?? []);
    setSummaries(s.summaries ?? []);
    setProviders(p.providers ?? []);
    setNotificationsList(n.notifications ?? []);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Deduplicated list of patients for clinical documentation
  const patientOptions = useMemo(() => {
    const patientMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        latestAppointmentId?: string;
        latestReason?: string;
      }
    >();

    for (const a of appointments) {
      if (!a.patientId) continue;
      const existing = patientMap.get(a.patientId);
      if (!existing) {
        patientMap.set(a.patientId, {
          id: a.patientId,
          name: a.patientName || "Unknown Patient",
          email: a.patientEmail || "",
          latestAppointmentId: a.id,
          latestReason: a.reason || "",
        });
      } else {
        if ((!existing.name || existing.name === "Unknown Patient") && a.patientName) {
          existing.name = a.patientName;
        }
        if (!existing.email && a.patientEmail) {
          existing.email = a.patientEmail;
        }
        if (a.status === "in_consultation" || a.status === "confirmed") {
          existing.latestAppointmentId = a.id;
          if (a.reason) existing.latestReason = a.reason;
        }
      }
    }

    for (const r of records) {
      if (!r.patientId) continue;
      if (!patientMap.has(r.patientId)) {
        patientMap.set(r.patientId, {
          id: r.patientId,
          name: r.patientName || "Unknown Patient",
          email: r.patientEmail || "",
        });
      }
    }

    return Array.from(patientMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments, records]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  async function markNotificationAsRead(id: string) {
    setNotificationsList((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      /* ignore */
    }
  }

  async function markAllNotificationsRead() {
    setNotificationsList((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
    } catch {
      /* ignore */
    }
  }

  const copyStaffId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedStaffId(true);
    setTimeout(() => setCopiedStaffId(false), 2000);
  };

  async function updateStatus(appointmentId: string, status: string) {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d?.error?.message ?? "Status update failed.");
      }
      await loadData();
    } catch {
      alert("Network error updating status.");
    }
  }

  async function handleDoctorRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!requestModalAppt || !requestReason.trim()) return;
    setRequestBusy(true);
    setRequestSuccess(null);
    try {
      const res = await fetch(`/api/appointments/${requestModalAppt.id}/request-cancellation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reason: requestReason.trim(),
          type: requestType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to submit request.");
      }
      setRequestSuccess(data.message);
      setTimeout(() => {
        setRequestModalAppt(null);
        setRequestReason("");
        setRequestSuccess(null);
      }, 1500);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setRequestBusy(false);
    }
  }

  async function submitConsultation(e: React.FormEvent) {
    e.preventDefault();
    setConsultBusy(true);
    try {
      const myProvider =
        providers.find(
          (p) =>
            p.name.toLowerCase().includes(user.name.toLowerCase()) ||
            user.name.toLowerCase().includes(p.name.toLowerCase().replace(/^(dr\.|nurse)\s+/i, "")) ||
            (user.email && p.contactEmail?.toLowerCase() === user.email.toLowerCase())
        ) || providers[0];
      const defaultProvId = newConsult.providerId || myProvider?.id || providers[0]?.id;
      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId: newConsult.patientId,
          providerId: defaultProvId,
          appointmentId: newConsult.appointmentId || undefined,
          chiefComplaint: newConsult.chiefComplaint,
          clinicalNotes: newConsult.clinicalNotes,
          diagnosis: newConsult.diagnosis,
          treatmentPlan: newConsult.treatmentPlan,
          vitals: {
            bloodPressure: newConsult.bloodPressure,
            heartRate: newConsult.heartRate,
            temperature: newConsult.temperature,
          },
          prescriptions: newConsult.medication
            ? [{ medication: newConsult.medication, dosage: newConsult.dosage || "As directed" }]
            : [],
          followUpInstructions: newConsult.followUpInstructions,
          createInvoice: newConsult.createInvoice,
        }),
      });
      if (res.ok) {
        setShowConsultModal(false);
        setNewConsult({
          patientId: "",
          providerId: "",
          appointmentId: "",
          chiefComplaint: "",
          clinicalNotes: "",
          diagnosis: "",
          treatmentPlan: "",
          bloodPressure: "120/80 mmHg",
          heartRate: "72 bpm",
          temperature: "98.6 °F",
          medication: "",
          dosage: "",
          followUpInstructions: "Follow up in 2 weeks or if symptoms persist.",
          createInvoice: true,
        });
        await loadData();
      } else {
        const d = await res.json();
        alert(d?.error?.message ?? "Failed to save record.");
      }
    } finally {
      setConsultBusy(false);
    }
  }

  async function reviewDraft(id: string, decision: "approved" | "rejected") {
    await fetch(`/api/summaries/${id}/review`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    await loadData();
  }

  const drafts = summaries.filter((s) => s.status === "draft");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased flex flex-col lg:flex-row">
      {/* ----------------- DOCTOR SIDEBAR ----------------- */}
      {/* ----------------- DOCTOR SIDEBAR ----------------- */}
      {/* ----------------- DOCTOR SIDEBAR ----------------- */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 transform bg-[#0b192c] text-[#e2e8f0] border-r border-[#0f2744] transition-all duration-300 ease-in-out lg:static flex flex-col justify-between shrink-0 overflow-hidden ${
          sidebarOpen ? "w-64 xl:w-72" : "w-16 lg:w-[70px]"
        } ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {sidebarOpen ? (
          <div className="p-4 flex flex-col flex-1 overflow-y-auto thin-scroll">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#0f2744] p-1 flex items-center justify-center shadow-xs border border-sky-400/30 shrink-0">
                  <img src="/afiya-icon.png?v=3" alt="Afiya" className="h-full w-full object-contain filter drop-shadow-xs" />
                </div>
                <div>
                  <p className="font-display text-[18px] font-medium text-white tracking-tight leading-none">Afiya</p>
                  <p className="font-sans text-[12px] font-normal tracking-normal text-sky-300 mt-0.5">Clinician Station</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  title="Collapse sidebar"
                  className="hidden lg:flex p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="lg:hidden p-1.5 rounded-full hover:bg-white/10 text-white/70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="mt-4 space-y-1">
              <p className="px-2 pb-1.5 text-[13px] font-normal text-white/60 normal-case">
                Clinical workspace
              </p>
              {DOCTOR_TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                const count = t.id === "review" ? drafts.length : t.id === "notifications" ? unreadNotifications : 0;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(t.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-[15px] transition-all cursor-pointer ${
                      active
                        ? "font-medium text-white bg-white/10 border-l-[3px] border-[#0ea5e9] shadow-xs"
                        : "font-normal text-[#64748b] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-[19px] w-[19px] shrink-0 ${active ? "text-[#0ea5e9]" : "text-[#475569]"}`} />
                      <span>{t.label}</span>
                    </div>
                    {count > 0 && (
                      <span className="rounded-full bg-[#0ea5e9] px-2 py-0.5 text-[11px] font-bold text-[#0b192c]">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Quick Actions */}
            <div className="mt-5 pt-3.5 border-t border-white/10 space-y-2">
              <p className="px-2 text-[10px] font-bold tracking-wider text-white/40 uppercase">Clinical Actions</p>
              <button
                onClick={() => {
                  setShowConsultModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] px-3 py-2 text-xs font-bold text-white hover:from-[#0369a1] hover:to-[#075985] transition-all shadow-md active:scale-98 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Document Visit</span>
              </button>
            </div>

            {/* Profile & Status Capsule at the Bottom */}
            <div className="mt-auto pt-4 border-t border-white/10 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowUserProfileModal(true)}
                className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors cursor-pointer group"
                title="View Clinician Profile"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-sky-400/20 text-sky-300 font-bold text-xs group-hover:scale-105 transition-transform">
                    MD
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                      <p className="text-[10px] text-sky-300 capitalize font-medium">Attending Physician</p>
                    </div>
                  </div>
                  <User className="h-3.5 w-3.5 text-white/40 group-hover:text-white transition-colors" />
                </div>
              </button>

              <div className="pt-1 text-xs text-white/50 flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] font-semibold text-white/80">Afiya EHR</p>
                  <p className="text-[10px] text-white/40">Doctor Station · Certified</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-sky-400" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 px-2 h-full justify-between">
            <div className="flex flex-col items-center gap-4 w-full">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                title="Click to expand sidebar"
                className="relative group h-10 w-10 rounded-xl hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
              >
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#0284c7] to-[#0f2744] p-1 flex items-center justify-center shadow-xs border border-sky-400/30 transition-all duration-200 group-hover:opacity-0 group-hover:scale-75">
                  <img
                    src="/afiya-icon.png?v=3"
                    alt="Afiya"
                    className="h-full w-full object-contain filter drop-shadow-xs"
                  />
                </div>
                <PanelLeft className="h-5 w-5 text-sky-400 absolute opacity-0 scale-75 transition-all duration-200 group-hover:opacity-100 group-hover:scale-100" />
              </button>

              <nav className="w-full space-y-1.5 mt-2">
                {DOCTOR_TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  const count = t.id === "review" ? drafts.length : t.id === "notifications" ? unreadNotifications : 0;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      title={t.label}
                      className={`w-full relative flex items-center justify-center p-2.5 rounded-xl transition-all cursor-pointer ${
                        active
                          ? "bg-[#0c213b] text-white shadow-xs"
                          : "text-[#64748b] hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-[#0ea5e9]" : "text-[#64748b]"}`} />
                      {count > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#0ea5e9]" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="w-full pt-3 border-t border-white/10 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowConsultModal(true)}
                  title="Document Visit"
                  className="h-9 w-9 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#0284c7] to-[#0369a1] text-white hover:from-[#0369a1] hover:to-[#075985] transition-all shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="w-full pt-3 border-t border-white/10 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUserProfileModal(true)}
                title={`Clinician: ${user.name}`}
                className="h-8 w-8 rounded-lg bg-sky-400/20 text-sky-300 hover:bg-sky-400/30 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                MD
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-[76px] py-3.5 px-4 sm:px-8 border-b border-[#e2e8f0] bg-white/95 backdrop-blur-md sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[#e2e8f0] bg-white text-[#0f2744] hover:bg-[#f1f5f9] shadow-2xs cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#f0f7ff] text-[#0284c7] border border-[#e2e8f0]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] animate-pulse" />
                  Physician Station
                </span>
                <span className="text-[12px] text-[#64748b]">/</span>
                <span className="text-[12px] font-medium text-[#475569] truncate">
                  {DOCTOR_TABS.find((t) => t.id === tab)?.label}
                </span>
              </div>
              <h1 className="font-display text-[22px] sm:text-[24px] font-bold text-[#0f2744] tracking-tight leading-tight">
                {DOCTOR_TABS.find((t) => t.id === tab)?.label}
              </h1>
              <p className="text-[13px] text-[#475569] mt-0.5 font-normal line-clamp-1">
                {TAB_DESCRIPTIONS[tab]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto sm:ml-0">
            {/* Refresh Data Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh physician schedule & data"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#1e293b] hover:bg-[#f8fafc] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#0284c7] ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-6 lg:p-8 flex-1 overflow-y-auto">
          {/* TAB 1: DOCTOR SCHEDULE */}
          {tab === "schedule" && (
            <div className="space-y-6 max-w-6xl">

              <div className="overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xs">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#f0f7ff] text-[12px] text-[#475569] font-medium normal-case border-b border-[#e2e8f0]">
                    <tr>
                      <th className="px-5 py-3 font-medium">Time</th>
                      <th className="px-5 py-3 font-medium">Patient</th>
                      <th className="px-5 py-3 font-medium">Chief Reason</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Clinical Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f7ff]">
                    {appointments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-[#64748b]">
                          No appointments assigned for your schedule.
                        </td>
                      </tr>
                    ) : (
                      appointments.map((a) => (
                        <tr key={a.id} className="hover:bg-[#f8fafc] transition-colors">
                          <td className="px-5 py-3.5 font-medium text-[#0f2744]">{fmt(a.startAt)}</td>
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-[#0f2744]">{a.patientName}</p>
                            <p className="text-[10px] text-[#64748b]">{a.patientEmail}</p>
                          </td>
                          <td className="px-5 py-3.5 text-[#1e293b] max-w-44 truncate">{a.reason || "General Consultation"}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase border ${
                                a.status === "confirmed"
                                  ? "bg-sky-100 text-blue-800 border-sky-200"
                                  : a.status === "checked_in"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : a.status === "in_consultation"
                                  ? "bg-purple-100 text-purple-800 border-purple-200"
                                  : a.status === "completed"
                                  ? "bg-sky-100 text-blue-900 border-sky-300"
                                  : a.status === "cancellation_requested" || a.status === "reschedule_requested"
                                  ? "bg-amber-100 text-amber-800 border-amber-200"
                                  : "bg-rose-100 text-rose-800 border-rose-200"
                              }`}
                            >
                              {a.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex justify-end gap-1.5">
                              {a.status === "checked_in" && (
                                <button
                                  onClick={() => updateStatus(a.id, "in_consultation")}
                                  className="rounded-full bg-purple-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-purple-700 shadow-2xs cursor-pointer"
                                >
                                  Start Consult
                                </button>
                              )}
                              {a.status === "in_consultation" && (
                                <>
                                  <button
                                    onClick={() => {
                                      setNewConsult((prev) => ({
                                        ...prev,
                                        patientId: a.patientId,
                                        appointmentId: a.id,
                                        chiefComplaint: a.reason || "Scheduled Consultation",
                                      }));
                                      setShowConsultModal(true);
                                    }}
                                    className="rounded-full bg-[#0f2744] px-3 py-1 text-[11px] font-bold text-white hover:bg-[#0c213b] shadow-2xs cursor-pointer"
                                  >
                                    Document Visit
                                  </button>
                                  <button
                                    onClick={() => updateStatus(a.id, "completed")}
                                    className="rounded-full bg-blue-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-blue-700 shadow-2xs cursor-pointer"
                                  >
                                    Complete
                                  </button>
                                </>
                              )}
                              {a.status !== "cancelled" && a.status !== "completed" && a.status !== "cancellation_requested" && (
                                <button
                                  onClick={() => {
                                    setRequestModalAppt(a);
                                    setRequestReason("");
                                    setRequestType("cancellation");
                                  }}
                                  className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100 cursor-pointer"
                                  title="Submit request to front-desk reception"
                                >
                                  Request Cancel/Reschedule
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PATIENT EHR & CHARTS */}
          {tab === "records" && (
            <div className="space-y-6 max-w-6xl">

              <div className="grid gap-4 sm:grid-cols-2">
                {records.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#f0f7ff]">
                      <div>
                        <p className="font-bold text-[#0f2744] text-sm">{r.patientName}</p>
                        <p className="text-[10px] text-[#64748b]">{r.patientEmail}</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#0284c7]">{fmtDate(r.visitDate)}</span>
                    </div>
                    <div className="text-xs space-y-2 text-[#1e293b]">
                      <p><strong className="text-[#475569]">Chief Complaint:</strong> {r.chiefComplaint}</p>
                      <p><strong className="text-[#475569]">Vitals:</strong> BP: {r.vitals.bloodPressure || "—"} · HR: {r.vitals.heartRate || "—"}</p>
                      <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                        <p className="text-[10px] font-bold text-[#475569] uppercase">Clinical Exam Notes:</p>
                        <p className="text-[#0f172a] mt-0.5">{r.clinicalNotes}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-[#fbf9f1] border border-[#ebdcb9]">
                        <p className="text-[10px] font-bold text-[#94691e] uppercase">Diagnosis (Human Physician):</p>
                        <p className="font-semibold text-[#0f2744] mt-0.5">{r.diagnosis}</p>
                      </div>
                      {r.prescriptions && r.prescriptions.length > 0 && (
                        <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                          <p className="text-[10px] font-bold text-purple-800 uppercase">Prescriptions:</p>
                          <ul className="mt-1 list-disc list-inside text-purple-950">
                            {r.prescriptions.map((p, idx) => (
                              <li key={idx}>{p.medication} · {p.dosage}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: AI REVIEW QUEUE */}
          {tab === "review" && (
            <div className="space-y-6 max-w-6xl">

              {drafts.length === 0 ? (
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-12 text-center shadow-2xs">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                  <p className="text-sm font-semibold text-[#0f2744]">Review queue is empty</p>
                  <p className="text-xs text-[#64748b] mt-1">No AI drafts pending physician review.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {drafts.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-[#f0f7ff]">
                        <span className="text-[10px] font-bold text-[#0284c7] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200 uppercase">AI Intake Draft</span>
                        <span className="text-[10px] text-[#64748b]">{fmt(d.createdAt)}</span>
                      </div>
                      <p className="text-xs text-[#1e293b] leading-relaxed italic bg-[#f8fafc] p-3 rounded-xl border border-[#e2e8f0]">&quot;{d.draft}&quot;</p>
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => reviewDraft(d.id, "rejected")}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => reviewDraft(d.id, "approved")}
                          className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs cursor-pointer"
                        >
                          Approve Draft
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: NOTIFICATIONS & ALERTS */}
          {tab === "notifications" && (
            <div className="space-y-6 max-w-6xl">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-2.5">
                  <span className="rounded-full bg-[#f0f7ff] text-[#0284c7] border border-[#e2e8f0] px-3.5 py-1 text-xs font-bold">
                    {notificationsList.length} Total Alerts
                  </span>
                  {unreadNotifications > 0 ? (
                    <span className="rounded-full bg-rose-100 text-rose-800 border border-rose-300 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      {unreadNotifications} Unread
                    </span>
                  ) : (
                    <span className="rounded-full bg-sky-100 text-blue-800 border border-sky-300 px-3 py-1 text-xs font-medium flex items-center gap-1">
                      <Check className="h-3 w-3 text-blue-600" /> All caught up
                    </span>
                  )}
                </div>

                {unreadNotifications > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0f2744] hover:bg-[#f8fafc] transition-colors cursor-pointer shadow-2xs"
                  >
                    <CheckCheck className="h-3.5 w-3.5 text-[#0284c7]" />
                    <span>Mark all as read</span>
                  </button>
                )}
              </div>

              {notificationsList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-white p-12 text-center shadow-2xs">
                  <BellRing className="mx-auto h-8 w-8 text-[#64748b]" />
                  <p className="mt-3 text-xs text-[#64748b]">No notifications at this time.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notificationsList.map((n) => {
                    const isUnread = !n.read;
                    return (
                      <div
                        key={n.id}
                        className={`rounded-2xl border p-4 transition-all flex items-start gap-3.5 shadow-2xs ${
                          isUnread
                            ? "border-sky-300 bg-gradient-to-r from-sky-50/60 to-white"
                            : "border-[#e2e8f0] bg-white hover:bg-[#f8fafc]"
                        }`}
                      >
                        <div
                          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                            isUnread
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-[#d49b35]/15 text-[#d49b35]"
                          }`}
                        >
                          <BellRing className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-xs font-bold ${isUnread ? "text-[#0284c7]" : "text-[#0f2744]"}`}>
                                {n.title}
                              </h4>
                              {isUnread && (
                                <span className="rounded-full bg-rose-500/15 text-rose-700 px-2 py-0.5 text-[10px] font-bold">
                                  New
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[#64748b] font-mono">
                              {fmtDate(n.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#1e293b] leading-relaxed">{n.message}</p>
                        </div>

                        {/* Action: Mark as read button */}
                        <div className="shrink-0 self-center">
                          {isUnread ? (
                            <button
                              type="button"
                              onClick={() => markNotificationAsRead(n.id)}
                              title="Mark this notification as read"
                              className="inline-flex items-center gap-1 rounded-lg border border-[#e2e8f0] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0f2744] hover:bg-[#f0f7ff] hover:text-[#0284c7] transition-colors shadow-2xs cursor-pointer"
                            >
                              <Check className="h-3 w-3 text-blue-600" />
                              <span className="hidden sm:inline">Mark read</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#64748b] font-medium px-2 py-1">
                              <Check className="h-3 w-3 text-[#64748b]" />
                              <span className="hidden sm:inline">Read</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CLINICAL PROFILE */}
          {tab === "profile" && (
            <div className="space-y-8 max-w-4xl mx-auto py-2">
              {(() => {
                const myProvider =
                  providers.find(
                    (p) =>
                      p.name.toLowerCase().includes(user.name.toLowerCase()) ||
                      user.name.toLowerCase().includes(p.name.toLowerCase().replace(/^(dr\.|nurse)\s+/i, "")) ||
                      (user.email && p.contactEmail?.toLowerCase() === user.email.toLowerCase())
                  ) || providers[0];
                const staffId = `AFIYA-MD-${(myProvider?.id || "001").slice(-4).toUpperCase()}`;
                const licenseNumber = `MED-ET-${(myProvider?.id || "9281").slice(-5).toUpperCase()}`;

                return (
                  <div className="flex flex-col items-center w-full">
                    {/* Outer Centered Apple Wallet / Medical Pass Card - Rectangular Landscape Format */}
                    <div id="doctor-credential-card" className="w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-[#0f2744]/25 bg-gradient-to-br from-[#0c213b] via-[#0f2744] to-[#0f2744] text-white relative">
                      {/* Decorative Gold & Botanical Accents */}
                      <div className="absolute top-0 right-0 w-96 h-96 bg-radial from-sky-500/20 via-sky-400/5 to-transparent rounded-full blur-2xl pointer-events-none" />
                      <div className="absolute bottom-0 left-0 w-80 h-80 bg-radial from-[#0ea5e9]/15 to-transparent rounded-full blur-2xl pointer-events-none" />
                      <BotanicalCorner className="absolute top-2 right-2 w-32 h-32 text-white/5 pointer-events-none" />

                      {/* Card Content - Wide Rectangular 2-Column Grid */}
                      <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch relative z-10">
                        {/* Left Column: Clinician Credentials & Identity */}
                        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
                          {/* Top Branding Strip */}
                          <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10">
                            <div className="flex items-center gap-2.5">
                              <div className="h-9 w-9 rounded-xl bg-white/10 border border-white/20 grid place-items-center backdrop-blur-md shadow-xs">
                                <ClinicLogoIcon className="h-5 w-5 text-sky-400" />
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold tracking-widest text-sky-300">
                                  Afiya Medical Center
                                </span>
                                <h4 className="text-xs font-semibold tracking-wide text-white/90">
                                  Official Clinician Credential
                                </h4>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30 backdrop-blur-md">
                              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                              Verified Clinician
                            </span>
                          </div>

                          {/* Physician Avatar & Title */}
                          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
                            <div className="relative shrink-0">
                              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#0284c7] via-[#0ea5e9] to-[#0f2744] p-0.5 shadow-xl">
                                <div className="h-full w-full rounded-[14px] bg-[#0b192c] flex items-center justify-center text-2xl font-bold text-sky-200">
                                  MD
                                </div>
                              </div>
                              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-sky-500 border-2 border-[#0c213b] flex items-center justify-center">
                                <Check className="h-3.5 w-3.5 text-white" />
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight">
                                {myProvider?.name || user.name}
                              </h2>
                              <p className="text-sm font-semibold text-[#f3cf7a] mt-1">
                                {myProvider?.title || "Consultant Physician"} · {myProvider?.specialty || "Internal Medicine"}
                              </p>
                              <p className="text-xs text-white/70 mt-1 line-clamp-1">
                                {myProvider?.departmentName || "Department of Clinical Medicine & Outpatient Services"}
                              </p>

                              {/* Credentials Pills */}
                              <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                                <button
                                  type="button"
                                  onClick={() => copyStaffId(staffId)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white/90 transition-colors cursor-pointer text-[11px] font-mono"
                                  title="Click to copy staff ID"
                                >
                                  <span>ID: {staffId}</span>
                                  {copiedStaffId ? (
                                    <Check className="h-3 w-3 text-sky-400" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-white/60" />
                                  )}
                                </button>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 border border-white/15 text-white/80 text-[11px] font-mono">
                                  Lic #{licenseNumber}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-400/25 text-sky-300 text-[11px] font-semibold">
                                  Fee: ${myProvider?.consultationFee || 90}.00
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Quick Location & Security Pill */}
                          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-white/80 border-t border-white/10">
                            <span className="flex items-center gap-1.5">
                              <Building2 className="h-3.5 w-3.5 text-sky-300" />
                              <span>{myProvider?.roomNumber || "Suite 102 - West Wing"}</span>
                            </span>
                            <span className="text-white/30">·</span>
                            <span className="flex items-center gap-1.5">
                              <Mail className="h-3.5 w-3.5 text-sky-300" />
                              <span className="font-mono text-[11px] truncate max-w-[200px]">
                                {myProvider?.contactEmail || user.email || "dr.meyer@afiyaclinic.com"}
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Right Column: Practice Hours, EMR Scan & Clinical Access Badge */}
                        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-black/25 backdrop-blur-md p-4 sm:p-5 border border-white/15 space-y-4">
                          <div>
                            <div className="flex items-center justify-between text-xs text-white/70 mb-1">
                              <span className="flex items-center gap-1.5 font-medium text-white/90">
                                <CalendarDays className="h-3.5 w-3.5 text-sky-300" />
                                Practice Hours
                              </span>
                              <span className="font-semibold text-sky-300">In Practice</span>
                            </div>
                            <p className="text-xs font-semibold text-white pl-5">
                              {myProvider?.workingHours || "Mon – Fri · 09:00 – 16:00"}
                            </p>
                          </div>

                          {/* EMR Authorization Scan QR */}
                          <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3.5">
                            <div className="p-2 rounded-lg bg-white text-[#0c213b] shrink-0 shadow-sm">
                              <QrCode className="h-9 w-9" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white">Hospital EMR Auth Scan</p>
                              <p className="text-[11px] text-white/60 leading-tight mt-0.5">
                                Kiosk &amp; pharmacy clinician verification
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                                  Level 4 Access
                                </span>
                                <span className="text-[10px] text-white/50">Exp: Dec 2027</span>
                              </div>
                            </div>
                          </div>

                          {/* Quick In-Card Print & Copy Actions */}
                          <div className="grid grid-cols-2 gap-2 pt-1 no-print">
                            <button
                              type="button"
                              onClick={() => printCard("doctor-credential-card")}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5 text-sky-300" />
                              <span>Print Card</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copyStaffId(staffId)}
                              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
                            >
                              {copiedStaffId ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-sky-400" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5 text-sky-300" />
                                  <span>Copy ID</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Additional Clinical Privileges & Accreditation Summary Box */}
                    <div className="mt-8 w-full max-w-4xl rounded-2xl border border-[#e2e8f0] bg-white p-6 shadow-2xs text-[#0f172a] space-y-4">
                      <div className="flex items-center justify-between border-b border-[#f0f7ff] pb-3">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="h-5 w-5 text-blue-600" />
                          <h3 className="font-display text-base font-bold text-[#0f2744]">
                            Active Clinical Privileges &amp; Scope
                          </h3>
                        </div>
                        <span className="text-[11px] font-semibold text-blue-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                          Active · Good Standing
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                          <span className="h-2 w-2 rounded-full bg-sky-500 mt-1 shrink-0" />
                          <div>
                            <p className="font-semibold text-[#0f2744]">Inpatient &amp; Outpatient Consultations</p>
                            <p className="text-[11px] text-[#475569] mt-0.5">Authorized for direct clinical evaluations and triage.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                          <span className="h-2 w-2 rounded-full bg-sky-500 mt-1 shrink-0" />
                          <div>
                            <p className="font-semibold text-[#0f2744]">Electronic Prescriptions (e-Rx)</p>
                            <p className="text-[11px] text-[#475569] mt-0.5">DEA Schedule II-V digital prescribing credentials.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                          <span className="h-2 w-2 rounded-full bg-sky-500 mt-1 shrink-0" />
                          <div>
                            <p className="font-semibold text-[#0f2744]">Diagnostic &amp; Lab Ordering</p>
                            <p className="text-[11px] text-[#475569] mt-0.5">Direct orders to clinical pathology and imaging.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0]">
                          <span className="h-2 w-2 rounded-full bg-sky-500 mt-1 shrink-0" />
                          <div>
                            <p className="font-semibold text-[#0f2744]">Telehealth &amp; Remote Review</p>
                            <p className="text-[11px] text-[#475569] mt-0.5">AI intake validation and remote follow-up care.</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-[#64748b] pt-2 border-t border-[#f0f7ff] leading-relaxed">
                        Clinician profile managed by Afiya Clinic Medical Board. Any update to consultation rates, licensed scope, or practice hours must be submitted to the Clinical Administration Office.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: DOCTOR CANCELLATION / RESCHEDULE REQUEST */}
      {requestModalAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-2xl text-[#0f172a] space-y-4">
            <div className="flex items-center gap-2.5 text-amber-700">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-display text-base font-bold">Submit Schedule Adjustment Request</h3>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              As a physician, you cannot cancel patient bookings directly. Submitting this request alerts the front desk to notify <strong>{requestModalAppt.patientName}</strong> and manage clinic scheduling.
            </p>
            {requestSuccess && (
              <p className="rounded-xl bg-sky-100 border border-sky-200 p-2.5 text-xs text-blue-800 font-semibold">{requestSuccess}</p>
            )}
            <form onSubmit={handleDoctorRequest} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Request Type</label>
                <select
                  value={requestType}
                  onChange={(e) => setRequestType(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                >
                  <option value="cancellation">Request Cancellation (Cannot Attend)</option>
                  <option value="reschedule">Request Reschedule (Different Time Needed)</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Physician Reason * (Required)</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why you cannot attend (e.g. Emergency surgery rotation, clinical conference, illness)…"
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRequestModalAppt(null)}
                  className="rounded-full border border-[#e2e8f0] px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestBusy || !requestReason.trim()}
                  className="rounded-full bg-[#0f2744] px-4 py-2 text-xs font-bold text-white hover:bg-[#0c213b] shadow-xs disabled:opacity-50"
                >
                  {requestBusy ? "Submitting…" : "Submit to Reception"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DOCUMENT VISIT */}
      {showConsultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-2xl text-[#0f172a] space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f7ff]">
              <h3 className="font-display text-base font-bold text-[#0f2744]">Clinical Visit Charting &amp; EHR</h3>
              <button onClick={() => setShowConsultModal(false)} className="text-[#64748b] hover:text-[#0f2744]">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitConsultation} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Patient *</label>
                <select
                  required
                  value={newConsult.patientId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const matchedPatient = patientOptions.find((p) => p.id === pid);
                    setNewConsult((prev) => ({
                      ...prev,
                      patientId: pid,
                      appointmentId: prev.appointmentId || matchedPatient?.latestAppointmentId || "",
                      chiefComplaint: prev.chiefComplaint || matchedPatient?.latestReason || "",
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                >
                  <option value="">Select Patient…</option>
                  {patientOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.email ? `(${p.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Chief Complaint *</label>
                <input
                  type="text"
                  required
                  value={newConsult.chiefComplaint}
                  onChange={(e) => setNewConsult({ ...newConsult, chiefComplaint: e.target.value })}
                  placeholder="e.g. Tension headache and cervical spine stiffness"
                  className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-[#1e3a5f] uppercase">Blood Pressure</label>
                  <input
                    type="text"
                    value={newConsult.bloodPressure}
                    onChange={(e) => setNewConsult({ ...newConsult, bloodPressure: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#1e3a5f] uppercase">Heart Rate</label>
                  <input
                    type="text"
                    value={newConsult.heartRate}
                    onChange={(e) => setNewConsult({ ...newConsult, heartRate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#1e3a5f] uppercase">Temperature</label>
                  <input
                    type="text"
                    value={newConsult.temperature}
                    onChange={(e) => setNewConsult({ ...newConsult, temperature: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Clinical Examination Notes *</label>
                <textarea
                  required
                  rows={3}
                  value={newConsult.clinicalNotes}
                  onChange={(e) => setNewConsult({ ...newConsult, clinicalNotes: e.target.value })}
                  placeholder="Physical exam findings, neurological status, auscultation…"
                  className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Physician Diagnosis * (Human)</label>
                <input
                  type="text"
                  required
                  value={newConsult.diagnosis}
                  onChange={(e) => setNewConsult({ ...newConsult, diagnosis: e.target.value })}
                  placeholder="Primary clinical diagnosis rendered by attending physician"
                  className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Medication</label>
                  <input
                    type="text"
                    value={newConsult.medication}
                    onChange={(e) => setNewConsult({ ...newConsult, medication: e.target.value })}
                    placeholder="e.g. Naproxen 500mg"
                    className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Dosage</label>
                  <input
                    type="text"
                    value={newConsult.dosage}
                    onChange={(e) => setNewConsult({ ...newConsult, dosage: e.target.value })}
                    placeholder="e.g. 1 tab PO BID with meals"
                    className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowConsultModal(false)}
                  className="rounded-full border border-[#e2e8f0] px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={consultBusy}
                  className="rounded-full bg-[#0f2744] px-4 py-2 text-xs font-bold text-white hover:bg-[#0c213b] shadow-xs disabled:opacity-50"
                >
                  {consultBusy ? "Saving…" : "Save & Finalize Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <RoleSwitcherModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        currentEmail="clinician@demo.clinic"
      />

      {/* ----------------- USER PROFILE MODAL ----------------- */}
      {showUserProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-sky-100">
            <button
              onClick={() => setShowUserProfileModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-[#0b192c] text-sky-400 font-display font-bold text-2xl flex items-center justify-center shadow-md border border-[#0f2744]">
                MD
              </div>
              <h3 className="mt-3.5 text-base font-bold text-[#0f2744]">{user.name}</h3>
              <span className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-50 text-blue-800 border border-sky-200">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                Staff · Certified Clinician
              </span>
              <p className="mt-1 text-xs text-[#475569]">{user.email || "clinician@demo.clinic"}</p>
            </div>

            <div className="mt-5 space-y-2 border-t border-[#f0f7ff] pt-4 text-xs">
              <div className="flex justify-between py-1 text-stone-600">
                <span className="text-stone-400">Staff ID</span>
                <span className="font-semibold text-[#0f2744]">CLN-9482-ATT</span>
              </div>
              <div className="flex justify-between py-1 text-stone-600">
                <span className="text-stone-400">Department</span>
                <span className="font-semibold text-[#0f2744]">Primary Care &amp; Internal Medicine</span>
              </div>
              <div className="flex justify-between py-1 text-stone-600">
                <span className="text-stone-400">Clinic Center</span>
                <span className="font-semibold text-[#0f2744]">Afiya Health Hub</span>
              </div>
              <div className="flex justify-between py-1 text-stone-600">
                <span className="text-stone-400">Session Status</span>
                <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                  Authenticated Active
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUserProfileModal(false);
                  setShowSignOutConfirm(true);
                }}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out of Account</span>
              </button>
              <button
                type="button"
                onClick={() => setShowUserProfileModal(false)}
                className="w-full rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- SIGN OUT CONFIRMATION MODAL ----------------- */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600 mb-3.5">
              <LogOut className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-stone-900">Are you sure you want to sign out?</h3>
            <p className="mt-1.5 text-xs text-stone-500 leading-relaxed">
              You will be safely logged out of your clinician workstation session.
            </p>
            <div className="mt-6 flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                disabled={isSigningOut}
                className="flex-1 rounded-xl border border-stone-200 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isSigningOut ? "Signing Out…" : "Yes, Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
