import { useState, useMemo, useEffect } from "react";
import OverlayPortal from "../../components/common/OverlayPortal";
import {
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  BookOpen,
  ArrowUpDown,
  X,
  Layers,
  Award,
  ChevronRight,
} from "lucide-react";

export default function CoursesPage({
  records,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
  loading,
  status,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [bucketFilter, setBucketFilter] = useState("all");
  const [creditsFilter, setCreditsFilter] = useState("all");
  const [sortBy, setSortBy] = useState("courseCode");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedCourse, setSelectedCourse] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedCourse(null);
      }
    };
    if (selectedCourse) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedCourse]);

  // Extract unique buckets and credit options for filters
  const bucketOptions = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      const b = typeof r.bucket === "object" ? r.bucket?.code || r.bucket?.id : r.bucket;
      if (b) set.add(b);
    });
    return Array.from(set).sort();
  }, [records]);

  const creditOptions = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.credits !== undefined && r.credits !== null) set.add(r.credits);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [records]);

  const filteredAndSorted = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.courseCode?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.prerequisite?.toLowerCase().includes(q)
      );
    }

    if (bucketFilter !== "all") {
      result = result.filter((c) => {
        const b = typeof c.bucket === "object" ? c.bucket?.code || c.bucket?.id : c.bucket;
        return b === bucketFilter;
      });
    }

    if (creditsFilter !== "all") {
      result = result.filter((c) => String(c.credits) === String(creditsFilter));
    }

    result.sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, searchQuery, bucketFilter, creditsFilter, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setBucketFilter("all");
    setCreditsFilter("all");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || bucketFilter !== "all" || creditsFilter !== "all";

  return (
    <section className="admin-records-container">
      {/* Header and Add Action */}
      <div className="admin-records-header">
        <div>
          <span className="kicker">Academic Curriculum</span>
          <h1 className="admin-page-title">Course Catalog</h1>
          <p className="admin-page-desc">
            Organize academic curriculum offerings, teaching hour allocations (L-T-P-S), and course prerequisites.
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={onAdd}>
          <Plus size={16} />
          <span>Add Course</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by code, title, or prerequisite…"
            className="admin-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600"
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="admin-select-filter">
          <select
            value={bucketFilter}
            onChange={(e) => setBucketFilter(e.target.value)}
            className="admin-filter-select"
          >
            <option value="all">All Buckets</option>
            {bucketOptions.map((b) => (
              <option key={b} value={b}>
                Bucket {b}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-select-filter">
          <select
            value={creditsFilter}
            onChange={(e) => setCreditsFilter(e.target.value)}
            className="admin-filter-select"
          >
            <option value="all">All Credits</option>
            {creditOptions.map((cr) => (
              <option key={cr} value={cr}>
                {cr} Credits
              </option>
            ))}
          </select>
        </div>

        <div className="admin-filter-meta">
          {hasActiveFilters && (
            <button type="button" className="admin-clear-filter-btn" onClick={clearFilters}>
              Reset filters
            </button>
          )}
          <button type="button" className="secondary-btn btn-sm" onClick={onRefresh}>
            <RefreshCcw size={14} />
            <span>Refresh</span>
          </button>
          <span className="admin-record-counter">
            <strong>{filteredAndSorted.length}</strong> of {records.length} courses
          </span>
        </div>
      </div>

      {status && (
        <div className="admin-status-toast">
          <span>{status}</span>
        </div>
      )}

      {/* Course Data Table */}
      <div className="admin-table-container">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th
                onClick={() => toggleSort("courseCode")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("courseCode");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Course Code, currently ${sortBy === "courseCode" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "16%" }}
              >
                <div className="th-content">
                  <span>Course Code</span>
                  <ArrowUpDown size={13} className={sortBy === "courseCode" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th
                onClick={() => toggleSort("name")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("name");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Course Name, currently ${sortBy === "name" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "32%" }}
              >
                <div className="th-content">
                  <span>Course Name</span>
                  <ArrowUpDown size={13} className={sortBy === "name" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th
                onClick={() => toggleSort("bucket")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("bucket");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Bucket, currently ${sortBy === "bucket" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "14%" }}
              >
                <div className="th-content">
                  <span>Bucket</span>
                  <ArrowUpDown size={13} className={sortBy === "bucket" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th
                onClick={() => toggleSort("credits")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("credits");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Credits, currently ${sortBy === "credits" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "12%" }}
              >
                <div className="th-content">
                  <span>Credits</span>
                  <ArrowUpDown size={13} className={sortBy === "credits" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th style={{ width: "16%" }}>Hours (L-T-P-S)</th>
              <th style={{ width: "10%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((record) => {
              const bucketCode = typeof record.bucket === "object" ? record.bucket?.code || record.bucket?.id : record.bucket;
              const compList = Array.isArray(record.components) ? record.components : [record.components].filter(Boolean);

              return (
                <tr
                  key={record.id}
                  className={`admin-table-row ${selectedCourse?.id === record.id ? "row-selected" : ""}`}
                >
                  <td
                    onClick={() => setSelectedCourse(record)}
                    className="clickable-cell"
                  >
                    <span className="subject-code-tag">{record.courseCode}</span>
                  </td>
                  <td onClick={() => setSelectedCourse(record)} className="clickable-cell">
                    <div className="counselor-cell-info">
                      <strong>{record.name}</strong>
                      {record.prerequisite && (
                        <small className="text-slate-500">Prereq: {record.prerequisite}</small>
                      )}
                    </div>
                  </td>
                  <td onClick={() => setSelectedCourse(record)} className="clickable-cell">
                    <span className="badge-cluster bg-amber-50 text-amber-800 border border-amber-200">
                      Bucket {bucketCode}
                    </span>
                  </td>
                  <td onClick={() => setSelectedCourse(record)} className="clickable-cell">
                    <span className="badge-residency bg-blue-50 text-blue-700 border-blue-200 font-bold">
                      {record.credits} Credits
                    </span>
                  </td>
                  <td onClick={() => setSelectedCourse(record)} className="clickable-cell">
                    <div className="cluster-tag-group">
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {record.lectureHours || 0}–{record.tutorialHours || 0}–{record.practicalHours || 0}–{record.skillHours || 0}
                      </span>
                      {compList.map((c) => (
                        <span key={c} className="badge-component-tag">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="admin-actions-cell">
                      <button
                        type="button"
                        aria-label="View course details"
                        title="View Course Details"
                        className="admin-action-icon-btn"
                        onClick={() => setSelectedCourse(record)}
                      >
                        <BookOpen size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Edit course"
                        title="Edit Course"
                        className="admin-action-icon-btn"
                        onClick={() => onEdit(record)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete course"
                        title="Delete Course"
                        className="admin-action-icon-btn danger"
                        onClick={() => onDelete(record)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {loading && (
              <tr>
                <td colSpan="6" className="admin-table-empty">
                  Loading course catalog…
                </td>
              </tr>
            )}

            {!loading && !filteredAndSorted.length && (
              <tr>
                <td colSpan="6" className="admin-table-empty">
                  No courses found matching the search or filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Clean Floating Pop-Up Modal for Course Details via OverlayPortal */}
      {selectedCourse && (
        <OverlayPortal
          isOpen={Boolean(selectedCourse)}
          onClose={() => setSelectedCourse(null)}
          className="clean-popup-backdrop"
        >
          <aside
            className="clean-popup-card"
            style={{ width: "min(680px, 94vw)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="clean-popup-header">
              <div className="clean-popup-header-icon">
                <BookOpen size={20} className="text-white" />
              </div>
              <div className="clean-popup-header-text">
                <h3>{selectedCourse.name}</h3>
                <p>Course Code: {selectedCourse.courseCode} · Bucket {typeof selectedCourse.bucket === "object" ? selectedCourse.bucket?.code : selectedCourse.bucket}</p>
              </div>
              <button
                type="button"
                className="clean-popup-close-btn"
                onClick={() => setSelectedCourse(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <div className="clean-popup-body">
              {/* Stat / Metric Pills */}
              <div className="clean-popup-pill-grid">
                <div className="clean-popup-pill-card active-blue">
                  <span className="clean-popup-pill-label">COURSE CREDITS</span>
                  <strong className="clean-popup-pill-val">{selectedCourse.credits}</strong>
                  <span className="clean-popup-pill-desc">Total academic credit weight</span>
                </div>
                <div className="clean-popup-pill-card">
                  <span className="clean-popup-pill-label">L-T-P-S STRUCTURE</span>
                  <strong className="clean-popup-pill-val" style={{ fontSize: "17px" }}>
                    {selectedCourse.lectureHours || 0}L : {selectedCourse.tutorialHours || 0}T : {selectedCourse.practicalHours || 0}P : {selectedCourse.skillHours || 0}S
                  </strong>
                  <span className="clean-popup-pill-desc">Lecture, Tutorial, Practical &amp; Skill</span>
                </div>
              </div>

              {/* Course Detail Box */}
              <div className="clean-popup-detail-box">
                <span className="clean-popup-detail-title">SPECIFICATIONS &amp; COMPONENTS</span>

                <div className="clean-popup-detail-row">
                  <span className="clean-popup-detail-label">Teaching Components</span>
                  <span className="clean-popup-detail-value">
                    {(Array.isArray(selectedCourse.components) ? selectedCourse.components : [selectedCourse.components])
                      .filter(Boolean)
                      .join(", ") || "Lecture (L)"}
                  </span>
                </div>

                <div className="clean-popup-detail-row">
                  <span className="clean-popup-detail-label">Department</span>
                  <span className="clean-popup-detail-value">Computer Science &amp; Engineering</span>
                </div>

                <div className="clean-popup-detail-row">
                  <span className="clean-popup-detail-label">Academic Semester</span>
                  <span className="clean-popup-detail-value">Semester 8 · Even 2026–27</span>
                </div>

                {selectedCourse.prerequisite && (
                  <div className="clean-popup-detail-row">
                    <span className="clean-popup-detail-label">Prerequisites</span>
                    <span className="clean-popup-detail-value">{selectedCourse.prerequisite}</span>
                  </div>
                )}

                {selectedCourse.description && (
                  <div className="clean-popup-detail-row full-col" style={{ marginTop: "4px" }}>
                    <span className="clean-popup-detail-label">Curriculum Description</span>
                    <p style={{ margin: 0, fontSize: "12.5px", color: "#334155", lineHeight: 1.6 }}>
                      {selectedCourse.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="clean-popup-footer">
              <button
                type="button"
                className="clean-popup-btn-dismiss"
                onClick={() => setSelectedCourse(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="clean-popup-btn-action"
                onClick={() => {
                  onEdit(selectedCourse);
                  setSelectedCourse(null);
                }}
              >
                <Pencil size={15} />
                <span>Edit Course</span>
              </button>
            </div>
          </aside>
        </OverlayPortal>
      )}
    </section>
  );
}
