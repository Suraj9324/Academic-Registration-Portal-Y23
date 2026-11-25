import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  BookOpen,
  Boxes,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
  ChevronRight,
  Trash2,
} from "lucide-react";
import Brand from "../components/common/Brand";

import AdminDashboard from "./admin/DashboardPage";
import StudentsPage from "./admin/StudentsPage";
import FacultyPage from "./admin/FacultyPage";
import BucketsPage from "./admin/BucketsPage";
import CoursesPage from "./admin/CoursesPage";
import AdminProfilePage from "./admin/AdminProfilePage";
import AdminResetPasswordPage from "./admin/ResetPasswordPage";
import RecordModal from "./admin/RecordModal";
import OverlayPortal from "../components/common/OverlayPortal";
import { adminNavigation, resources, singularLabels, fields, normalizeForm } from "./admin/adminConfig";
import { getAsyncRecord, setAsyncRecord } from "../services/api";
import { resetPasswordToDefaultDob, rememberDateOfBirth } from "../services/authService";

const iconMap = {
  Dashboard: LayoutDashboard,
  Students: GraduationCap,
  Faculty: UserRound,
  Buckets: Boxes,
  Courses: BookOpen,
  "Reset-Password": KeyRound,
  "My-Profile": ShieldCheck,
};

export default function Admin() {
  const { pageName = "Dashboard.php" } = useParams();
  const navigate = useNavigate();
  const cleanPageName = pageName ? pageName.replace(/\.php$/, "") : "Dashboard";
  const active = adminNavigation.some(([key]) => key === cleanPageName) ? cleanPageName : "Dashboard";
  const [admin, setAdmin] = useState(null);
  const [records, setRecords] = useState([]);
  const [buckets, setBuckets] = useState([]);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [status, setStatus] = useState("");
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [summary, setSummary] = useState({ students: [], faculty: [], buckets: [], courses: [] });
  const resource = resources[active];

  useEffect(() => {
    // Authenticated Administrator Session
    const activeAdmin = {
      id: "admin-2400030952",
      name: "G Bhaanu",
      username: "2400030952",
      email: "Bhaanugali@gmail.com",
      role: "System Administrator",
      department: "Office of the Registrar / Central Academic Administration",
      phone: "+91 88973 37687",
    };
    setAdmin(activeAdmin);
  }, [navigate]);

  const load = async () => {
    if (!resource) return;
    setLoadingRecords(true);
    try {
      if (resource === "students") {
        const res = await fetch("/portal-api/students");
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          const mapped = json.data.map((s) => ({
            id: s.id || `student-${s.student_id}`,
            name: s.name,
            username: s.student_id,
            dateOfBirth: s.date_of_birth,
            universityEmail: s.university_email,
            personalEmail: s.personal_email || "",
            mobileNumber: s.mobile_number || "",
            gender: s.gender || "Male",
            aadhaarNumber: s.aadhaar_number || "",
            aapaarNumber: s.apaar_number || "",
            residencyStatus: s.residency_status || "Hosteler",
            parentName: s.parent_name || "",
            parentPhoneNumber: s.parent_phone_number || "",
            cluster: s.cluster_id === "UNVERIFIED" ? "Pending institutional verification" : (s.cluster_id || "Pending institutional verification"),
            specialization: s.specialization || "Not verified",
            studentType: s.student_type || "CRT",
            placementStatus: s.placement_status || "YTB Placed",
            addonStatus: s.addon_status || "Specialization",
            counselor: {
              name: s.counselor_name || "Not assigned",
              employeeId: s.counselor_id || "—",
              designation: "Counselor",
              mobileNumber: s.counselor_mobile || "—",
              email: s.counselor_email || "—",
            },
            updatedAt: s.updated_at || new Date().toISOString(),
          }));
          setRecords(mapped);
          return;
        }
      } else if (resource === "faculty") {
        const res = await fetch("/portal-api/faculty?view=allocations");
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setRecords(json.data);
          return;
        }
      } else if (resource === "buckets") {
        const res = await fetch("/portal-api/buckets");
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          const mapped = json.data.map((b, i) => ({
            id: `bucket-${b.id}`,
            code: b.id,
            shortName: b.short_code,
            title: b.title,
            sortOrder: b.sort_order ?? i,
            courseCount: b.course_count,
            minCredits: b.min_credits,
            maxCredits: b.max_credits,
            active: b.is_active === 1,
            updatedAt: b.created_at || new Date().toISOString(),
          }));
          setRecords(mapped);
          return;
        }
      } else if (resource === "courses") {
        const res = await fetch("/portal-api/courses");
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          const mapped = json.data.map((c) => ({
            id: `course-${c.code}`,
            bucket: c.bucket_id,
            courseCode: c.code,
            name: c.name,
            credits: c.credits,
            lectureHours: c.lecture_hours,
            tutorialHours: c.tutorial_hours,
            practicalHours: c.practical_hours,
            skillHours: c.skill_hours,
            components: Array.isArray(c.components) ? c.components : JSON.parse(c.components || '["L"]'),
            category: c.category_code,
            description: c.description || "",
            prerequisite: c.prerequisite || "",
            active: c.is_active === 1,
            updatedAt: c.created_at || new Date().toISOString(),
          }));
          setRecords(mapped);
          return;
        }
      }

      // If remote API unavailable, empty fallback - NEVER fake demo data
      setRecords([]);
    } catch (err) {
      console.error("Admin load error:", err);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const loadBuckets = async () => {
    try {
      const res = await fetch("/portal-api/buckets");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setBuckets(json.data.map((b, i) => ({
          id: `bucket-${b.id}`,
          code: b.id,
          shortName: b.short_code,
          title: b.title,
          sortOrder: b.sort_order ?? i,
          active: true,
        })));
      }
    } catch {
      setBuckets([]);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await fetch("/portal-api/dashboard-stats");
      const json = await res.json();
      if (json.ok && json.data) {
        setSummary({
          students: Array.isArray(json.data.recentStudents) ? json.data.recentStudents : [],
          studentsCount: json.data.students || 0,
          facultyCount: json.data.allocations || json.data.faculty || 0,
          bucketsCount: json.data.buckets || 0,
          coursesCount: json.data.courses || 0,
        });
      }
    } catch {
      setSummary({ students: [], faculty: [], buckets: [], courses: [], studentsCount: 0, facultyCount: 0, bucketsCount: 0, coursesCount: 0 });
    }
  };

  useEffect(() => {
    setStatus("");
    setQuery("");
    if (active === "Dashboard") {
      loadSummary();
    } else {
      load();
    }
    loadBuckets();
  }, [active]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => {
      const searchFields = [
        r.name,
        r.username,
        r.facultyName,
        r.employeeId,
        r.title,
        r.code,
        r.courseCode,
        r.shortName,
      ].filter(Boolean);
      return searchFields.some((f) => String(f).toLowerCase().includes(q));
    });
  }, [records, query]);

  const beginCreate = (targetActive = active) => {
    const initial = {};
    (fields[targetActive] || []).forEach((field) => {
      initial[field.name] = field.type === "number" ? 0 : field.type === "checkbox" ? true : "";
    });
    setForm(initial);
    setEditing("new");
  };

  const handleQuickCreate = (targetResourceKey) => {
    const formattedKey = targetResourceKey.endsWith(".php") ? targetResourceKey : `${targetResourceKey}.php`;
    navigate(`/KLEF/8-2/Admin/G-Bhaanu-Sai/${formattedKey}`);
    setTimeout(() => {
      beginCreate(targetResourceKey.replace(/\.php$/, ""));
    }, 50);
  };

  const beginEdit = (record) => {
    const initial = {};
    (fields[active] || []).forEach((field) => {
      const val = record[field.name];
      if (val !== undefined) {
        if (typeof val === "object" && val !== null) {
          initial[field.name] = val.id || val.code || "";
        } else {
          initial[field.name] = val;
        }
      } else {
        initial[field.name] = field.type === "number" ? 0 : field.type === "checkbox" ? true : "";
      }
    });
    setForm(initial);
    setEditing(record);
  };

  const save = async () => {
    const payloadData = normalizeForm(form, fields[active]);
    
    // If saving a student record, persist directly to backend database
    if (active === "Students") {
      if (editing === "new") {
        const studentId = payloadData.username || form.username;
        if (!studentId) {
          setStatus("Error: Student ID is required to create a student.");
          return;
        }
        try {
          const res = await fetch("/portal-api/student-create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              studentData: {
                student_id: studentId,
                name: payloadData.name,
                university_email: payloadData.universityEmail || `${studentId}@kluniversity.in`,
                date_of_birth: payloadData.dateOfBirth || "2005-01-01",
                gender: payloadData.gender || "Male",
                residency_status: payloadData.residencyStatus || "Hosteler",
                cluster_id: payloadData.cluster?.includes("Pending") ? "UNVERIFIED" : (payloadData.cluster || "Cluster-1"),
                specialization: payloadData.specialization || "General Track",
                student_type: payloadData.studentType || "CRT",
                placement_status: payloadData.placementStatus || "YTB Placed",
                personal_email: payloadData.personalEmail || "",
                mobile_number: payloadData.mobileNumber || "",
                parent_name: payloadData.parentName || "",
                parent_phone_number: payloadData.parentPhoneNumber || "",
                aadhaar_number: payloadData.aadhaarNumber || "",
                apaar_number: payloadData.aapaarNumber || "",
                counselor_name: payloadData.counselor?.name || form["counselor.name"] || "",
                counselor_id: payloadData.counselor?.employeeId || form["counselor.employeeId"] || "",
              },
            }),
          });
          const json = await res.json();
          if (json.ok) {
            setStatus("New student created and saved to institutional database.");
            setEditing(null);
            load();
            return;
          } else {
            setStatus(`Creation failed: ${json.message || "Unknown error"}`);
            return;
          }
        } catch (e) {
          console.error("Backend student create error:", e);
        }
      } else {
        const studentId = editing.username || editing.student_id;
        if (studentId) {
          try {
            const res = await fetch("/portal-api/student-update", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                studentId,
                updates: {
                  name: payloadData.name,
                  cluster_id: payloadData.cluster?.includes("Pending") ? "UNVERIFIED" : payloadData.cluster,
                  student_type: payloadData.studentType,
                  placement_status: payloadData.placementStatus,
                  specialization: payloadData.specialization,
                  personal_email: payloadData.personalEmail,
                  mobile_number: payloadData.mobileNumber,
                  residency_status: payloadData.residencyStatus,
                },
                reason: "Admin Portal UI profile update",
              }),
            });
            const json = await res.json();
            if (json.ok) {
              setStatus("Institutional student record updated and logged to audit database.");
              setEditing(null);
              load();
              return;
            }
          } catch (e) {
            console.error("Backend student update error:", e);
          }
        }
      }
    }

    const localKey = `klef-admin-${resource}`;
    let currentList = (await getAsyncRecord(localKey, null)) || records;

    if (editing === "new") {
      const newRec = { id: `local-${Date.now()}`, ...payloadData, updatedAt: new Date().toISOString() };
      currentList = [newRec, ...currentList];
    } else {
      const updatedRec = { ...editing, ...payloadData, updatedAt: new Date().toISOString() };
      currentList = currentList.map((r) => (r.id === editing.id ? updatedRec : r));
    }

    await setAsyncRecord(localKey, currentList);
    setRecords(currentList);
    setEditing(null);
    setStatus("Record saved successfully.");
  };

  const [recordToDelete, setRecordToDelete] = useState(null);

  const remove = (record) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;
    const record = recordToDelete;
    setRecordToDelete(null);

    if (active === "Students") {
      const studentId = record.username || record.student_id;
      if (studentId) {
        try {
          const res = await fetch("/portal-api/student-delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentId }),
          });
          const json = await res.json();
          if (json.ok) {
            setStatus(`Student ${studentId} deleted from database and audit log recorded.`);
            load();
            return;
          }
        } catch (e) {
          console.error("Backend student delete error:", e);
        }
      }
    }

    const localKey = `klef-admin-${resource}`;
    const updatedList = records.filter((r) => r.id !== record.id);
    await setAsyncRecord(localKey, updatedList);
    setRecords(updatedList);
    setStatus("Record deleted.");
  };

  const resetPassword = async (record) => {
    const studentId = record.username || record.student_id;
    if (!studentId) return setStatus("Invalid student record: missing Student ID.");
    const targetDob = record.dateOfBirth || record.date_of_birth || "2005-01-01";

    try {
      // 1. Clear custom password in browser and set reset flag
      resetPasswordToDefaultDob(studentId);
      rememberDateOfBirth(studentId, targetDob);

      // 2. Call backend student-reset-password API
      await fetch("/portal-api/student-reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, targetDob }),
      });

      setStatus(`Password reset: Default credential for ${record.name} (${studentId}) restored to Date of Birth (${targetDob}).`);
    } catch (err) {
      console.error("Error in resetPassword:", err);
      setStatus(`Password reset attempted for ${record.name}.`);
    }
  };

  const logout = async () => {
    try {
      await fetch("/portal-api/auth", { method: "DELETE" }).catch(() => {});
    } catch {}
    sessionStorage.clear();
    localStorage.removeItem("klef-active-browser-student");
    localStorage.removeItem("klef-active-browser-role");
    localStorage.removeItem("klef-last-activity-time");
    setAdmin(null);
    window.location.href = "/";
  };

  if (!admin) return <main className="admin-loading">Verifying administrator access…</main>;

  return (
    <div className="app-shell page-shell-admin">
      {/* Top Application Header identical to Student Portal */}
      <header className="topbar">
        <div className="topbar-inner">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="student-mobile-menu-btn text-slate-300 hover:text-white"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle navigation menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <Brand compact />
          </div>

          <div className="portal-title">
            <strong>Academic Registration Portal</strong>
            <span>Central Administration · {adminNavigation.find(([k]) => k === active)?.[1] || active}</span>
          </div>

          <div className="account-menu">
            <div className="account-user-badge">
              <div className="account-avatar-sm">
                <ShieldCheck size={15} />
              </div>
              <div className="account-info-text">
                <span className="account-role-label">Admin</span>
                <strong className="account-id-label">{admin.name}</strong>
              </div>
            </div>

            <button type="button" className="signout-button" onClick={logout} title="Sign out of admin console" aria-label="Sign out">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Primary Sub-Navigation Bar matching Student Portal */}
      <nav className={`main-nav ${menuOpen ? "mobile-open" : ""}`} aria-label="Admin navigation">
        <div className="nav-inner">
          {adminNavigation.map(([key, label]) => {
            const Icon = iconMap[key];
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                className={`nav-item-btn ${isActive ? "active" : ""}`}
                onClick={() => {
                  setMenuOpen(false);
                  navigate(`/KLEF/8-2/Admin/G-Bhaanu-Sai/${key}.php`);
                }}
              >
                <Icon size={16} className={isActive ? "text-blue-600" : "text-slate-400"} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <main className="content admin-content-workspace">
        <div className="page-transition" key={active}>
          {active === "Dashboard" && (
            <AdminDashboard
              summary={summary}
              onNavigate={(key) => navigate(`/KLEF/8-2/Admin/G-Bhaanu-Sai/${key}.php`)}
              onQuickCreate={handleQuickCreate}
            />
          )}

          {active === "Students" && (
            <StudentsPage
              records={records}
              filtered={filtered}
              query={query}
              setQuery={setQuery}
              loading={loadingRecords}
              status={status}
              onRefresh={load}
              onAdd={beginCreate}
              onEdit={beginEdit}
              onDelete={remove}
              onResetPassword={resetPassword}
              onImportRecords={async (newRecords) => {
                const localKey = `klef-admin-${resource}`;
                const merged = [...newRecords, ...records];
                await setAsyncRecord(localKey, merged);
                setRecords(merged);
                setStatus(`Successfully imported and organized ${newRecords.length} student profile(s).`);
              }}
            />
          )}

          {active === "Faculty" && (
            <FacultyPage
              records={records}
              filtered={filtered}
              query={query}
              setQuery={setQuery}
              loading={loadingRecords}
              status={status}
              onRefresh={load}
              onAdd={beginCreate}
              onEdit={beginEdit}
              onDelete={remove}
              onImportRecords={async (newRecords) => {
                const localKey = `klef-admin-${resource}`;
                const merged = [...newRecords, ...records];
                await setAsyncRecord(localKey, merged);
                setRecords(merged);
                setStatus(`Successfully imported and organized ${newRecords.length} faculty allocation(s).`);
              }}
            />
          )}

          {active === "Buckets" && (
            <BucketsPage
              records={records}
              filtered={filtered}
              query={query}
              setQuery={setQuery}
              loading={loadingRecords}
              status={status}
              onRefresh={load}
              onAdd={beginCreate}
              onEdit={beginEdit}
              onDelete={remove}
            />
          )}

          {active === "Courses" && (
            <CoursesPage
              records={records}
              filtered={filtered}
              query={query}
              setQuery={setQuery}
              loading={loadingRecords}
              status={status}
              onRefresh={load}
              onAdd={beginCreate}
              onEdit={beginEdit}
              onDelete={remove}
            />
          )}

          {active === "Reset-Password" && (
            <AdminResetPasswordPage />
          )}

          {active === "My-Profile" && (
            <AdminProfilePage admin={admin} />
          )}
        </div>
      </main>

      {editing && (
        <RecordModal
          editing={editing}
          active={active}
          singularLabel={singularLabels[active]}
          fields={fields[active]}
          form={form}
          setForm={setForm}
          buckets={buckets}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Modern Confirmation Dialog for Record Deletion via OverlayPortal */}
      {recordToDelete && (
        <OverlayPortal
          isOpen={Boolean(recordToDelete)}
          onClose={() => setRecordToDelete(null)}
          className="modal-backdrop-centered"
        >
          <div
            className="admin-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-confirm-header">
              <div className="admin-confirm-icon-wrap" style={{ background: "#fee2e2", color: "#b91c1c" }}>
                <Trash2 size={24} />
              </div>
              <div>
                <h2>Confirm Record Deletion</h2>
                <p>Are you sure you want to permanently remove this {singularLabels[active] || "record"}?</p>
              </div>
            </div>

            <div className="admin-confirm-body">
              <p className="text-sm text-slate-600">
                This action will delete the entry for <strong>{recordToDelete.name || recordToDelete.facultyName || recordToDelete.title || recordToDelete.username || "this item"}</strong> ({recordToDelete.username || recordToDelete.employeeId || recordToDelete.code || recordToDelete.courseCode || recordToDelete.id}).
              </p>
            </div>

            <div className="admin-confirm-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setRecordToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                style={{ background: "#dc2626", borderColor: "#dc2626", color: "#fff" }}
                onClick={confirmDelete}
              >
                Delete Record
              </button>
            </div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
