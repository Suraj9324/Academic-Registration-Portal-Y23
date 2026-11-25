import { useState, useMemo, useEffect } from "react";
import {
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Boxes,
  BookOpen,
  ArrowUpDown,
  X,
  Layers,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { buckets as defaultBuckets } from "../../services/academicData";
import OverlayPortal from "../../components/common/OverlayPortal";

export default function BucketsPage({
  records,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
  loading,
  status,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("sortOrder");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedBucket, setSelectedBucket] = useState(null);
  const [liveCourses, setLiveCourses] = useState([]);

  useEffect(() => {
    // Fetch live course catalog from database API
    fetch("/portal-api/courses")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data)) {
          setLiveCourses(res.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedBucket(null);
      }
    };
    if (selectedBucket) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedBucket]);

  // Map bucket code to associated curriculum courses using live DB courses with defaultBuckets fallback
  const bucketCoursesMap = useMemo(() => {
    const map = {};
    // Seed with fallback
    defaultBuckets.forEach((b) => {
      map[b.id] = b.subjects || [];
    });
    // Overlay with live courses from DB if available
    if (liveCourses.length > 0) {
      const liveMap = {};
      liveCourses.forEach((c) => {
        const bId = c.bucket_id;
        if (!liveMap[bId]) liveMap[bId] = [];
        liveMap[bId].push({
          code: c.code,
          name: c.name,
          credits: c.credits,
          components: Array.isArray(c.components) ? c.components : JSON.parse(c.components || '["L"]'),
          ltps: [c.lecture_hours || 0, c.tutorial_hours || 0, c.practical_hours || 0, c.skill_hours || 0],
          description: c.description || "",
        });
      });
      Object.keys(liveMap).forEach((bId) => {
        map[bId] = liveMap[bId];
      });
    }
    return map;
  }, [liveCourses]);

  const filteredAndSorted = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.code?.toLowerCase().includes(q) ||
          b.shortName?.toLowerCase().includes(q)
      );
    }

    if (statusFilter === "active") {
      result = result.filter((b) => b.active !== false);
    } else if (statusFilter === "inactive") {
      result = result.filter((b) => b.active === false);
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
  }, [records, searchQuery, statusFilter, sortBy, sortOrder]);

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
    setStatusFilter("all");
  };

  const hasActiveFilters = searchQuery.trim() !== "" || statusFilter !== "all";

  return (
    <section className="admin-records-container">
      {/* Header and Add Action */}
      <div className="admin-records-header">
        <div>
          <span className="kicker">Academic Structure</span>
          <h1 className="admin-page-title">Curriculum Course Buckets</h1>
          <p className="admin-page-desc">
            Define curriculum bucket categories, sequencing order, and manage student election groups for Even Semester.
          </p>
        </div>
        <button type="button" className="primary-btn" onClick={onAdd}>
          <Plus size={16} />
          <span>Add Course Bucket</span>
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
            placeholder="Search buckets by code, title, or category tag…"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-filter-select"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active in Registration</option>
            <option value="inactive">Hidden / Inactive</option>
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
            <strong>{filteredAndSorted.length}</strong> of {records.length} buckets
          </span>
        </div>
      </div>

      {status && (
        <div className="admin-status-toast">
          <span>{status}</span>
        </div>
      )}

      {/* Buckets Data Table */}
      <div className="admin-table-container">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th
                onClick={() => toggleSort("code")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("code");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Bucket Code, currently ${sortBy === "code" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "22%" }}
              >
                <div className="th-content">
                  <span>Bucket Code &amp; Tag</span>
                  <ArrowUpDown size={13} className={sortBy === "code" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th
                onClick={() => toggleSort("title")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("title");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Curriculum Title, currently ${sortBy === "title" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "32%" }}
              >
                <div className="th-content">
                  <span>Curriculum Category Title</span>
                  <ArrowUpDown size={13} className={sortBy === "title" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th
                onClick={() => toggleSort("sortOrder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("sortOrder");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Sort Order, currently ${sortBy === "sortOrder" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "16%" }}
              >
                <div className="th-content">
                  <span>Sort Order</span>
                  <ArrowUpDown size={13} className={sortBy === "sortOrder" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th style={{ width: "18%" }}>Portal Status</th>
              <th style={{ width: "12%", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.map((record) => {
              const assignedCourses = bucketCoursesMap[record.code] || [];
              const isActive = record.active !== false;

              return (
                <tr
                  key={record.id}
                  className={`admin-table-row ${selectedBucket?.id === record.id ? "row-selected" : ""}`}
                >
                  <td
                    onClick={() => setSelectedBucket(record)}
                    className="clickable-cell"
                  >
                    <div className="student-profile-cell">
                      <div className="student-avatar-badge bg-amber-50 border-amber-200 text-amber-700 font-bold">
                        {record.code}
                      </div>
                      <div>
                        <strong className="student-primary-name">{record.shortName}</strong>
                        <span className="student-secondary-id">Code: {record.code}</span>
                      </div>
                    </div>
                  </td>
                  <td onClick={() => setSelectedBucket(record)} className="clickable-cell">
                    <div className="counselor-cell-info">
                      <strong>{record.title}</strong>
                      <small>{assignedCourses.length} courses in curriculum</small>
                    </div>
                  </td>
                  <td onClick={() => setSelectedBucket(record)} className="clickable-cell">
                    <span className="badge-cluster bg-slate-100 text-slate-700 border border-slate-200">
                      Index #{record.sortOrder || 1}
                    </span>
                  </td>
                  <td onClick={() => setSelectedBucket(record)} className="clickable-cell">
                    <div className="cluster-tag-group">
                      {isActive ? (
                        <span className="badge-residency bg-emerald-50 text-emerald-700 border-emerald-200 inline-flex items-center gap-1">
                          <Eye size={12} />
                          <span>Active in Portal</span>
                        </span>
                      ) : (
                        <span className="badge-residency bg-slate-50 text-slate-500 border-slate-200 inline-flex items-center gap-1">
                          <EyeOff size={12} />
                          <span>Hidden</span>
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="admin-actions-cell">
                      <button
                        type="button"
                        aria-label="View bucket courses"
                        title="View Associated Courses"
                        className="admin-action-icon-btn"
                        onClick={() => setSelectedBucket(record)}
                      >
                        <Boxes size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Edit course bucket"
                        title="Edit Bucket"
                        className="admin-action-icon-btn"
                        onClick={() => onEdit(record)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        aria-label="Delete course bucket"
                        title="Delete Bucket"
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
                <td colSpan="5" className="admin-table-empty">
                  Loading course buckets…
                </td>
              </tr>
            )}

            {!loading && !filteredAndSorted.length && (
              <tr>
                <td colSpan="5" className="admin-table-empty">
                  No course buckets found matching the search or filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Slide-out Bucket Detail Drawer via OverlayPortal */}
      {selectedBucket && (
        <OverlayPortal
          isOpen={Boolean(selectedBucket)}
          onClose={() => setSelectedBucket(null)}
          className="student-detail-drawer-scrim"
        >
          <aside
            className="student-detail-drawer"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div className="drawer-title-group">
                <span className="kicker">Bucket Detail Profile</span>
                <h2>{selectedBucket.title}</h2>
                <span className="drawer-id-tag">Bucket Code: {selectedBucket.code}</span>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedBucket(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-content">
              {/* Section: Bucket Settings */}
              <div className="drawer-section">
                <h3>Category Settings</h3>
                <dl className="drawer-dl">
                  <div>
                    <dt>Category Tag</dt>
                    <dd>{selectedBucket.shortName}</dd>
                  </div>
                  <div>
                    <dt>Sequencing Order</dt>
                    <dd>Position #{selectedBucket.sortOrder}</dd>
                  </div>
                  <div>
                    <dt>Student Visibility</dt>
                    <dd>{selectedBucket.active !== false ? "Active & Visible" : "Hidden"}</dd>
                  </div>
                  <div>
                    <dt>Semester Context</dt>
                    <dd>Semester 8 (Even 2026–27)</dd>
                  </div>
                </dl>
              </div>

              {/* Section: Associated Courses */}
              <div className="drawer-section">
                <h3>Associated Curriculum Courses</h3>
                <div className="drawer-course-list">
                  {(bucketCoursesMap[selectedBucket.code] || []).map((course) => (
                    <div key={course.code} className="drawer-course-card">
                      <div className="drawer-course-top">
                        <span className="subject-code-tag">{course.code}</span>
                        <span className="drawer-course-credits">{course.credits} Credits</span>
                      </div>
                      <strong>{course.name}</strong>
                      <small className="text-slate-500">
                        Components: {course.components?.join(", ")} · L-T-P-S: {course.ltps?.join("–")}
                      </small>
                      {course.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2">{course.description}</p>
                      )}
                    </div>
                  ))}
                  {!(bucketCoursesMap[selectedBucket.code] || []).length && (
                    <p className="text-xs text-slate-500 italic">No courses currently mapped to this bucket.</p>
                  )}
                </div>
              </div>

              <div className="drawer-actions">
                <button
                  type="button"
                  className="primary-btn w-full"
                  onClick={() => {
                    onEdit(selectedBucket);
                    setSelectedBucket(null);
                  }}
                >
                  <Pencil size={15} />
                  <span>Edit Bucket Information</span>
                </button>
              </div>
            </div>
          </aside>
        </OverlayPortal>
      )}
    </section>
  );
}
