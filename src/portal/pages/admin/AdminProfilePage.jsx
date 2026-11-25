import { useState, useEffect } from "react";
import {
  User,
  CheckCircle,
  Pencil,
  X,
  Save,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Lock,
} from "lucide-react";
import PasswordInput from "../../components/common/PasswordInput";
import OverlayPortal from "../../components/common/OverlayPortal";

export default function AdminProfilePage({ admin }) {
  // Initial administrator details from props or defaults
  const [profile, setProfile] = useState({
    name: admin?.name || "G Bhaanu",
    username: admin?.username || "2400030952",
    email: admin?.email || "Bhaanugali@gmail.com",
    personalEmail: "Bhaanugali@gmail.com",
    phone: "+91 88973 37687",
    designation: "Assistant Director of Academic Registration",
    department: "Office of the Registrar / Computer Science & Engineering",
    campus: "KLEF Green Fields, Vaddeswaram",
    role: "System Administrator",
    accessLevel: "Full Registration Central Administration",
    lastLogin: "Active Now",
    mfaStatus: "Enabled (TOTP / SMS)",
    sessionTimeout: "4 Hours",
    auditId: "ADM-SEC-8897",
  });

  // Load custom saved administrator contact details from localStorage if present
  useEffect(() => {
    const saved = localStorage.getItem("klef-admin-profile");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile((prev) => ({
          ...prev,
          ...parsed,
          name: parsed.name === "Institutional Administrator" ? "G Bhaanu" : (parsed.name || "G Bhaanu"),
          username: parsed.username === "8897337687" ? "2400030952" : (parsed.username || "2400030952"),
          email: parsed.email === "registrar@kluniversity.in" || parsed.email === "bhaanusai.g@kluniversity.in" ? "Bhaanugali@gmail.com" : (parsed.email || "Bhaanugali@gmail.com"),
        }));
      } catch {}
    } else {
      setProfile((prev) => ({
        ...prev,
        name: "G Bhaanu",
        username: "2400030952",
        email: "Bhaanugali@gmail.com",
      }));
    }
  }, [admin]);

  // Editing state for allowable contact fields
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    personalEmail: "",
    phone: "",
    campus: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Admin Change Password Modal State
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowPwdModal(false);
      }
    };
    if (showPwdModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showPwdModal]);

  const startEdit = () => {
    setEditForm({
      personalEmail: profile.personalEmail,
      phone: profile.phone,
      campus: profile.campus,
    });
    setIsEditing(true);
    setFeedback(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setFeedback(null);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    const updated = {
      ...profile,
      personalEmail: editForm.personalEmail.trim() || profile.personalEmail,
      phone: editForm.phone.trim() || profile.phone,
      campus: editForm.campus.trim() || profile.campus,
    };

    // Save to local storage for persistence across reloads
    localStorage.setItem("klef-admin-profile", JSON.stringify(updated));
    setProfile(updated);

    setTimeout(() => {
      setIsSaving(false);
      setIsEditing(false);
      setFeedback({
        type: "success",
        text: "Administrator contact preferences updated successfully.",
      });
      setTimeout(() => setFeedback(null), 4000);
    }, 400);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!newPwd || newPwd.length < 8) {
      setPwdError("New administrator password must be at least 8 characters long.");
      return;
    }

    if (newPwd !== confirmPwd) {
      setPwdError("New passwords do not match.");
      return;
    }

    setPwdLoading(true);

    try {
      const res = await fetch("/portal-api/admin-change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: profile.username,
          currentPassword: currentPwd,
          newPassword: newPwd,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setPwdError(data.message || "Failed to update administrator password.");
      } else {
        setPwdSuccess("Administrator password updated in SQL database successfully! Next sign-in will use this new password.");
        setCurrentPwd("");
        setNewPwd("");
        setConfirmPwd("");
        setTimeout(() => {
          setShowPwdModal(false);
          setPwdSuccess("");
        }, 2500);
      }
    } catch {
      setPwdError("Unable to reach the server. Please try again.");
    } finally {
      setPwdLoading(false);
    }
  };

  // Monogram initials
  const initials = profile.name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 3)
    .join("");

  return (
    <section className="admin-profile-shell">
      {/* Header Banner */}
      <div className="admin-records-header">
        <div>
          <span className="kicker">Institutional Account</span>
          <h1 className="admin-page-title">Administrator Profile</h1>
          <p className="admin-page-desc">
            Manage your administrative identity credentials and contact preferences.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setShowPwdModal(true);
              setPwdError("");
              setPwdSuccess("");
            }}
          >
            <KeyRound size={15} />
            <span>Change Admin Password</span>
          </button>
          {!isEditing && (
            <button type="button" className="primary-btn" onClick={startEdit}>
              <Pencil size={15} />
              <span>Edit Contact Info</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div
          className={`admin-feedback-banner ${
            feedback.type === "success" ? "feedback-success" : "feedback-error"
          }`}
        >
          <CheckCircle size={18} />
          <div className="admin-feedback-body">
            <strong>{feedback.text}</strong>
          </div>
        </div>
      )}

      {/* Main Profile Grid */}
      <div className="admin-profile-clean-layout">
        {/* Profile Card */}
        <div className="admin-content-card">
          <div className="admin-card-header">
            <div className="admin-card-title-group">
              <div className="admin-id-avatar-circle sm">
                <span>{initials}</span>
                <span className="admin-avatar-status-badge" title="Online and Authenticated" />
              </div>
              <div>
                <h2>{profile.name}</h2>
                <div className="admin-role-tag-cluster">
                  <span className="admin-id-badge">{profile.username}</span>
                  <span className="admin-role-badge">{profile.role}</span>
                </div>
              </div>
            </div>
          </div>

          {!isEditing ? (
            <div className="admin-details-grid">
              <div className="admin-detail-item">
                <dt>Full Name (Official)</dt>
                <dd>{profile.name}</dd>
              </div>
              <div className="admin-detail-item">
                <dt>Employee / Admin ID</dt>
                <dd className="font-mono">{profile.username}</dd>
              </div>
              <div className="admin-detail-item">
                <dt>Institutional Email</dt>
                <dd>
                  <a href={`mailto:${profile.email}`} className="text-blue-600 hover:underline">
                    {profile.email}
                  </a>
                </dd>
              </div>
              <div className="admin-detail-item">
                <dt>Personal Contact Email</dt>
                <dd>{profile.personalEmail || "—"}</dd>
              </div>
              <div className="admin-detail-item">
                <dt>Contact Mobile</dt>
                <dd>{profile.phone || "—"}</dd>
              </div>
              <div className="admin-detail-item">
                <dt>Campus Location</dt>
                <dd>{profile.campus}</dd>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSave} className="admin-edit-contact-form">
              <div className="admin-form-row">
                <div className="admin-reset-field-group">
                  <label className="admin-field-label">Institutional Email (System Locked)</label>
                  <input
                    type="text"
                    value={profile.email}
                    disabled
                    className="admin-text-input bg-slate-50 text-slate-500 cursor-not-allowed"
                  />
                  <span className="admin-field-helper">Managed by university IT directory services.</span>
                </div>

                <div className="admin-reset-field-group">
                  <label htmlFor="personal-email-input" className="admin-field-label">
                    Personal / Recovery Email
                  </label>
                  <input
                    id="personal-email-input"
                    type="email"
                    value={editForm.personalEmail}
                    onChange={(e) => setEditForm({ ...editForm, personalEmail: e.target.value })}
                    className="admin-text-input"
                    placeholder="e.g., bhaanusai.admin@gmail.com"
                    required
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-reset-field-group">
                  <label htmlFor="phone-input" className="admin-field-label">
                    Contact Mobile Number
                  </label>
                  <input
                    id="phone-input"
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="admin-text-input"
                    placeholder="+91 88973 37687"
                    required
                  />
                </div>

                <div className="admin-reset-field-group">
                  <label htmlFor="campus-input" className="admin-field-label">
                    Campus Office Location
                  </label>
                  <input
                    id="campus-input"
                    type="text"
                    value={editForm.campus}
                    onChange={(e) => setEditForm({ ...editForm, campus: e.target.value })}
                    className="admin-text-input"
                    placeholder="e.g., KLEF Green Fields, Vaddeswaram"
                    required
                  />
                </div>
              </div>

              <div className="admin-edit-actions">
                <button type="button" className="secondary-btn" onClick={cancelEdit} disabled={isSaving}>
                  <X size={15} />
                  <span>Cancel</span>
                </button>
                <button type="submit" className="primary-btn" disabled={isSaving}>
                  <Save size={15} />
                  <span>{isSaving ? "Saving Changes…" : "Save Contact Details"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Clean Modal: Change Administrator Password in SQLite via OverlayPortal */}
      {showPwdModal && (
        <OverlayPortal
          isOpen={showPwdModal}
          onClose={() => setShowPwdModal(false)}
          className="clean-popup-backdrop"
        >
          <div
            className="clean-popup-card"
            style={{ width: "min(520px, 94vw)" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="clean-popup-header">
              <div className="clean-popup-header-icon">
                <KeyRound size={20} className="text-white" />
              </div>
              <div className="clean-popup-header-text">
                <h3>Change Administrator Password</h3>
                <p>Updates administrator credentials directly in persistent SQL database</p>
              </div>
              <button
                type="button"
                className="clean-popup-close-btn"
                onClick={() => setShowPwdModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="clean-popup-body">
                <div className="clean-popup-detail-box">
                  <span className="clean-popup-detail-title">ACCOUNT AUTHENTICATION CREDENTIALS</span>

                  <div className="clean-popup-detail-row full-col">
                    <span className="clean-popup-detail-label">Current Password</span>
                    <PasswordInput
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      placeholder="Enter current admin password"
                      autoComplete="current-password"
                      required
                    />
                  </div>

                  <div className="clean-popup-detail-row full-col">
                    <span className="clean-popup-detail-label">New Password (Min 8 Characters)</span>
                    <PasswordInput
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="Minimum 8 characters"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>

                  <div className="clean-popup-detail-row full-col">
                    <span className="clean-popup-detail-label">Confirm New Password</span>
                    <PasswordInput
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      placeholder="Re-enter new password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                {pwdError && (
                  <div className="form-feedback-pill error">
                    <AlertCircle size={15} />
                    <span>{pwdError}</span>
                  </div>
                )}

                {pwdSuccess && (
                  <div className="form-feedback-pill success">
                    <CheckCircle size={15} />
                    <span>{pwdSuccess}</span>
                  </div>
                )}
              </div>

              <div className="clean-popup-footer">
                <button
                  type="button"
                  className="clean-popup-btn-dismiss"
                  onClick={() => setShowPwdModal(false)}
                  disabled={pwdLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="clean-popup-btn-action"
                  disabled={pwdLoading}
                >
                  <Lock size={14} />
                  <span>{pwdLoading ? "Updating SQL Database…" : "Update Admin Password"}</span>
                </button>
              </div>
            </form>
          </div>
        </OverlayPortal>
      )}
    </section>
  );
}
