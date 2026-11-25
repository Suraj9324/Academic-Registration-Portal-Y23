import { useState, useMemo, useEffect } from "react";
import PageHeading from "../components/common/PageHeading";
import { buckets as fallbackBuckets, initialSelections } from "../services/academicData";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Layers,
  Sparkles,
  RotateCcw,
  AlertTriangle,
  X,
  User,
} from "lucide-react";
import OverlayPortal from "../components/common/OverlayPortal";

export default function Subjects({
  studentId,
  studentName = "Student",
  selections,
  setSelections,
  goTo,
  activeBucketId,
  onBucketChange,
}) {
  const [active, setActive] = useState(activeBucketId || "C0");
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStatus, setResetStatus] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowResetModal(false);
      }
    };
    if (showResetModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showResetModal]);

  const [studentBuckets, setStudentBuckets] = useState([]);
  const [studentSubjects, setStudentSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync internal active with external activeBucketId prop if provided
  useEffect(() => {
    if (activeBucketId && activeBucketId !== active) {
      setActive(activeBucketId);
    }
  }, [activeBucketId]);

  const handleSelectBucket = (bucketId) => {
    setActive(bucketId);
    if (onBucketChange) {
      onBucketChange(bucketId);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    Promise.all([
      fetch(`/portal-api/student-eligible-buckets?studentId=${studentId}`).then((r) => r.json()),
      fetch(`/portal-api/my-subjects?studentId=${studentId}`).then((r) => r.json()),
    ])
      .then(([bRes, sRes]) => {
        if (bRes.ok && bRes.data && bRes.data.length > 0) {
          setStudentBuckets(bRes.data);
          // If active is not in student buckets, set to first
          const targetActive = activeBucketId || active;
          if (!targetActive || !bRes.data.some((b) => b.id === targetActive)) {
            const firstId = bRes.data[0].id;
            setActive(firstId);
            if (onBucketChange) onBucketChange(firstId);
          }
        }
        if (sRes.ok && sRes.data) {
          setStudentSubjects(sRes.data);
        }
      })
      .catch((err) => console.error("Error loading student eligible buckets:", err))
      .finally(() => setLoading(false));
  }, [studentId]);

  // Use dynamic student buckets or fallback
  const displayBuckets = useMemo(() => {
    if (studentBuckets && studentBuckets.length > 0) {
      return studentBuckets.map((b) => {
        // Map courses for this bucket from studentSubjects or catalog
        const matchingSubjects = studentSubjects.filter((s) => s.bucket_id === b.id);
        const subjectsList = matchingSubjects.flatMap((ms) => {
          if (ms.is_elective && ms.eligible_courses && ms.eligible_courses.length > 0) {
            return ms.eligible_courses.map((ec) => ({
              code: ec.code,
              name: ec.name,
              credits: ec.credits ?? 3,
              ltps: ec.ltps || (ec.lecture_hours !== undefined && ec.lecture_hours !== null ? [ec.lecture_hours, ec.tutorial_hours ?? 0, ec.practical_hours ?? 0, ec.skill_hours ?? 0] : null),
              components: ec.components || ["L"],
              description: ec.description || "",
              faculty_display: ms.faculty_display,
              sections: ms.sections,
              is_prescribed: false,
            }));
          }
          return [{
            code: ms.course_code,
            name: ms.course_name,
            credits: ms.credits ?? 3,
            ltps: ms.ltps || (ms.lecture_hours !== undefined && ms.lecture_hours !== null ? [ms.lecture_hours, ms.tutorial_hours ?? 0, ms.practical_hours ?? 0, ms.skill_hours ?? 0] : null),
            components: ms.components || ["L"],
            description: "",
            faculty_display: ms.faculty_display,
            sections: ms.sections,
            is_prescribed: ms.is_prescribed || false,
          }];
        });

        // Deduplicate subjects within the bucket
        const seen = new Set();
        const uniqueSubjects = [];
        subjectsList.forEach((s) => {
          if (!seen.has(s.code)) {
            seen.add(s.code);
            uniqueSubjects.push(s);
          }
        });

        return {
          id: b.id,
          short: b.short_code || b.id,
          title: b.title || b.id,
          description: b.title,
          subjects: uniqueSubjects,
        };
      });
    }

    return fallbackBuckets.map((b) => ({
      ...b,
      subjects: b.subjects.map((s) => ({
        ...s,
        faculty_display: null,
      })),
    }));
  }, [studentBuckets, studentSubjects]);

  // Alias displayBuckets as buckets for cleaner template bindings
  const buckets = displayBuckets;

  const bucket = displayBuckets.find((item) => item.id === active) || displayBuckets[0];

  const selectedSubjects = useMemo(() => {
    return displayBuckets
      .map((b) => b.subjects.find((s) => s.code === selections[b.id]))
      .filter(Boolean);
  }, [displayBuckets, selections]);

  const credits = useMemo(() => {
    return selectedSubjects.reduce((sum, item) => sum + item.credits, 0);
  }, [selectedSubjects]);

  const complete = useMemo(() => {
    return Object.keys(selections).length === displayBuckets.length;
  }, [displayBuckets, selections]);

  const handleResetCourseSelections = () => {
    setSelections({});
    setShowResetModal(false);
    setResetStatus("Course selections have been cleared. Please choose your courses.");
    setTimeout(() => setResetStatus(""), 4000);
  };

  return (
    <div className="subject-selection-page">
      <PageHeading
        title="Course Bucket Selection"
        description="Select exactly one course option for each academic bucket. Your choices determine available faculty preferences."
        aside={
          <div className="subject-aside-meter-row">
            <div className="credit-meter">
              <div className="meter-header">
                <span>Selected Credits</span>
                <strong>
                  <span className="animated-number">{credits}</span>
                  <small> / 25 Max</small>
                </strong>
              </div>
              <div className="meter-track">
                <i style={{ width: `${Math.min((credits / 25) * 100, 100)}%` }} />
              </div>
              <p>
                {credits === 25
                  ? "Requirement met (25 Credits)"
                  : `${displayBuckets.length - selectedSubjects.length} of ${displayBuckets.length} buckets remaining`}
              </p>
            </div>
            <button
              type="button"
              className="reset-action-pill vertical-reset-btn"
              onClick={() => setShowResetModal(true)}
              title="Reset all course selections"
            >
              <span className="vertical-text">
                <span>Re</span>
                <span>Set</span>
              </span>
              <RotateCcw size={13} className="vertical-reset-icon" />
            </button>
          </div>
        }
      />

      {resetStatus && (
        <div className="admin-feedback-banner feedback-success mb-4 animate-in fade-in">
          <CheckCircle2 size={18} />
          <div className="admin-feedback-body">
            <strong>{resetStatus}</strong>
          </div>
        </div>
      )}

      <div className="bucket-layout">
        {/* Bucket Navigation Sidebar */}
        <aside className="bucket-nav">
          <div className="bucket-nav-header">
            <p className="eyebrow">Academic Buckets</p>
          </div>

          <div className="bucket-nav-list" role="tablist">
            {displayBuckets.map((item) => {
              const selectedCode = selections[item.id];
              const isNone = selectedCode === "NONE";
              const subject = item.subjects.find((s) => s.code === selectedCode);
              const isRegisteredCourse = Boolean(subject) && !isNone;
              const isCurrent = active === item.id;

              const statusClass = isRegisteredCourse
                ? "completed"
                : isNone
                ? "opted-none"
                : "pending";

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`bucket-nav-item ${isCurrent ? "active" : ""} ${statusClass}`}
                  aria-current={isCurrent ? "step" : undefined}
                  onClick={() => handleSelectBucket(item.id)}
                >
                  <span className="nav-bucket-badge">{item.id}</span>
                  <div className="nav-bucket-info">
                    <strong>{item.short}</strong>
                    <small>
                      {isNone
                        ? "Not selected (None)"
                        : isRegisteredCourse
                        ? `${subject.credits} credits chosen`
                        : "Selection needed"}
                    </small>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bucket-nav-footer">
            <div className="nav-legend">
              <span className="legend-dot completed" />
              <span>Selected</span>
              <span className="legend-dot opted-none" />
              <span>None chosen</span>
              <span className="legend-dot pending" />
              <span>Pending</span>
            </div>
          </div>
        </aside>

        {/* Bucket Main Content & Subject Discovery */}
        <section className="bucket-content" key={bucket.id}>
          {/* Header of Active Bucket */}
          <div className="bucket-header-panel">
            <div className="bucket-header-left">
              <div className="bucket-header-meta">
                <span className="bucket-code-pill">{bucket.id}</span>
                <span className="bucket-type-tag">{bucket.short}</span>
              </div>
              <h2>{bucket.title}</h2>
              <p className="bucket-desc">
                Select one approved course from this academic bucket. Selections directly determine your faculty preference options in the subsequent step.
              </p>
            </div>

            <div className="bucket-header-actions">
              <button
                type="button"
                className="reset-action-pill"
                onClick={() => {
                  setSelections((current) => {
                    const next = { ...current };
                    delete next[bucket.id];
                    return next;
                  });
                }}
                disabled={!selections[bucket.id]}
                title={`Reset selection for ${bucket.id}`}
              >
                <RotateCcw size={12} />
                <span>Reset {bucket.id}</span>
              </button>
            </div>
          </div>

          {/* Subjects Grid */}
          <div className="subject-cards-grid">
            {bucket.subjects.map((item) => {
              const isSelected = selections[bucket.id] === item.code;

              return (
                <article
                  key={item.code}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  className={`subject-card ${isSelected ? "selected" : ""}`}
                  onClick={() =>
                    setSelections((current) => ({
                      ...current,
                      [bucket.id]: item.code,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setSelections((current) => ({
                        ...current,
                        [bucket.id]: item.code,
                      }));
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="card-top">
                    <div className="card-left-content">
                      <div className="card-code-group">
                        <span className="card-code">{item.code}</span>
                        <span className="card-credits">{item.credits} Credits</span>
                      </div>
                      <h3 className="card-title">{item.name}</h3>
                      {item.description && !item.description.includes(item.name) ? (
                        <p className="card-description">{item.description}</p>
                      ) : null}
                    </div>

                    <div className="card-right-group">
                      <div className="card-radio-mark" aria-hidden="true">
                        {isSelected && <Check size={14} />}
                      </div>

                      {/* L-T-P-S Structure below the selection dot */}
                      {(() => {
                        const labels = ["L", "T", "P", "S"];
                        return (
                          <div className="ltps-badge" title="Course hours per week (L - T - P - S)">
                            <div className="ltps-matrix-labels">
                              {labels.map((lbl) => (
                                <span key={lbl}>{lbl}</span>
                              ))}
                            </div>
                            <div className="ltps-matrix-values">
                              {labels.map((_, idx) => (
                                <span key={idx}>{item.ltps && item.ltps[idx] !== undefined && item.ltps[idx] !== null ? item.ltps[idx] : "-"}</span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="card-action-row">
                    <span className="action-hint">
                      {isSelected ? "Selected for Registration" : "Click to select course"}
                    </span>
                    {isSelected && (
                      <span className="selected-indicator-pill">
                        <CheckCircle2 size={14} /> Active
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

            {/* None of the Above Option */}
            {(() => {
              const isNoneSelected = selections[bucket.id] === "NONE";
              return (
                <article
                  role="radio"
                  aria-checked={isNoneSelected}
                  tabIndex={0}
                  className={`subject-card subject-card-none ${isNoneSelected ? "selected" : ""}`}
                  onClick={() =>
                    setSelections((current) => ({
                      ...current,
                      [bucket.id]: "NONE",
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setSelections((current) => ({
                        ...current,
                        [bucket.id]: "NONE",
                      }));
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div className="card-top">
                    <div className="card-code-group">
                      <span className="card-code">NONE</span>
                      <span className="card-credits">0 Credits</span>
                    </div>
                    <div className="card-radio-mark" aria-hidden="true">
                      {isNoneSelected && <Check size={14} />}
                    </div>
                  </div>

                  <h3 className="card-title">None of the above</h3>
                  <p className="card-description">
                    Choose this option if you do not wish to register for any of the listed courses in {bucket.short} ({bucket.title}) this semester.
                  </p>

                  <div className="card-action-row">
                    <span className="action-hint">
                      {isNoneSelected ? "Selected: None of the above" : "Click to select none"}
                    </span>
                    {isNoneSelected && (
                      <span className="selected-indicator-pill">
                        <CheckCircle2 size={14} /> Active
                      </span>
                    )}
                  </div>
                </article>
              );
            })()}
          </div>

          {/* Sticky Bucket Navigation Footer */}
          <div className="bucket-footer">
            <div className="bucket-footer-info">
              {selections[bucket.id] === "NONE" ? (
                <span className="text-slate-600 font-semibold flex items-center gap-1.5 text-xs">
                  <CheckCircle2 size={16} /> None of the above selected for {bucket.short}
                </span>
              ) : selections[bucket.id] ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1.5 text-xs">
                  <CheckCircle2 size={16} /> Course selected for {bucket.short}
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1.5 text-xs">
                  Pending selection for {bucket.short}
                </span>
              )}
            </div>

            <div className="bucket-footer-actions">
              {/* Previous Bucket button */}
              {buckets.findIndex((b) => b.id === bucket.id) > 0 && (
                <button
                  type="button"
                  className="secondary-btn btn-sm"
                  onClick={() => {
                    const idx = buckets.findIndex((b) => b.id === bucket.id);
                    handleSelectBucket(buckets[idx - 1].id);
                  }}
                >
                  Previous Bucket
                </button>
              )}

              {/* Next Bucket button */}
              {buckets.findIndex((b) => b.id === bucket.id) < buckets.length - 1 ? (
                <button
                  type="button"
                  className="primary-btn btn-sm"
                  onClick={() => {
                    const idx = buckets.findIndex((b) => b.id === bucket.id);
                    handleSelectBucket(buckets[idx + 1].id);
                  }}
                >
                  Next Bucket
                </button>
              ) : (
                <button
                  type="button"
                  className="primary-btn btn-sm"
                  onClick={() => goTo("preferences")}
                >
                  <span>Continue to Faculty Preferences</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal for Resetting Course Selections via OverlayPortal */}
      {showResetModal && (
        <OverlayPortal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
          className="modal-backdrop-centered"
        >
          <div
            className="admin-confirm-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-confirm-header">
              <div className="admin-confirm-icon-wrap">
                <AlertTriangle size={24} className="text-rose-600" />
              </div>
              <div>
                <h2>Reset Course Selections</h2>
                <p>Are you sure you want to clear all your course selections?</p>
              </div>
            </div>

            <div className="admin-confirm-body">
              <p className="text-sm text-slate-600">
                This will clear all course selections across all academic buckets. Associated faculty preferences will also be invalidated.
              </p>
              <div className="admin-confirm-summary-box">
                <div className="admin-confirm-row">
                  <span>Target:</span>
                  <strong>All {displayBuckets.length} Academic Buckets</strong>
                </div>
                <div className="admin-confirm-row">
                  <span>Action:</span>
                  <span className="text-rose-700 font-semibold">Clear All Selections</span>
                </div>
              </div>
            </div>

            <div className="admin-confirm-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setShowResetModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn danger-override"
                onClick={handleResetCourseSelections}
              >
                <RotateCcw size={15} />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
