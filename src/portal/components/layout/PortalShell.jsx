import { useState, useEffect } from "react";
import Brand from "../common/Brand";
import PortalFooter from "./PortalFooter";
import {
  recordStudentActivity,
  isStudentTimedOut,
} from "../../services/authService";
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  UserCheck,
  FolderSearch,
  BookmarkCheck,
  User,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ShieldCheck,
  GraduationCap,
} from "lucide-react";

const navItems = [
  { key: "overview", label: "Academic Overview", icon: LayoutDashboard, badge: null },
  { key: "cluster", label: "Cluster Selection", icon: Layers, badge: null },
  { key: "subjects", label: "Course Selection", icon: BookOpen, badge: null },
  { key: "preferences", label: "Faculty Preferences", icon: UserCheck, badge: null },
  { key: "directory", label: "Faculty Directory", icon: FolderSearch, badge: null },
  { key: "my-preference", label: "My Preference", icon: BookmarkCheck, badge: null },
  { key: "profile", label: "My Profile", icon: User, badge: null },
];

export default function PortalShell({ page, setPage, onLogout, studentId, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const now = new Date();
  const semester = 8;

  // Single Account Per Browser & 300-Minute Inactivity Tracker (Student Portal Only)
  useEffect(() => {
    if (!studentId) return;

    // Record initial activity
    recordStudentActivity();

    // Activity listeners to refresh the 300-minute inactivity timer
    const handleUserActivity = () => {
      recordStudentActivity();
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Check every 30 seconds for 300-minute inactivity timeout
    const inactivityInterval = setInterval(() => {
      if (isStudentTimedOut()) {
        console.warn("Session expired: 300 minutes of student inactivity exceeded.");
        alert("Your session has timed out due to 300 minutes (5 hours) of inactivity. Please log in again.");
        onLogout();
      }
    }, 30000);

    // Cross-tab single student account enforcement
    const handleStorageChange = (e) => {
      if (e.key === "klef-active-browser-student") {
        if (e.newValue && e.newValue !== studentId) {
          // Another student logged in on this browser in a different tab/window
          alert("Another student account has logged in on this browser. Logging out current session.");
          onLogout();
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(inactivityInterval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [studentId, onLogout]);

  const currentNav = navItems.find((item) => item.key === page) || navItems[0];

  return (
    <div className={`app-shell page-shell-${page}`}>
      {/* Top Application Header */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="student-mobile-menu-btn text-slate-300 hover:text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Brand compact />
          </div>

          <div className="portal-title">
            <strong>Academic Registration Portal</strong>
            <span>CSE-2 · Academic Semester {semester}</span>
          </div>

          <div className="account-menu">
            <div className="account-user-badge">
              <div className="account-avatar-sm">
                <GraduationCap size={15} />
              </div>
              <div className="account-info-text">
                <span className="account-role-label">Registration No</span>
                <strong className="account-id-label">{studentId}</strong>
              </div>
            </div>

            <button type="button" className="signout-button" onClick={onLogout} title="Sign out of student portal" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Sub-Navigation Bar */}
      <nav className={`main-nav ${mobileMenuOpen ? "mobile-open" : ""}`} aria-label="Main navigation">
        <div className="nav-inner">
          {navItems.map(({ key, label, icon: Icon, badge }) => {
            const isActive = page === key;
            return (
              <button
                key={key}
                type="button"
                className={`nav-item-btn ${isActive ? "active" : ""}`}
                onClick={() => {
                  setPage(key);
                  setMobileMenuOpen(false);
                }}
              >
                <Icon size={16} className={isActive ? "text-blue-600" : "text-slate-400"} />
                <span>{label}</span>
                {badge && <span className={`nav-item-badge ${isActive ? "active-badge" : ""}`}>{badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Main Page Workspace */}
      <main className={`content page-${page}`}>
        <div className="page-transition" key={page}>
          {children}
        </div>
      </main>

      {/* Standard Unified Footer */}
      <PortalFooter returnTo={window.location.pathname} />
    </div>
  );
}
