<div align="center">
  <p align="center">
    <img src="public/afiya-logo.png" alt="Afiya — Better Care Starts Here" width="310" style="vertical-align: middle; display: inline-block;" />
    &nbsp;&nbsp;&nbsp;&nbsp;
    <img src="public/mascot.svg" alt="Afiya Clinical Mascot" width="115" style="vertical-align: middle; display: inline-block;" />
  </p>

  <h1>Afiya — Better Care Starts Here</h1>

  <p><strong>Intelligent AI Front-Desk Assistant, Clinical Workflow Automation Engine &amp; Full-Stack Healthcare Operations Platform</strong></p>

  <p>
    <a href="#quick-start--local-setup"><img src="https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js" alt="Next.js 16" /></a>
    <a href="#quick-start--local-setup"><img src="https://img.shields.io/badge/TypeScript-5.9_Strict-0284c7?style=for-the-badge&logo=typescript" alt="TypeScript Strict" /></a>
    <a href="#quick-start--local-setup"><img src="https://img.shields.io/badge/PostgreSQL-Drizzle_ORM-004088?style=for-the-badge&logo=postgresql" alt="PostgreSQL" /></a>
    <a href="#verification-tests--evaluation-benchmarks"><img src="https://img.shields.io/badge/Vitest-46%2F46_Passing-0284c7?style=for-the-badge&logo=vitest" alt="Vitest 46/46" /></a>
    <a href="#safety-ethics--medical-boundary-model"><img src="https://img.shields.io/badge/Safety_Benchmark-100%25_Deterministic-0ea5e9?style=for-the-badge" alt="Safety 100%" /></a>
    <a href="#code-quality--linting"><img src="https://img.shields.io/badge/ESLint-Clean_0_Errors-0284c7?style=for-the-badge&logo=eslint" alt="ESLint Clean" /></a>
    <a href="#clinical-uiux-design-system"><img src="https://img.shields.io/badge/UI%2FUX-Clinical_Hospital_Blue-0284c7?style=for-the-badge&logo=tailwindcss" alt="Clinical Blue" /></a>
  </p>

  <p>
    <strong>Final Project Submission — Brolf Tech Remote Internship Challenge 2026, AI &amp; Automation Track (PROJECT 3)</strong>
  </p>
</div>

---

## Table of Contents

1. [Executive Summary & System Problem](#executive-summary--system-problem)
2. [End-to-End System Architecture](#end-to-end-system-architecture)
3. [Multi-Role Workspaces & RBAC Matrix](#multi-role-workspaces--rbac-matrix)
   - [Patient Health Portal](#1-patient-health-portal-)
   - [Receptionist Operations Station](#2-receptionist-operations-station-staff)
   - [Physician Clinical Station & EHR](#3-physician-clinical-station--ehr-staff)
   - [Clinic Administration & Executive Governance](#4-clinic-administration--executive-governance-staff)
4. [Safety, Ethics & Medical Boundary Model](#safety-ethics--medical-boundary-model)
5. [Engineering Rigor & Core Technical Innovations](#engineering-rigor--core-technical-innovations)
   - [Zero Double-Booking Transactional Concurrency](#1-zero-double-booking-transactional-concurrency)
   - [Deterministic Pre-LLM Safety & Grounded FAQ Pipeline](#2-deterministic-pre-llm-safety--grounded-faq-pipeline)
   - [Cryptographic Session Security & Server-Side RBAC](#3-cryptographic-session-security--server-side-rbac)
   - [Mobile-Responsive Dual-View Engineering](#4-mobile-responsive-dual-view-engineering)
6. [REST API Specification](#rest-api-specification)
7. [Relational Schema & Entity Relationship](#relational-schema--entity-relationship)
8. [Quick Start & Local Setup](#quick-start--local-setup)
9. [Clinical UI/UX Design System](#clinical-uiux-design-system)
10. [Verification, Tests & Evaluation Benchmarks](#verification-tests--evaluation-benchmarks)
11. [Synthetic Demo Accounts](#synthetic-demo-accounts)
12. [5-Minute Evaluation Walkthrough for Judges](#5-minute-evaluation-walkthrough-for-judges)
13. [Technical Documentation Index](#technical-documentation-index)

---

## Executive Summary & System Problem

Healthcare clinics lose **15–20 hours weekly** to repetitive front-desk administrative friction: appointment phone triage, double-booking schedule conflicts, manual copay reconciliation, forgotten appointment no-shows, and fragmented communication between receptionists and attending clinicians.

**Afiya** is a production-grade healthcare operations platform that solves this operational crisis through **safety-first conversational AI and transactional workflow automation**:

- **24/7 Patient Self-Service**: Conversational triage, grounded FAQ queries, instant slot reservation, digital health card access, and calendar synchronization (.ics).
- **Zero-Double-Booking Concurrency**: PostgreSQL `SELECT ... FOR UPDATE` row-level locks prevent appointment race conditions under concurrent network traffic.
- **Strict Medical Boundary Enforcement**: Pre-LLM deterministic red-flag emergency screening intercepts acute medical distress before any model inference occurs. **AI never diagnoses, prescribes, or claims clinical authority.**
- **Comprehensive Clinical & Financial Operations**: Unified Electronic Health Records (EHR) with objective vitals, **physician-only diagnoses**, e-prescriptions, cashier copay collection, and automated accounts receivable ledger.
- **Executive Analytics & Governance**: Asymmetrical bento command center featuring SVG financial velocity curves, circular SVG slot occupancy radial gauges, consultation load charts, and automated audit telemetry.

---

## End-to-End System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENT LAYER (Browser / Mobile)                                  │
│                                                                                                  │
│   Patient Portal (/)         Receptionist Station (/staff)    Doctor Station (/staff)   Admin Console (/staff)
│   - ChatGPT-mood Canvas      - Responsive Check-In Bento       - Landscape Pass Card    - Bento Executive Analytics
│   - Read-Only Health Card    - Profiles Registry & Card Editor - EHR & Clinical Notes   - User Role Governance
│   - Billing Checkout (.ics)  - Cashier Copay Settlement        - AI Intake Audit Queue  - Safety Policy Controls
│   - Certified Providers      - Reminder Dispatch Telemetry     - Human-Only Diagnosis   - 44-Case Eval Suite
└─────────────────────────────────┬────────────────────────────────────────────────────────────────┘
                                  │ HTTPS Fetch + httpOnly Partitioned Cookie
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               NEXT.JS 16 APP ROUTER (Server Runtime)                             │
│                                                                                                  │
│  ┌─────────────────────────────── Server-Side Security Boundaries ─────────────────────────────┐  │
│  │ Rate Limiter (Token Bucket)  │  Scrypt Session Auth Guard  │  Zod Ingress & Egress Contracts │  │
│  └──────────────────────────────────────────────┬──────────────────────────────────────────────┘  │
│                                                 ▼                                                 │
│  ┌────────────────────────────── Multi-Stage Request Gateway ──────────────────────────────────┐  │
│  │                                                                                              │  │
│  │  1. Prompt Injection Scanner  ──► Regex delimiter evasion & token anomaly check              │  │
│  │  2. Deterministic Safety Scan ──► Pre-LLM matcher over active `red_flag_rules` (Zero Hallucination)
│  │  3. Anti-Collision Classifier──► Keyword & intent disambiguation (FAQ / Booking / Intake)   │  │
│  │                                                                                              │  │
│  └───────┬───────────────────────────┬──────────────────────────┬───────────────────────────────┘  │
│          ▼                           ▼                          ▼                                  │
│  ┌───────────────┐          ┌─────────────────┐        ┌─────────────────┐                         │
│  │  FAQ Service  │          │ Intake Pipeline │        │ Booking Engine  │                         │
│  │  Approved DB  │          │ Strict Zod JSON │        │ FOR UPDATE Lock │                         │
│  │  Corpus Only  │          │ Schema Parsing  │        │ Idempotency Key │                         │
│  └───────┬───────┘          └────────┬────────┘        └────────┬────────┘                         │
│          │                           │                          │                                  │
│          ▼                           ▼                          ▼                                  │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                   LLM Provider Abstraction (`mock` default | `openai`-compatible)         │  │
│  │      *Failsafe Mechanism: Automatic fallback to deterministic regex engine on timeout/error*      │  │
│  └───────────────────────────────────────────┬───────────────────────────────────────────────┘  │
│                                              ▼                                                   │
│  ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                    Drizzle ORM & Relational Persistence Layer (PostgreSQL)                 │  │
│  │  - users & sessions        - providers & slots        - appointments & waitlist            │  │
│  │  - patient_profiles        - clinical_records (EHR)   - invoices & billing transactions    │  │
│  │  - notifications & alerts  - intake_sessions & drafts - audit_logs (SHA-256 telemetry)     │  │
│  └───────────────────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Role Workspaces & RBAC Matrix

The system enforces strict **Role-Based Access Control (RBAC)** across 4 user personas. All mutations are validated server-side; client UI role gating is paired with server route guards:

| Capability / Resource | Patient (`patient`) | Receptionist (`receptionist`) | Clinician (`clinician`) | Administrator (`admin`) |
|---|:---:|:---:|:---:|:---:|
| **Conversational AI Intake & FAQ** | Read / Write | Read Only | Read Only | Read Only |
| **Digital Patient Health Card** | **Strict Read-Only** | **File, Edit & Issue** | Read Only | **Full Oversight** |
| **Front-Desk Check-In Triage** | View Own Status | **Full Triage Control** | View Queue | **Full Oversight** |
| **Slot Availability & Creation** | View Open Slots | View / Create Slots | View Assigned Slots | **Global Master Manager** |
| **Clinical Encounter Notes & EHR** | View Own Past Visits | No Access | **Author & Commit** | **Audit Review Only** |
| **Official Medical Diagnosis** | No Access | No Access | **Sole Authority (Human)**| No Access |
| **Cashier Copay & Invoice Settlement** | Pay Own Invoices | **Collect & Mark Paid**| Trigger upon EHR | **Financial Ledger** |
| **User Role Management & Permissions**| No Access | No Access | No Access | **Superuser Authority** |
| **Automated 44-Case Safety Suite** | No Access | No Access | No Access | **Run & Inspect** |

---

### 1. Patient Health Portal (`/`)
- **Conversational AI Canvas**: ChatGPT-mood full-height chat workspace answering clinic FAQs from approved corpus, guiding intake, and facilitating booking.
- **Strictly Read-Only Digital Health Card**: Patient demographic pass displaying Member ID, emergency contact, insurance details, documented allergies, blood group, and verification seal. Prevents unauthorized self-modifications; includes guidance banner instructing patients to contact the front desk for updates.
- **Appointments Timeline**: Live status tracking (`confirmed`, `checked_in`, `in_consultation`, `completed`), instant calendar download (`.ics` generation), and direct cancellation request routing.
- **Clinical Records**: Read-only timeline of completed doctor visits, objective vitals, diagnoses, and prescribed medications.
- **Billing & Receipts**: Itemized consultation invoices with instant mock card checkout and digital receipt generation.
- **Certified Physician Directory**: Specialist bios, consultation rooms, fees, practice hours, and booking triggers.

---

### 2. Receptionist Operations Station (`/staff`)
- **Gold-Standard Header**: Standardized glassmorphic header (`min-h-[76px]`) with live station badge, real-time sync, and quick action shortcuts.
- **Mobile-Responsive Check-In Station (`tab === "schedule"`)**:
  - **Asymmetrical Triage Bento**:
    - *Daily Intake Hero Card (5 cols)*: Dark botanical emerald gradient, daily volume counter, live station queue indicator, and a **3-stage colored progress bar** (Awaiting arrival, In clinic, Completed) with percentage completion.
    - *Awaiting Check-In Action Card (4 cols)*: Soft blue arrival-beacon styling, counter, and one-tap **"Filter Awaiting"** toggle button.
    - *Clinical Triage & Room Activity Card (3 cols)*: Dual mini-monitors for lounge queue and active consultation rooms (`Suites 101–104 Active`).
  - **Dual-View Adaptive Layout**: Scrollable table on desktop (`hidden md:block`); touch-optimized check-in cards on mobile (`block md:hidden`) featuring prominent **"Check In Patient Now"** buttons.
- **Patient Profiles & Cards Registry (`tab === "patient_profiles"`)**: Exclusive front-desk capability to register walk-ins, edit demographic/insurance records, record drug allergies, and generate printable digital health passes.
- **Cashier & Checkout (`tab === "billing"`)**: Financial KPI summary, live search, desktop table + mobile checkout cards, and responsive copay collection modal supporting Cash, Visa/Mastercard, Debit, and Insurance Copays.
- **Cancellation & Reschedule Manager (`tab === "cancellation_requests"`)**: Review doctor and patient cancellation requests with automated 15-minute expiring waitlist offers.
- **Automated Reminders (`tab === "automation"`)**: Dedicated clock-icon station monitoring scheduled 24h & 48h pre-visit reminders and dispatch telemetry.

---

### 3. Physician Clinical Station & EHR (`/staff`)
- **Rectangular Landscape Credential Card (`tab === "profile"`)**:
  - Redesigned executive landscape format (`max-w-4xl`, aspect ratio ~2.4:1).
  - Left column: Afiya branding, **Verified Clinician** seal, MD avatar with gold ring, doctor name, title, specialty, copyable Staff ID, and State Medical License number.
  - Right column: Frosted glass panel with practice hours, consultation suite, official email, **Hospital EMR Authorization QR Code** ("Level 4 Clinical Access · Valid Through Dec 2027"), and in-card "Print Card" & "Copy ID" buttons.
  - **Active Clinical Privileges Panel**: Verified scope for Inpatient/Outpatient consultations, DEA Schedule II-V digital prescribing, and diagnostic lab ordering.
- **Schedule & Encounter Queue (`tab === "schedule"`)**: Daily patient roster with real-time queue transitions (`Call Patient` → `in_consultation` → `Complete`).
- **Electronic Health Records (`tab === "records"`)**:
  - Objective vitals logging: Blood pressure (mmHg), heart rate (bpm), body temperature (°F/°C).
  - Subjective & objective clinical encounter notes.
  - **Human-Only Medical Diagnosis**: Strictly locked to licensed physicians; AI is programmatically barred from authoring diagnoses.
  - Prescription medication management (drug name, dosage, dosing instructions).
  - Automated billing trigger: Generates accounts receivable invoice upon record finalization.
- **AI Intake Review Queue (`tab === "review"`)**: Physician audit queue allowing doctors to review, approve, revise, or discard AI-extracted intake summaries.

---

### 4. Clinic Administration & Executive Governance (`/staff`)
- **Executive Analytics Bento (`tab === "operations"`)**:
  - **Hero Revenue & Financial Velocity Card (8 cols)**: Large `$XXX.00` revenue figure, positive velocity pill (`+18.4%`), pending collections, and a **smooth SVG area & line graph** mapping 7-day velocity (`Mon` to `Today`) with an emerald gradient glow.
  - **Slot Utilization Radial Dial Gauge (4 cols)**: Interactive SVG circular dial gauge with colored track and animated green occupancy ring, percentage readout (`X% Occupied`), and capacity status badge (`High Availability`, `Optimal Capacity`, `Peak Load`).
  - **Confirmed Consultations & Hourly Load Card (6 cols)**: Time-block multi-bar distribution chart (`09:00 - 11:00`, `11:00 - 13:00`, `13:00 - 15:00`, `15:00 - 17:00`) and consultation status pills.
  - **Registered Users & Workforce Composition (6 cols)**: Multi-segment horizontal progress bar color-coded by role (Doctors in emerald, Front Desk in blue, Admins in amber, Patients in teal) + 4 interactive role filter cards.
  - **Operational Status Bar**: Live counters for AI Draft Summaries, Pending Reminders, Waitlisted Patients, and Archived Encounters.
  - **Audit Trail**: Real-time audit log tracking every security and operational event.
- **Staff & User Role Governance (`tab === "users"`)**: Provision new staff accounts, manage roles, and reset credentials.
- **Clinic Safety Policy (`tab === "safety"`)**: Configure pre-LLM red-flag detection rules and escalation procedures.
- **Automated Evaluation Suite (`tab === "eval"`)**: Execute the comprehensive 44-case safety benchmark suite directly from the browser.

---

## Safety, Ethics & Medical Boundary Model

```
                               Patient Message Enters Chat
                                            │
                                            ▼
                           ┌─────────────────────────────────┐
                           │   Prompt Injection Screening    │
                           │   (Regex & delimiter analysis)  │
                           └────────────────┬────────────────┘
                                            │ Pass
                                            ▼
                           ┌─────────────────────────────────┐
                           │  DETERMINISTIC SAFETY MATCHER   │
                           │  Pre-LLM Red-Flag Rules Cache   │
                           └───────┬─────────────────┬───────┘
                                   │                 │
                           Match   │                 │ No Match
                                   ▼                 ▼
             ┌───────────────────────────┐    ┌───────────────────────────┐
             │ EMERGENCY RED-FLAG TRIGGER│    │ Intent Classifier         │
             │ - Bypasses all LLM calls  │    │ - FAQ: Approved DB Corpus │
             │ - Displays ER referral    │    │ - Booking: Live DB Slots  │
             │ - Logs SHA-256 audit entry│    │ - Intake: Strict Zod JSON │
             │ - Explicit Non-Dx Warning │    └─────────────┬─────────────┘
             └───────────────────────────┘                  │
                                                            ▼
                                              ┌───────────────────────────┐
                                              │ AI Summary Draft Marked   │
                                              │ "DRAFT — NOT FOR DX"      │
                                              └─────────────┬─────────────┘
                                                            │
                                                            ▼
                                              ┌───────────────────────────┐
                                              │ Human Clinician Review &  │
                                              │ Physician-Only Diagnosis  │
                                              └───────────────────────────┘
```

1. **Deterministic Pre-LLM Safety Screening**:
   - Every patient message is analyzed against active `red_flag_rules` (e.g., chest pain, difficulty breathing, acute neurological deficits, uncontrolled bleeding).
   - A match **instantly short-circuits the pipeline**, returning emergency guidance (e.g. *Call 911 or visit the nearest ER*) and an explicit non-diagnostic disclaimer. **No LLM is invoked during red-flag events, eliminating hallucination risks entirely.**
2. **Strict Non-Diagnostic Boundary**:
   - The AI Assistant is explicitly forbidden from suggesting diagnoses, prescribing medications, or recommending clinical regimens.
   - All intake outputs are saved as `DRAFT` summaries requiring human physician review and approval before entering official medical charts.
3. **Approved-Corpus FAQ Answering**:
   - FAQ queries are matched solely against verified clinic database records. Questions outside the approved corpus receive a deterministic fallback directing the user to human staff.
4. **Data Minimization & Patient Privacy**:
   - Audit logs never record raw patient message text; only salted SHA-256 hashes are preserved for security correlation.

---

## Engineering Rigor & Core Technical Innovations

### 1. Zero Double-Booking Transactional Concurrency
Under high concurrent loads, two patients attempting to reserve the same time slot can create duplicate bookings. Afiya eliminates race conditions at the database engine level:

```typescript
// Transactional Slot Locking in src/lib/booking/service.ts
await db.transaction(async (tx) => {
  const [slot] = await tx
    .select()
    .from(slots)
    .where(and(eq(slots.id, slotId), eq(slots.isAvailable, true)))
    .for("update"); // Row-level lock acquired

  if (!slot) {
    throw new AppError("slot_unavailable", "This slot was just claimed by another patient.");
  }

  // Atomically mark slot unavailable and insert appointment
  await tx.update(slots).set({ isAvailable: false }).where(eq(slots.id, slotId));
  await tx.insert(appointments).values({ ...appointmentData });
});
```

### 2. Deterministic Pre-LLM Safety & Grounded FAQ Pipeline
- **Zero Hallucination Architecture**: Rather than relying on system prompt adherence, safety-critical workflows bypass the model entirely.
- **Fail-Safe Fallback**: If an external LLM provider encounters network latency, rate limits, or output parsing failures, the system automatically falls back to an internal deterministic extraction parser without crashing the user session.

### 3. Cryptographic Session Security & Server-Side RBAC
- **Password Security**: Passwords hashed using Node.js native `crypto.scrypt` with individual random 16-byte salts and derived key length of 64 bytes.
- **Brute-Force Mitigation**: In-memory sliding window rate limiting prevents credential stuffing.
- **Cookie Partitioning**: Session tokens stored in `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookies, completely inaccessible to browser JavaScript.
- **Server-Side Authorization**: Every API mutation re-verifies session authenticity, active account status, and role authority.

### 4. Mobile-Responsive Dual-View Engineering
Rather than forcing desktop tables onto mobile viewports (which results in clipped data and horizontal layout breaks), Afiya implements a **dual-view pattern**:
- **Desktop View (`hidden md:block`)**: Information-dense tables wrapped in `overflow-x-auto thin-scroll` for maximum administrative productivity.
- **Mobile View (`block md:hidden`)**: Fully native card-based workflows with touch targets exceeding Apple/Android HIG guidelines (min 44px).

---

## REST API Specification

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates credentials, issues partitioned session cookie |
| `POST` | `/api/auth/register` | Public | Self-registration for new patients with profile initialization |
| `POST` | `/api/auth/logout` | Authenticated | Revokes session token in database and clears client cookie |
| `GET` | `/api/auth/me` | Authenticated | Returns current authenticated user identity and role |
| `POST` | `/api/assistant/chat` | Authenticated / Guest | Front-desk AI conversation pipeline with tool calling |
| `GET` | `/api/patient/profile` | Patient / Reception / Admin | Fetches patient digital health card and clinical demographics |
| `POST` | `/api/patient/profile` | **Reception / Admin Only** | **Filing & editing patient cards (403 for patients)** |
| `GET` | `/api/appointments` | Authenticated | Lists appointments scoped by role (patient sees own; staff sees all) |
| `POST` | `/api/appointments` | Authenticated | Atomically books an appointment with `FOR UPDATE` lock |
| `POST` | `/api/appointments/:id/status`| Reception / Doctor / Admin | Updates status (`checked_in`, `in_consultation`, `completed`) |
| `POST` | `/api/appointments/:id/cancel`| Authenticated | Cancels appointment or files cancellation request |
| `GET` | `/api/records` | Patient / Doctor / Admin | Electronic Health Records (EHR) timeline |
| `POST` | `/api/records` | **Doctor Only** | **Documents consultation notes, vitals, diagnosis & e-Rx** |
| `GET` | `/api/billing` | Authenticated | Invoices and payment ledger |
| `POST` | `/api/billing/:id/pay` | Patient / Reception / Admin | Collects copay / settles invoice via cash, POS, or card |
| `GET` | `/api/staff/overview` | Reception / Doctor / Admin | Live clinic operational KPI metrics and audit trail |
| `GET` | `/api/admin/users` | **Admin Only** | Lists all registered accounts across roles |
| `POST` | `/api/admin/users` | **Admin Only** | Provisions new clinician, receptionist, or admin accounts |
| `POST` | `/api/eval/run` | **Admin Only** | Executes the automated 44-case safety benchmark suite |

---

## Relational Schema & Entity Relationship

Built on **PostgreSQL** and managed declaratively via **Drizzle ORM**:

```
 ┌──────────────┐       1:N       ┌──────────────┐
 │    users     │─────────────────│   sessions   │
 └──────┬───────┘                 └──────────────┘
        │
        │ 1:1                     1:N
        ├─────────────────────────────────────────┐
        │                                         │
        ▼                                         ▼
 ┌──────────────┐       1:N       ┌──────────────┐       1:N       ┌──────────────┐
 │patient_profil│                 │  providers   │─────────────────│    slots     │
 └──────┬───────┘                 └──────┬───────┘                 └──────┬───────┘
        │                                │                                │
        │ 1:N                            │ 1:N                            │ 1:1
        ▼                                ▼                                ▼
 ┌──────────────┐                 ┌──────────────┐                 ┌──────────────┐
 │   invoices   │                 │clinical_recor│                 │ appointments │
 └──────────────┘                 └──────────────┘                 └──────┬───────┘
                                                                          │
                                                                   1:N    ▼
 ┌──────────────┐        1:N      ┌──────────────┐          ┌──────────────┐
 │  audit_logs  │                 │ notifications│          │  reminders   │
 └──────────────┘                 └──────────────┘          └──────────────┘
```

---

## Quick Start & Local Setup

### Prerequisites
- **Node.js**: v20.x or higher
- **Package Manager**: `npm` (v10+)
- **Database**: PostgreSQL (local instance or hosted e.g. Neon, Supabase)

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/brolf-tech/ai-clinic-assistant.git
   cd ai-clinic-assistant
   ```

2. **Install project dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and specify your PostgreSQL connection string*:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/afiya_clinic"
   AI_PROVIDER="mock" # or "openai" for live LLM inference
   SEED_DEMO_PASSWORD="demo1234"
   ```

4. **Initialize Database Schema & Synthetic Seed Data**:
   ```bash
   npx drizzle-kit push
   npm run db:reset
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Clinical UI/UX Design System

Afiya adheres to an authentic **Hospital Medical Blue & Sterile Ice** aesthetic inspired by leading clinical EHR platforms (Epic MyChart, Cerner, Mayo Clinic Health System):

```
┌────────────────────────┬────────────────────────────────────────────────────────────────────────────┐
│ Color Role             │ Token & Value           │ Clinical Function                                │
├────────────────────────┼─────────────────────────┼──────────────────────────────────────────────────┤
│ Deep Medical Navy      │ #0f2744 / #0b192c       │ Portal headers, sidebars, dark card surfaces     │
│ Primary Action Blue    │ #0284c7 / #0369a1       │ CTAs, active tab selections, booking actions     │
│ Clinical Cerulean      │ #0ea5e9 / sky-500       │ Real-time grounding chips, status badges, dots   │
│ Sterile Ice Canvas     │ #f8fafc / #f0f7ff       │ High-contrast clean medical canvas background    │
│ Clinical Slate Borders │ #e2e8f0 / #cbd5e1       │ Subtle container dividers, inputs, table borders │
│ Medical Slate Text     │ #0f172a / #475569       │ High-readability clinical text & metadata        │
└────────────────────────┴─────────────────────────┴──────────────────────────────────────────────────┘
```

- **WCAG AA/AAA Contrast Compliance**: All text and icon elements guarantee high contrast ratios (minimum 4.5:1 for body copy and 7:1 for headers).
- **Favicon & Asset Cache Busting**: File-based Next.js metadata icons and explicit `<link>` tags with version parameters (`?v=3`) prevent stale browser caching.
- **Micro-Interactions**: Smooth CSS transitions, active scale feedback, pulsing status indicators for live queue updates, and floating mascot character.

---

## Verification, Tests & Evaluation Benchmarks

Afiya comes equipped with a comprehensive multi-layered automated test suite:

### 1. TypeScript Strict Typecheck
```bash
npm run typecheck
```
*Executes `tsc --noEmit`. Verified clean with **0 compilation errors** across all components, API routes, database models, and unit tests.*

### 2. ESLint Code Quality & Standards
```bash
npm run lint
```
*Executes `eslint .`. Verified clean with **0 errors and 0 warnings** adhering to strict Next.js and React code quality standards.*

### 3. Vitest Unit & Integration Suite (46 Tests)
```bash
npm test
```
*Executes **46 automated unit and integration tests** across 4 test suites (`safety`, `intake`, `booking`, `clinic-features`) verifying pure business logic, atomic slot locking with PostgreSQL `SELECT ... FOR UPDATE`, injection defense, secure scrypt password hashing, RBAC guards, and cashier billing workflows (100% pass rate).*

### 4. Automated Safety & Clinical Evaluation Benchmark (44 Cases)
```bash
npm run eval
```
*Executes 44 rigorous test scenarios across emergency red-flag triggers, medical boundary denials, anti-hallucination checks, and role ownership isolation (100% pass rate, 0 critical failures).*

### 4. End-to-End RBAC Security Suite
```bash
npx tsx scratch/test_e2e_rbac.ts
npx tsx scratch/test_patient_card_rbac.ts
```
*Simulates all 4 user roles making live HTTP requests against the API to verify server-side authorization enforcement.*

---

## Synthetic Demo Accounts

All accounts are pre-seeded with synthetic test identities. Password for all demo accounts: `demo1234`.

| Email Address | Role | Display Name | Purpose & Access Scope |
|---|---|---|---|
| `patient@demo.clinic` | `patient` | Maya Chen | AI Front-Desk Chat, Read-Only Card, Appointments, Billing |
| `patient2@demo.clinic` | `patient` | Jordan Ali | Cross-patient boundary testing & independent EHR records |
| `receptionist@demo.clinic` | `receptionist`| Sarah Jenkins | Front-Desk Check-In Bento, Patient Card Filing, Cashier POS |
| `clinician@demo.clinic` | `clinician` | Dr. Rosa Ibarra | Rectangular Credential Card, EHR Clinical Notes, Diagnoses |
| `dr.meyer@demo.clinic` | `clinician` | Dr. Leon Meyer | Internal medicine specialist consultation & schedule |
| `admin@demo.clinic` | `admin` | Theo Park | Bento Executive Analytics, User Roles, Master Safety Policy |

---

## 5-Minute Evaluation Walkthrough for Judges

Judges can execute this rapid 5-minute walkthrough to test all critical technical capabilities:

1. **Test Conversational AI & Emergency Interception**:
   - Navigate to [http://localhost:3000](http://localhost:3000).
   - Sign in as `patient@demo.clinic` (Password: `demo1234`).
   - In chat, send: `"What are your consultation fees and opening hours?"` → *Returns grounded FAQ response from DB*.
   - Send: `"I am having severe chest pain and left arm numbness"` → *Instantly triggers pre-LLM red-flag safety escalation with emergency care referral*.
   - Send: `"I would like to book an appointment with a doctor"` → *Interactive tool calling displays available slots; confirm booking*.

2. **Inspect Read-Only Patient Health Card**:
   - Switch to the **"Digital Health Card"** tab.
   - Note the verified patient badge, QR code, and demographics. Notice that direct edits are restricted with an advisory banner instructing the patient to contact the front desk.

3. **Experience Mobile-Responsive Front-Desk Station**:
   - Open a new browser window (or switch role) and sign in as `receptionist@demo.clinic`.
   - On the **"Front-Desk Check-In"** station:
     - Review the **Daily Intake Hero Card** with the 3-stage intake progress bar.
     - Click **"Filter Awaiting"** on the blue arrival card to isolate arriving patients.
     - Click **"Check In"** on Maya Chen's appointment.
   - Resize the browser window to mobile width (~375px) to view the dedicated mobile check-in cards and touch targets.

4. **Test Patient Card Filing & Editing (Receptionist Authority)**:
   - Click **"Patient Cards & Profiles"** in the sidebar.
   - Click **"+ File New Patient Card"** to register a walk-in patient, or edit Maya Chen's emergency contact. Save changes.
   - Verify that changes immediately reflect on the patient's card.

5. **Conduct Physician Clinical Consultation & EHR Documentation**:
   - Sign in as `clinician@demo.clinic`.
   - On **"Clinical Profile & Hours"**, inspect the **rectangular landscape credential pass**, Level 4 access tag, and active clinical privileges.
   - Go to **"Patient EHR & History"** → Click **"Document New Consultation"**.
   - Input objective vitals (`120/80 mmHg`, `72 bpm`, `98.6 °F`), clinical examination notes, **official doctor diagnosis** (*"Acute tension headache secondary to fatigue"*), and prescribed medication (*"Ibuprofen 400mg"*). Ensure *"Generate Billing Invoice"* is checked, and submit.

6. **Process Cashier Copay Settlement**:
   - Switch back to `receptionist@demo.clinic` → **"Cashier & Checkout"**.
   - View the generated `$90.00` invoice.
   - Click **"Collect Copay"** → Select payment method (`Cash` or `Credit Card`) → Click **"Mark as Paid"**.
   - Review updated collections in the financial summary cards.

7. **Inspect Bento Executive Analytics & Audit Governance**:
   - Sign in as `admin@demo.clinic`.
   - Under **"Executive Analytics"**, inspect:
     - The **7-Day Revenue SVG Area & Line Graph**.
     - The **Circular Radial Dial Gauge** showing Slot Utilization.
     - The **Hourly Consultation Load Bar Distribution**.
     - The **Workforce Role Distribution** segmented progress bar.
   - Go to **"Evaluation Suite"** and click **"Run 44-case Suite"** to verify 100% pass rate in real time.

---

## Technical Documentation Index

Detailed architectural specifications, test plans, and design rationales are located in the [`docs/`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs) directory:

- [`docs/architecture.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/architecture.md) — Comprehensive technical architecture, pipeline stages, and security boundaries.
- [`docs/api-contracts.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/api-contracts.md) — Exhaustive REST API specifications, request/response schemas, and error codes.
- [`docs/safety-and-privacy.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/safety-and-privacy.md) — Non-diagnostic boundary guarantees, data minimization, and red-flag rules.
- [`docs/decisions.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/decisions.md) — Architectural Decision Records (ADRs) and trade-off rationales.
- [`docs/test-plan.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/test-plan.md) — Testing strategy, concurrency verification, and Vitest coverage.
- [`docs/evaluation-results.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/evaluation-results.md) — 44/44 executed safety & accuracy evaluation benchmarks.
- [`docs/deployment.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/deployment.md) — Production deployment guidelines, Dockerization, and environment hardening.
- [`docs/project-scope.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/project-scope.md) — Requirements traceability matrix, MVP scope, and non-goals.
- [`docs/ai-prompts.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/ai-prompts.md) — System prompt designs, extraction schemas, and few-shot examples.
- [`docs/week-4-handover.md`](file:///c:/Users/AMANUEL/Downloads/ai-clinic-assistant-project%20(2)/docs/week-4-handover.md) — Final internship project handover and compliance verification.

---

<div align="center">
  <p><strong>Afiya — Better Care Starts Here.</strong></p>
  <p>Engineered with clinical safety, technical elegance, and architectural rigor.</p>
</div>
