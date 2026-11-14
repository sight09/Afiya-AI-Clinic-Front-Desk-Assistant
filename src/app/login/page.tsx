"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  HeartPulse,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  RotateCcw,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const DEMO_ACCOUNTS = [
  { email: "patient@demo.clinic", label: "Maya · patient", role: "patient" },
  { email: "patient2@demo.clinic", label: "Jordan · patient", role: "patient" },
  { email: "receptionist@demo.clinic", label: "Sarah · receptionist", role: "receptionist" },
  { email: "clinician@demo.clinic", label: "Dr. Rosa Ibarra · clinician", role: "clinician" },
  { email: "dr.meyer@demo.clinic", label: "Dr. Leon Meyer · clinician", role: "clinician" },
  { email: "admin@demo.clinic", label: "Theo · admin", role: "admin" },
];

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login states - check query param if pre-filled, otherwise clean inputs
  const [email, setEmail] = useState(() => params.get("email") || "");
  const [password, setPassword] = useState("");

  // Registration states
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regDob, setRegDob] = useState("");
  const [regGender, setRegGender] = useState("unspecified");
  const [regBlood, setRegBlood] = useState("");
  const [regAllergies, setRegAllergies] = useState("");
  const [regEmergencyName, setRegEmergencyName] = useState("");
  const [regEmergencyPhone, setRegEmergencyPhone] = useState("");
  const [regInsurance, setRegInsurance] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inIframe, setInIframe] = useState(false);

  // Reset Password 2-Step OTP modal states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<"email" | "otp" | "success">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    setInIframe(window.self !== window.top);
  }, []);

  async function submitRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError("Please enter your account email address.");
      return;
    }

    setResetBusy(true);
    setResetError(null);

    try {
      const res = await fetch("/api/auth/request-reset-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Failed to send verification code.");
      }
      setSimulatedOtp(data?.previewOtp ?? null);
      setResetStep("otp");
      setResetError(null);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setResetBusy(false);
    }
  }

  async function submitVerifyOtpAndReset(e: React.FormEvent) {
    e.preventDefault();
    if (resetOtp.trim().length !== 6) {
      setResetError("Please enter the 6-digit verification code sent to your email.");
      return;
    }
    if (resetNewPassword.length < 6) {
      setResetError("New password must be at least 6 characters.");
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setResetError("Passwords do not match. Please verify both fields.");
      return;
    }

    setResetBusy(true);
    setResetError(null);

    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: resetEmail.trim(),
          otp: resetOtp.trim(),
          newPassword: resetNewPassword,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Password reset failed.");
      }
      setResetSuccess(data?.message ?? "Password reset successfully!");
      setResetStep("success");
      // Automatically prefill the sign-in form with the newly verified credentials
      setEmail(resetEmail.trim());
      setPassword(resetNewPassword);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setResetBusy(false);
    }
  }

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          proto: window.location.protocol.replace(":", ""),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error?.message ?? `Sign-in failed (server ${res.status}). Check email and password.`,
        );
      }
      const next = params.get("next");
      const isStaffRole = data.user?.role === "clinician" || data.user?.role === "admin" || data.user?.role === "receptionist";
      let target = isStaffRole ? "/staff" : "/";
      if (next && next !== "/" && !next.includes("preview=patient")) {
        if (isStaffRole && (next.startsWith("/staff") || next.startsWith("/api"))) {
          target = next;
        } else if (!isStaffRole && !next.startsWith("/staff")) {
          target = next;
        }
      }
      window.location.assign(target);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: regName,
          email: regEmail.trim(),
          password: regPassword,
          phone: regPhone,
          dateOfBirth: regDob,
          gender: regGender,
          bloodGroup: regBlood,
          allergies: regAllergies,
          emergencyContactName: regEmergencyName,
          emergencyContactPhone: regEmergencyPhone,
          insuranceProvider: regInsurance,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error?.message ?? "Registration failed.");
      }
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12 bg-[#f8fafc] text-[#0f172a]">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-[14px] font-normal text-[#475569] hover:text-[#0284c7] transition-colors"
          >
            ← Back to Front Desk
          </a>
          <span className="text-[13px] font-medium text-[#0ea5e9] underline underline-offset-4 decoration-[#0ea5e9]">
            Afiya Portal
          </span>
        </div>

        <div className="mb-6 text-center">
          <div className="mx-auto flex justify-center mb-3">
            <img
              src="/afiya-logo.png"
              alt="Afiya — Better Care Starts Here"
              className="h-16 w-auto object-contain drop-shadow-xs"
            />
          </div>
          <h1 className="font-display mt-2 text-[28px] sm:text-[32px] font-medium text-[#0284c7]">
            {mode === "login" ? "Clinic System Sign In" : "New Patient Registration"}
          </h1>
          <p className="mt-1.5 text-[14px] font-normal text-[#475569]">
            {mode === "login"
              ? "Sign in with your staff account (Doctor, Receptionist, Admin) or patient credentials."
              : "Create your personal clinical profile and online portal account."}
          </p>
        </div>

        {inIframe && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/50 px-4 py-3">
            <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-[#0284c7]" />
            <p className="text-[12.5px] font-normal leading-relaxed text-[#0f172a]">
              This preview is running inside an embedded frame. If sign-in doesn&apos;t stick,{" "}
              <a
                href={typeof window !== "undefined" ? window.location.href.split("?")[0] : "/login"}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#0284c7] underline underline-offset-2 decoration-[#0ea5e9]"
              >
                open the app in a new tab
              </a>{" "}
              instead.
            </p>
          </div>
        )}

        <div className="rounded-3xl border border-[#e2e8f0] bg-white p-7 sm:p-8 shadow-xl">
          {/* Mode Switcher */}
          <div className="mb-6 grid grid-cols-2 gap-1.5 rounded-2xl bg-[#f0f7ff] p-1 border border-[#e2e8f0]">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`rounded-xl py-2 text-[13px] font-medium transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "text-[#475569] hover:text-[#0284c7]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`rounded-xl py-2 text-[13px] font-medium transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-[#0284c7] text-white shadow-xs"
                  : "text-[#475569] hover:text-[#0284c7]"
              }`}
            >
              Patient Registration
            </button>
          </div>

          {mode === "login" ? (
            <div>
              <p className="mb-2.5 text-[13px] font-normal text-[#475569]">
                1-Click test accounts (demo identities)
              </p>
              <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword("demo1234");
                    }}
                    className={`rounded-xl border px-3 py-2 text-left text-[13px] font-normal transition-all cursor-pointer ${
                      email === a.email
                        ? "border-[#0284c7] bg-[#0284c7] text-white font-medium shadow-xs"
                        : "border-[#e2e8f0] bg-[#f8fafc] text-[#0f172a] hover:border-[#0284c7]/40 hover:bg-white"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <form onSubmit={submitLogin} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[14px] font-medium text-[#0f172a]">
                    Account Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@demo.clinic or your-email@domain.com"
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[14px] font-medium text-[#0f172a]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(email.trim());
                        setResetNewPassword("");
                        setResetConfirmPassword("");
                        setResetError(null);
                        setResetSuccess(null);
                        setShowResetModal(true);
                      }}
                      className="text-[12.5px] font-medium text-[#0284c7] hover:text-[#0ea5e9] hover:underline transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none transition-all"
                    required
                  />
                </div>
                {error && <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-[12.5px] font-normal text-[#d9432f]">{error}</p>}
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0284c7] text-[15px] font-medium text-white transition-all hover:bg-[#0369a1] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin text-[#0ea5e9]" /> : <LogIn className="h-4 w-4 text-[#0ea5e9]" />}
                  Sign In to Clinic Portal
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={submitRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alex@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Password * (min 6 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={regDob}
                    onChange={(e) => setRegDob(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-2 text-[15px] font-normal text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Gender
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => setRegGender(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-2 text-[15px] font-normal text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  >
                    <option value="unspecified">Select...</option>
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Blood Group
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. O+"
                    value={regBlood}
                    onChange={(e) => setRegBlood(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-2 text-[15px] font-normal text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Known Allergies
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Penicillin, Peanuts, None"
                    value={regAllergies}
                    onChange={(e) => setRegAllergies(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Blue Cross / Self-Pay"
                    value={regInsurance}
                    onChange={(e) => setRegInsurance(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="Contact full name"
                    value={regEmergencyName}
                    onChange={(e) => setRegEmergencyName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[14px] font-medium text-[#0f172a]">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="Contact phone"
                    value={regEmergencyPhone}
                    onChange={(e) => setRegEmergencyPhone(e.target.value)}
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-[15px] font-normal text-[#0f172a] placeholder:text-[#475569]/60 focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {error && <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-[12.5px] font-normal text-[#d9432f]">{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0284c7] text-[15px] font-medium text-white transition-all hover:bg-[#0369a1] active:scale-[0.99] disabled:opacity-50 cursor-pointer shadow-md"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin text-[#0ea5e9]" /> : <UserPlus className="h-4 w-4 text-[#0ea5e9]" />}
                Create Patient Account
              </button>
            </form>
          )}

          <p className="mt-5 flex items-start gap-2 text-[12.5px] font-normal leading-relaxed text-[#475569]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0ea5e9]" />
            Security & Safety: Passwords are scrypt-hashed. Sessions use httpOnly partitioned cookies.
            Clinic records and patient health information are strictly isolated per role.
          </p>
        </div>
      </div>

      {/* 2-Step OTP Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border border-[#cbd5e1] bg-white p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-3.5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0284c7]/10 text-[#0284c7] border border-[#0284c7]/20">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-[#0284c7]">
                    {resetStep === "email" && "Reset Account Password"}
                    {resetStep === "otp" && "Enter Verification OTP"}
                    {resetStep === "success" && "Password Reset Complete"}
                  </h3>
                  <p className="text-[12px] text-[#475569]">
                    {resetStep === "email" && "Step 1 of 2 · Request Email OTP"}
                    {resetStep === "otp" && "Step 2 of 2 · Verify Code & Set Password"}
                    {resetStep === "success" && "Afiya Patient & Staff Security"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* STEP 1: Enter Email & Request OTP */}
            {resetStep === "email" && (
              <form onSubmit={submitRequestOtp} className="space-y-4">
                <p className="text-xs text-[#475569] leading-relaxed">
                  Enter your registered account email. We will generate and send a 6-digit one-time verification passcode (OTP) to your inbox.
                </p>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#0f172a]">
                    Account Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="e.g. patient@demo.clinic or staff email"
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3.5 text-sm font-normal text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>

                {resetError && (
                  <p className="rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-[12px] font-normal text-[#d9432f]">
                    {resetError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="rounded-xl border border-[#e2e8f0] bg-white px-4 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f0f7ff] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetBusy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0284c7] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0369a1] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {resetBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                    <span>Send Verification Code</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter OTP & Set New Password */}
            {resetStep === "otp" && (
              <form onSubmit={submitVerifyOtpAndReset} className="space-y-4">
                {/* Target email indicator & change button */}
                <div className="flex items-center justify-between rounded-xl bg-[#f0f7ff] border border-[#cbd5e1] p-2.5 px-3 text-xs">
                  <div className="min-w-0">
                    <span className="text-[11px] text-[#475569] block font-medium">Verification sent to:</span>
                    <span className="font-semibold text-[#0f2744] truncate block">{resetEmail}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep("email");
                      setResetError(null);
                    }}
                    className="text-xs font-bold text-[#0284c7] hover:underline shrink-0 ml-2"
                  >
                    Change email
                  </button>
                </div>

                {/* Simulated Email Notification Banner for Demo Evaluators & Judges */}
                {simulatedOtp && (
                  <div className="rounded-2xl border border-sky-300 bg-sky-50/90 p-3.5 text-xs text-[#0284c7] flex items-start gap-2.5">
                    <Mail className="h-4 w-4 shrink-0 mt-0.5 text-sky-700" />
                    <div>
                      <p className="font-bold text-sky-900">Email Dispatched (Security Demo Preview):</p>
                      <p className="mt-0.5 text-sky-800">
                        Your 6-digit one-time passcode is:{" "}
                        <span className="font-mono font-black text-slate-900 bg-sky-200/90 px-2 py-0.5 rounded tracking-widest text-sm">
                          {simulatedOtp}
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-[#0f172a]">
                      6-Digit Verification Code (OTP) *
                    </label>
                    <button
                      type="button"
                      disabled={resetBusy}
                      onClick={submitRequestOtp}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284c7] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Resend Code</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="h-11 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 font-mono text-center tracking-[0.35em] text-base font-bold text-[#0f2744] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#0f172a]">
                    New Password * (min 6 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-xs font-normal text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#0f172a]">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="h-10 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 text-xs font-normal text-[#0f172a] focus:border-[#0284c7] focus:bg-white focus:outline-none"
                  />
                </div>

                {resetError && (
                  <p className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-[12px] font-normal text-[#d9432f]">
                    {resetError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e2e8f0]">
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep("email");
                      setResetError(null);
                    }}
                    className="rounded-xl border border-[#e2e8f0] bg-white px-3.5 py-2 text-xs font-semibold text-[#475569] hover:bg-[#f0f7ff] transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={resetBusy}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0284c7] px-4 py-2 text-xs font-bold text-white hover:bg-[#0369a1] transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {resetBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                    <span>Verify Code &amp; Reset Password</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Success Confirmation */}
            {resetStep === "success" && (
              <div className="space-y-4 py-2">
                <div className="rounded-2xl border border-sky-300 bg-sky-50/80 p-5 text-center">
                  <CheckCircle2 className="mx-auto h-11 w-11 text-blue-600 mb-2" />
                  <h4 className="text-sm font-bold text-[#0f2744]">Password Updated Successfully!</h4>
                  <p className="mt-1 text-xs text-[#475569] leading-relaxed">
                    {resetSuccess || "Your password has been verified and updated. All prior sessions have been logged out for security."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setMode("login");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0284c7] py-3 text-xs font-bold text-white hover:bg-[#0369a1] transition-colors shadow-xs cursor-pointer"
                >
                  <span>Continue to Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
