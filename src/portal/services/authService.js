/**
 * Authentication and Credential Management Module
 * Manages sessions, single account per browser, inactivity timeout, custom passwords, and date of birth fallbacks.
 */

const SESSION_KEY = "klef-portal-session";
const ACTIVE_STUDENT_KEY = "klef-active-browser-student";
const LAST_ACTIVITY_KEY = "klef-last-activity-time";
const CUSTOM_PASSWORD_PREFIX = "klef-student-custom-pwd-";
const DOB_KEY_PREFIX = "klef-portal-dob-";

// 300 minutes in milliseconds = 300 * 60 * 1000 = 18,000,000 ms (5 hours)
export const INACTIVITY_TIMEOUT_MS = 300 * 60 * 1000;

export function getAuthenticatedStudent() {
  if (typeof window === "undefined") return null;
  
  // Check if session exists in sessionStorage
  let role = sessionStorage.getItem("klef-portal-role");
  let sessionStudent = sessionStorage.getItem(SESSION_KEY);

  // If new tab opened without sessionStorage, restore from active browser session in localStorage
  if (!sessionStudent) {
    const activeStudent = localStorage.getItem(ACTIVE_STUDENT_KEY);
    const activeRole = localStorage.getItem("klef-active-browser-role");
    if (activeStudent) {
      // Check inactivity timeout first
      if (isStudentTimedOut()) {
        clearSession();
        return null;
      }
      sessionStudent = activeStudent;
      role = activeRole || "student";
      sessionStorage.setItem(SESSION_KEY, sessionStudent);
      sessionStorage.setItem("klef-portal-role", role);
    }
  }

  // If student session, enforce single active browser student
  if (role === "student" && sessionStudent) {
    const activeBrowserStudent = localStorage.getItem(ACTIVE_STUDENT_KEY);
    if (activeBrowserStudent && activeBrowserStudent !== sessionStudent) {
      // Overridden by another login in this browser
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem("klef-portal-role");
      return null;
    }
  }

  return sessionStudent;
}

export function createSession(identifier, role = "student") {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SESSION_KEY, identifier);
  sessionStorage.setItem("klef-portal-role", role);

  // Clear any existing session-level agreement so guidelines always pop up on each sign in
  sessionStorage.removeItem(`guidelines_session_agreed_${identifier}`);

  // Enforce per-browser single student account login and cross-tab sharing
  localStorage.setItem(ACTIVE_STUDENT_KEY, identifier);
  localStorage.setItem("klef-active-browser-role", role);
  recordStudentActivity();
}

export function clearSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem("klef-portal-role");
    sessionStorage.removeItem(LAST_ACTIVITY_KEY);

    localStorage.removeItem(ACTIVE_STUDENT_KEY);
    localStorage.removeItem("klef-active-browser-role");
    localStorage.removeItem(LAST_ACTIVITY_KEY);

    // Call backend auth API to clear signed HTTP cookie
    fetch("/portal-api/auth", { method: "DELETE" }).catch(() => {});
  } catch (err) {
    console.error("Error clearing session:", err);
  }
}

/**
 * Records user activity timestamp for student sessions.
 */
export function recordStudentActivity() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
}

/**
 * Checks whether the student has been inactive for more than 300 minutes.
 * Returns true if timed out, false otherwise.
 */
export function isStudentTimedOut() {
  if (typeof window === "undefined") return false;
  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY) || sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivityStr) return false;
  const lastActivity = parseInt(lastActivityStr, 10);
  if (Number.isNaN(lastActivity)) return false;
  return Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS;
}

/**
 * Returns remaining inactivity time in minutes.
 */
export function getRemainingInactivityMinutes() {
  if (typeof window === "undefined") return 300;
  const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY) || sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!lastActivityStr) return 300;
  const lastActivity = parseInt(lastActivityStr, 10);
  if (Number.isNaN(lastActivity)) return 300;
  const diff = Date.now() - lastActivity;
  const remaining = Math.max(0, INACTIVITY_TIMEOUT_MS - diff);
  return Math.ceil(remaining / (60 * 1000));
}

export function rememberDateOfBirth(studentId, dateOfBirth) {
  if (typeof window === "undefined" || !studentId) return;
  localStorage.setItem(`${DOB_KEY_PREFIX}${studentId}`, dateOfBirth);
  sessionStorage.setItem(`${DOB_KEY_PREFIX}${studentId}`, dateOfBirth);
}

export function getRememberedDateOfBirth(studentId) {
  if (typeof window === "undefined" || !studentId) return null;
  return (
    sessionStorage.getItem(`${DOB_KEY_PREFIX}${studentId}`) ||
    localStorage.getItem(`${DOB_KEY_PREFIX}${studentId}`) ||
    "2005-01-01" // Default password: 01 Jan 2005 (YYYY-MM-DD: 2005-01-01) for all students
  );
}

/**
 * Checks whether the student has set an 8+ character custom password.
 */
export function hasCustomPassword(studentId) {
  if (typeof window === "undefined" || !studentId) return false;
  // If explicitly flagged as reset to DOB in this browser
  if (localStorage.getItem(`klef-student-dob-reset-${studentId}`) === "true") {
    return false;
  }
  const pwd = localStorage.getItem(`${CUSTOM_PASSWORD_PREFIX}${studentId}`);
  return Boolean(pwd && pwd.length >= 8);
}

/**
 * Retrieves student's custom password if one was configured.
 */
export function getCustomPassword(studentId) {
  if (typeof window === "undefined" || !studentId) return null;
  if (localStorage.getItem(`klef-student-dob-reset-${studentId}`) === "true") {
    return null;
  }
  return localStorage.getItem(`${CUSTOM_PASSWORD_PREFIX}${studentId}`);
}

/**
 * Sets a new custom password for a student.
 */
export function setCustomPassword(studentId, newPassword) {
  if (typeof window === "undefined" || !studentId) return;
  localStorage.removeItem(`klef-student-dob-reset-${studentId}`);
  localStorage.setItem(`${CUSTOM_PASSWORD_PREFIX}${studentId}`, newPassword);

  // Sync to backend database
  fetch("/portal-api/student-set-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId, newPassword }),
  }).catch(() => {});
}

/**
 * Resets a student's password back to their default Date of Birth.
 */
export function resetPasswordToDefaultDob(studentId) {
  if (typeof window === "undefined" || !studentId) return;
  localStorage.removeItem(`${CUSTOM_PASSWORD_PREFIX}${studentId}`);
  localStorage.setItem(`klef-student-dob-reset-${studentId}`, "true");

  // Sync reset to backend database
  fetch("/portal-api/student-reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studentId }),
  }).catch(() => {});
}

export async function requestPasswordReset(studentId) {
  resetPasswordToDefaultDob(studentId);
  return {
    studentId,
    success: true,
    isDevelopmentMode: true,
    note: "Password reset completed. The student credential has been reset to their registered Date of Birth.",
  };
}
