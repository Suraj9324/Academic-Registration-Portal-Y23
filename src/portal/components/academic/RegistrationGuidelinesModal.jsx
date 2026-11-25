import { useState, useEffect } from "react";
import { FileText, ArrowRight, Check } from "lucide-react";
import OverlayPortal from "../common/OverlayPortal";
import { getStudentRosterInfo } from "../../services/studentService";

export default function RegistrationGuidelinesModal({ studentId, onAgree, initialProfile }) {
  const [student, setStudent] = useState(() => {
    if (initialProfile) return initialProfile;
    const rosterInfo = getStudentRosterInfo(studentId);
    return rosterInfo?.specialization ? rosterInfo : null;
  });
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    fetch(`/portal-api/student-profile?studentId=${studentId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) {
          setStudent(res.data);
          try {
            localStorage.setItem(`klef-student-profile-${studentId}`, JSON.stringify(res.data));
          } catch {}
        }
      })
      .catch(() => {});
  }, [studentId]);

  const rawSpecialization = student?.specialization || getStudentRosterInfo(studentId)?.specialization;
  const specializationName = rawSpecialization ? rawSpecialization.toUpperCase() : null;
  const clusterName = (student?.cluster_id === "Cluster-1" || student?.cluster === "Cluster 1" || getStudentRosterInfo(studentId)?.cluster === "Cluster 1") ? "Cluster 1" : "Cluster 2";

  const handleProceed = () => {
    if (!agreed) return;
    onAgree();
  };

  return (
    <OverlayPortal isOpen={true} className="guidelines-modal-backdrop">
      <div className="guidelines-modal-container" role="dialog" aria-modal="true">
        {/* Dark Blue Header */}
        <div className="guidelines-modal-header">
          <div className="guidelines-header-icon">
            <FileText size={20} className="text-white" />
          </div>
          <div className="guidelines-header-text">
            <h2>Registration Guidelines</h2>
            <p>Read each instruction carefully</p>
          </div>
        </div>

        {/* Guidelines List Body */}
        <div className="guidelines-modal-body">
          <div className="guidelines-list">
            {/* Rule 1 */}
            <div className="guideline-item">
              <span className="guideline-num">1</span>
              <p className="guideline-content">
                You <strong>MUST</strong> clear all your <strong>fee dues</strong> as per university norms.
              </p>
            </div>

            {/* Rule 2 */}
            <div className="guideline-item">
              <span className="guideline-num">2</span>
              <p className="guideline-content">
                You <strong>MUST</strong> do the registration only in the <strong>presence of your counsellor</strong> through Microsoft Teams.
              </p>
            </div>

            {/* Rule 3 (Highlighted) */}
            <div className="guideline-item guideline-item-special">
              <span className="guideline-num dark">3</span>
              <p className="guideline-content">
                Your Specialization: <strong>{specializationName || "Loading Specialization..."}</strong>
              </p>
            </div>

            {/* Rule 4 */}
            <div className="guideline-item">
              <span className="guideline-num">4</span>
              <p className="guideline-content">
                You <strong>MUST</strong> choose all courses from the same cluster.
              </p>
            </div>

            {/* Rule 5 */}
            <div className="guideline-item">
              <span className="guideline-num">5</span>
              <p className="guideline-content">
                For <strong>Cluster-1</strong> sections range from <strong>S1 to S50</strong> and for <strong>Cluster-2</strong> sections range from <strong>S51 to S100</strong>.
              </p>
            </div>

            {/* Rule 6 */}
            <div className="guideline-item">
              <span className="guideline-num">6</span>
              <p className="guideline-content">
                You <strong>MUST</strong> do the registration in ERP only referring to this portal.
              </p>
            </div>

            {/* Rule 7 */}
            <div className="guideline-item">
              <span className="guideline-num">7</span>
              <p className="guideline-content">
                You <strong>MUST</strong> click on <strong>Save in ERP</strong> as the <strong>final step</strong> of registration.
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Checkbox Box */}
        <div className="guidelines-agreement-strip">
          <label className="guidelines-checkbox-label" style={{ cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  setAgreed(!agreed);
                }
              }}
              className="guidelines-native-checkbox"
            />
            <span className={`guidelines-custom-checkbox ${agreed ? "checked" : ""}`}>
              {agreed && <Check size={14} strokeWidth={3} />}
            </span>
            <span className="guidelines-agreement-text">
              I have read and understood all the registration instructions above and agree to follow the university guidelines for course registration.
            </span>
          </label>
        </div>

        {/* Proceed Action Button */}
        <div className="guidelines-actions">
          <button
            type="button"
            disabled={!agreed}
            onClick={handleProceed}
            className={`guidelines-proceed-btn ${agreed ? "active" : "disabled"}`}
          >
            <span>Proceed</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </OverlayPortal>
  );
}
