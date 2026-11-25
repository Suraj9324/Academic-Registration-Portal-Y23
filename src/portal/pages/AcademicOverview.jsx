import React, { useMemo, useState, useEffect } from "react";
import PageHeading from "../components/common/PageHeading";
import { getStudentCluster, getStudentRosterInfo } from "../services/studentService";
import { loadPreferences } from "../services/preferenceService";
import { readLocalRecord } from "../services/api";
import { getSelectionStorageKey, initialSelections } from "../services/subjectService";
import {
  CheckCircle2,
  Clock,
  BookOpen,
  Layers,
  Award,
  Sparkles,
  UserCheck,
  ArrowRight,
  Shield,
  FileCheck,
  Building,
  GraduationCap,
  Calendar,
  Compass,
} from "lucide-react";

export default function Overview({ studentId, goTo }) {
  const initialInfo = useMemo(() => getStudentRosterInfo(studentId), [studentId]);
  const [student, setStudent] = useState(() => initialInfo);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      fetch(`/portal-api/student-profile?studentId=${studentId}`).then((r) => r.json()),
      fetch(`/portal-api/my-subjects?studentId=${studentId}`).then((r) => r.json()),
    ])
      .then(([profRes, subRes]) => {
        if (profRes.ok && profRes.data) {
          setStudent(profRes.data);
          try {
            localStorage.setItem(`klef-student-profile-${studentId}`, JSON.stringify(profRes.data));
          } catch {}
        }
        if (subRes.ok && subRes.data) setSubjects(subRes.data);
      })
      .catch((err) => console.error("Failed to load student overview data:", err));
  }, [studentId]);

  // Read actual student state
  const cluster = useMemo(() => student?.cluster_id || getStudentCluster(studentId) || "Cluster 2", [student, studentId]);
  const selections = useMemo(() => {
    return readLocalRecord(getSelectionStorageKey(studentId), initialSelections);
  }, [studentId]);
  const preferences = useMemo(() => loadPreferences(studentId), [studentId]);

  // Compute distinct buckets and subjects
  const totalBuckets = useMemo(() => {
    const bSet = new Set(subjects.map((s) => s.bucket_id));
    return bSet.size || 8;
  }, [subjects]);

  const totalCredits = useMemo(() => {
    return subjects.reduce((sum, s) => sum + (s.credits || 0), 0);
  }, [subjects]);

  const pendingElectivesCount = useMemo(() => {
    return subjects.filter((s) => s.is_elective && !selections[s.bucket_id]).length;
  }, [subjects, selections]);

  return (
    <div className="overview-container">
      <PageHeading
        title="Academic Overview"
        description="Official university profile, active cohort allocation, and academic registration progression status."
      />

      {/* Top Balanced Row: Academic Enrollment Identity and Academic Counseling */}
      <div className="overview-grid">
        {/* Left Card: Official Academic Credentials */}
        <section className="plain-section academic-section">
          <div className="section-title">
            <div>
              <h2>Academic Enrollment Identity</h2>
            </div>
          </div>

          <dl className="data-grid academic-grid">
            <div>
              <dt>Student Name</dt>
              <dd className="font-semibold text-gray-900">{student?.name || "Loading..."}</dd>
            </div>
            <div>
              <dt>University Roll Number</dt>
              <dd className="font-mono font-bold text-blue-700">{student?.student_id || studentId}</dd>
            </div>
            <div>
              <dt>Institutional Email</dt>
              <dd>
                <a href={`mailto:${student?.university_email || `${studentId}@kluniversity.in`}`} className="text-blue-600 hover:underline">
                  {student?.university_email || `${studentId}@kluniversity.in`}
                </a>
              </dd>
            </div>
            <div>
              <dt>Department / Program</dt>
              <dd>{student?.program || "CSE"} · Computer Science &amp; Engineering</dd>
            </div>
            <div>
              <dt>Academic Specialization</dt>
              <dd className="text-blue-700 font-semibold">{student?.specialization || "Departmental Specialization"}</dd>
            </div>
            <div>
              <dt>Cohort Cluster</dt>
              <dd className="font-semibold text-emerald-700">{student?.cluster_id || cluster}</dd>
            </div>
            <div>
              <dt>Student Type / Track</dt>
              <dd className="font-medium text-amber-700">{student?.student_type || "CRT"} ({student?.flexibility_track || "Standard"})</dd>
            </div>
            <div>
              <dt>Placement Readiness Status</dt>
              <dd className="font-medium">{student?.placement_status || "YTB Placed"}</dd>
            </div>
            <div>
              <dt>ADDON Degree Track</dt>
              <dd className="font-medium text-purple-700">{student?.addon_status || "Specialization"}</dd>
            </div>
            <div>
              <dt>Current Term Level</dt>
              <dd>Fourth Year · Semester 8 (2026–27 EVEN)</dd>
            </div>
          </dl>
        </section>

        {/* Right Card: Assigned Faculty Counselor Panel (Matched Length) */}
        <aside className="counselor-panel">
          <p className="eyebrow">Academic Counseling</p>
          <h2>{student?.counselor_name || "Counselor Not Assigned"}</h2>
          <dl>
            <div>
              <dt>Employee ID</dt>
              <dd className="font-mono">{student?.counselor_id || "Not assigned"}</dd>
            </div>
            <div>
              <dt>Designation</dt>
              <dd>{student?.counselor_designation || "Faculty Counselor"}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{student?.counselor_dept || "Computer Science & Engineering"}</dd>
            </div>
            <div>
              <dt>Contact Mobile</dt>
              <dd>{student?.counselor_mobile || "Not available"}</dd>
            </div>
            <div>
              <dt>Contact Email</dt>
              <dd>
                {student?.counselor_email ? (
                  <a href={`mailto:${student.counselor_email}`} className="text-blue-600 hover:underline">
                    {student.counselor_email}
                  </a>
                ) : (
                  <span>Not available</span>
                )}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

      {/* Full Width Bottom Row: Prescribed Curriculum Status */}
      <section className="plain-section overview-curriculum-section">
        <div className="section-title">
          <h2>Prescribed Curriculum Status</h2>
        </div>
        <div className="grid grid-cols-4 gap-4 curriculum-kpis-grid">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center" style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center' }}>
            <span className="text-xs uppercase text-gray-500 font-semibold block" style={{ fontSize: '0.75rem', color: '#64748b' }}>Curriculum Buckets</span>
            <strong className="text-2xl text-blue-700 block mt-1" style={{ fontSize: '1.5rem', color: '#1d4ed8' }}>{totalBuckets}</strong>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center" style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center' }}>
            <span className="text-xs uppercase text-gray-500 font-semibold block" style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Subjects</span>
            <strong className="text-2xl text-emerald-700 block mt-1" style={{ fontSize: '1.5rem', color: '#047857' }}>{subjects.length}</strong>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center" style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center' }}>
            <span className="text-xs uppercase text-gray-500 font-semibold block" style={{ fontSize: '0.75rem', color: '#64748b' }}>Prescribed Credits</span>
            <strong className="text-2xl text-purple-700 block mt-1" style={{ fontSize: '1.5rem', color: '#7e22ce' }}>{totalCredits}</strong>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center" style={{ padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', textAlign: 'center' }}>
            <span className="text-xs uppercase text-gray-500 font-semibold block" style={{ fontSize: '0.75rem', color: '#64748b' }}>Electives Pending</span>
            <strong className={`text-2xl block mt-1 ${pendingElectivesCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`} style={{ fontSize: '1.5rem' }}>
              {pendingElectivesCount}
            </strong>
          </div>
        </div>
      </section>
    </div>
  );
}
