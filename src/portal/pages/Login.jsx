import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import Brand from "../components/common/Brand";
import DatePicker from "../components/common/DatePicker";
import PasswordInput from "../components/common/PasswordInput";
import PortalFooter from "../components/layout/PortalFooter";
import { useAuth } from "../hooks/useAuth";
import {
  createSession,
  rememberDateOfBirth,
  hasCustomPassword,
  getCustomPassword,
  getRememberedDateOfBirth,
  getAuthenticatedStudent,
} from "../services/authService";
import { portalPath } from "../utils/routes";
import { getLastRoute } from "../services/studentService";
import { isValidStudentId } from "../utils/validation";
import { KeyRound, Phone, HelpCircle, X, ExternalLink } from "lucide-react";
import OverlayPortal from "../components/common/OverlayPortal";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [studentId, setStudentId] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showResetModal, setShowResetModal] = useState(false);

  const RESET_STEPS_PATH = "/KLEF/8-2/GBS/Auth/Reset-Password-Steps.php";

  useEffect(() => {
    // If user navigates directly to reset steps URL or presses back/forward
    if (window.location.pathname === RESET_STEPS_PATH) {
      setShowResetModal(true);
    }
  }, []);

  const openResetModal = () => {
    setShowResetModal(true);
    window.history.pushState(null, "", RESET_STEPS_PATH);
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    if (window.location.pathname === RESET_STEPS_PATH) {
      window.history.pushState(null, "", "/KLEF/8-2/GBS.php");
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === RESET_STEPS_PATH) {
        setShowResetModal(true);
      } else if (showResetModal) {
        setShowResetModal(false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [showResetModal]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeResetModal();
      }
    };
    if (showResetModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showResetModal]);

  const isFull10Digits = studentId.length === 10;
  const isAdmin = isFull10Digits && studentId === "8897337687";
  const [serverCustomPassword, setServerCustomPassword] = useState(null);

  // Check backend server status for student custom password vs DOB reset
  useEffect(() => {
    if (!isFull10Digits || isAdmin) {
      setServerCustomPassword(null);
      return;
    }

    // Check if browser has explicit DOB reset flag
    if (localStorage.getItem(`klef-student-dob-reset-${studentId}`) === "true") {
      setServerCustomPassword(false);
      return;
    }

    // Check backend API status
    fetch("/portal-api/student-password-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setServerCustomPassword(Boolean(data.hasCustomPassword));
          if (!data.hasCustomPassword) {
            localStorage.removeItem(`klef-student-custom-pwd-${studentId}`);
          }
        } else {
          setServerCustomPassword(hasCustomPassword(studentId));
        }
      })
      .catch(() => {
        setServerCustomPassword(hasCustomPassword(studentId));
      });
  }, [studentId, isFull10Digits, isAdmin]);

  const studentHasCustomPassword =
    isFull10Digits &&
    !isAdmin &&
    (serverCustomPassword !== null ? serverCustomPassword : hasCustomPassword(studentId));

  const now = new Date();
  const isEvenSemester = now.getMonth() === 11 || (now.getMonth() === 10 && now.getDate() >= 30);

  // Auto-redirect if student or admin is already authenticated in this browser profile
  useEffect(() => {
    const activeStudent = getAuthenticatedStudent();
    if (activeStudent) {
      if (activeStudent === "8897337687") {
        navigate("/KLEF/8-2/Admin/G-Bhaanu-Sai/Dashboard.php");
      } else {
        const lastRoute = getLastRoute();
        if (lastRoute && lastRoute.includes(`/KLEF/8-2/${activeStudent}/`)) {
          navigate(lastRoute);
        } else {
          fetch(`/portal-api/student-profile?studentId=${activeStudent}`)
            .then((r) => r.json())
            .then((res) => {
              if (res.ok && res.data) {
                const studentRecord = res.data;
                const studentSlug = studentRecord.name
                  ? studentRecord.name.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "")
                  : "Student";
                navigate(portalPath(activeStudent, studentSlug, "overview"));
              }
            })
            .catch(() => {});
        }
      }
    }
  }, [navigate]);

  // Clear password / date when student ID changes
  useEffect(() => {
    setPassword("");
    setDateOfBirth("");
    setError("");
  }, [studentId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!isValidStudentId(studentId)) {
      return setError("Student ID must contain exactly 10 digits.");
    }

    if (isAdmin) {
      if (!password) return setError("Enter the administrator password.");
      try {
        const res = await fetch('/portal-api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: studentId, password })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return setError(data.message || "The administrator password entered is incorrect.");
        }
        createSession(studentId, "admin");
        signIn(studentId);
        navigate("/KLEF/8-2/Admin/G-Bhaanu-Sai/Dashboard.php");
        return;
      } catch {
        return setError("Authentication service unavailable. Please retry.");
      }
    }

    // Student Authentication Flow
    try {
      // 1. Verify student exists in institutional database
      const profileRes = await fetch(`/portal-api/student-profile?studentId=${studentId}`);
      const profileData = await profileRes.json();
      
      if (!profileData || !profileData.ok || !profileData.data) {
        return setError("Student ID not found in institutional register. Please verify your 10-digit ID.");
      }

      const studentRecord = profileData.data;
      try {
        localStorage.setItem(`klef-student-profile-${studentId}`, JSON.stringify(studentRecord));
      } catch {}

      // 2. Validate Credential
      if (studentHasCustomPassword) {
        if (!password) {
          return setError("Please enter your account password.");
        }
        const savedPassword = getCustomPassword(studentId);
        if (savedPassword && password !== savedPassword) {
          return setError("Incorrect password. Please verify and try again.");
        }
      } else {
        if (!dateOfBirth) {
          return setError("Please select your registered Date of Birth.");
        }
        // Verify against institutional DOB record or default password (01 Jan 2005)
        const expectedDob = studentRecord.date_of_birth || getRememberedDateOfBirth(studentId) || "2005-01-01";
        if (dateOfBirth !== expectedDob) {
          return setError("Invalid Date of Birth credential. Default password for all students is 01 Jan 2005.");
        }
      }

      setError("");
      createSession(studentId, "student");
      if (dateOfBirth) rememberDateOfBirth(studentId, dateOfBirth);

      const studentSlug = studentRecord.name
        ? studentRecord.name.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        : 'Student';
      signIn(studentId);
      const lastRoute = getLastRoute();
      if (lastRoute && lastRoute.includes(`/KLEF/8-2/${studentId}/`)) {
        navigate(lastRoute);
      } else {
        navigate(portalPath(studentId, studentSlug, "overview"));
      }
    } catch {
      return setError("Unable to authenticate at this time. Please check your network connection.");
    }
  };

  const adminPhone = "+91 8897402707";
  const whatsappNumber = "918897402707";
  const prefilledMessage = encodeURIComponent(
    `Hi,\n\nMy name is [Your Name], and my Student ID is ${studentId || "[Your Student ID]"}. I am a student at KL University. While trying to log in to the Academic Registration Portal, I tried using both 01 January 2005 and my official Date of Birth as recorded in the university records, but I was unable to sign in.\n\nMy actual Date of Birth is [Your DOB]. Kindly assist me in updating or resetting my password.\n\nThank you.`
  );

  return (
    <div className="login-page">
      <main className="login-shell">
        <section className="login-context">
          <Brand />
          <div className="login-intro">
            <p className="eyebrow">CSE-2 · Batch 2023–2027 (Fourth Year)</p>
            <h1>Academic Registration Portal</h1>
            <p>
              Select semester subjects, record faculty preferences, and maintain your student
              profile in one focused academic workspace.
            </p>
          </div>
          <div className="term-note">
            <span>Current registration period</span>
            <strong>Semester 8 · Even semester</strong>
          </div>
        </section>
        <section className="login-panel">
          <div className="login-form-wrap">
            <div className="mobile-brand">
              <Brand />
            </div>
            <p className="eyebrow">{isAdmin ? "Admin Access" : "Student access"}</p>
            <h2>Sign in to continue</h2>
            <form onSubmit={submit} className="login-form">
              <label>
                {isAdmin ? "Admin ID" : "Student ID"}
                <input
                  inputMode="numeric"
                  autoComplete="username"
                  maxLength={10}
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value.replace(/\D/g, ""));
                  }}
                  placeholder="Enter Your Registration Number"
                />
                {isAdmin ? (
                  <small>Administrator identified · Enter password below</small>
                ) : isFull10Digits && studentHasCustomPassword ? (
                  <small>Custom password configured · Enter your password</small>
                ) : null}
              </label>

              <div
                className="credential-state"
                key={isAdmin ? "admin-password" : studentHasCustomPassword ? "student-password" : "date-of-birth"}
              >
                {isAdmin ? (
                  <label>
                    Password
                    <PasswordInput
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your account password"
                      autoComplete="current-password"
                      required
                    />
                    <small>Enter your secure administrator credential.</small>
                  </label>
                ) : studentHasCustomPassword ? (
                  <label>
                    Password
                    <PasswordInput
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your account password"
                      autoComplete="current-password"
                      required
                    />
                    <small>Enter your 8+ character custom account password</small>
                  </label>
                ) : (
                  <label className="date-login-field">
                    Date of Birth
                    <DatePicker
                      label="Registered DOB"
                      value={dateOfBirth}
                      onChange={setDateOfBirth}
                    />
                  </label>
                )}
              </div>

              {error && <p className="form-error">{error}</p>}
              <button className="primary-btn wide" type="submit">
                Sign in
              </button>
            </form>
            <div className="login-help">
              <button
                type="button"
                onClick={openResetModal}
                className="text-blue-600 hover:text-blue-800 font-medium text-xs underline cursor-pointer bg-transparent border-0 p-0 ml-auto"
              >
                Reset password
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Modern Clean Pop-Up Modal via OverlayPortal */}
      {showResetModal && (
        <OverlayPortal
          isOpen={showResetModal}
          onClose={closeResetModal}
          className="clean-popup-backdrop"
        >
          <div
            className="clean-popup-card"
            style={{ width: "560px", maxWidth: "94vw" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Top Rounded Header Bar with Icon, Title, Subtitle */}
            <div className="clean-popup-header header-orange">
              <div className="clean-popup-header-icon">
                <KeyRound size={20} className="text-white" />
              </div>
              <div className="clean-popup-header-text">
                <h3>Password &amp; Credential Support</h3>
                <p>Official student credential recovery &amp; administration assistance</p>
              </div>
            </div>

            {/* Modal Body with Structured Details Box */}
            <div className="clean-popup-body">
              {/* Structured Key Details Table Box */}
              <div className="clean-popup-detail-box">
                <span className="clean-popup-detail-title">AUTHENTICATION STEPS</span>

                <div className="clean-popup-detail-row">
                  <span className="clean-popup-detail-label">Step 1 · Credential Verification</span>
                  <span className="clean-popup-detail-value">Try 01 January 2005, then your official DOB</span>
                </div>

                <div className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-md py-1.5 px-3 text-center">
                  If Step 1 fails, proceed to Step 2
                </div>

                <div className="clean-popup-detail-row">
                  <span className="clean-popup-detail-label">Step 2 · Administrator Contact</span>
                  <span className="clean-popup-detail-value" style={{ color: "#ea580c", fontWeight: 700 }}>
                    {adminPhone}
                  </span>
                </div>

                <div className="clean-popup-detail-row full-col">
                  <span className="clean-popup-detail-label">Support Message Template</span>
                  <div className="clean-popup-code-snippet">
{`Hi,

My name is [Your Name], and my Student ID is ${studentId || "[Your Student ID]"}. I am a student at KL University. While trying to log in to the Academic Registration Portal, I tried using both 01 January 2005 and my official Date of Birth as recorded in the university records, but I was unable to sign in.

My actual Date of Birth is [Your DOB]. Kindly assist me in updating or resetting my password.

Thank you.`}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer with Pill Dismiss and Action Buttons */}
            <div className="clean-popup-footer">
              <button
                type="button"
                className="clean-popup-btn-dismiss"
                onClick={closeResetModal}
              >
                Close
              </button>

              <a
                href={`https://wa.me/${whatsappNumber}?text=${prefilledMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="clean-popup-btn-action"
              >
                <Phone size={14} />
                <span>Message Administrator</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </OverlayPortal>
      )}

      <PortalFooter returnTo="/" />
    </div>
  );
}
