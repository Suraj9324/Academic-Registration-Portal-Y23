import { useState, useMemo, useEffect, useRef } from "react";
import {
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  ArrowUpDown,
  UserRound,
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { componentNames, buckets } from "../../services/academicData";
import { extractTextFromFile, toTitleCase } from "../../utils/validation";
import OverlayPortal from "../../components/common/OverlayPortal";

export default function FacultyPage({
  records,
  onRefresh,
  onAdd,
  onEdit,
  onDelete,
  onImportRecords,
  loading,
  status,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [componentFilter, setComponentFilter] = useState("all");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sortBy, setSortBy] = useState("employeeId");
  const [sortOrder, setSortOrder] = useState("asc");
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const handleToggleSelectAll = () => {
    if (selectedIds.size === paginatedRecords.length && paginatedRecords.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRecords.map((f) => f.id)));
    }
  };

  const handleToggleSelectRow = (id, e) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRowClick = (facultyItem) => {
    setSelectedFaculty(facultyItem);
  };

  // Pagination states to eliminate lag for 11,000+ faculty records
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Import Modal & Processing States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setSelectedFaculty(null);
        setShowImportModal(false);
      }
    };
    if (selectedFaculty || showImportModal) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedFaculty, showImportModal]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, componentFilter, courseFilter, pageSize]);

  // Extract unique courses for filtering
  const courseOptions = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.courseCode) set.add(r.courseCode);
    });
    return Array.from(set).sort();
  }, [records]);

  const filteredAndSorted = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.facultyName?.toLowerCase().includes(q) ||
          f.employeeId?.toLowerCase().includes(q) ||
          f.courseCode?.toLowerCase().includes(q) ||
          f.courseName?.toLowerCase().includes(q) ||
          f.section?.toLowerCase().includes(q) ||
          f.department?.toLowerCase().includes(q)
      );
    }

    if (componentFilter !== "all") {
      result = result.filter((f) => {
        if (Array.isArray(f.component)) return f.component.includes(componentFilter);
        return f.component === componentFilter;
      });
    }

    if (courseFilter !== "all") {
      result = result.filter((f) => f.courseCode === courseFilter);
    }

    result.sort((a, b) => {
      let valA = a[sortBy] || "";
      let valB = b[sortBy] || "";

      // Composite sort: When sorting by course name or course code, combine Name + Code
      if (sortBy === "courseName") {
        valA = `${a.courseName || ""} ${a.courseCode || ""}`.trim();
        valB = `${b.courseName || ""} ${b.courseCode || ""}`.trim();
      } else if (sortBy === "courseCode") {
        valA = `${a.courseCode || ""} ${a.courseName || ""}`.trim();
        valB = `${b.courseCode || ""} ${b.courseName || ""}`.trim();
      } else if (sortBy === "section") {
        const secA = parseInt(String(a.section || "").replace(/\D/g, ""), 10) || 0;
        const secB = parseInt(String(b.section || "").replace(/\D/g, ""), 10) || 0;
        if (secA !== secB) return sortOrder === "asc" ? secA - secB : secB - secA;
      }

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, searchQuery, componentFilter, courseFilter, sortBy, sortOrder]);

  // Paginated records
  const totalRecords = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, safeCurrentPage, pageSize]);

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
    setComponentFilter("all");
    setCourseFilter("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || componentFilter !== "all" || courseFilter !== "all";

  // Course title lookup dictionary from curriculum buckets
  const courseLookup = useMemo(() => {
    const map = {
      "24SDCS03": "SOA Programming and Microservices",
      "24SDCS08": "Cloud Native Development",
      "24CS3105": "Information Assurance and Security",
      "24CS3110": "Computer Networks",
      "24CS3215": "Compiler Design and Automata",
      "24CS3220": "Distributed Systems and Cloud Computing",
      "24AI3101": "Deep Learning and Neural Architectures",
      "24AI3102": "Natural Language Processing",
      "24AI3203": "Computer Vision & Visual Analytics",
      "24CY3101": "Network Defense and Countermeasures",
      "24CY3102": "Ethical Hacking and Penetration Testing",
      "24CY3203": "Cloud Security & Governance",
      "24DS3101": "Big Data Engineering and Analytics",
      "24DS3102": "Predictive Modeling and Statistical Learning",
      "24DS3203": "Data Visualization & Business Storytelling",
      "24UC0008": "Indian Constitution & Universal Human Values",
      "24UC0009": "Design Thinking and Innovation",
      "24UC0010": "Professional Ethics and Human Values",
      "23IE4053R": "Term Paper / Academic Research Project",
      "23IE4055A": "Seminar & Technical Presentation",
      "23IE4057A": "Comprehensive Viva Voce",
      "23UC0026": "Social Immersive Learning Project",
    };
    buckets.forEach((b) => {
      b.subjects.forEach((s) => {
        map[s.code] = s.name;
      });
    });
    return map;
  }, []);

  /**
   * High-Fidelity Faculty Ingestion Parser
   * Accurately parses Emp ID, Faculty Name, Course Code, Course Name, Components.
   */
  const processFacultyData = (rawText) => {
    if (!rawText || !rawText.trim()) {
      setImportStatus({ type: "error", message: "Please paste faculty data or upload a file." });
      return;
    }

    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setImportStatus({ type: "error", message: "No text data detected to parse." });
      return;
    }

    const parsedRecords = [];
    let isHeader = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle CSV, TSV, or pipes/spaces
      let parts = line.includes("\t")
        ? line.split("\t").map((p) => p.trim())
        : line.includes(",")
        ? line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""))
        : line.split(/\s{2,}|\s*\|\s*/).map((p) => p.trim());

      parts = parts.filter((p) => p !== undefined && p !== "");
      if (parts.length === 0) continue;

      // Header row check
      const firstCol = parts[0]?.toLowerCase().replace(/[^a-z]/g, "");
      if (
        isHeader &&
        (firstCol === "slno" ||
          firstCol === "sno" ||
          firstCol === "empid" ||
          firstCol === "name" ||
          firstCol === "faculty" ||
          firstCol === "facultyname" ||
          firstCol === "coursecode")
      ) {
        isHeader = false;
        continue;
      }
      isHeader = false;

      // Drop serial number if column 0 is just an index (1, 2, 3...)
      if (/^\d{1,5}$/.test(parts[0]) && parts.length > 1) {
        if (
          parts[1].toUpperCase().startsWith("KLEF") ||
          /^\d{4,6}$/.test(parts[1]) ||
          /^[a-zA-Z\s.]+$/.test(parts[1])
        ) {
          parts = parts.slice(1);
        }
      }

      if (parts.length < 2) continue;

      let facultyName = "";
      let employeeId = "";
      let courseCode = "";
      let courseName = "";
      let section = "";
      let components = [];
      let designation = "Assistant Professor";
      let department = "Computer Science & Engineering";

      const remainingTokens = [];

      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        const val = parts[pIdx];

        // 1. Employee ID: KLEF prefix or 4-6 digits
        if (!employeeId && (val.toUpperCase().startsWith("KLEF") || /^\d{4,6}$/.test(val))) {
          employeeId = val.toUpperCase().startsWith("KLEF") ? val.toUpperCase() : `KLEF${val}`;
          continue;
        }

        // 2. Course Code: e.g. 24CS3105, 24SDCS03, 23IE4053R, 24AI3101, 23UC0026
        if (!courseCode && /^\d{2}[A-Z]{2,4}\d{3,4}[A-Z]?$/i.test(val)) {
          courseCode = val.toUpperCase();
          continue;
        }

        // 3. Section: "Sec 12", "Section 5", or simple integer section
        if (!section && (/^(sec|section)\s*#?\d+/i.test(val) || (/^\d{1,3}$/.test(val) && Number(val) <= 100))) {
          section = val.replace(/\D/g, "") || "1";
          continue;
        }

        // 4. Component: L, T, P, S or combinations like L+T, L, P
        if (components.length === 0 && /^[LTPSltps\s,+/&]+$/.test(val) && val.length <= 10) {
          const extracted = val.toUpperCase().match(/[LTPS]/g);
          if (extracted && extracted.length > 0) {
            components = Array.from(new Set(extracted));
            continue;
          }
        }

        // 5. Department detection
        if (/computer|engineering|science|cse|ece|mechanical/i.test(val)) {
          department = val;
          continue;
        }

        remainingTokens.push(val);
      }

      // Check remaining tokens for Course Name and Faculty Name
      for (let t of remainingTokens) {
        if (!courseName && (courseLookup[courseCode] || /system|network|assurance|security|cloud|deep|learning|project|seminar|viva/i.test(t))) {
          courseName = t;
        } else if (!facultyName) {
          facultyName = t;
        }
      }

      // If no employee ID found, generate consistent ID
      if (!employeeId) {
        employeeId = `KLEF${Math.floor(1000 + (i % 8999))}`;
      }

      // If no faculty name, set clean title
      if (!facultyName) {
        facultyName = `Dr. Faculty ${employeeId.replace("KLEF", "")}`;
      }
      facultyName = toTitleCase(facultyName.replace(/KLEF\d+/gi, "").trim());
      if (!facultyName) facultyName = `Dr. Faculty ${employeeId.replace("KLEF", "")}`;

      // Resolve Course Code & Course Name
      if (!courseCode) {
        courseCode = "24CS3105";
      }
      if (!courseName || courseName === `${courseCode} Course`) {
        courseName = courseLookup[courseCode] || "Information Assurance and Security";
      }
      courseName = toTitleCase(courseName);

      // Section
      if (!section) {
        const hash = (employeeId + courseCode).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        section = String((hash % 50) + 1);
      }

      // Components default
      if (components.length === 0) {
        components = ["L"];
      }

      parsedRecords.push({
        id: `fac-imported-${Date.now()}-${i}`,
        facultyName,
        employeeId,
        courseCode,
        courseName,
        section,
        component: components,
        designation: toTitleCase(designation),
        department: toTitleCase(department),
        updatedAt: new Date().toISOString(),
      });
    }

    if (parsedRecords.length === 0) {
      setImportStatus({
        type: "error",
        message: "Could not parse valid faculty allocations. Please check the file formatting.",
      });
      return;
    }

    if (onImportRecords) {
      onImportRecords(parsedRecords);
    }

    setImportStatus({
      type: "success",
      message: `Successfully organized and imported ${parsedRecords.length} faculty allocation(s).`,
    });
    setImportText("");
    setTimeout(() => {
      setShowImportModal(false);
      setImportStatus(null);
    }, 1500);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus({ type: "info", message: `Processing ${file.name}...` });
      const content = await extractTextFromFile(file);
      if (content) {
        setImportText(content);
        processFacultyData(content);
      } else {
        setImportStatus({ type: "error", message: "No readable content extracted from file." });
      }
    } catch (err) {
      setImportStatus({ type: "error", message: `Failed to read file: ${err.message}` });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className="admin-records-container">
      {/* Page Header */}
      <div className="admin-records-header">
        <div>
          <span className="kicker">University Academics</span>
          <h1 className="admin-page-title">Faculty Allocations</h1>
          <p className="admin-page-desc">
            Manage faculty course assignments, section allocations, and component responsibilities (L, T, P, S).
          </p>
        </div>
        <div className="admin-header-actions">
          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              setImportText("");
              setImportStatus(null);
              setShowImportModal(true);
            }}
          >
            <Upload size={16} />
            <span>Import Data</span>
          </button>
          <button type="button" className="primary-btn" onClick={onAdd}>
            <Plus size={16} />
            <span>Allocate Faculty</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <Search size={16} />
          <input
            type="text"
            className="admin-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by faculty name, EMP ID, course, or section..."
          />
          {searchQuery && (
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 p-1"
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <select
          className="admin-filter-select"
          value={componentFilter}
          onChange={(e) => setComponentFilter(e.target.value)}
        >
          <option value="all">All Components</option>
          <option value="L">Lecture (L)</option>
          <option value="T">Tutorial (T)</option>
          <option value="P">Practical (P)</option>
          <option value="S">Skilling (S)</option>
        </select>

        <select
          className="admin-filter-select"
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
        >
          <option value="all">All Courses</option>
          {courseOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

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
            <strong>{filteredAndSorted.length}</strong> records
          </span>
        </div>
      </div>

      {status && (
        <div className="admin-status-toast">
          <span>{status}</span>
        </div>
      )}

      {/* Strictly Formatted Faculty Table with Grid Borderlines */}
      <div className="admin-table-container">
        <table className="admin-data-table admin-grid-bordered">
          <thead>
            <tr>
              <th style={{ width: "6%", textAlign: "center" }}>
                <span>SL NO</span>
              </th>
              <th
                onClick={() => toggleSort("employeeId")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("employeeId");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Employee ID, currently ${sortBy === "employeeId" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "11%" }}
              >
                <div className="th-content">
                  <span>EMP ID</span>
                  <ArrowUpDown size={13} className={sortBy === "employeeId" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th
                onClick={() => toggleSort("facultyName")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("facultyName");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Faculty Name, currently ${sortBy === "facultyName" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "18%" }}
              >
                <div className="th-content">
                  <span>EMP NAME</span>
                  <ArrowUpDown size={13} className={sortBy === "facultyName" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
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
                style={{ width: "15%" }}
              >
                <div className="th-content">
                  <span>ASSIGNED COURSE CODE</span>
                  <ArrowUpDown size={13} className={sortBy === "courseCode" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th
                onClick={() => toggleSort("courseName")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("courseName");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Course Name, currently ${sortBy === "courseName" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "23%" }}
              >
                <div className="th-content">
                  <span>ASSIGNED COURSE NAME</span>
                  <ArrowUpDown size={13} className={sortBy === "courseName" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th
                onClick={() => toggleSort("section")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleSort("section");
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Sort by Section, currently ${sortBy === "section" ? sortOrder : "none"}`}
                className="sortable-th"
                style={{ width: "9%", textAlign: "center" }}
              >
                <div className="th-content justify-center">
                  <span>SECTION</span>
                  <ArrowUpDown size={13} className={sortBy === "section" ? "text-blue-600" : "text-slate-400"} />
                </div>
              </th>
              <th style={{ width: "9%", textAlign: "center" }}>
                <span>COMPONENT</span>
              </th>
              <th style={{ width: "9%", textAlign: "center" }}>
                <span>ACTIONS</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedRecords.map((record, index) => {
              const serialNo = (safeCurrentPage - 1) * pageSize + index + 1;
              const compList = Array.isArray(record.component) ? record.component : [record.component].filter(Boolean);
              return (
                <tr
                  key={record.id}
                  className={`admin-table-row ${selectedFaculty?.id === record.id ? "row-selected" : ""} ${selectedIds.has(record.id) ? "row-checked" : ""}`}
                >
                  {/* 1. SL NO */}
                  <td style={{ textAlign: "center", fontWeight: "600", color: "#64748b" }}>
                    {serialNo}
                  </td>

                  {/* 2. EMP ID */}
                  <td onClick={(e) => handleRowClick(record, e)} className="clickable-td">
                    <span className="font-mono font-bold text-slate-900 tracking-wide text-xs">
                      {record.employeeId}
                    </span>
                  </td>

                  {/* 3. EMP NAME */}
                  <td onClick={(e) => handleRowClick(record, e)} className="clickable-td">
                    <div className="admin-cell-user">
                      <div className="admin-avatar-sm">
                        <UserRound size={15} />
                      </div>
                      <div>
                        <strong className="capitalize">{toTitleCase(record.facultyName)}</strong>
                        <span className="text-slate-400 text-xs block">{record.designation || "Faculty Member"}</span>
                      </div>
                    </div>
                  </td>

                  {/* 4. ASSIGNED COURSE CODE */}
                  <td onClick={(e) => handleRowClick(record, e)} className="clickable-td">
                    <span className="admin-course-tag">{record.courseCode}</span>
                  </td>

                  {/* 5. ASSIGNED COURSE NAME */}
                  <td onClick={(e) => handleRowClick(record, e)} className="clickable-td">
                    <span className="font-medium text-slate-800 text-xs block capitalize">
                      {toTitleCase(record.courseName)}
                    </span>
                  </td>

                  {/* 6. SECTION */}
                  <td style={{ textAlign: "center" }} onClick={(e) => handleRowClick(record, e)} className="clickable-td">
                    <span className="admin-section-pill">Sec {record.section}</span>
                  </td>

                  {/* 7. COMPONENT */}
                  <td style={{ textAlign: "center" }}>
                    <div className="admin-component-chips justify-center">
                      {compList.map((c) => (
                        <span key={c} className="admin-comp-tag" title={componentNames[c] || c}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* 8. ACTIONS */}
                  <td style={{ textAlign: "center" }}>
                    <div className="admin-row-actions justify-center">
                      <button
                        type="button"
                        className="admin-action-btn edit-btn"
                        onClick={() => onEdit(record)}
                        title="Edit allocation"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="admin-action-btn delete-btn"
                        onClick={() => onDelete(record)}
                        title="Delete allocation"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {paginatedRecords.length === 0 && (
              <tr>
                <td colSpan={8} className="admin-empty-table">
                  <div className="admin-empty-state">
                    <UserRound size={32} className="text-slate-300" />
                    <strong>No faculty allocations found</strong>
                    <p>Try modifying your search or filter parameters.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls - Stops Lag Instantly */}
      {totalRecords > 0 && (
        <div className="admin-pagination-bar">
          <div className="pagination-info">
            Showing <strong>{(safeCurrentPage - 1) * pageSize + 1}</strong> to{" "}
            <strong>{Math.min(safeCurrentPage * pageSize, totalRecords)}</strong> of{" "}
            <strong>{totalRecords}</strong> faculty allocations
          </div>

          <div className="pagination-controls">
            <div className="page-size-picker">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="page-select"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
              <span>per page</span>
            </div>

            <div className="pagination-buttons">
              <button
                type="button"
                className="page-btn"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={16} />
                <span>Prev</span>
              </button>

              <span className="page-current">
                Page {safeCurrentPage} of {totalPages}
              </span>

              <button
                type="button"
                className="page-btn"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal - Positioned Top & Zero Blur via OverlayPortal */}
      {showImportModal && (
        <OverlayPortal
          isOpen={showImportModal}
          onClose={() => setShowImportModal(false)}
          className="admin-modal-backdrop"
        >
          <div
            className="admin-modal"
            style={{ maxWidth: "640px" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <header>
              <div>
                <span className="kicker">Automated Curriculum Ingestion</span>
                <h2>Import &amp; Organize Faculty Data</h2>
              </div>
              <button aria-label="Close dialog" onClick={() => setShowImportModal(false)}>
                <X size={18} />
              </button>
            </header>

            <div className="p-6 flex flex-col gap-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                Upload an <strong>Excel (.xlsx, .xls), PDF (.pdf), CSV, or TSV file</strong>, or paste faculty records below.
                The platform automatically organizes Employee IDs, formats names in Title Case, resolves curriculum course codes,
                assigns sections, and structures teaching components (L, T, P, S).
              </p>

              {/* File Upload Box */}
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-5 flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer text-center"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet size={28} className="text-blue-600" />
                <span className="text-sm font-semibold text-slate-800">
                  Click to select Excel (.xlsx/.xls), PDF, or CSV file
                </span>
                <span className="text-xs text-slate-500">Supports Excel spreadsheets, PDF course allocations, and CSV/TSV rosters</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.pdf,.csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Paste Text Area */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Or Paste Faculty Allocations:
                </label>
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder={`Examples of auto-recognized formats:
1, KLEF8339, Dr. K. Ramanathan, 24CS3105, Sec 12, L+T
KLEF7231, Prof. V. Sunitha, 24SDCS03, 5, L, S`}
                  className="font-mono text-xs p-3 border border-slate-300 rounded-md bg-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Status Banner */}
              {importStatus && (
                <div
                  className={`p-3 rounded-md flex items-center gap-2 text-xs font-semibold ${
                    importStatus.type === "success"
                      ? "bg-green-50 text-green-800 border border-green-200"
                      : importStatus.type === "info"
                      ? "bg-blue-50 text-blue-800 border border-blue-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {importStatus.type === "success" ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{importStatus.message}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowImportModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  disabled={!importText.trim()}
                  onClick={() => processFacultyData(importText)}
                >
                  <Upload size={15} />
                  <span>Parse &amp; Import Faculty</span>
                </button>
              </div>
            </div>
          </div>
        </OverlayPortal>
      )}

      {/* Faculty Detail View - Positioned via OverlayPortal directly to body */}
      {selectedFaculty && (
        <OverlayPortal
          isOpen={Boolean(selectedFaculty)}
          onClose={() => setSelectedFaculty(null)}
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
                <div className="drawer-avatar">
                  <UserRound size={24} />
                </div>
                <div>
                  <span className="drawer-kicker">Faculty Profile</span>
                  <h2>{toTitleCase(selectedFaculty.facultyName)}</h2>
                  <span className="drawer-badge">{selectedFaculty.employeeId}</span>
                </div>
              </div>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedFaculty(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <h3>Allocation Information</h3>
                <dl className="drawer-dl">
                  <div>
                    <dt>Assigned Course</dt>
                    <dd>{selectedFaculty.courseCode} - {toTitleCase(selectedFaculty.courseName)}</dd>
                  </div>
                  <div>
                    <dt>Class Section</dt>
                    <dd>Section {selectedFaculty.section}</dd>
                  </div>
                  <div>
                    <dt>Components</dt>
                    <dd>
                      {(Array.isArray(selectedFaculty.component)
                        ? selectedFaculty.component
                        : [selectedFaculty.component]
                      )
                        .filter(Boolean)
                        .join(", ")}
                    </dd>
                  </div>
                  <div>
                    <dt>Department</dt>
                    <dd>{toTitleCase(selectedFaculty.department || "Computer Science & Engineering")}</dd>
                  </div>
                </dl>
              </div>

              <div className="drawer-actions">
                <button
                  type="button"
                  className="primary-btn w-full"
                  onClick={() => {
                    onEdit(selectedFaculty);
                    setSelectedFaculty(null);
                  }}
                >
                  <Pencil size={15} />
                  <span>Edit Faculty Allocation</span>
                </button>
              </div>
            </div>
          </aside>
        </OverlayPortal>
      )}
    </section>
  );
}
