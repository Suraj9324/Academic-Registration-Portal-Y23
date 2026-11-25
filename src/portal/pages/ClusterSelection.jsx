import { useState, useEffect } from "react";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { getStudentRosterInfo } from "../services/studentService";

export default function ClusterSelection({ studentId, cluster, setCluster, goTo }) {
  const initialInfo = getStudentRosterInfo(studentId);
  const [student, setStudent] = useState(initialInfo);
  const [loading, setLoading] = useState(false);
  const [assignedCluster, setAssignedCluster] = useState(initialInfo?.cluster || null);
  const [isUnverified, setIsUnverified] = useState(initialInfo?.cluster === "UNVERIFIED");

  useEffect(() => {
    if (!studentId) return;
    fetch(`/portal-api/student-profile?studentId=${studentId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) {
          const s = res.data;
          setStudent(s);
          if (s.cluster_id === "Cluster-1") {
            setAssignedCluster("Cluster 1");
            setCluster("Cluster 1");
          } else if (s.cluster_id === "Cluster-2") {
            setAssignedCluster("Cluster 2");
            setCluster("Cluster 2");
          } else {
            setIsUnverified(true);
            setAssignedCluster(null);
          }
        }
      })
      .catch((err) => {
        console.error("Error loading student profile in ClusterSelection:", err);
      });
  }, [studentId, setCluster]);

  const clusterCards = [
    {
      id: "Cluster 1",
      name: "Cluster 1",
      range: "S1 — S50",
      description: "Section range 1 through 50 for primary cohort registrations.",
    },
    {
      id: "Cluster 2",
      name: "Cluster 2",
      range: "S51 — S100",
      description: "Section range 51 through 100 aligned with your specialization cohort.",
    },
  ];

  const currentClusterName = assignedCluster || (cluster === "Cluster 1" || cluster === "Cluster 2" ? cluster : "Cluster 2");

  // Determine display specialization (matches student record or falls back accurately)
  const displaySpecialization = student?.specialization || initialInfo?.specialization || "";

  return (
    <div className="cluster-selection-screen-fit">
      {/* Title & Top Badge Bar */}
      <div className="cluster-fit-header">
        <div className="cluster-fit-title-wrap">
          <h1>Cluster Selection</h1>
          <p>Confirm the section cluster assigned to your specialization before choosing semester subjects.</p>
        </div>
        <div className="cluster-fit-cohort-pill">
          <span className="pill-kicker">SELECTED COHORT</span>
          <strong>{currentClusterName}</strong>
        </div>
      </div>

      {/* Specialization Banner Box: "Your Specialization" up, name down */}
      <div className="cluster-fit-spec-card">
        <span className="spec-tag">Your Specialization</span>
        <strong className="spec-name">{displaySpecialization}</strong>
      </div>

      {/* Unverified Warning if applicable */}
      {isUnverified && (
        <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-50 text-amber-900 flex items-center gap-2">
          <ShieldAlert size={18} className="text-amber-600 flex-shrink-0" />
          <span className="text-xs font-medium">Cluster Assignment Pending Verification with Academic Administration.</span>
        </div>
      )}

      {/* 2-Column Minimal Cards with clean layout, NO 'recommended' or 'alternative' words */}
      <div className="cluster-fit-grid">
        {clusterCards.map((item) => {
          const isSelected = currentClusterName === item.name;

          return (
            <div
              key={item.id}
              role="radio"
              aria-checked={isSelected}
              aria-disabled={!isSelected}
              tabIndex={isSelected ? 0 : -1}
              className={`cluster-fit-card ${isSelected ? "is-selected" : "is-disabled-cohort"}`}
              style={{
                cursor: isSelected ? "default" : "not-allowed",
                opacity: isSelected ? 1 : 0.58,
                pointerEvents: isSelected ? "auto" : "none",
              }}
            >
              <div className="card-top-row">
                <span className="status-badge-placeholder">
                  {isSelected ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-100 text-orange-800 border border-orange-200">
                      Assigned Cohort
                    </span>
                  ) : (
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                      Locked to Other Cohort
                    </span>
                  )}
                </span>
                <div className={`check-circle ${isSelected ? "selected" : ""}`}>
                  {isSelected && <CheckCircle2 size={18} className="text-white fill-current" />}
                </div>
              </div>

              <div className="card-center-row">
                <strong className="cluster-name">{item.name}</strong>
                <div className="range-badge">
                  <span className="range-lbl">RANGE</span>
                  <span className="range-num">{item.range}</span>
                </div>
              </div>

              <p className="card-desc">{item.description}</p>
            </div>
          );
        })}
      </div>

      {/* Bottom Information Notice Bar */}
      <div className="cluster-fit-alert">
        <span className="alert-info-icon">ⓘ</span>
        <p>
          Your cluster is based on your specialization cohort. All course buckets will display faculty and section allocations from this cluster only.
        </p>
      </div>

      {/* Bottom Action Buttons */}
      <div className="cluster-fit-actions">
        <button
          type="button"
          className="cluster-fit-back-btn"
          onClick={() => goTo("overview")}
        >
          <span>← Back to Overview</span>
        </button>

        <button
          type="button"
          disabled={isUnverified}
          className={`cluster-fit-confirm-btn ${isUnverified ? "disabled" : ""}`}
          onClick={() => {
            if (!isUnverified) {
              setCluster(currentClusterName);
              goTo("subjects");
            }
          }}
        >
          <span>Confirm {currentClusterName}</span>
          <CheckCircle2 size={16} />
        </button>
      </div>
    </div>
  );
}
