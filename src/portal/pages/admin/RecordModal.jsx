import { useEffect } from "react";
import { Save, X, PlusCircle, Edit3 } from "lucide-react";
import OverlayPortal from "../../components/common/OverlayPortal";

export default function RecordModal({
  editing,
  active,
  singularLabel,
  fields,
  form,
  setForm,
  buckets,
  onSave,
  onClose,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isNew = editing === "new";

  return (
    <OverlayPortal isOpen={Boolean(editing)} onClose={onClose} className="clean-popup-backdrop">
      <section
        className="clean-popup-card"
        style={{ width: "min(780px, 94vw)" }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="clean-popup-header">
          <div className="clean-popup-header-icon">
            {isNew ? <PlusCircle size={20} className="text-white" /> : <Edit3 size={20} className="text-white" />}
          </div>
          <div className="clean-popup-header-text">
            <h3>{isNew ? `Add New ${singularLabel}` : `Edit ${singularLabel}`}</h3>
            <p>{isNew ? "Enter institutional record details to create a new entry" : "Modify existing record information and attributes"}</p>
          </div>
          <button
            className="clean-popup-close-btn"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={onSave} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
          <div className="clean-popup-body" style={{ flex: 1, overflowY: "auto" }}>
            <div className="admin-form-grid">
              {(fields || []).map(([key, label, type, required, readOnly, options]) => (
                <label key={key} className={type === "textarea" ? "wide" : ""}>
                  <span>
                    {label}
                    {required && " *"}
                  </span>

                  {type === "select" || type === "bucket" ? (
                    <select
                      required={required}
                      disabled={readOnly}
                      value={form[key] || ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    >
                      <option value="">Select an option</option>
                      {(type === "bucket"
                        ? buckets.map((bucket) => [bucket.id, `${bucket.code} · ${bucket.title}`])
                        : options.map((option) => [option, option])
                      ).map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                  ) : type === "multiselect" ? (
                    <div className="admin-check-row">
                      {options.map((option) => (
                        <label key={option}>
                          <input
                            type="checkbox"
                            checked={(form[key] || []).includes(option)}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                [key]: e.target.checked
                                  ? [...(form[key] || []), option]
                                  : (form[key] || []).filter((item) => item !== option),
                              })
                            }
                          />
                          {option}
                        </label>
                      ))}
                    </div>
                  ) : type === "textarea" ? (
                    <textarea
                      value={form[key] || ""}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  ) : type === "checkbox" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(form[key])}
                      onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    />
                  ) : (
                    <input
                      type={type}
                      required={required}
                      disabled={readOnly}
                      value={form[key] || ""}
                      maxLength={key === "username" ? 10 : undefined}
                      onChange={(e) => {
                        const value = key === "username" ? e.target.value.replace(/\D/g, "") : e.target.value;
                        setForm({
                          ...form,
                          [key]: value,
                          ...(key === "username" ? { universityEmail: value ? `${value}@kluniversity.in` : "" } : {}),
                        });
                      }}
                    />
                  )}
                </label>
              ))}
            </div>

            {active === "Students" && (
              <p className="admin-form-note" style={{ margin: 0 }}>
                Default password corresponds to the student’s Date of Birth (YYYY-MM-DD). University email is automatically generated from the 10-digit Student ID.
              </p>
            )}
          </div>

          <footer className="clean-popup-footer">
            <button type="button" className="clean-popup-btn-dismiss" onClick={onClose}>
              Cancel
            </button>
            <button className="clean-popup-btn-action" type="submit">
              <Save size={15} />
              <span>Save Record</span>
            </button>
          </footer>
        </form>
      </section>
    </OverlayPortal>
  );
}
