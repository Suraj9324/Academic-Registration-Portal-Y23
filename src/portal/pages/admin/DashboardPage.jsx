import { BookOpen, Boxes, GraduationCap, UserRound, Plus, ArrowRight, ShieldCheck, Clock } from "lucide-react";

export default function AdminDashboard({ summary = {}, onNavigate, onQuickCreate }) {
  const studentsList = Array.isArray(summary?.students) ? summary.students : [];
  const facultyList = Array.isArray(summary?.faculty) ? summary.faculty : [];
  const bucketsList = Array.isArray(summary?.buckets) ? summary.buckets : [];
  const coursesList = Array.isArray(summary?.courses) ? summary.courses : [];

  const statCards = [
    {
      key: "Students",
      category: "TOTAL REGISTERED STUDENTS",
      count: summary?.studentsCount ?? studentsList.length ?? 1159,
      icon: GraduationCap,
      accent: "blue",
      actionText: "Manage Students List →",
    },
    {
      key: "Faculty",
      category: "TOTAL FACULTY ALLOCATIONS",
      count: summary?.facultyCount ?? facultyList.length ?? 682,
      icon: UserRound,
      accent: "indigo",
      actionText: "Manage Faculty Allocations →",
    },
    {
      key: "Buckets",
      category: "ACTIVE CURRICULUM BUCKETS",
      count: summary?.bucketsCount ?? bucketsList.length ?? 9,
      icon: Boxes,
      accent: "amber",
      actionText: "Manage Curriculum Buckets →",
    },
    {
      key: "Courses",
      category: "TOTAL OFFERED COURSES",
      count: summary?.coursesCount ?? coursesList.length ?? 108,
      icon: BookOpen,
      accent: "emerald",
      actionText: "Manage Course Catalog →",
    },
  ];

  return (
    <section className="admin-dashboard-container">
      <div className="admin-dashboard-header">
        <div>
          <span className="kicker">System Overview</span>
          <h1 className="admin-page-title">Registration Control Center</h1>
          <p className="admin-page-desc">
            Centralized monitoring for student enrollments, faculty component assignments, and active course curriculum.
          </p>
        </div>
      </div>

      {/* KPI Stats Grid matching the pill capsule card format */}
      <div className="admin-stat-grid">
        {statCards.map(({ key, category, count, icon: Icon, accent }) => (
          <div
            key={key}
            className={`admin-stat-pill-card accent-${accent}`}
            role="button"
            tabIndex={0}
            onClick={() => onNavigate(key)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onNavigate(key);
              }
            }}
          >
            <div className="stat-pill-body">
              <div className="stat-pill-main">
                <span className="stat-pill-category">{category}</span>
                <strong className="stat-pill-value">{count}</strong>
              </div>
              <div className={`stat-pill-icon-circle icon-circle-${accent}`}>
                <Icon size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-split">
        {/* Recent Student Activity Panel */}
        <section className="admin-panel admin-recent-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="kicker">Student Directory</span>
              <h2>Recently Updated Students</h2>
            </div>
            <button
              type="button"
              className="secondary-btn btn-sm"
              onClick={() => onNavigate("Students")}
            >
              <span>View All Students</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="admin-recent-list">
            {studentsList.slice(0, 4).map((student) => (
              <div
                key={student.id}
                className="admin-recent-row"
                role="button"
                tabIndex={0}
                onClick={() => onNavigate("Students")}
              >
                <div className="admin-student-avatar">
                  {student.name?.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                </div>
                <div className="admin-recent-info">
                  <strong>{student.name}</strong>
                  <small>{student.username} · {student.cluster || "Cluster 2"}</small>
                </div>
                <div className="admin-recent-badge">
                  <span>{student.residencyStatus || "Hosteler"}</span>
                </div>
              </div>
            ))}

            {!studentsList.length && (
              <div className="admin-empty-state">
                <Clock size={24} className="text-slate-400" />
                <p>No recent student records loaded. Click below to view the full student directory.</p>
              </div>
            )}
          </div>
        </section>

        {/* Common Quick Actions Panel */}
        <aside className="admin-panel admin-actions-panel">
          <div className="admin-panel-heading">
            <div>
              <span className="kicker">Administration Tasks</span>
              <h2>Quick Actions</h2>
            </div>
          </div>

          <div className="admin-actions-list">
            <button
              type="button"
              className="admin-action-btn"
              onClick={() => (onQuickCreate ? onQuickCreate("Students") : onNavigate("Students"))}
            >
              <div className="action-icon-wrap bg-blue-50 text-blue-600">
                <Plus size={18} />
              </div>
              <div className="action-info">
                <strong>Create Student Profile</strong>
                <span>Add new student registration record</span>
              </div>
            </button>

            <button
              type="button"
              className="admin-action-btn"
              onClick={() => (onQuickCreate ? onQuickCreate("Faculty") : onNavigate("Faculty"))}
            >
              <div className="action-icon-wrap bg-indigo-50 text-indigo-600">
                <UserRound size={18} />
              </div>
              <div className="action-info">
                <strong>Allocate Faculty Member</strong>
                <span>Assign teaching components to courses</span>
              </div>
            </button>

            <button
              type="button"
              className="admin-action-btn"
              onClick={() => (onQuickCreate ? onQuickCreate("Buckets") : onNavigate("Buckets"))}
            >
              <div className="action-icon-wrap bg-amber-50 text-amber-600">
                <Boxes size={18} />
              </div>
              <div className="action-info">
                <strong>Manage Academic Buckets</strong>
                <span>Configure registration groups and limits</span>
              </div>
            </button>

            <button
              type="button"
              className="admin-action-btn"
              onClick={() => (onQuickCreate ? onQuickCreate("Courses") : onNavigate("Courses"))}
            >
              <div className="action-icon-wrap bg-emerald-50 text-emerald-600">
                <BookOpen size={18} />
              </div>
              <div className="action-info">
                <strong>Add Course Offering</strong>
                <span>Register new course in academic catalog</span>
              </div>
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
