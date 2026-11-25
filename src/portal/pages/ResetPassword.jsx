import { useState } from "react";
import { Link } from "react-router";
import Brand from "../components/common/Brand";
import PortalFooter from "../components/layout/PortalFooter";
import { requestPasswordReset } from "../services/authService";
import { isValidStudentId } from "../utils/validation";

export default function ResetPassword() {
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!isValidStudentId(studentId)) {
      setSubmitted(false);
      setMessage("Student ID must contain exactly 10 digits.");
      return;
    }

    await requestPasswordReset(studentId);
    setSubmitted(true);
    setMessage(
      "Password reset processed for " +
        studentId +
        ". Your default credential is set to your registered Date of Birth. Please check with your academic department or sign in using your Date of Birth.",
    );
  };

  return (
    <div className="reset-page">
      <main className="reset-screen">
        <section className="reset-card">
          <Brand />
          <div>
            <p className="eyebrow">Account recovery</p>
            <h1>Reset password</h1>
            <p>Enter your 10-digit Student ID to begin the password reset process.</p>
          </div>
          <form className="reset-form" onSubmit={submit}>
            <label>
              Student ID
              <input
                inputMode="numeric"
                maxLength={10}
                value={studentId}
                onChange={(event) => {
                  setStudentId(event.target.value.replace(/\D/g, ""));
                  setMessage("");
                  setSubmitted(false);
                }}
                placeholder="10-digit Student ID"
                autoComplete="username"
                required
              />
            </label>
            {message && (
              <p
                className={submitted ? "form-message success" : "form-message error"}
                role="status"
              >
                {message}
              </p>
            )}
            <button className="primary-btn wide" type="submit">
              Submit
            </button>
          </form>
          <Link className="back-to-login" to="/">
            Back to sign in
          </Link>
        </section>
      </main>
      <PortalFooter returnTo="/reset-password" />
    </div>
  );
}
