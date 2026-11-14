"use client";

import { useCallback, useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { RoleSwitcherModal } from "@/components/auth/role-switcher-modal";
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Edit3,
  FileText,
  Heart,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Phone,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { BotanicalCorner, ClinicLogoIcon } from "@/components/ui/botanical-art";
import { printCard } from "@/lib/print";
import {
  Appointment,
  fmt,
  fmtDate,
  Invoice,
  NotificationItem,
  PatientProfile,
  Provider,
} from "./types";

type ReceptionistTab =
  | "schedule"
  | "patient_profiles"
  | "cancellation_requests"
  | "automation"
  | "notifications"
  | "book_patient"
  | "providers"
  | "billing";

const RECEPTIONIST_TABS = [
  { id: "schedule", label: "Front-Desk Check-In", icon: CalendarDays },
  { id: "patient_profiles", label: "Patient Cards & Profiles", icon: QrCode },
  { id: "cancellation_requests", label: "Cancellation Requests", icon: CalendarCheck },
  { id: "automation", label: "Automated Reminders", icon: Clock },
  { id: "notifications", label: "Notifications & Inquiries", icon: BellRing },
  { id: "book_patient", label: "Book for Patient", icon: CalendarPlus },
  { id: "providers", label: "Doctor Availability & Rooms", icon: Stethoscope },
  { id: "billing", label: "Cashier & Checkout", icon: CreditCard },
] as const;

export function ReceptionistDashboard({ user }: { user: { name: string; role: string } }) {
  const [tab, setTab] = useState<ReceptionistTab>("schedule");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [notificationsList, setNotificationsList] = useState<NotificationItem[]>([]);
  const unreadNotifications = notificationsList.filter((n) => !n.read).length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/login");
    }
  }

  const [availableSlots, setAvailableSlots] = useState<{ slotId: string; startAt: string; providerName: string; departmentName: string; durationMin?: number }[]>([]);

  // Workflow Automation state
  const [dispatchBusy, setDispatchBusy] = useState(false);
  const [dispatchStatus, setDispatchStatus] = useState<{ sent: number; skipped: number; failed: number } | null>(null);

  // Direct Cancel Modal (requires reason)
  const [directCancelAppt, setDirectCancelAppt] = useState<Appointment | null>(null);
  const [directCancelReason, setDirectCancelReason] = useState("");
  const [directCancelBusy, setDirectCancelBusy] = useState(false);

  // Process Cancellation Request Modal
  const [processingRequest, setProcessingRequest] = useState<Appointment | null>(null);
  const [processNote, setProcessNote] = useState("");
  const [processBusy, setProcessBusy] = useState(false);

  // Book on behalf of patient state
  const [bookPatientMode, setBookPatientMode] = useState<"new" | "existing">("new");
  const [bookPatientName, setBookPatientName] = useState("");
  const [bookPatientEmail, setBookPatientEmail] = useState("");
  const [bookPatientPhone, setBookPatientPhone] = useState("");
  const [bookPatientDob, setBookPatientDob] = useState("");
  const [bookPatientGender, setBookPatientGender] = useState("Unspecified");
  const [bookDepartmentFilter, setBookDepartmentFilter] = useState("all");
  const [bookSlotId, setBookSlotId] = useState("");
  const [bookAppointmentType, setBookAppointmentType] = useState("In-Person Clinic Visit");
  const [bookUrgency, setBookUrgency] = useState("Routine");
  const [bookSymptomDuration, setBookSymptomDuration] = useState("2 - 3 Days");
  const [bookReason, setBookReason] = useState("");
  const [bookAllergies, setBookAllergies] = useState("None reported");
  const [bookInsuranceProvider, setBookInsuranceProvider] = useState("Self-Pay / Cash");
  const [bookInsurancePolicy, setBookInsurancePolicy] = useState("");
  const [bookSpecialNotes, setBookSpecialNotes] = useState("");
  const [bookBusy, setBookBusy] = useState(false);
  const [bookSuccess, setBookSuccess] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Cashier Pay Modal
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [payBusy, setPayBusy] = useState(false);
  const [billingSearch, setBillingSearch] = useState("");
  const [billingFilter, setBillingFilter] = useState<"all" | "pending" | "paid">("all");
  const [scheduleSearch, setScheduleSearch] = useState("");
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<string>("all");

  // Patient Cards & Profiles Registry State
  const [patientsList, setPatientsList] = useState<PatientProfile[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientFilingMode, setPatientFilingMode] = useState<"view_edit" | "file_new">("view_edit");
  const [copiedMemberId, setCopiedMemberId] = useState(false);

  // Edit Patient Profile State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editGender, setEditGender] = useState("unspecified");
  const [editAddress, setEditAddress] = useState("");
  const [editBloodGroup, setEditBloodGroup] = useState("");
  const [editAllergies, setEditAllergies] = useState("");
  const [editEmergencyName, setEditEmergencyName] = useState("");
  const [editEmergencyPhone, setEditEmergencyPhone] = useState("");
  const [editInsuranceProvider, setEditInsuranceProvider] = useState("");
  const [editInsurancePolicy, setEditInsurancePolicy] = useState("");
  const [editMedicalHistory, setEditMedicalHistory] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editSuccessMsg, setEditSuccessMsg] = useState(false);

  // File New Patient State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDob, setNewDob] = useState("");
  const [newGender, setNewGender] = useState("unspecified");
  const [newAddress, setNewAddress] = useState("");
  const [newBloodGroup, setNewBloodGroup] = useState("O+");
  const [newAllergies, setNewAllergies] = useState("None reported");
  const [newEmergencyName, setNewEmergencyName] = useState("");
  const [newEmergencyPhone, setNewEmergencyPhone] = useState("");
  const [newInsuranceProvider, setNewInsuranceProvider] = useState("Self-Pay / Cash");
  const [newInsurancePolicy, setNewInsurancePolicy] = useState("");
  const [newMedicalHistory, setNewMedicalHistory] = useState("");
  const [filingSaving, setFilingSaving] = useState(false);
  const [filingSuccessMsg, setFilingSuccessMsg] = useState(false);

  const selectPatient = useCallback((pat: PatientProfile) => {
    setSelectedPatientId(pat.id);
    setPatientFilingMode("view_edit");
    setEditName(pat.name || "");
    setEditEmail(pat.email || "");
    setEditPhone(pat.phone || "");
    setEditDob(pat.dateOfBirth || "");
    setEditGender(pat.gender || "unspecified");
    setEditAddress(pat.address || "");
    setEditBloodGroup(pat.bloodGroup || "");
    setEditAllergies(pat.allergies || "");
    setEditEmergencyName(pat.emergencyContactName || "");
    setEditEmergencyPhone(pat.emergencyContactPhone || "");
    setEditInsuranceProvider(pat.insuranceProvider || "");
    setEditInsurancePolicy(pat.insurancePolicyNumber || "");
    setEditMedicalHistory(pat.medicalHistory || "");
    setEditSuccessMsg(false);
  }, []);

  const openPatientProfile = useCallback((patientId: string) => {
    setTab("patient_profiles");
    const target = patientsList.find((p) => p.id === patientId);
    if (target) {
      selectPatient(target);
    } else {
      setSelectedPatientId(patientId);
      setPatientFilingMode("view_edit");
      fetch(`/api/patient/profile?patientId=${patientId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.patient) selectPatient(data.patient);
        })
        .catch(() => {});
    }
  }, [patientsList, selectPatient]);

  function copyMemberId(id: string) {
    void navigator.clipboard.writeText(id);
    setCopiedMemberId(true);
    setTimeout(() => setCopiedMemberId(false), 2000);
  }

  const loadData = useCallback(async () => {
    const [a, b, p, n, av, pats] = await Promise.all([
      fetch("/api/appointments").then((res) => (res.ok ? res.json() : { appointments: [] })),
      fetch("/api/billing").then((res) => (res.ok ? res.json() : { invoices: [] })),
      fetch("/api/providers").then((res) => (res.ok ? res.json() : { providers: [] })),
      fetch("/api/notifications").then((res) => (res.ok ? res.json() : { notifications: [], unreadCount: 0 })),
      fetch("/api/availability").then((res) => (res.ok ? res.json() : { slots: [] })),
      fetch("/api/patient/profile?list=true").then((res) => (res.ok ? res.json() : { patients: [] })),
    ]);
    setAppointments(a.appointments ?? []);
    setInvoicesList(b.invoices ?? []);
    setProviders(p.providers ?? []);
    setNotificationsList(n.notifications ?? []);
    setAvailableSlots(av.slots ?? []);
    const pRows: PatientProfile[] = pats.patients ?? [];
    setPatientsList(pRows);
  }, []);

  useEffect(() => {
    if (patientsList.length > 0 && !selectedPatientId) {
      selectPatient(patientsList[0]);
    }
  }, [patientsList, selectedPatientId, selectPatient]);

  async function handleUpdatePatient(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "update",
          patientId: selectedPatientId,
          name: editName.trim() || undefined,
          phone: editPhone.trim(),
          dateOfBirth: editDob,
          gender: editGender,
          address: editAddress.trim(),
          bloodGroup: editBloodGroup.trim(),
          allergies: editAllergies.trim(),
          emergencyContactName: editEmergencyName.trim(),
          emergencyContactPhone: editEmergencyPhone.trim(),
          insuranceProvider: editInsuranceProvider.trim(),
          insurancePolicyNumber: editInsurancePolicy.trim(),
          medicalHistory: editMedicalHistory.trim(),
        }),
      });

      if (res.ok) {
        setEditSuccessMsg(true);
        setTimeout(() => setEditSuccessMsg(false), 4000);
        await loadData();
      } else {
        const d = await res.json().catch(() => null);
        alert(d?.error?.message || "Failed to update patient profile.");
      }
    } catch {
      alert("Network error updating patient profile.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleFileNewPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) {
      alert("Patient name and email are required to file a profile.");
      return;
    }
    setFilingSaving(true);
    try {
      const res = await fetch("/api/patient/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "create",
          name: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          phone: newPhone.trim(),
          dateOfBirth: newDob,
          gender: newGender,
          address: newAddress.trim(),
          bloodGroup: newBloodGroup.trim(),
          allergies: newAllergies.trim() || "None reported",
          emergencyContactName: newEmergencyName.trim(),
          emergencyContactPhone: newEmergencyPhone.trim(),
          insuranceProvider: newInsuranceProvider.trim() || "Self-Pay / Cash",
          insurancePolicyNumber: newInsurancePolicy.trim(),
          medicalHistory: newMedicalHistory.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setFilingSuccessMsg(true);
        setTimeout(() => setFilingSuccessMsg(false), 4000);
        setNewName("");
        setNewEmail("");
        setNewPhone("");
        setNewDob("");
        setNewGender("unspecified");
        setNewAddress("");
        setNewBloodGroup("O+");
        setNewAllergies("None reported");
        setNewEmergencyName("");
        setNewEmergencyPhone("");
        setNewInsuranceProvider("Self-Pay / Cash");
        setNewInsurancePolicy("");
        setNewMedicalHistory("");

        await loadData();
        if (data.patientId) {
          setSelectedPatientId(data.patientId);
          setPatientFilingMode("view_edit");
        }
      } else {
        const d = await res.json().catch(() => null);
        alert(d?.error?.message || "Failed to file new patient profile.");
      }
    } catch {
      alert("Network error filing patient profile.");
    } finally {
      setFilingSaving(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [loadData]);

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

  async function handleDirectCancel() {
    if (!directCancelAppt || !directCancelReason.trim()) return;
    setDirectCancelBusy(true);
    try {
      const res = await fetch(`/api/appointments/${directCancelAppt.id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: directCancelReason.trim() }),
      });
      if (res.ok) {
        setDirectCancelAppt(null);
        setDirectCancelReason("");
        await loadData();
      } else {
        const d = await res.json();
        alert(d?.error?.message ?? "Cancellation failed.");
      }
    } finally {
      setDirectCancelBusy(false);
    }
  }

  async function handleProcessRequest(approved: boolean) {
    if (!processingRequest) return;
    setProcessBusy(true);
    try {
      const res = await fetch(`/api/appointments/${processingRequest.id}/process-cancellation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ approved, reviewNote: processNote.trim() }),
      });
      if (res.ok) {
        setProcessingRequest(null);
        setProcessNote("");
        await loadData();
      } else {
        const d = await res.json();
        alert(d?.error?.message ?? "Processing failed.");
      }
    } finally {
      setProcessBusy(false);
    }
  }

  const TAB_DESCRIPTIONS: Record<ReceptionistTab, string> = {
    schedule: "Real-time front-desk patient arrival tracking, check-ins, and doctor queue management.",
    patient_profiles: "File, edit, and update patient digital health cards, personal demographics, and EHR profiles.",
    cancellation_requests: "Review, approve, or reassign cancellation and reschedule requests.",
    automation: "Scheduled SMS and email appointment reminders and dispatch telemetry.",
    notifications: "Live clinical notifications, waitlist offers, and triage alerts.",
    book_patient: "Direct patient registration, clinical intake, and physician slot booking.",
    providers: "Live clinic room allocations, physician rosters, and shift availability.",
    billing: "Patient checkout, copay collections, invoice settlement, and payment receipts.",
  };

  const selectedPatient = patientsList.find((p) => p.id === selectedPatientId) ?? patientsList[0];

  const filteredPatients = patientsList.filter((p) => {
    const q = patientSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      p.bloodGroup?.toLowerCase().includes(q) ||
      p.insuranceProvider?.toLowerCase().includes(q)
    );
  });

  const knownPatients = Array.from(
    new Map(
      appointments
        .filter(
          (a): a is Appointment & { patientEmail: string; patientName: string } =>
            Boolean(a.patientEmail && a.patientName),
        )
        .map((a) => [a.patientEmail.toLowerCase(), { name: a.patientName, email: a.patientEmail, id: a.patientId }]),
    ).values(),
  );

  const clinicDepartments = Array.from(
    new Set([
      ...availableSlots.map((s) => s.departmentName).filter(Boolean),
      ...providers.map((p) => p.specialty).filter(Boolean),
    ])
  );

  const filteredSlots = availableSlots.filter((s) => {
    if (bookDepartmentFilter === "all") return true;
    return s.departmentName === bookDepartmentFilter;
  });

  const selectedSlot = availableSlots.find((s) => s.slotId === bookSlotId);
  const selectedProvider = providers.find((p) => p.name === selectedSlot?.providerName || p.id === bookSlotId);

  async function handleManualRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setTimeout(() => setRefreshing(false), 450);
    }
  }

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

  function handleResetBookingForm() {
    setBookPatientName("");
    setBookPatientEmail("");
    setBookPatientPhone("");
    setBookPatientDob("");
    setBookPatientGender("Unspecified");
    setBookDepartmentFilter("all");
    setBookSlotId("");
    setBookAppointmentType("In-Person Clinic Visit");
    setBookUrgency("Routine");
    setBookSymptomDuration("2 - 3 Days");
    setBookReason("");
    setBookAllergies("None reported");
    setBookInsuranceProvider("Self-Pay / Cash");
    setBookInsurancePolicy("");
    setBookSpecialNotes("");
    setBookSuccess(null);
  }

  function handleSelectExistingPatient(email: string) {
    const p = knownPatients.find((kp) => kp.email.toLowerCase() === email.toLowerCase());
    if (p) {
      setBookPatientName(p.name);
      setBookPatientEmail(p.email);
    }
  }

  async function handleBookForPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!bookSlotId) {
      alert("Please select an available doctor appointment slot.");
      return;
    }
    if (!bookPatientEmail || !bookPatientEmail.includes("@")) {
      alert("Please enter a valid patient email address.");
      return;
    }
    if (!bookPatientName.trim()) {
      alert("Please enter the patient's full name.");
      return;
    }
    setBookBusy(true);
    setBookSuccess(null);
    try {
      const existingPatient = appointments.find(
        (a) => a.patientEmail?.toLowerCase() === bookPatientEmail.toLowerCase(),
      );

      const intakeSummary = [
        bookReason.trim() || "Front-desk scheduled consultation",
        `[Mode: ${bookAppointmentType}]`,
        `[Urgency: ${bookUrgency}]`,
        bookSymptomDuration ? `[Duration: ${bookSymptomDuration}]` : "",
        bookPatientPhone ? `[Phone: ${bookPatientPhone}]` : "",
        bookPatientDob ? `[DOB: ${bookPatientDob}]` : "",
        bookInsuranceProvider ? `[Insurance: ${bookInsuranceProvider}${bookInsurancePolicy ? ` #${bookInsurancePolicy}` : ""}]` : "",
        bookAllergies && bookAllergies !== "None reported" ? `[Allergies: ${bookAllergies}]` : "",
        bookSpecialNotes ? `[Notes: ${bookSpecialNotes}]` : "",
      ]
        .filter(Boolean)
        .join(" · ");

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slotId: bookSlotId,
          reason: intakeSummary.slice(0, 750),
          patientId: existingPatient?.patientId,
          patientEmail: bookPatientEmail.trim().toLowerCase(),
          patientName: bookPatientName.trim(),
          phone: bookPatientPhone.trim(),
          appointmentType: bookAppointmentType,
          priority: bookUrgency,
          insuranceProvider: bookInsuranceProvider,
          notes: bookSpecialNotes.trim(),
          idempotencyKey: `desk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to book appointment.");
      }
      setBookSuccess(`Appointment successfully booked for ${bookPatientName.trim()} (${bookPatientEmail.trim()})! Digital confirmation and front-desk check-in record generated.`);
      setBookSlotId("");
      setBookReason("");
      setBookSpecialNotes("");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBookBusy(false);
    }
  }

  async function handlePayInvoice() {
    if (!payingInvoice) return;
    setPayBusy(true);
    try {
      const res = await fetch(`/api/billing/${payingInvoice.id}/pay`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paymentMethod }),
      });
      if (res.ok) {
        setPayingInvoice(null);
        await loadData();
      } else {
        alert("Payment processing failed.");
      }
    } finally {
      setPayBusy(false);
    }
  }

  async function handleDispatchReminders() {
    setDispatchBusy(true);
    setDispatchStatus(null);
    try {
      const res = await fetch("/api/reminders/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lookaheadHours: 48 }),
      });
      const d = await res.json();
      if (res.ok) {
        setDispatchStatus({ sent: d.sent, skipped: d.skipped, failed: d.failed });
        await loadData();
      } else {
        alert(d?.error?.message ?? "Reminder dispatch failed.");
      }
    } catch {
      alert("Network error running reminder dispatch.");
    } finally {
      setDispatchBusy(false);
    }
  }

  const pendingRequests = appointments.filter(
    (a) => a.status === "cancellation_requested" || a.status === "reschedule_requested",
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased flex flex-col lg:flex-row">
      {/* ----------------- RECEPTIONIST SIDEBAR ----------------- */}
      {/* ----------------- RECEPTIONIST SIDEBAR ----------------- */}
      {/* ----------------- RECEPTIONIST SIDEBAR ----------------- */}
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
                  <p className="font-sans text-[12px] font-normal tracking-normal text-sky-300 mt-0.5">Reception Desk</p>
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
                Front-desk operations
              </p>
              {RECEPTIONIST_TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                const count =
                  t.id === "cancellation_requests"
                    ? pendingRequests.length
                    : t.id === "notifications"
                    ? unreadNotifications
                    : t.id === "patient_profiles"
                    ? patientsList.length
                    : 0;
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
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          t.id === "patient_profiles"
                            ? "bg-sky-500/30 text-sky-200 border border-sky-400/30"
                            : "bg-rose-500 text-white animate-pulse"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>



            {/* Profile & Status Capsule at the Bottom */}
            <div className="mt-auto pt-4 border-t border-white/10 space-y-2.5">
              <button
                type="button"
                onClick={() => setShowUserProfileModal(true)}
                className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors cursor-pointer group"
                title="View Front Desk Profile"
              >
                <div className="flex items-center gap-2.5">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-400/20 text-blue-300 font-bold text-xs group-hover:scale-105 transition-transform">
                    RD
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                      <p className="text-[10px] text-sky-300 capitalize font-medium">Front Desk Specialist</p>
                    </div>
                  </div>
                  <User className="h-3.5 w-3.5 text-white/40 group-hover:text-white transition-colors" />
                </div>
              </button>

              <div className="pt-1 text-xs text-white/50 flex items-center justify-between px-1">
                <div>
                  <p className="text-[11px] font-semibold text-white/80">Afiya Front Desk</p>
                  <p className="text-[10px] text-white/40">Reception Station · Active</p>
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
                {RECEPTIONIST_TABS.map((t) => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  const count =
                    t.id === "cancellation_requests"
                      ? pendingRequests.length
                      : t.id === "notifications"
                      ? unreadNotifications
                      : t.id === "patient_profiles"
                      ? patientsList.length
                      : 0;
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
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </nav>


            </div>

            <div className="w-full pt-3 border-t border-white/10 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUserProfileModal(true)}
                title={`Receptionist: ${user.name}`}
                className="h-8 w-8 rounded-lg bg-blue-400/20 text-blue-300 hover:bg-blue-400/30 font-bold text-xs flex items-center justify-center transition-colors cursor-pointer"
              >
                RD
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
                  Front Desk Station
                </span>
                <span className="text-[12px] text-[#64748b]">/</span>
                <span className="text-[12px] font-medium text-[#475569] truncate">
                  {RECEPTIONIST_TABS.find((t) => t.id === tab)?.label}
                </span>
              </div>
              <h1 className="font-display text-[22px] sm:text-[24px] font-bold text-[#0f2744] tracking-tight leading-tight">
                {RECEPTIONIST_TABS.find((t) => t.id === tab)?.label}
              </h1>
              <p className="text-[13px] text-[#475569] mt-0.5 font-normal line-clamp-1">
                {TAB_DESCRIPTIONS[tab]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 ml-auto sm:ml-0">
            {/* Quick Action: New Booking Shortcut */}
            {tab !== "book_patient" && (
              <button
                type="button"
                onClick={() => setTab("book_patient")}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-[#0284c7] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0369a1] transition-colors shadow-2xs cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Book Patient</span>
              </button>
            )}

            {/* Refresh Data Button */}
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing}
              title="Refresh clinic schedules & queue"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white px-3 py-2 text-xs font-medium text-[#1e293b] hover:bg-[#f8fafc] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#0284c7] ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Sync Data</span>
            </button>

          </div>
        </header>

        {/* Tab Content */}
        <div className="p-6 lg:p-8 flex-1 overflow-y-auto">
          {/* TAB 1: FRONT-DESK CHECK-IN */}
          {tab === "schedule" && (
            <div className="space-y-6 max-w-6xl">
              {(() => {
                const totalAppts = appointments.length;
                const confirmedAppts = appointments.filter((a) => a.status === "confirmed");
                const checkedInAppts = appointments.filter(
                  (a) => a.status === "checked_in" || a.status === "in_consultation"
                );
                const completedAppts = appointments.filter((a) => a.status === "completed");

                // Progress proportions
                const awaitingPct = totalAppts > 0 ? (confirmedAppts.length / totalAppts) * 100 : 0;
                const inClinicPct = totalAppts > 0 ? (checkedInAppts.length / totalAppts) * 100 : 0;
                const completedPct = totalAppts > 0 ? (completedAppts.length / totalAppts) * 100 : 0;

                const filteredAppointments = appointments.filter((a) => {
                  const matchesFilter =
                    scheduleStatusFilter === "all" ||
                    (scheduleStatusFilter === "awaiting" && a.status === "confirmed") ||
                    (scheduleStatusFilter === "in_clinic" &&
                      (a.status === "checked_in" || a.status === "in_consultation")) ||
                    (scheduleStatusFilter === "completed" && a.status === "completed") ||
                    (scheduleStatusFilter === "requests" &&
                      (a.status === "cancellation_requested" || a.status === "reschedule_requested"));
                  const q = scheduleSearch.toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    a.patientName?.toLowerCase().includes(q) ||
                    a.patientEmail?.toLowerCase().includes(q) ||
                    a.providerName?.toLowerCase().includes(q) ||
                    a.departmentName?.toLowerCase().includes(q) ||
                    a.reason?.toLowerCase().includes(q);
                  return matchesFilter && matchesSearch;
                });

                return (
                  <div className="space-y-5">
                    {/* ASYMMETRICAL FRONT-DESK TRIAGE COMMAND BENTO */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 items-stretch">
                      {/* CARD 1: Large Featured Daily Intake Hero (5 cols on lg) */}
                      <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#0f2744] via-[#0f2744] to-[#0f2744] p-5 text-white shadow-md border border-[#0f2744]/30 flex flex-col justify-between relative overflow-hidden">
                        {/* Glow accent */}
                        <div className="absolute top-0 right-0 w-48 h-48 bg-radial from-sky-500/20 via-sky-400/5 to-transparent rounded-full blur-xl pointer-events-none" />

                        <div className="relative z-10">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="h-7 w-7 rounded-lg bg-white/10 border border-white/20 grid place-items-center">
                                <CalendarDays className="h-3.5 w-3.5 text-[#0284c7]" />
                              </span>
                              <span className="text-[11px] uppercase font-bold tracking-wider text-[#0284c7]">
                                Daily Clinical Intake
                              </span>
                            </div>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-400/30">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                              Live Station Queue
                            </span>
                          </div>

                          <div className="mt-3.5 flex items-baseline gap-2.5">
                            <span className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white">
                              {totalAppts}
                            </span>
                            <span className="text-xs text-white/70">
                              patient visits scheduled today
                            </span>
                          </div>
                        </div>

                        {/* Intake Stages Progress Bar */}
                        <div className="mt-4 pt-3 border-t border-white/10 relative z-10 space-y-2">
                          <div className="flex justify-between text-[11px] text-white/70">
                            <span>Intake Completion</span>
                            <span className="font-semibold text-white">
                              {totalAppts > 0 ? Math.round(((checkedInAppts.length + completedAppts.length) / totalAppts) * 100) : 0}% processed
                            </span>
                          </div>
                          <div className="h-2.5 w-full rounded-full bg-white/10 p-0.5 flex overflow-hidden gap-1">
                            {awaitingPct > 0 && (
                              <div
                                title={`Awaiting: ${confirmedAppts.length}`}
                                className="h-full rounded-full bg-blue-400 transition-all duration-500"
                                style={{ width: `${awaitingPct}%` }}
                              />
                            )}
                            {inClinicPct > 0 && (
                              <div
                                title={`In Clinic: ${checkedInAppts.length}`}
                                className="h-full rounded-full bg-sky-400 transition-all duration-500"
                                style={{ width: `${inClinicPct}%` }}
                              />
                            )}
                            {completedPct > 0 && (
                              <div
                                title={`Completed: ${completedAppts.length}`}
                                className="h-full rounded-full bg-sky-200 transition-all duration-500"
                                style={{ width: `${completedPct}%` }}
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-white/60 pt-0.5">
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              {confirmedAppts.length} Awaiting
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                              {checkedInAppts.length} In Clinic
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-200" />
                              {completedAppts.length} Done
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* CARD 2: Awaiting Check-In High-Focus Card (4 cols on lg) */}
                      <div className="lg:col-span-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 p-5 border border-blue-200/80 shadow-2xs flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                              Front-Desk Arrival
                            </span>
                            <span className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 grid place-items-center">
                              <Clock className="h-4 w-4" />
                            </span>
                          </div>

                          <div className="mt-3 flex items-baseline justify-between">
                            <div>
                              <p className="font-display text-3xl sm:text-4xl font-bold text-blue-900 leading-tight">
                                {confirmedAppts.length}
                              </p>
                              <p className="text-xs text-blue-700/80 font-medium mt-0.5">Awaiting Arrival &amp; Check-In</p>
                            </div>
                            <span className="h-9 w-9 rounded-full bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xs">
                              {totalAppts > 0 ? Math.round((confirmedAppts.length / totalAppts) * 100) : 0}%
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-blue-100 flex items-center justify-between gap-2">
                          <span className="text-[11px] text-blue-700">Ready at reception counter</span>
                          <button
                            type="button"
                            onClick={() => setScheduleStatusFilter(scheduleStatusFilter === "awaiting" ? "all" : "awaiting")}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              scheduleStatusFilter === "awaiting"
                                ? "bg-blue-600 text-white"
                                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            }`}
                          >
                            {scheduleStatusFilter === "awaiting" ? "Clear Filter" : "Filter Awaiting"}
                          </button>
                        </div>
                      </div>

                      {/* CARD 3: Active Consultation & Discharge Card (3 cols on lg) */}
                      <div className="lg:col-span-3 rounded-2xl bg-white p-5 border border-[#e2e8f0] shadow-2xs flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-[#f0f7ff]">
                            <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                              Clinical Triage
                            </span>
                            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            {/* In Clinic Mini-Box */}
                            <div className="p-2.5 rounded-xl bg-sky-50/60 border border-sky-100 text-left">
                              <div className="flex items-center gap-1.5 text-blue-800 text-[11px] font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span>In Clinic</span>
                              </div>
                              <p className="font-display text-2xl font-bold text-blue-900 mt-1">
                                {checkedInAppts.length}
                              </p>
                              <span className="text-[10px] text-blue-700">With MD/Exam</span>
                            </div>

                            {/* Completed Mini-Box */}
                            <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-left">
                              <div className="flex items-center gap-1.5 text-[#475569] text-[11px] font-semibold">
                                <Check className="h-3.5 w-3.5 text-[#0284c7] shrink-0" />
                                <span>Done</span>
                              </div>
                              <p className="font-display text-2xl font-bold text-[#0f2744] mt-1">
                                {completedAppts.length}
                              </p>
                              <span className="text-[10px] text-[#64748b]">Discharged</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#f0f7ff] flex items-center justify-between text-[11px] text-[#475569]">
                          <span>Active Rooms:</span>
                          <span className="font-semibold text-[#0f2744]">Suites 101–104 Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Filter & Search Bar - Mobile Responsive Wrapping */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#e2e8f0] shadow-2xs">
                      {/* Search Input */}
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#475569]" />
                        <input
                          type="text"
                          value={scheduleSearch}
                          onChange={(e) => setScheduleSearch(e.target.value)}
                          placeholder="Search patient, doctor, or reason…"
                          className="w-full h-9 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 text-xs text-[#0f172a] placeholder:text-[#64748b] focus:border-[#0284c7] focus:bg-white focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      {/* Filter Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll pb-1 sm:pb-0">
                        <button
                          type="button"
                          onClick={() => setScheduleStatusFilter("all")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            scheduleStatusFilter === "all"
                              ? "bg-[#0284c7] text-white shadow-2xs"
                              : "bg-[#f8fafc] text-[#475569] hover:bg-[#e2e8f0]"
                          }`}
                        >
                          All ({totalAppts})
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleStatusFilter("awaiting")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            scheduleStatusFilter === "awaiting"
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-blue-50 text-blue-800 border border-blue-200/60 hover:bg-blue-100"
                          }`}
                        >
                          Awaiting Check-In ({confirmedAppts.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleStatusFilter("in_clinic")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            scheduleStatusFilter === "in_clinic"
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-sky-50 text-blue-800 border border-sky-200/60 hover:bg-sky-100"
                          }`}
                        >
                          In Clinic ({checkedInAppts.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleStatusFilter("completed")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            scheduleStatusFilter === "completed"
                              ? "bg-[#0f2744] text-white shadow-2xs"
                              : "bg-[#f8fafc] text-[#475569] hover:bg-[#e2e8f0]"
                          }`}
                        >
                          Completed ({completedAppts.length})
                        </button>
                      </div>
                    </div>

                    {/* DESKTOP TABLE VIEW (hidden on mobile, visible on md and up) */}
                    <div className="hidden md:block overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xs">
                      <div className="overflow-x-auto thin-scroll">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-[#f0f7ff] text-[12px] text-[#475569] font-medium normal-case border-b border-[#e2e8f0]">
                            <tr>
                              <th className="px-5 py-3 font-medium">Scheduled time</th>
                              <th className="px-5 py-3 font-medium">Patient</th>
                              <th className="px-5 py-3 font-medium">Doctor</th>
                              <th className="px-5 py-3 font-medium">Department</th>
                              <th className="px-5 py-3 font-medium">Status</th>
                              <th className="px-5 py-3 text-right font-medium">Front-desk actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f0f7ff]">
                            {filteredAppointments.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-5 py-8 text-center text-[#64748b]">
                                  No appointments match the selected filter.
                                </td>
                              </tr>
                            ) : (
                              filteredAppointments.map((a) => (
                                <tr key={a.id} className="hover:bg-[#f8fafc] transition-colors">
                                  <td className="px-5 py-3.5 font-medium text-[#0f2744]">{fmt(a.startAt)}</td>
                                  <td className="px-5 py-3.5">
                                    <p className="font-semibold text-[#0f2744]">{a.patientName}</p>
                                    <p className="text-xs text-[#64748b] font-mono">{a.patientEmail}</p>
                                  </td>
                                  <td className="px-5 py-3.5 text-[#1e293b] font-medium">{a.providerName}</td>
                                  <td className="px-5 py-3.5 text-[#475569]">{a.departmentName}</td>
                                  <td className="px-5 py-3.5">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase border ${
                                        a.status === "confirmed"
                                          ? "bg-blue-100 text-blue-800 border-blue-200"
                                          : a.status === "checked_in"
                                          ? "bg-sky-100 text-blue-800 border-sky-200"
                                          : a.status === "in_consultation"
                                          ? "bg-purple-100 text-purple-800 border-purple-200"
                                          : a.status === "completed"
                                          ? "bg-stone-100 text-stone-800 border-stone-200"
                                          : a.status === "cancellation_requested" ||
                                            a.status === "reschedule_requested"
                                          ? "bg-amber-100 text-amber-800 border-amber-200"
                                          : "bg-rose-100 text-rose-800 border-rose-200"
                                      }`}
                                    >
                                      {a.status === "checked_in" && <Check className="h-3 w-3" />}
                                      {a.status.replace("_", " ")}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    <div className="flex justify-end gap-1.5 items-center">
                                      <button
                                        type="button"
                                        onClick={() => openPatientProfile(a.patientId)}
                                        className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-blue-800 hover:bg-sky-100 transition-colors cursor-pointer shadow-2xs"
                                        title="View & Edit Patient Health Card"
                                      >
                                        <QrCode className="h-3 w-3 text-[#0284c7]" />
                                        <span>Card / EHR</span>
                                      </button>
                                      {a.status === "confirmed" && (
                                        <button
                                          onClick={() => updateStatus(a.id, "checked_in")}
                                          className="rounded-full bg-blue-600 px-3.5 py-1 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
                                        >
                                          Check In
                                        </button>
                                      )}
                                      {a.status !== "cancelled" && a.status !== "completed" && (
                                        <button
                                          onClick={() => {
                                            setDirectCancelAppt(a);
                                            setDirectCancelReason("");
                                          }}
                                          className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                        >
                                          Cancel (Phone/Walk-in)
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

                    {/* MOBILE CARD VIEW (visible on mobile only: block md:hidden) */}
                    <div className="block md:hidden space-y-3.5">
                      {filteredAppointments.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-white p-8 text-center text-xs text-[#64748b]">
                          No appointments match the selected filter.
                        </div>
                      ) : (
                        filteredAppointments.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs space-y-3.5"
                          >
                            {/* Card Header: Scheduled Time & Status */}
                            <div className="flex items-start justify-between gap-2 border-b border-[#f0f7ff] pb-3">
                              <div className="flex items-center gap-2">
                                <span className="h-8 w-8 rounded-xl bg-blue-50 text-blue-700 grid place-items-center shrink-0">
                                  <Clock className="h-4 w-4" />
                                </span>
                                <div>
                                  <span className="text-xs font-bold text-[#0f2744] block">
                                    {fmt(a.startAt)}
                                  </span>
                                  <span className="text-[11px] text-[#475569]">{a.departmentName}</span>
                                </div>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase border shrink-0 ${
                                  a.status === "confirmed"
                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                    : a.status === "checked_in"
                                    ? "bg-sky-100 text-blue-800 border-sky-200"
                                    : a.status === "in_consultation"
                                    ? "bg-purple-100 text-purple-800 border-purple-200"
                                    : a.status === "completed"
                                    ? "bg-stone-100 text-stone-800 border-stone-200"
                                    : a.status === "cancellation_requested" ||
                                      a.status === "reschedule_requested"
                                    ? "bg-amber-100 text-amber-800 border-amber-200"
                                    : "bg-rose-100 text-rose-800 border-rose-200"
                                }`}
                              >
                                {a.status === "checked_in" && <Check className="h-3 w-3" />}
                                {a.status.replace("_", " ")}
                              </span>
                            </div>

                            {/* Patient & Doctor Details */}
                            <div className="space-y-1.5 text-xs">
                              <div>
                                <span className="text-[#475569] text-[11px]">Patient:</span>
                                <h4 className="text-sm font-bold text-[#0f2744]">{a.patientName}</h4>
                                {a.patientEmail && (
                                  <p className="text-[11px] text-[#64748b] font-mono">{a.patientEmail}</p>
                                )}
                              </div>
                              <div className="pt-1 flex items-center justify-between text-xs text-[#1e293b]">
                                <span className="text-[#475569]">Physician:</span>
                                <span className="font-semibold text-[#0f2744]">{a.providerName}</span>
                              </div>
                              {a.reason && (
                                <div className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-[11px] text-[#1e293b] leading-relaxed">
                                  <strong className="text-[#0f2744]">Reason:</strong> {a.reason}
                                </div>
                              )}
                            </div>

                            {/* Mobile Actions Cluster */}
                            <div className="pt-2 border-t border-[#f0f7ff] space-y-2">
                              {/* Primary Check-In Button (Large touch target) */}
                              {a.status === "confirmed" && (
                                <button
                                  type="button"
                                  onClick={() => updateStatus(a.id, "checked_in")}
                                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-blue-700 active:scale-[0.99] shadow-xs transition-all cursor-pointer"
                                >
                                  <Check className="h-4 w-4" />
                                  <span>Check In Patient Now</span>
                                </button>
                              )}

                              {a.status === "checked_in" && (
                                <div className="w-full text-center py-2 rounded-xl bg-sky-50 text-blue-800 text-xs font-semibold border border-sky-200">
                                  ✓ Patient Checked In · Waiting in Lounge
                                </div>
                              )}

                              {/* Secondary Actions (Card/EHR & Cancel) */}
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onClick={() => openPatientProfile(a.patientId)}
                                  className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 py-2 px-3 text-xs font-semibold text-blue-800 hover:bg-sky-100 transition-colors cursor-pointer"
                                >
                                  <QrCode className="h-3.5 w-3.5 text-[#0284c7]" />
                                  <span>Card / EHR</span>
                                </button>
                                {a.status !== "cancelled" && a.status !== "completed" && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDirectCancelAppt(a);
                                      setDirectCancelReason("");
                                    }}
                                    className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                  >
                                    <span>Cancel Visit</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: PATIENT CARDS & PROFILES REGISTRY */}
          {tab === "patient_profiles" && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Header Action Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-[#cbd5e1] bg-gradient-to-r from-[#0b192c] via-[#0f2744] to-[#0f2744] p-5 sm:p-6 text-white shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-white/10 text-sky-300 shrink-0 border border-white/15">
                    <QrCode className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                      Patient Profiles &amp; Digital Health Cards
                    </h3>
                    <p className="text-xs sm:text-sm text-sky-100/80 mt-1 max-w-xl leading-relaxed">
                      Front-desk EHR registry: File new patient profiles, update clinical demographics, manage documented allergies, and issue verified digital cards.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  {patientFilingMode === "file_new" ? (
                    <button
                      type="button"
                      onClick={() => setPatientFilingMode("view_edit")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer border border-white/20 shadow-xs"
                    >
                      <ArrowRight className="h-4 w-4 rotate-180" />
                      <span>Back to Patient Directory</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setPatientFilingMode("file_new");
                        setFilingSuccessMsg(false);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] text-white px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.02]"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>+ File New Patient Card</span>
                    </button>
                  )}
                </div>
              </div>

              {/* MODE 1: FILE NEW PATIENT */}
              {patientFilingMode === "file_new" ? (
                <div className="rounded-2xl border border-[#cbd5e1] bg-white p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
                    <div>
                      <h4 className="font-display text-lg font-bold text-[#0f2744] flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-[#0284c7]" />
                        <span>Front-Desk Patient Filing Form</span>
                      </h4>
                      <p className="text-xs text-[#475569] mt-0.5">
                        Register a walk-in, phone patient, or emergency intake. This automatically creates their verified profile and digital health card.
                      </p>
                    </div>
                    {filingSuccessMsg && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-sky-100 border border-sky-300 px-3.5 py-1.5 rounded-full shadow-2xs">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" /> Patient Card Filed!
                      </span>
                    )}
                  </div>

                  <form onSubmit={handleFileNewPatient} className="space-y-6">
                    {/* Section 1: Demographics */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-bold text-[#0f2744] uppercase tracking-wider flex items-center gap-2 border-b border-[#f8fafc] pb-1.5">
                        <User className="h-4 w-4 text-[#0284c7]" />
                        <span>1. Primary Demographics &amp; Contact</span>
                      </h5>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Full Legal Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="e.g. Maya Chen"
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Email Address <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="email"
                            required
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            placeholder="e.g. maya@example.com"
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={newDob}
                            onChange={(e) => setNewDob(e.target.value)}
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Gender
                          </label>
                          <select
                            value={newGender}
                            onChange={(e) => setNewGender(e.target.value)}
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          >
                            <option value="unspecified">Unspecified</option>
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="non-binary">Non-binary</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                          Residential Address
                        </label>
                        <input
                          type="text"
                          value={newAddress}
                          onChange={(e) => setNewAddress(e.target.value)}
                          placeholder="Street, City, State, ZIP"
                          className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                        />
                      </div>
                    </div>

                    {/* Section 2: Clinical Details */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-bold text-[#0f2744] uppercase tracking-wider flex items-center gap-2 border-b border-[#f8fafc] pb-1.5">
                        <Heart className="h-4 w-4 text-[#0ea5e9]" />
                        <span>2. Clinical Safety &amp; Allergies</span>
                      </h5>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Blood Group
                          </label>
                          <select
                            value={newBloodGroup}
                            onChange={(e) => setNewBloodGroup(e.target.value)}
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          >
                            <option value="O+">O+ (Positive)</option>
                            <option value="O-">O- (Negative)</option>
                            <option value="A+">A+ (Positive)</option>
                            <option value="A-">A- (Negative)</option>
                            <option value="B+">B+ (Positive)</option>
                            <option value="B-">B- (Negative)</option>
                            <option value="AB+">AB+ (Positive)</option>
                            <option value="AB-">AB- (Negative)</option>
                            <option value="Unknown">Unknown / Pending Lab</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Known Drug &amp; Food Allergies
                          </label>
                          <input
                            type="text"
                            value={newAllergies}
                            onChange={(e) => setNewAllergies(e.target.value)}
                            placeholder="e.g. Penicillin, Peanuts, None reported"
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Emergency Contact Name
                          </label>
                          <input
                            type="text"
                            value={newEmergencyName}
                            onChange={(e) => setNewEmergencyName(e.target.value)}
                            placeholder="Full name of emergency contact"
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Emergency Contact Phone
                          </label>
                          <input
                            type="tel"
                            value={newEmergencyPhone}
                            onChange={(e) => setNewEmergencyPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Insurance Carrier
                          </label>
                          <input
                            type="text"
                            value={newInsuranceProvider}
                            onChange={(e) => setNewInsuranceProvider(e.target.value)}
                            placeholder="e.g. Blue Shield, Aetna, Self-Pay / Cash"
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                            Insurance Policy / Member ID
                          </label>
                          <input
                            type="text"
                            value={newInsurancePolicy}
                            onChange={(e) => setNewInsurancePolicy(e.target.value)}
                            placeholder="e.g. POL-99210-BC"
                            className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                          Medical History &amp; Chronic Conditions
                        </label>
                        <textarea
                          rows={3}
                          value={newMedicalHistory}
                          onChange={(e) => setNewMedicalHistory(e.target.value)}
                          placeholder="e.g. Mild seasonal asthma, routine vaccinations up to date"
                          className="w-full rounded-xl border border-[#cbd5e1] bg-white p-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setPatientFilingMode("view_edit")}
                        className="rounded-xl border border-[#cbd5e1] bg-white px-5 py-2.5 text-xs font-semibold text-[#475569] hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={filingSaving}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-6 py-3 text-sm font-bold text-white hover:bg-[#0369a1] disabled:opacity-50 shadow-md transition-all cursor-pointer"
                      >
                        {filingSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
                        <span>File Patient Profile &amp; Issue Health Card</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* MODE 2: DIRECTORY + LIVE CARD VIEW + EDIT PROFILE */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Patients List (4 cols) */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="rounded-2xl border border-[#cbd5e1] bg-white p-4 shadow-2xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#0f2744]">
                          Clinic Patients ({filteredPatients.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPatientFilingMode("file_new");
                            setFilingSuccessMsg(false);
                          }}
                          className="text-xs font-bold text-[#0284c7] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> File New
                        </button>
                      </div>

                      {/* Search box */}
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748b]" />
                        <input
                          type="text"
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          placeholder="Search by name, email, ID..."
                          className="h-10 w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] pl-9 pr-3 text-xs text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                        />
                      </div>
                    </div>

                    {/* Patient Cards List */}
                    <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
                      {filteredPatients.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-8 text-center text-xs text-[#475569]">
                          No patients found matching your search.
                        </div>
                      ) : (
                        filteredPatients.map((pat) => {
                          const isSelected = selectedPatient?.id === pat.id;
                          return (
                            <button
                              key={pat.id}
                              type="button"
                              onClick={() => selectPatient(pat)}
                              className={`w-full text-left rounded-2xl p-3.5 border transition-all cursor-pointer ${
                                isSelected
                                  ? "border-[#0284c7] bg-[#f8fafc] shadow-xs ring-1 ring-[#0284c7]"
                                  : "border-[#e2e8f0] bg-white hover:bg-[#f8fafc] shadow-2xs"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-[#0f2744] truncate">
                                    {pat.name || "Unnamed Patient"}
                                  </p>
                                  <p className="text-xs text-[#475569] truncate">{pat.email}</p>
                                </div>
                                <span className="font-mono text-[11px] font-bold text-[#0284c7] bg-white px-2 py-0.5 rounded-lg border border-[#cbd5e1] shrink-0">
                                  {`AF-${pat.id.slice(0, 6).toUpperCase()}`}
                                </span>
                              </div>

                              <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                                {pat.bloodGroup && (
                                  <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 font-bold border border-rose-200">
                                    🩸 {pat.bloodGroup}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium border border-amber-200 truncate max-w-[140px]">
                                  ⚠ {pat.allergies || "No allergies"}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Column: Selected Patient Live Card & Profile Editor (8 cols) */}
                  <div className="lg:col-span-8 space-y-6">
                    {selectedPatient ? (
                      <>
                        {/* Live Digital Health Card (Receptionist View) */}
                        <div id="receptionist-patient-pass" className="w-full rounded-[26px] p-6 text-white shadow-xl relative overflow-hidden bg-gradient-to-br from-[#0b192c] via-[#0f2744] to-[#0f2744] border-2 border-sky-400/40">
                          {/* Botanical Watermark */}
                          <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                            <BotanicalCorner className="h-32 w-32" />
                          </div>

                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/20">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-white/20 to-white/5 border border-sky-400/40 p-1 flex items-center justify-center shrink-0 shadow-md backdrop-blur-md">
                                <img
                                  src="/mascot.svg"
                                  alt="Afiya Mascot"
                                  className="h-8 w-8 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-display text-sm font-bold tracking-wide text-white">Afiya Clinic</p>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-sky-300 font-semibold truncate">
                                  Digital Health Pass · Reception Verified
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500/25 via-sky-400/20 to-blue-500/25 border border-sky-400/60 px-3 py-1 text-[11px] font-bold text-white shadow-[0_2px_10px_rgba(14,165,233,0.3)] backdrop-blur-md whitespace-nowrap">
                                <div className="grid h-3.5 w-3.5 place-items-center rounded-full bg-sky-400/30 text-sky-200">
                                  <ShieldCheck className="h-3 w-3 text-sky-300" />
                                </div>
                                <span className="tracking-wide font-bold text-sky-100">
                                  Verified Active
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => printCard("receptionist-patient-pass")}
                                className="no-print p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                                title="Print Health Card"
                              >
                                <Printer className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Card Body */}
                          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <span className="text-[11px] uppercase tracking-wider text-sky-200/90 block font-bold">
                                Patient Full Name
                              </span>
                              <p className="text-xl font-bold tracking-tight text-white mt-0.5">
                                {editName || selectedPatient.name || "Patient"}
                              </p>
                            </div>

                            <div>
                              <span className="text-[11px] uppercase tracking-wider text-sky-200/90 block font-bold">
                                Clinic Member ID
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <p className="font-mono text-sm font-bold text-sky-200">
                                  {`AF-${selectedPatient.id.slice(0, 8).toUpperCase()}`}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => copyMemberId(`AF-${selectedPatient.id.slice(0, 8).toUpperCase()}`)}
                                  className="p-1 rounded-md hover:bg-white/15 text-white/80 transition-colors cursor-pointer"
                                  title="Copy Member ID"
                                >
                                  {copiedMemberId ? <Check className="h-3.5 w-3.5 text-sky-400" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>

                            <div>
                              <span className="text-[11px] uppercase tracking-wider text-sky-200/90 block font-bold">
                                Blood Group
                              </span>
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 border border-rose-400/35 px-2.5 py-0.5 text-xs font-bold text-rose-200">
                                  🩸 {editBloodGroup || selectedPatient.bloodGroup || "O+ (Positive)"}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[11px] uppercase tracking-wider text-sky-200/90 block font-bold">
                                Documented Allergies
                              </span>
                              <div className="mt-1">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/20 border border-amber-400/35 px-2.5 py-0.5 text-xs font-bold text-amber-200">
                                  ⚠ {editAllergies || selectedPatient.allergies || "None reported"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="mt-5 pt-4 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-white/90">
                            <div className="space-y-0.5">
                              <p className="flex items-center gap-1.5">
                                <span className="font-bold text-sky-200">Insurance:</span>
                                <span>{editInsuranceProvider || selectedPatient.insuranceProvider || "Self-Pay"}</span>
                                <span className="text-white/60">({editInsurancePolicy || selectedPatient.insurancePolicyNumber || "Active"})</span>
                              </p>
                              <p className="flex items-center gap-1.5">
                                <span className="font-bold text-sky-200">Emergency:</span>
                                <span>{editEmergencyName || selectedPatient.emergencyContactName || "Front Desk Contact"}</span>
                                <span className="text-white/60">({editEmergencyPhone || selectedPatient.emergencyContactPhone || "+1 Clinic"})</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5 self-end sm:self-center">
                              <div className="grid h-11 w-11 place-items-center rounded-xl bg-white p-1 shadow-md">
                                <QrCode className="h-9 w-9 text-[#0f2744]" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Front-Desk Profile & Card Editor Form */}
                        <div className="rounded-2xl border border-[#cbd5e1] bg-white p-6 sm:p-7 shadow-xs space-y-6">
                          <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4">
                            <div>
                              <h4 className="font-display text-lg font-bold text-[#0f2744] flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-[#0284c7]" />
                                <span>Reception EHR &amp; Health Card Editor</span>
                              </h4>
                              <p className="text-xs text-[#475569] mt-0.5">
                                Update patient information. Changes immediately sync to the patient&apos;s digital health card and clinic EHR.
                              </p>
                            </div>
                            {editSuccessMsg && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-sky-100 border border-sky-300 px-3.5 py-1.5 rounded-full shadow-2xs">
                                <CheckCircle2 className="h-4 w-4 text-blue-600" /> Card &amp; EHR Updated!
                              </span>
                            )}
                          </div>

                          <form onSubmit={handleUpdatePatient} className="space-y-5">
                            {/* Patient Full Name */}
                            <div>
                              <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                Patient Full Name
                              </label>
                              <input
                                type="text"
                                required
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="e.g. Maya Chen"
                                className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Phone Number
                                </label>
                                <input
                                  type="tel"
                                  value={editPhone}
                                  onChange={(e) => setEditPhone(e.target.value)}
                                  placeholder="+1 (555) 000-0000"
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Date of Birth
                                </label>
                                <input
                                  type="date"
                                  value={editDob}
                                  onChange={(e) => setEditDob(e.target.value)}
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Blood Group
                                </label>
                                <input
                                  type="text"
                                  value={editBloodGroup}
                                  onChange={(e) => setEditBloodGroup(e.target.value)}
                                  placeholder="e.g. O+, A+, B-"
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Known Drug &amp; Food Allergies
                                </label>
                                <input
                                  type="text"
                                  value={editAllergies}
                                  onChange={(e) => setEditAllergies(e.target.value)}
                                  placeholder="e.g. Penicillin, Peanuts, None reported"
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Residential Address
                                </label>
                                <input
                                  type="text"
                                  value={editAddress}
                                  onChange={(e) => setEditAddress(e.target.value)}
                                  placeholder="Street, City, State"
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Emergency Contact Name
                                </label>
                                <input
                                  type="text"
                                  value={editEmergencyName}
                                  onChange={(e) => setEditEmergencyName(e.target.value)}
                                  placeholder="Contact Full Name"
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Emergency Contact Phone
                                </label>
                                <input
                                  type="tel"
                                  value={editEmergencyPhone}
                                  onChange={(e) => setEditEmergencyPhone(e.target.value)}
                                  placeholder="+1 (555) 000-0000"
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Insurance Provider
                                </label>
                                <input
                                  type="text"
                                  value={editInsuranceProvider}
                                  onChange={(e) => setEditInsuranceProvider(e.target.value)}
                                  placeholder="e.g. Blue Cross Blue Shield"
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                  Insurance Policy Number
                                </label>
                                <input
                                  type="text"
                                  value={editInsurancePolicy}
                                  onChange={(e) => setEditInsurancePolicy(e.target.value)}
                                  placeholder="e.g. POL-99210-BC"
                                  className="h-11 w-full rounded-xl border border-[#cbd5e1] bg-white px-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-[#0f2744] uppercase tracking-wider mb-1.5">
                                Past Medical History &amp; Chronic Conditions
                              </label>
                              <textarea
                                rows={3}
                                value={editMedicalHistory}
                                onChange={(e) => setEditMedicalHistory(e.target.value)}
                                placeholder="e.g. Mild seasonal allergies, routine annual vaccinations up to date"
                                className="w-full rounded-xl border border-[#cbd5e1] bg-white p-3.5 text-sm text-[#0f2744] focus:outline-none focus:border-[#0f2744] focus:ring-1 focus:ring-[#0f2744] transition-all"
                              />
                            </div>

                            <div className="pt-3 border-t border-[#e2e8f0] flex items-center justify-end">
                              <button
                                type="submit"
                                disabled={editSaving}
                                className="inline-flex items-center gap-2 rounded-xl bg-[#0284c7] px-6 py-3 text-sm font-bold text-white hover:bg-[#0369a1] disabled:opacity-50 shadow-md transition-all cursor-pointer"
                              >
                                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-white" />}
                                <span>Save &amp; Update Patient Card</span>
                              </button>
                            </div>
                          </form>
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-12 text-center text-sm text-[#475569]">
                        Select a patient from the left column to view and edit their profile and card.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CANCELLATION REQUESTS QUEUE */}
          {tab === "cancellation_requests" && (
            <div className="space-y-6 max-w-6xl">

              {pendingRequests.length === 0 ? (
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-12 text-center shadow-2xs">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-blue-600 mb-2" />
                  <p className="text-sm font-semibold text-[#0f2744]">No pending cancellation requests</p>
                  <p className="text-xs text-[#64748b] mt-1">All doctor and patient requests have been processed.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="rounded-2xl border border-amber-300 bg-amber-50/50 p-5 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                        <span className="font-bold text-amber-800 text-xs uppercase">
                          Requested by: {req.cancellationRequestedBy === "doctor" ? "Doctor" : "Patient"}
                        </span>
                        <span className="text-[10px] text-[#64748b]">{req.cancellationRequestedAt ? fmt(req.cancellationRequestedAt) : ""}</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#0f2744] text-sm">{req.patientName}</p>
                        <p className="text-xs text-[#475569] mt-0.5">
                          Doctor: {req.providerName} · {fmt(req.startAt)}
                        </p>
                        <div className="mt-2.5 p-3 rounded-xl bg-white border border-amber-200 text-xs">
                          <p className="text-[10px] font-bold text-amber-800 uppercase">Reason Given:</p>
                          <p className="text-[#0f172a] mt-1">{req.cancellationReason || "No reason specified."}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 justify-end pt-2">
                        <button
                          onClick={() => {
                            setProcessingRequest(req);
                            setProcessNote("");
                          }}
                          className="rounded-full bg-[#0f2744] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#0c213b] shadow-xs cursor-pointer"
                        >
                          Process Cancellation
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: AUTOMATED REMINDERS & PATIENT NOTIFICATIONS */}
          {tab === "automation" && (
            <div className="space-y-6 max-w-6xl">
              {/* Automation KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <p className="text-xs uppercase font-bold tracking-wider text-[#475569]">Reminders Sent</p>
                  <p className="mt-2 text-2xl font-bold text-[#d49b35]">
                    {notificationsList.filter((n) => n.type === "reminder").length}
                  </p>
                  <p className="text-xs text-[#64748b] mt-1 font-medium">Delivered to patient portal</p>
                </div>
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <p className="text-xs uppercase font-bold tracking-wider text-[#475569]">Upcoming Visits</p>
                  <p className="mt-2 text-2xl font-bold text-blue-700">
                    {appointments.filter((a) => a.status === "confirmed").length}
                  </p>
                  <p className="text-xs text-[#64748b] mt-1 font-medium">Active in next 48 hours</p>
                </div>
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <p className="text-xs uppercase font-bold tracking-wider text-[#475569]">Cancellation Requests</p>
                  <p className="mt-2 text-2xl font-bold text-amber-700">{pendingRequests.length}</p>
                  <p className="text-xs text-[#64748b] mt-1 font-medium">Awaiting receptionist review</p>
                </div>
                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                  <p className="text-xs uppercase font-bold tracking-wider text-[#475569]">Schedule Integrity</p>
                  <p className="mt-2 text-2xl font-bold text-blue-700">100%</p>
                  <p className="text-xs text-[#64748b] mt-1 font-medium">Verified · Zero booking conflicts</p>
                </div>
              </div>

              {/* Automated Reminder Trigger Card */}
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-bold text-[#0f2744] flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-[#d49b35]" />
                      <span>24h &amp; 48h Appointment Reminder Dispatcher</span>
                    </h3>
                    <p className="text-xs text-[#475569] mt-1 max-w-2xl leading-relaxed">
                      Automatically evaluates confirmed patient visits scheduled for the next 48 hours and delivers personalized pre-visit reminders. Built-in deduplication prevents redundant messages.
                    </p>
                  </div>
                  <button
                    onClick={handleDispatchReminders}
                    disabled={dispatchBusy}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0f2744] px-4 py-2 text-xs font-bold text-white hover:bg-[#0c213b] disabled:opacity-50 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    {dispatchBusy ? <Loader2 className="h-4 w-4 animate-spin text-[#d49b35]" /> : <RefreshCw className="h-4 w-4 text-[#d49b35]" />}
                    <span>{dispatchBusy ? "Dispatching Reminders…" : "Send Due Reminders"}</span>
                  </button>
                </div>

                {dispatchStatus && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 text-xs text-blue-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                      <span>
                        Reminder dispatch completed: <strong>{dispatchStatus.sent}</strong> delivered,{" "}
                        <strong>{dispatchStatus.skipped}</strong> up to date, <strong>{dispatchStatus.failed}</strong> failed.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Live Automated Notification Stream */}
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 space-y-3 shadow-2xs">
                <h3 className="text-base font-bold text-[#0f2744]">Recent Reminder &amp; Notification Activity</h3>
                {notificationsList.length === 0 ? (
                  <p className="text-xs text-[#64748b] py-3">No recent notifications recorded.</p>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2 text-xs">
                    {notificationsList.slice(0, 8).map((n) => (
                      <div key={n.id} className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`font-semibold uppercase tracking-wider rounded-md px-1.5 py-0.5 ${
                              n.type === "reminder"
                                ? "bg-amber-100 text-amber-800"
                                : n.type === "booking_confirmed"
                                ? "bg-sky-100 text-blue-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {n.type === "reminder"
                              ? "Appointment Reminder"
                              : n.type === "booking_confirmed"
                              ? "Booking Confirmed"
                              : n.type.replace("_", " ")}
                          </span>
                          <span className="text-[#64748b]">{fmt(n.createdAt)}</span>
                        </div>
                        <p className="font-bold text-[#0f2744] text-xs">{n.title}</p>
                        <p className="text-[#1e293b] text-xs leading-snug">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: BOOK FOR PATIENT */}
          {tab === "book_patient" && (
            <div className="w-full max-w-4xl mx-auto py-2">
              {/* Form Container Card */}
              <div className="rounded-2xl border border-[#cbd5e1] bg-white shadow-sm overflow-hidden">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-[#0b192c] via-[#0f2744] to-[#0f2744] px-6 sm:px-8 py-6 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-white/10 text-sky-300 shrink-0 mt-0.5 border border-white/15">
                      <CalendarPlus className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                        Front-Desk Patient Appointment Booking
                      </h3>
                      <p className="text-xs sm:text-sm text-sky-100/80 mt-1 max-w-xl leading-relaxed">
                        Schedule in-person or telehealth consultations on behalf of walk-ins, phone-in callers, or registered clinic patients with instant EHR sync.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-200 border border-sky-400/30">
                      <CheckCircle2 className="h-3.5 w-3.5 text-sky-300" />
                      Direct EHR Intake
                    </span>
                  </div>
                </div>

                {/* Success Banner */}
                {bookSuccess && (
                  <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-xl bg-sky-50 border border-sky-200 flex items-start gap-3 text-blue-900 animate-in fade-in duration-200">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-950">Appointment Successfully Confirmed</p>
                      <p className="text-xs text-blue-800 mt-0.5 leading-relaxed">{bookSuccess}</p>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setTab("schedule")}
                          className="px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 transition-colors cursor-pointer"
                        >
                          View Front-Desk Queue →
                        </button>
                        <button
                          type="button"
                          onClick={handleResetBookingForm}
                          className="px-3 py-1.5 rounded-lg border border-sky-300 bg-white text-blue-800 text-xs font-semibold hover:bg-sky-50 transition-colors cursor-pointer"
                        >
                          Book Another Patient
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Body */}
                <form onSubmit={handleBookForPatient} className="p-6 sm:p-8 space-y-8">
                  {/* SECTION 1: PATIENT IDENTIFICATION & CONTACT */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e2e8f0] pb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-[#f0f7ff] text-[#0284c7] flex items-center justify-center font-bold text-xs">
                          1
                        </div>
                        <h4 className="text-sm font-bold text-[#0f2744] uppercase tracking-wider">
                          Patient Demographics &amp; Contact Info
                        </h4>
                      </div>

                      {/* Patient Type Switcher */}
                      <div className="flex items-center bg-[#f8fafc] p-1 rounded-xl border border-[#e2e8f0]">
                        <button
                          type="button"
                          onClick={() => {
                            setBookPatientMode("new");
                            setBookPatientName("");
                            setBookPatientEmail("");
                          }}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            bookPatientMode === "new"
                              ? "bg-white text-[#0f2744] shadow-2xs"
                              : "text-[#475569] hover:text-[#0f2744]"
                          }`}
                        >
                          + New / Walk-In Patient
                        </button>
                        <button
                          type="button"
                          onClick={() => setBookPatientMode("existing")}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                            bookPatientMode === "existing"
                              ? "bg-white text-[#0f2744] shadow-2xs"
                              : "text-[#475569] hover:text-[#0f2744]"
                          }`}
                        >
                          Registered Patient
                        </button>
                      </div>
                    </div>

                    {/* If Registered Patient, show Quick Lookup dropdown */}
                    {bookPatientMode === "existing" && (
                      <div className="p-3.5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2">
                        <label className="block text-xs font-bold text-[#1e293b] uppercase">
                          Search &amp; Select Existing Clinic Patient
                        </label>
                        <select
                          onChange={(e) => handleSelectExistingPatient(e.target.value)}
                          className="w-full rounded-xl border border-[#e2e8f0] bg-white p-2.5 text-xs text-[#0f172a] focus:border-[#0284c7] focus:outline-none"
                        >
                          <option value="">Choose a registered patient…</option>
                          {knownPatients.map((kp) => (
                            <option key={kp.email} value={kp.email}>
                              {kp.name} — ({kp.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Patient Full Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative mt-1">
                          <User className="h-4 w-4 absolute left-3 top-2.5 text-[#475569]" />
                          <input
                            type="text"
                            required
                            placeholder="e.g. Maya Davis or Robert Chen"
                            value={bookPatientName}
                            onChange={(e) => setBookPatientName(e.target.value)}
                            className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] pl-9 pr-3 py-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Patient Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative mt-1">
                          <Mail className="h-4 w-4 absolute left-3 top-2.5 text-[#475569]" />
                          <input
                            type="email"
                            required
                            placeholder="e.g. maya@example.com"
                            value={bookPatientEmail}
                            onChange={(e) => setBookPatientEmail(e.target.value)}
                            className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] pl-9 pr-3 py-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none transition-colors"
                          />
                        </div>
                        <p className="text-[11px] text-[#475569] mt-1">
                          Digital confirmation and patient portal link sent here.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Phone Number (SMS Reminders)
                        </label>
                        <div className="relative mt-1">
                          <Phone className="h-4 w-4 absolute left-3 top-2.5 text-[#475569]" />
                          <input
                            type="tel"
                            placeholder="e.g. (555) 234-5678"
                            value={bookPatientPhone}
                            onChange={(e) => setBookPatientPhone(e.target.value)}
                            className="w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] pl-9 pr-3 py-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={bookPatientDob}
                            onChange={(e) => setBookPatientDob(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                            Gender
                          </label>
                          <select
                            value={bookPatientGender}
                            onChange={(e) => setBookPatientGender(e.target.value)}
                            className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                          >
                            <option value="Unspecified">Unspecified</option>
                            <option value="Female">Female</option>
                            <option value="Male">Male</option>
                            <option value="Non-Binary">Non-Binary</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: CLINICAL SPECIALTY & APPOINTMENT SLOT */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3">
                      <div className="h-6 w-6 rounded-lg bg-[#f0f7ff] text-[#0284c7] flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <h4 className="text-sm font-bold text-[#0f2744] uppercase tracking-wider">
                        Doctor Roster &amp; Time Slot Selection
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Department Filter */}
                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Department Filter
                        </label>
                        <select
                          value={bookDepartmentFilter}
                          onChange={(e) => setBookDepartmentFilter(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                        >
                          <option value="all">All Departments ({availableSlots.length} open slots)</option>
                          {clinicDepartments.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Doctor & Slot Selector */}
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Select Physician &amp; Available Slot <span className="text-rose-500">*</span>
                        </label>
                        <select
                          required
                          value={bookSlotId}
                          onChange={(e) => setBookSlotId(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                        >
                          <option value="">Select Doctor &amp; Scheduled Slot…</option>
                          {filteredSlots.length > 0 ? (
                            filteredSlots.map((s) => (
                              <option key={s.slotId} value={s.slotId}>
                                {s.providerName} ({s.departmentName}) · {fmt(s.startAt)} ({s.durationMin || 30} min)
                              </option>
                            ))
                          ) : (
                            providers.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.specialty}) · {p.roomNumber} ({p.openSlotsCount} slots available)
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Consultation Mode */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      {[
                        { id: "In-Person Clinic Visit", label: "In-Person Visit", desc: "Consultation in clinic room" },
                        { id: "Telehealth Video Consultation", label: "Telehealth", desc: "Remote video / phone visit" },
                        { id: "Routine Follow-up", label: "Clinical Follow-Up", desc: "Lab review or treatment review" },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setBookAppointmentType(mode.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                            bookAppointmentType === mode.id
                              ? "border-[#0284c7] bg-[#f0f7ff] text-[#0f2744] ring-1 ring-[#0284c7]"
                              : "border-[#e2e8f0] bg-white text-[#475569] hover:bg-[#f8fafc]"
                          }`}
                        >
                          <p className="text-xs font-bold text-[#0f2744]">{mode.label}</p>
                          <p className="text-[11px] text-[#475569] mt-0.5">{mode.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SECTION 3: CLINICAL REASON, TRIAGE & SYMPTOMS */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3">
                      <div className="h-6 w-6 rounded-lg bg-[#f0f7ff] text-[#0284c7] flex items-center justify-center font-bold text-xs">
                        3
                      </div>
                      <h4 className="text-sm font-bold text-[#0f2744] uppercase tracking-wider">
                        Clinical Intake, Symptoms &amp; Triage Priority
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Urgency Level */}
                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Triage Urgency
                        </label>
                        <select
                          value={bookUrgency}
                          onChange={(e) => setBookUrgency(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                        >
                          <option value="Routine">🟢 Routine (Standard Intake)</option>
                          <option value="Moderate / Same-Day">🟡 Moderate (Same-Day Priority)</option>
                          <option value="Urgent / Priority">🔴 Urgent (Immediate Attention)</option>
                        </select>
                      </div>

                      {/* Symptom Duration */}
                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Symptom Duration
                        </label>
                        <select
                          value={bookSymptomDuration}
                          onChange={(e) => setBookSymptomDuration(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                        >
                          <option value="Today (< 24 hrs)">Today (&lt; 24 hrs)</option>
                          <option value="2 - 3 Days">2 - 3 Days</option>
                          <option value="1 - 2 Weeks">1 - 2 Weeks</option>
                          <option value="Chronic (> 1 month)">Chronic (&gt; 1 month)</option>
                          <option value="N/A - Routine Checkup">N/A - Routine Checkup</option>
                        </select>
                      </div>

                      {/* Known Allergies */}
                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Allergies / Medical Alerts
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Penicillin, Latex, None reported"
                          value={bookAllergies}
                          onChange={(e) => setBookAllergies(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Chief Complaint / Symptoms */}
                    <div>
                      <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                        Chief Complaint &amp; Clinical Reason <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={2}
                        value={bookReason}
                        onChange={(e) => setBookReason(e.target.value)}
                        placeholder="e.g. Patient reporting persistent migraine and mild fever for 2 days. Requesting consultation."
                        className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2.5 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* SECTION 4: BILLING, INSURANCE & SPECIAL ACCOMMODATIONS */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#e2e8f0] pb-3">
                      <div className="h-6 w-6 rounded-lg bg-[#f0f7ff] text-[#0284c7] flex items-center justify-center font-bold text-xs">
                        4
                      </div>
                      <h4 className="text-sm font-bold text-[#0f2744] uppercase tracking-wider">
                        Billing, Insurance &amp; Special Accommodations
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Payment Method / Insurance Provider
                        </label>
                        <select
                          value={bookInsuranceProvider}
                          onChange={(e) => setBookInsuranceProvider(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                        >
                          <option value="Self-Pay / Cash">Self-Pay / Cash at Desk</option>
                          <option value="Blue Cross Blue Shield">Blue Cross Blue Shield</option>
                          <option value="Aetna Health">Aetna Health</option>
                          <option value="Medicare / Medicaid">Medicare / Medicaid</option>
                          <option value="UnitedHealthcare">UnitedHealthcare</option>
                          <option value="Cigna">Cigna</option>
                          <option value="Other Private Insurance">Other Private Insurance</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                          Policy / Member ID (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. POL-8934271"
                          value={bookInsurancePolicy}
                          onChange={(e) => setBookInsurancePolicy(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1e3a5f] uppercase">
                        Front-Desk Special Accommodations &amp; Notes
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Wheelchair assistance required, translator requested, elderly patient accompanied by relative"
                        value={bookSpecialNotes}
                        onChange={(e) => setBookSpecialNotes(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#ffffff] p-2.5 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* LIVE SUMMARY CAPSULE */}
                  <div className="rounded-xl border border-[#cbd5e1] bg-[#f8fafc] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="font-bold text-[#0f2744]">
                        Booking Summary:{" "}
                        <span className="font-medium text-[#1e293b]">
                          {bookPatientName ? bookPatientName : "Patient name pending"} ({bookPatientEmail || "No email"})
                        </span>
                      </p>
                      <p className="text-[#475569]">
                        Physician:{" "}
                        <strong>{selectedSlot?.providerName || "No doctor selected yet"}</strong>
                        {selectedSlot && ` · ${fmt(selectedSlot.startAt)} (${selectedSlot.departmentName})`}
                        {selectedProvider?.roomNumber && ` · Room ${selectedProvider.roomNumber}`}
                      </p>
                    </div>

                    <div className="shrink-0 sm:text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-100 text-blue-800 font-bold text-xs">
                        {bookAppointmentType} · {bookUrgency}
                      </span>
                    </div>
                  </div>

                  {/* FORM ACTIONS */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-[#e2e8f0]">
                    <button
                      type="button"
                      onClick={handleResetBookingForm}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] hover:text-[#0f2744] transition-colors cursor-pointer"
                    >
                      Reset Form
                    </button>
                    <button
                      type="submit"
                      disabled={bookBusy || !bookPatientEmail || !bookPatientName}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#0284c7] hover:bg-[#0369a1] px-7 py-2.5 text-xs font-bold text-white transition-all duration-150 disabled:opacity-50 shadow-xs cursor-pointer"
                    >
                      {bookBusy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Scheduling Intake…</span>
                        </>
                      ) : (
                        <>
                          <CalendarPlus className="h-4 w-4" />
                          <span>Confirm &amp; Schedule Patient</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: DOCTOR AVAILABILITY & ROOMS */}
          {tab === "providers" && (
            <div className="space-y-6 max-w-6xl">
              <div className="grid gap-4 sm:grid-cols-2">
                {providers.map((p) => (
                  <div key={p.id} className="rounded-2xl border border-[#e2e8f0] bg-white p-5 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-[#f0f7ff]">
                      <div>
                        <p className="font-bold text-[#0f2744] text-sm">{p.name}</p>
                        <p className="text-xs text-[#0284c7] font-semibold">{p.specialty}</p>
                      </div>
                      <span className="rounded-full bg-sky-100 text-blue-800 border border-sky-200 px-2.5 py-0.5 text-xs font-bold">
                        On Duty
                      </span>
                    </div>
                    <div className="text-xs space-y-1 text-[#1e293b]">
                      <p><strong className="text-[#475569]">Room:</strong> {p.roomNumber}</p>
                      <p><strong className="text-[#475569]">Hours:</strong> {p.workingHours || "Mon–Fri 09:00–16:00"}</p>
                      <p><strong className="text-[#475569]">Consultation Fee:</strong> ${p.consultationFee}</p>
                      <p><strong className="text-[#475569]">Phone Ext:</strong> {p.contactPhone || "Ext 11"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: BILLING & CASHIER */}
          {tab === "billing" && (
            <div className="space-y-6 max-w-6xl">
              {/* Financial Summary KPI Cards (Responsive grid on mobile & desktop) */}
              {(() => {
                const totalInvoices = invoicesList.length;
                const paidInvoices = invoicesList.filter((i) => i.status === "paid");
                const pendingInvoices = invoicesList.filter((i) => i.status !== "paid");
                const totalCollected = paidInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
                const totalPending = pendingInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);

                const filteredInvoices = invoicesList.filter((inv) => {
                  const matchesFilter =
                    billingFilter === "all" ||
                    (billingFilter === "paid" && inv.status === "paid") ||
                    (billingFilter === "pending" && inv.status !== "paid");
                  const q = billingSearch.toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    inv.patientName?.toLowerCase().includes(q) ||
                    inv.invoiceNumber?.toLowerCase().includes(q) ||
                    inv.patientEmail?.toLowerCase().includes(q);
                  return matchesFilter && matchesSearch;
                });

                return (
                  <div className="space-y-5">
                    {/* Summary Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#475569]">Total Collected</span>
                          <span className="h-7 w-7 rounded-xl bg-sky-50 text-blue-700 grid place-items-center">
                            <DollarSign className="h-4 w-4" />
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-[#0284c7]">${totalCollected.toLocaleString()}.00</p>
                        <p className="text-[11px] text-[#64748b] mt-0.5">{paidInvoices.length} settled receipts</p>
                      </div>

                      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#475569]">Pending Checkout</span>
                          <span className="h-7 w-7 rounded-xl bg-amber-50 text-amber-700 grid place-items-center">
                            <Clock className="h-4 w-4" />
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-amber-700">${totalPending.toLocaleString()}.00</p>
                        <p className="text-[11px] text-[#64748b] mt-0.5">{pendingInvoices.length} patients awaiting copay</p>
                      </div>

                      <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#475569]">Total Invoices</span>
                          <span className="h-7 w-7 rounded-xl bg-sky-50 text-[#0284c7] grid place-items-center">
                            <CreditCard className="h-4 w-4" />
                          </span>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-[#0f2744]">{totalInvoices}</p>
                        <p className="text-[11px] text-[#64748b] mt-0.5">Clinic billing ledger active</p>
                      </div>
                    </div>

                    {/* Filter & Search Bar - Full Mobile Wrapping */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-[#e2e8f0] shadow-2xs">
                      {/* Search Input */}
                      <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#475569]" />
                        <input
                          type="text"
                          value={billingSearch}
                          onChange={(e) => setBillingSearch(e.target.value)}
                          placeholder="Search patient name, invoice #, or email…"
                          className="w-full h-9 rounded-xl border border-[#e2e8f0] bg-[#f8fafc] pl-9 pr-3 text-xs text-[#0f172a] placeholder:text-[#64748b] focus:border-[#0284c7] focus:bg-white focus:outline-none transition-all shadow-2xs"
                        />
                      </div>

                      {/* Filter Chips */}
                      <div className="flex items-center gap-1.5 overflow-x-auto thin-scroll pb-1 sm:pb-0">
                        <button
                          type="button"
                          onClick={() => setBillingFilter("all")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            billingFilter === "all"
                              ? "bg-[#0284c7] text-white shadow-2xs"
                              : "bg-[#f8fafc] text-[#475569] hover:bg-[#e2e8f0]"
                          }`}
                        >
                          All ({totalInvoices})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingFilter("pending")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            billingFilter === "pending"
                              ? "bg-amber-600 text-white shadow-2xs"
                              : "bg-amber-50 text-amber-800 border border-amber-200/60 hover:bg-amber-100"
                          }`}
                        >
                          Pending ({pendingInvoices.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingFilter("paid")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                            billingFilter === "paid"
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-sky-50 text-blue-800 border border-sky-200/60 hover:bg-sky-100"
                          }`}
                        >
                          Paid ({paidInvoices.length})
                        </button>
                      </div>
                    </div>

                    {/* DESKTOP TABLE VIEW (hidden on mobile, visible on md and up) */}
                    <div className="hidden md:block overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-2xs">
                      <div className="overflow-x-auto thin-scroll">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-[#f8fafc] text-[11px] tracking-wider text-[#1e3a5f] uppercase font-bold border-b border-[#e2e8f0]">
                            <tr>
                              <th className="px-5 py-3">Invoice #</th>
                              <th className="px-5 py-3">Patient</th>
                              <th className="px-5 py-3">Amount</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3 text-right">Cashier Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#f0f7ff]">
                            {filteredInvoices.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="px-5 py-8 text-center text-[#64748b]">
                                  No invoices match the selected filter.
                                </td>
                              </tr>
                            ) : (
                              filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-[#f8fafc] transition-colors">
                                  <td className="px-5 py-3.5 font-mono font-semibold text-[#0f2744]">
                                    {inv.invoiceNumber}
                                  </td>
                                  <td className="px-5 py-3.5">
                                    <div className="font-semibold text-[#0f2744]">{inv.patientName}</div>
                                    {inv.patientEmail && (
                                      <div className="text-[11px] text-[#64748b] font-mono">{inv.patientEmail}</div>
                                    )}
                                  </td>
                                  <td className="px-5 py-3.5 font-bold text-[#0f2744]">${inv.totalAmount}.00</td>
                                  <td className="px-5 py-3.5">
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase border ${
                                        inv.status === "paid"
                                          ? "bg-sky-100 text-blue-800 border-sky-200"
                                          : "bg-amber-100 text-amber-800 border-amber-200"
                                      }`}
                                    >
                                      {inv.status === "paid" && <Check className="h-3 w-3" />}
                                      {inv.status}
                                    </span>
                                  </td>
                                  <td className="px-5 py-3.5 text-right">
                                    {inv.status !== "paid" ? (
                                      <button
                                        type="button"
                                        onClick={() => setPayingInvoice(inv)}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs transition-colors cursor-pointer"
                                      >
                                        <DollarSign className="h-3.5 w-3.5" />
                                        <span>Collect Copay</span>
                                      </button>
                                    ) : (
                                      <span className="text-[11px] text-blue-700 font-medium">Receipt Filed</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* MOBILE CARD VIEW (visible on mobile only: block md:hidden) */}
                    <div className="block md:hidden space-y-3">
                      {filteredInvoices.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-[#e2e8f0] bg-white p-8 text-center text-xs text-[#64748b]">
                          No invoices match the selected filter.
                        </div>
                      ) : (
                        filteredInvoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="rounded-2xl border border-[#e2e8f0] bg-white p-4 shadow-2xs space-y-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-mono text-xs font-bold text-[#0284c7]">
                                  {inv.invoiceNumber}
                                </span>
                                <h4 className="text-sm font-bold text-[#0f2744] mt-0.5">{inv.patientName}</h4>
                                {inv.patientEmail && (
                                  <p className="text-[11px] text-[#64748b] font-mono">{inv.patientEmail}</p>
                                )}
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase border shrink-0 ${
                                  inv.status === "paid"
                                    ? "bg-sky-100 text-blue-800 border-sky-200"
                                    : "bg-amber-100 text-amber-800 border-amber-200"
                                }`}
                              >
                                {inv.status === "paid" && <Check className="h-3 w-3" />}
                                {inv.status}
                              </span>
                            </div>

                            <div className="flex items-center justify-between border-t border-[#f0f7ff] pt-2.5 text-xs">
                              <span className="text-[#475569]">Total Balance Due:</span>
                              <span className="text-base font-bold text-[#0f2744]">${inv.totalAmount}.00</span>
                            </div>

                            {inv.status !== "paid" ? (
                              <button
                                type="button"
                                onClick={() => setPayingInvoice(inv)}
                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer"
                              >
                                <DollarSign className="h-4 w-4" />
                                <span>Collect Copay (${inv.totalAmount}.00)</span>
                              </button>
                            ) : (
                              <div className="w-full text-center py-2 rounded-xl bg-sky-50 text-blue-800 text-xs font-semibold border border-sky-200">
                                ✓ Paid in Full · Electronic Receipt Archived
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB: NOTIFICATIONS & INQUIRIES */}
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
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#cbd5e1] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#0f2744] hover:bg-[#f8fafc] transition-colors cursor-pointer shadow-2xs"
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
                              className="inline-flex items-center gap-1 rounded-lg border border-[#cbd5e1] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#0f2744] hover:bg-[#f0f7ff] hover:text-[#0284c7] transition-colors shadow-2xs cursor-pointer"
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
        </div>
      </div>

      {/* MODAL: DIRECT CANCELLATION (PHONE/WALK-IN) */}
      {directCancelAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-2xl text-[#0f172a] space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-display text-base font-bold text-[#0f2744]">Cancel Patient Appointment</h3>
            </div>
            <p className="text-xs text-[#475569]">
              Cancel appointment for <strong>{directCancelAppt.patientName}</strong> with <strong>{directCancelAppt.providerName}</strong> on <strong>{fmt(directCancelAppt.startAt)}</strong>.
            </p>
            <div>
              <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">
                Mandatory Cancellation Reason *
              </label>
              <textarea
                required
                rows={3}
                placeholder="State the cancellation reason (e.g. Patient called to cancel, schedule conflict, transportation issue)…"
                value={directCancelReason}
                onChange={(e) => setDirectCancelReason(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-[#f0f7ff]">
              <button
                type="button"
                onClick={() => setDirectCancelAppt(null)}
                className="w-full sm:w-auto rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] transition-colors cursor-pointer"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={directCancelBusy || !directCancelReason.trim()}
                onClick={handleDirectCancel}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 shadow-xs transition-colors cursor-pointer"
              >
                {directCancelBusy ? "Cancelling…" : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROCESS CANCELLATION REQUEST */}
      {processingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl border border-[#e2e8f0] bg-white p-6 shadow-2xl text-[#0f172a] space-y-4">
            <div className="flex items-center gap-2.5 text-amber-700">
              <CalendarCheck className="h-5 w-5" />
              <h3 className="font-display text-base font-bold text-[#0f2744]">Process Cancellation Request</h3>
            </div>
            <div className="p-3 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-xs space-y-1">
              <p><strong>Patient:</strong> {processingRequest.patientName}</p>
              <p><strong>Doctor:</strong> {processingRequest.providerName}</p>
              <p><strong>Time:</strong> {fmt(processingRequest.startAt)}</p>
              <p><strong>Initiated By:</strong> {processingRequest.cancellationRequestedBy === "doctor" ? "Doctor" : "Patient"}</p>
              <p className="text-amber-800 font-medium mt-2"><strong>Reason Given:</strong> {processingRequest.cancellationReason}</p>
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#1e3a5f] uppercase">Front-Desk Resolution Note</label>
              <textarea
                rows={2}
                placeholder="Optional processing notes sent in notification to patient and doctor…"
                value={processNote}
                onChange={(e) => setProcessNote(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2 text-xs text-[#0f172a] focus:border-[#0f2744] focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setProcessingRequest(null)}
                className="rounded-full border border-[#e2e8f0] px-3.5 py-1.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc]"
              >
                Close
              </button>
              <button
                type="button"
                disabled={processBusy}
                onClick={() => handleProcessRequest(false)}
                className="rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
              >
                Reject Request
              </button>
              <button
                type="button"
                disabled={processBusy}
                onClick={() => handleProcessRequest(true)}
                className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
              >
                Approve &amp; Free Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CASHIER PAY */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-[#e2e8f0] bg-white p-5 sm:p-6 shadow-2xl text-[#0f172a] space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-[#f0f7ff] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-sky-50 text-[#0284c7] grid place-items-center">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#0f2744]">Collect Patient Copay</h3>
                  <p className="text-[11px] text-[#475569]">Cashier &amp; Checkout Station</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#f8fafc] p-3.5 border border-[#e2e8f0] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">Patient Name:</span>
                <span className="font-bold text-[#0f2744]">{payingInvoice.patientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">Invoice Number:</span>
                <span className="font-mono font-semibold text-[#0284c7]">{payingInvoice.invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#e2e8f0] pt-2 text-sm font-bold">
                <span className="text-[#0f2744]">Total Copay Due:</span>
                <span className="text-blue-700">${payingInvoice.totalAmount}.00</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#1e3a5f] uppercase tracking-wide">
                Payment Method &amp; Channel
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-2.5 text-xs text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none shadow-2xs"
              >
                <option value="Cash">Cash (Physical Currency)</option>
                <option value="Credit Card (Visa)">Credit Card (Visa / Mastercard)</option>
                <option value="Debit Card">Debit Card (Point of Sale)</option>
                <option value="Insurance Copay">Insurance Copay / Direct Billing</option>
                <option value="Mobile Payment">Mobile Payment (Apple Pay / Google Pay)</option>
              </select>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-[#f0f7ff]">
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="w-full sm:w-auto rounded-xl border border-[#e2e8f0] px-4 py-2.5 text-xs font-semibold text-[#475569] hover:bg-[#f8fafc] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={payBusy}
                onClick={handlePayInvoice}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {payBusy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Mark as Paid (${payingInvoice.totalAmount}.00)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <RoleSwitcherModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        currentEmail="receptionist@demo.clinic"
      />

      {/* ----------------- USER PROFILE MODAL ----------------- */}
      {showUserProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-blue-100">
            <button
              onClick={() => setShowUserProfileModal(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-[#0b192c] text-blue-400 font-display font-bold text-2xl flex items-center justify-center shadow-md border border-[#0f2744]">
                RD
              </div>
              <h3 className="mt-3.5 text-base font-bold text-[#0f2744]">{user.name}</h3>
              <span className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                Staff · Front Desk Receptionist
              </span>
              <p className="mt-1 text-xs text-[#475569]">receptionist@demo.clinic</p>
            </div>

            <div className="mt-5 space-y-2 border-t border-[#f0f7ff] pt-4 text-xs">
              <div className="flex justify-between py-1 text-stone-600">
                <span className="text-stone-400">Staff ID</span>
                <span className="font-semibold text-[#0f2744]">REC-1042-DESK</span>
              </div>
              <div className="flex justify-between py-1 text-stone-600">
                <span className="text-stone-400">Department</span>
                <span className="font-semibold text-[#0f2744]">Patient Relations &amp; Admissions</span>
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
              You will be safely logged out of your front desk reception session.
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
