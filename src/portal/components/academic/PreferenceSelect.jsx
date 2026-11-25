import { faculty, sectionFor, getFacultyOptionsForSubject } from "../../services/academicData";
import { Check, ChevronDown } from "lucide-react";

export default function PreferenceSelect({
  value,
  onChange,
  options,
  used = [],
  excludedIds = [],
  label,
  subjectCode,
  component = "L",
  cluster = "Cluster 2",
  sectionFilter,
  placeholder = "Select faculty member...",
  sectionHint,
}) {
  // Determine faculty pool:
  // If options passed directly, use them.
  // Otherwise, use getFacultyOptionsForSubject which orders strictly by Section Number ascending,
  // showing Section Number, Faculty Name, and Emp ID, scoped to sectionFilter if provided.
  const facultyPool = options && Array.isArray(options)
    ? options
    : (() => {
        let allocatedOptions = getFacultyOptionsForSubject(subjectCode, component, cluster, sectionFilter);
        if (allocatedOptions.length === 0 && sectionFilter) {
          allocatedOptions = getFacultyOptionsForSubject(subjectCode, component, null, sectionFilter);
        }
        if (allocatedOptions.length === 0) {
          allocatedOptions = getFacultyOptionsForSubject(subjectCode, component, cluster);
        }
        if (allocatedOptions.length === 0) {
          allocatedOptions = getFacultyOptionsForSubject(subjectCode, component, null);
        }
        return allocatedOptions;
      })();

  const selectedFaculty = value ? faculty.find((f) => f.id === value) || facultyPool.find((f) => f.id === value) : null;
  const sectionText = value ? (selectedFaculty?.section_id || sectionFor(subjectCode, value, component, cluster)) : "";

  // Combine used and excludedIds
  const unavailableIds = [...(used || []), ...(excludedIds || [])];

  return (
    <div className={`preference-select-card ${value ? "is-selected" : ""}`}>
      {label && (
        <div className="pref-label-row">
          <span className="pref-rank-title">{label}</span>
          {value && (
            <span className="pref-saved-pill">
              <Check size={12} />
              <span>Preference Saved</span>
            </span>
          )}
        </div>
      )}

      <div className="pref-dropdown-container">
        <select
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="pref-native-select"
        >
          <option value="">{placeholder}</option>
          {facultyPool.map((person) => {
            const isUsed = unavailableIds.includes(person.id) && person.id !== value;
            const labelText = person.displayLabel || `${person.section_id || "Section"} • ${person.name} (Emp ID: ${person.emp_id || person.id})`;
            return (
              <option
                key={`${person.id}-${person.section_id || ''}`}
                value={person.id}
                disabled={isUsed}
              >
                {labelText}{isUsed ? " — Already chosen" : ""}
              </option>
            );
          })}
        </select>
        <ChevronDown size={16} className="pref-select-arrow" />
      </div>

      <div className="pref-meta-row">
        {selectedFaculty ? (
          <div className="pref-details">
            <strong>{selectedFaculty.designation || "Faculty Member"}</strong>
            <span>Section {sectionText} • Emp ID: {selectedFaculty.emp_id || selectedFaculty.id}</span>
          </div>
        ) : (
          <span className="pref-placeholder-hint">Select a faculty to assign preference</span>
        )}
      </div>

      {sectionHint && <em className="preference-section-hint">{sectionHint}</em>}
    </div>
  );
}
