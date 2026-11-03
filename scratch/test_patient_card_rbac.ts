/**
 * Verification Script:
 * 1. In Patient mode, Patient must NOT edit their card (POST /api/patient/profile rejected with 403 Forbidden).
 * 2. Patient CAN view their card (GET /api/patient/profile).
 * 3. Receptionist CAN list patient profiles (GET /api/patient/profile?list=true).
 * 4. Receptionist CAN file a new patient profile (POST /api/patient/profile with mode: "create").
 * 5. Receptionist CAN edit and update patient profile & card (POST /api/patient/profile with mode: "update").
 * 6. Patient immediately sees the updated card info when viewing their card.
 */

export {};

const BASE_URL = "http://127.0.0.1:3000";

interface AuthSession {
  cookie: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

async function loginAs(email: string, password = "demo1234"): Promise<AuthSession> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }

  const setCookie = res.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";")[0];
  const data = await res.json();
  return { cookie, user: data.user };
}

async function run() {
  console.log("=== Testing Patient Card & Receptionist RBAC Workflow ===");

  // 1. Authenticate as Patient & Receptionist
  console.log("\n1. Authenticating as Patient and Receptionist...");
  const patient = await loginAs("patient@demo.clinic");
  const receptionist = await loginAs("receptionist@demo.clinic");

  console.log(`✓ Patient: ${patient.user.name} (${patient.user.id})`);
  console.log(`✓ Receptionist: ${receptionist.user.name} (${receptionist.user.id})`);

  // 2. Patient views their card
  console.log("\n2. Patient views their own card (GET /api/patient/profile)...");
  const viewRes = await fetch(`${BASE_URL}/api/patient/profile`, {
    headers: { Cookie: patient.cookie },
  });
  const viewData = await viewRes.json();
  console.log("Status:", viewRes.status);
  console.log("Cardholder Name:", viewData.patient?.name);
  console.log("Blood Group on Card:", viewData.patient?.bloodGroup);
  if (viewRes.status !== 200 || !viewData.patient) {
    throw new Error("Failed: Patient could not view card");
  }
  console.log("PASS: Patient successfully views their card.");

  // 3. Patient attempts to edit their card -> MUST BE FORBIDDEN
  console.log("\n3. Patient attempts to EDIT their card (POST /api/patient/profile)...");
  const editAttemptRes = await fetch(`${BASE_URL}/api/patient/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: patient.cookie,
    },
    body: JSON.stringify({
      mode: "update",
      patientId: patient.user.id,
      name: "Patient Trying To Edit",
      bloodGroup: "AB-",
      allergies: "None",
    }),
  });
  const editAttemptData = await editAttemptRes.json();
  console.log("Status:", editAttemptRes.status);
  console.log("Response:", editAttemptData);
  if (editAttemptRes.status !== 403) {
    throw new Error(`Failed: Expected 403 Forbidden for patient editing card, got ${editAttemptRes.status}`);
  }
  console.log("PASS: Patient is strictly forbidden from editing their card!");

  // 4. Receptionist views all patient profiles
  console.log("\n4. Receptionist views patient profiles directory (GET /api/patient/profile?list=true)...");
  const listRes = await fetch(`${BASE_URL}/api/patient/profile?list=true`, {
    headers: { Cookie: receptionist.cookie },
  });
  const listData = await listRes.json();
  console.log("Status:", listRes.status);
  console.log("Total patients in registry:", listData.patients?.length);
  if (listRes.status !== 200 || !Array.isArray(listData.patients) || listData.patients.length === 0) {
    throw new Error("Failed: Receptionist could not fetch patient profiles directory");
  }
  console.log("PASS: Receptionist successfully retrieved patient directory.");

  // 5. Receptionist edits and updates patient's profile & card
  console.log("\n5. Receptionist files update to patient's card & EHR (POST /api/patient/profile)...");
  const updatedAllergies = `Sulfa & Penicillin (Updated by reception at ${new Date().toLocaleTimeString()})`;
  const updateRes = await fetch(`${BASE_URL}/api/patient/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: receptionist.cookie,
    },
    body: JSON.stringify({
      mode: "update",
      patientId: patient.user.id,
      name: "Maya Chen (Verified by Desk)",
      phone: "+1 (555) 012-3456",
      dateOfBirth: "1993-11-14",
      gender: "female",
      address: "100 Medical Center Way, Suite 400",
      bloodGroup: "O+",
      allergies: updatedAllergies,
      emergencyContactName: "Jordan Chen",
      emergencyContactPhone: "+1 (555) 998-0011",
      insuranceProvider: "Blue Cross Blue Shield Platinum",
      insurancePolicyNumber: "BCBS-99482-P",
      medicalHistory: "Mild seasonal asthma, up to date with immunizations.",
    }),
  });
  const updateData = await updateRes.json();
  console.log("Status:", updateRes.status);
  console.log("Response:", updateData);
  if (updateRes.status !== 200 || !updateData.ok) {
    throw new Error("Failed: Receptionist could not update patient profile");
  }
  console.log("PASS: Receptionist successfully updated patient profile.");

  // 6. Verify Patient now sees the updated card
  console.log("\n6. Patient views card again to verify reception updates are reflected...");
  const verifyRes = await fetch(`${BASE_URL}/api/patient/profile`, {
    headers: { Cookie: patient.cookie },
  });
  const verifyData = await verifyRes.json();
  console.log("Updated Name on Card:", verifyData.patient?.name);
  console.log("Updated Blood Group:", verifyData.patient?.bloodGroup);
  console.log("Updated Allergies:", verifyData.patient?.allergies);
  console.log("Updated Insurance:", verifyData.patient?.insuranceProvider);
  if (
    verifyData.patient?.name !== "Maya Chen (Verified by Desk)" ||
    verifyData.patient?.allergies !== updatedAllergies ||
    verifyData.patient?.bloodGroup !== "O+"
  ) {
    throw new Error("Failed: Patient card does not reflect receptionist updates");
  }
  console.log("PASS: Patient sees the updated health card updated by reception.");

  // 7. Receptionist files a new walk-in patient profile & card
  console.log("\n7. Receptionist files a brand new patient profile & card (walk-in intake)...");
  const newPatientEmail = `walkin.${Date.now()}@afiya.clinic`;
  const fileRes = await fetch(`${BASE_URL}/api/patient/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: receptionist.cookie,
    },
    body: JSON.stringify({
      mode: "create",
      name: "Arthur Dent",
      email: newPatientEmail,
      phone: "+1 (555) 424-2424",
      dateOfBirth: "1982-03-11",
      gender: "male",
      address: "42 Galaxy Way, London",
      bloodGroup: "A+",
      allergies: "Tea withdrawal",
      emergencyContactName: "Ford Prefect",
      emergencyContactPhone: "+1 (555) 424-0000",
      insuranceProvider: "Universal Health Care",
      insurancePolicyNumber: "UHC-4242",
      medicalHistory: "Frequent intergalactic travel stress.",
    }),
  });
  const fileData = await fileRes.json();
  console.log("Status:", fileRes.status);
  console.log("Response:", fileData);
  if (fileRes.status !== 200 || !fileData.ok || !fileData.patientId) {
    throw new Error("Failed: Receptionist could not file new patient profile");
  }
  console.log("PASS: Receptionist successfully filed new patient card & profile.");

  // 8. Verify the new patient profile can be fetched by receptionist
  console.log("\n8. Receptionist fetches the newly filed patient profile...");
  const newPatRes = await fetch(`${BASE_URL}/api/patient/profile?patientId=${fileData.patientId}`, {
    headers: { Cookie: receptionist.cookie },
  });
  const newPatData = await newPatRes.json();
  console.log("New Patient Name:", newPatData.patient?.name);
  console.log("New Patient Blood Group:", newPatData.patient?.bloodGroup);
  console.log("New Patient Allergies:", newPatData.patient?.allergies);
  if (newPatData.patient?.name !== "Arthur Dent" || newPatData.patient?.bloodGroup !== "A+") {
    throw new Error("Failed: Newly filed patient profile does not match");
  }
  console.log("PASS: Newly filed patient profile is verified in the EHR registry.");

  console.log("\n========================================================");
  console.log("ALL TESTS PASSED: PATIENT CARD & RECEPTIONIST WORKFLOW!");
  console.log("========================================================");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
