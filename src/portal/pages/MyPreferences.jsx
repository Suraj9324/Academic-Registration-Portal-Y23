import { useRef, useState, useMemo, useEffect } from "react";
import { toPng } from "html-to-image";
import PageHeading from "../components/common/PageHeading";
import { buckets, componentNames, faculty, sectionBase, sectionFor, getFacultyOptionsForSubject } from "../services/academicData";
import { CheckCircle2, Download, Layers, ShieldCheck, Check, Trash2, Edit3, Lock, RotateCcw } from "lucide-react";

export default function MyPreference({ studentId, selections = {}, setSelections, prefs = {}, setPrefs, cluster }) {
  const tableRef = useRef(null);
  const [downloadState, setDownloadState] = useState("idle");
  const [finalization, setFinalization] = useState({ status: "EDITABLE", finalized_at: null });
  const [actionNotice, setActionNotice] = useState("");
  const [studentBuckets, setStudentBuckets] = useState(null);

  // Load finalization status and student eligible buckets from backend database
  useEffect(() => {
    if (!studentId) return;
    Promise.all([
      fetch(`/portal-api/finalization-status?studentId=${studentId}`).then((r) => r.json()),
      fetch(`/portal-api/student-eligible-buckets?studentId=${studentId}`).then((r) => r.json()),
    ])
      .then(([fRes, bRes]) => {
        if (fRes.ok && fRes.data) {
          setFinalization(fRes.data);
        }
        if (bRes.ok && bRes.data && bRes.data.length > 0) {
          setStudentBuckets(bRes.data);
        }
      })
      .catch(() => {});
  }, [studentId]);

  const isFinalized = finalization.status === "FINALIZED";

  const downloadTable = async () => {
    if (!tableRef.current || downloadState === "working") return;
    setDownloadState("working");
    try {
      const dataUrl = await toPng(tableRef.current, {
        backgroundColor: "#FFFFFF",
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      link.download = `KLEF-registration-preferences-${studentId || "student"}.png`;
      link.href = dataUrl;
      link.click();
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
    }
  };

  const handleFinalize = async () => {
    if (!studentId) return;
    try {
      const res = await fetch("/portal-api/finalize-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (data.ok) {
        setFinalization({ status: "FINALIZED", finalized_at: new Date().toISOString() });
        setActionNotice("Preferences finalized. Use this reference when registering in the official college system.");
        setTimeout(() => setActionNotice(""), 5000);
      }
    } catch {
      setActionNotice("Unable to finalize preferences at this time.");
      setTimeout(() => setActionNotice(""), 4000);
    }
  };

  const handleReopen = async () => {
    if (!studentId) return;
    try {
      const res = await fetch("/portal-api/reopen-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (data.ok) {
        setFinalization({ status: "REOPENED", finalized_at: null });
        setActionNotice("Preferences reopened. You can now modify your selections.");
        setTimeout(() => setActionNotice(""), 5000);
      }
    } catch {
      setActionNotice("Unable to reopen preferences at this time.");
      setTimeout(() => setActionNotice(""), 4000);
    }
  };

  const handleDeleteCoursePreference = async (bucketId, courseCode) => {
    if (isFinalized) return;
    if (setSelections) {
      setSelections((curr) => {
        const next = { ...curr };
        delete next[bucketId];
        return next;
      });
    }

    // Delete in database
    try {
      await fetch("/portal-api/delete-subject-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, bucketId }),
      });
      if (courseCode) {
        await fetch("/portal-api/delete-faculty-preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId, courseCode }),
        });
      }
      setActionNotice(`Course preference for ${bucketId} removed.`);
      setTimeout(() => setActionNotice(""), 4000);
    } catch {
      // Handled silently
    }
  };

  const rows = useMemo(() => {
    // If student specific buckets are loaded from DB, only include buckets this student has
    const activeBuckets = studentBuckets && studentBuckets.length > 0
      ? studentBuckets.map((sb) => {
          const fallback = buckets.find((b) => b.id === sb.id);
          return {
            id: sb.id,
            short: sb.short_code || fallback?.short || sb.id,
            title: sb.title || fallback?.title || sb.id,
            subjects: fallback?.subjects || [],
          };
        })
      : buckets;

    return activeBuckets.map((bucket) => {
      const selectedCode = selections[bucket.id];
      const isNone = selectedCode === "NONE";
      const subject = bucket.subjects.find((item) => item.code === selectedCode);
      return {
        bucket,
        subject: subject || null,
        isNone,
      };
    });
  }, [studentBuckets, selections]);

  const selectedCoursesCount = useMemo(() => {
    return rows.filter((r) => r.subject).length;
  }, [rows]);

  const completedPreferencesCount = useMemo(() => {
    return rows.filter((r) => {
      if (!r.subject) return false;
      const comps = Array.isArray(r.subject.components) && r.subject.components.length > 0 ? r.subject.components : ["L"];
      const primaryComp = comps.includes("L") ? "L" : comps.includes("T") ? "T" : comps.includes("P") ? "P" : comps[0] || "L";
      let pool = getFacultyOptionsForSubject(r.subject.code, primaryComp, cluster, null);
      if (pool.length === 0) pool = getFacultyOptionsForSubject(r.subject.code, primaryComp, null, null);
      const requiredRanks = Math.min(3, Math.max(1, pool.length));
      const primaryPrefs = prefs[`${r.subject.code}-${primaryComp}`] || [];
      if (pool.length === 1) {
        return Boolean(primaryPrefs[0]) || Boolean(pool[0]);
      }
      return primaryPrefs.filter(Boolean).length >= requiredRanks;
    }).length;
  }, [rows, prefs, cluster]);

  const preferenceCell = (subject, component, rank) => {
    const comps = Array.isArray(subject.components) && subject.components.length > 0 ? subject.components : ["L"];
    const primaryComp = comps.includes("L") ? "L" : comps.includes("T") ? "T" : comps.includes("P") ? "P" : comps[0] || "L";

    if (component === primaryComp) {
      let pool = getFacultyOptionsForSubject(subject.code, primaryComp, cluster, null);
      if (pool.length === 0) pool = getFacultyOptionsForSubject(subject.code, primaryComp, null, null);
      const availableCount = pool.length;

      if (availableCount === 1) {
        if (rank === 0) {
          const facultyId = prefs[`${subject.code}-${primaryComp}`]?.[0];
          if (!facultyId) {
            return (
              <div className="pref-cell-empty">
                <span>Not Selected</span>
              </div>
            );
          }
          const person = faculty.find((item) => item.id === facultyId) || pool.find((item) => item.id === facultyId);
          return (
            <div className="pref-cell-filled">
              <div className="pref-cell-top">
                <span className="pref-cell-sec">{person?.section_id || sectionFor(subject.code, person.id, primaryComp, cluster)}</span>
                <span className="pref-cell-rank">1st Preference</span>
              </div>
              <strong>{person.name}</strong>
              <span className="pref-cell-empid">ID · {person.id}</span>
            </div>
          );
        }
        return (
          <div className="pref-cell-empty">
            <span style={{ color: "#94a3b8" }}>— Not Applicable —</span>
          </div>
        );
      }

      if (availableCount === 2 && rank === 2) {
        return (
          <div className="pref-cell-empty">
            <span style={{ color: "#94a3b8" }}>— Not Applicable —</span>
          </div>
        );
      }

      const facultyId = prefs[`${subject.code}-${primaryComp}`]?.[rank];
      const person = faculty.find((item) => item.id === facultyId) || pool.find((item) => item.id === facultyId);
      if (!person) {
        return (
          <div className="pref-cell-empty">
            <span>Choice {rank + 1} pending</span>
          </div>
        );
      }
      return (
        <div className="pref-cell-filled">
          <div className="pref-cell-top">
            <span className="pref-cell-sec">{person.section_id || sectionFor(subject.code, person.id, primaryComp, cluster)}</span>
            <span className="pref-cell-rank">Choice {rank + 1}</span>
          </div>
          <strong>{person.name}</strong>
          <span className="pref-cell-empid">ID · {person.id}</span>
        </div>
      );
    }

    // Sub-component (Skill, Tutorial): linked to primary choice at this rank
    const primaryFacultyId = prefs[`${subject.code}-${primaryComp}`]?.[rank];
    const primaryFaculty = faculty.find((item) => item.id === primaryFacultyId);
    const baseSec = primaryFaculty
      ? sectionBase(primaryFaculty.section_id || sectionFor(subject.code, primaryFaculty.id, primaryComp, cluster))
      : null;

    if (!baseSec) {
      return (
        <div className="pref-cell-empty">
          <span>Set {componentNames[primaryComp] || "Primary"} Pref {rank + 1}</span>
        </div>
      );
    }

    // Retrieve all available options for this section
    const subOptions = getFacultyOptionsForSubject(subject.code, component, null, `S-${baseSec}`);
    const maxSubRanks = Math.max(1, subOptions.length);

    const subRanks = Array.from({ length: maxSubRanks }, (_, i) => i + 1)
      .map((subR) => {
        const key = `${subject.code}-${component}-L${rank + 1}-R${subR}`;
        const facultyId = prefs[key];
        if (!facultyId) return null;
        const fPerson = faculty.find((f) => f.id === facultyId);
        return {
          subRank: subR,
          sectionId: `S-${baseSec}`,
          faculty: fPerson,
        };
      })
      .filter(Boolean);

    if (!subRanks.length) {
      return (
        <div className="pref-cell-empty">
          <span>Sub-components pending</span>
        </div>
      );
    }

    return (
      <div className="sub-ranked-grid">
        {subRanks.map((item) => (
          <div key={item.subRank} className="sub-ranked-chip">
            <div className="sub-chip-header">
              <span className="sub-chip-code">{item.sectionId}</span>
              <span className="sub-chip-rank">Pref {item.subRank}</span>
            </div>
            <strong>{item.faculty ? item.faculty.name : "Faculty Member"}</strong>
            <span className="sub-chip-empid">{item.faculty ? `ID · ${item.faculty.id}` : ""}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <PageHeading
        title="My Preference"
        description="A consolidated, automatically saved view of your faculty preferences across all delivery components for each selected course."
        aside={
          <div className="flex items-center gap-2">
            <button
              className="summary-download-btn"
              type="button"
              onClick={downloadTable}
              disabled={downloadState === "working"}
              title="Download clean table image for official college registration reference"
            >
              <Download size={15} />
              <span>{downloadState === "working" ? "Generating..." : "Download PNG"}</span>
            </button>
          </div>
        }
      />

      {actionNotice && (
        <div className="admin-feedback-banner feedback-success mb-4 animate-in fade-in">
          <CheckCircle2 size={18} />
          <div className="admin-feedback-body">
            <strong>{actionNotice}</strong>
          </div>
        </div>
      )}

      {isFinalized && (
        <div className="admin-feedback-banner feedback-info mb-4">
          <ShieldCheck size={20} className="text-emerald-600" />
          <div className="admin-feedback-body">
            <strong>Registration Ready: Preferences Finalized</strong>
            <p>
              Your course selections and faculty rankings are locked as a verified reference copy.
              {finalization.finalized_at && ` (Finalized on ${new Date(finalization.finalized_at).toLocaleString()})`}
            </p>
          </div>
        </div>
      )}

      <div className="my-preferences-container">
        <div className="my-preferences-table-wrap" ref={tableRef}>

          <table className="summary-table">
            <thead>
              <tr>
                <th style={{ width: "26%" }}>Bucket &amp; Course</th>
                <th style={{ width: "13%" }}>Component</th>
                <th style={{ width: "20%" }}>1st Preference</th>
                <th style={{ width: "20%" }}>2nd Preference</th>
                <th style={{ width: "21%" }}>3rd Preference</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ bucket, subject, isNone }) => {
                if (subject) {
                  return subject.components.map((component, compIdx) => (
                    <tr
                      key={`${subject.code}-${component}`}
                      className={`${compIdx === 0 ? "subject-group-start" : "subject-group-row"}`}
                    >
                      {compIdx === 0 && (
                        <td rowSpan={subject.components.length} className="subject-meta-cell">
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                            <span className="summary-bucket-tag">{bucket.id}</span>
                            <span className="summary-bucket-tag" style={{ background: "#fef3c7", color: "#92400e", borderColor: "#fde68a" }}>
                              {bucket.short}
                            </span>
                          </div>
                          <strong>{subject.name}</strong>
                          <div className="summary-subject-sub">
                            <span className="sub-tag-code">{subject.code}</span>
                            <span className="sub-tag-credits">{subject.credits} Credits</span>
                            <span className="sub-tag-ltps" title="Course Hours (L T P S)">
                              L:- T:- P:- S:-
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="component-tag-cell">
                        <span className={`comp-pill comp-${component}`}>
                          {componentNames[component] || component}
                        </span>
                      </td>
                      <td>{preferenceCell(subject, component, 0)}</td>
                      <td>{preferenceCell(subject, component, 1)}</td>
                      <td>{preferenceCell(subject, component, 2)}</td>
                    </tr>
                  ));
                }

                return (
                  <tr key={bucket.id} className="subject-group-start row-empty-bucket">
                    <td className="subject-meta-cell">
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                        <span className="summary-bucket-tag summary-bucket-tag-muted">{bucket.id}</span>
                        <span className="summary-bucket-tag summary-bucket-tag-muted">{bucket.short}</span>
                      </div>
                      <strong>{bucket.title}</strong>
                      <div className="summary-subject-sub">
                        <span>{isNone ? "None of the above selected" : "Not yet registered"}</span>
                      </div>
                    </td>
                    <td className="component-tag-cell">
                      <span className="comp-pill comp-none">
                        None
                      </span>
                    </td>
                    <td colSpan={3} className="bucket-unregistered-cell">
                      <span className="unregistered-notice-text">
                        {isNone
                          ? "You opted out of this course bucket. No faculty preferences required."
                          : "Course not selected yet. Choose a course in Course Selection to assign faculty preferences."}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
