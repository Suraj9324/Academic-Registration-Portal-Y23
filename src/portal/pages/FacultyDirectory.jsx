import { useState, useMemo, useEffect } from "react";
import PageHeading from "../components/common/PageHeading";
import { allocations, buckets, componentNames } from "../services/academicData";
import { Search, UserRound, ArrowUpDown, Filter, BookOpen, Layers, X, Download, Users, FileText, CheckCircle2 } from "lucide-react";
import OverlayPortal from "../components/common/OverlayPortal";

export default function FacultyDirectory({ cluster, studentId, selections }) {
  const [query, setQuery] = useState("");
  const [courseCode, setCourseCode] = useState("All courses");
  const [component, setComponent] = useState("All components");
  const [facultyOrder, setFacultyOrder] = useState("asc");
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [rawDirectoryRows, setRawDirectoryRows] = useState(null);

  // Normalize active student cohort cluster (Cluster-1 or Cluster-2)
  const normalizedCluster = useMemo(() => {
    if (!cluster) return "Cluster-1";
    if (cluster === "Cluster 1" || cluster === "C1" || cluster === "Cluster-1") return "Cluster-1";
    if (cluster === "Cluster 2" || cluster === "C2" || cluster === "Cluster-2") return "Cluster-2";
    return cluster;
  }, [cluster]);

  // Fetch this student's specific academic faculty directory from live DB
  useEffect(() => {
    if (!studentId) return;
    fetch(`/portal-api/faculty?studentId=${studentId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
          setRawDirectoryRows(res.data);
        }
      })
      .catch(() => {});
  }, [studentId]);

  const allCatalogCourses = useMemo(() => {
    return buckets.flatMap((bucket) => bucket.subjects);
  }, []);

  const directoryRows = useMemo(() => {
    // If student-specific directory rows were fetched from live backend
    let baseRows = [];
    if (rawDirectoryRows && rawDirectoryRows.length > 0) {
      baseRows = rawDirectoryRows;
    } else {
      // Fallback to cluster allocations
      const clusterAllocations = allocations.filter((a) => a.cluster_id === normalizedCluster);
      const codeToBucket = {};
      buckets.forEach((b) => {
        b.subjects.forEach((s) => {
          codeToBucket[s.code] = b.id;
        });
      });

      baseRows = clusterAllocations.map((alloc) => {
        const subject = allCatalogCourses.find((item) => item.code === alloc.course_code);
        const actualCourseName = subject?.name || alloc.course_name || alloc.course_code;
        const bucketNo = codeToBucket[alloc.course_code] || alloc.bucket_id || "C0";

        return {
          bucketNo,
          courseCode: alloc.course_code,
          courseName: actualCourseName,
          sectionNumber: alloc.section_number,
          section: alloc.section_id,
          component: alloc.component,
          empId: alloc.faculty_id,
          facultyName: alloc.faculty_name || `Faculty Member (${alloc.faculty_id})`,
        };
      });
    }

    // Filter by user search query, course code, and component
    const filtered = baseRows.filter(({ facultyName, empId, section, courseCode: cCode, courseName, component: comp, bucketNo }) => {
      const text =
        `${bucketNo} ${facultyName} ${empId} ${section} ${cCode} ${courseName} ${comp} ${componentNames[comp] || ""}`.toLowerCase();
      return (
        text.includes(query.toLowerCase()) &&
        (courseCode === "All courses" || cCode === courseCode) &&
        (component === "All components" || comp === component)
      );
    });

    // Sort strictly on the basis of Bucket, then Section Number, then Delivery Component
    const multiplier = facultyOrder === "desc" ? -1 : 1;
    return filtered.sort((a, b) => {
      return (
        a.bucketNo.localeCompare(b.bucketNo, undefined, { numeric: true }) ||
        (a.sectionNumber - b.sectionNumber) ||
        a.component.localeCompare(b.component) ||
        (multiplier * a.facultyName.localeCompare(b.facultyName))
      );
    });
  }, [rawDirectoryRows, normalizedCluster, allCatalogCourses, query, courseCode, component, facultyOrder]);

  const courses = useMemo(() => {
    const map = new Map();
    const source = rawDirectoryRows && rawDirectoryRows.length > 0 ? rawDirectoryRows : directoryRows;
    source.forEach((r) => {
      if (!map.has(r.courseCode)) {
        map.set(r.courseCode, { code: r.courseCode, name: r.courseName });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [rawDirectoryRows, directoryRows]);

  const hasActiveFilters = query.trim() !== "" || courseCode !== "All courses" || component !== "All components";

  // Export faculty data to PDF (mode: 'student' or 'entire')
  const handleDownloadPdf = async (mode = "student") => {
    if (isExporting) return;
    setIsExporting(true);
    setShowExportModal(false);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTableModule = await import("jspdf-autotable");
      const autoTable = autoTableModule.default || autoTableModule;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const today = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });

      let targetRows = [];
      let isEntire = mode === "entire";

      if (isEntire) {
        // Compile entire faculty allocations across Cluster 1 and Cluster 2
        const codeToBucket = {};
        buckets.forEach((b) => {
          b.subjects.forEach((s) => {
            codeToBucket[s.code] = b.id;
          });
        });

        targetRows = allocations.map((alloc) => {
          const subject = allCatalogCourses.find((item) => item.code === alloc.course_code);
          const actualCourseName = subject?.name || alloc.course_name || alloc.course_code;
          const bucketNo = codeToBucket[alloc.course_code] || alloc.bucket_id || "C0";

          return {
            bucketNo,
            courseCode: alloc.course_code,
            courseName: actualCourseName,
            sectionNumber: alloc.section_number,
            component: alloc.component,
            empId: alloc.faculty_id,
            facultyName: alloc.faculty_name || `Faculty Member (${alloc.faculty_id})`,
          };
        }).sort((a, b) => {
          return (
            a.bucketNo.localeCompare(b.bucketNo, undefined, { numeric: true }) ||
            (a.sectionNumber - b.sectionNumber) ||
            a.component.localeCompare(b.component) ||
            a.facultyName.localeCompare(b.facultyName)
          );
        });
      } else {
        targetRows = directoryRows;
      }

      // Build table rows (7 columns: BUCKET NO., COURSE CODE, NAME OF THE COURSE, SECTION NUMBER, DELIVERY COMPONENT, EMP ID, NAME OF THE FACULTY)
      const tableRows = targetRows.map((r) => [
        r.bucketNo,
        r.courseCode,
        r.courseName,
        r.sectionNumber,
        r.component,
        r.empId,
        r.facultyName,
      ]);

      const subTitleText = isEntire
        ? "Academic Semester 8 · Master Faculty Allocation Directory (Clusters 1 & 2)"
        : `Academic Semester 8 · Faculty Allocation Directory (${studentId || "Student"})`;

      autoTable(doc, {
        startY: 35,
        head: [["BUCKET NO.", "COURSE CODE", "NAME OF THE COURSE", "SECTION NUMBER", "DELIVERY COMPONENT", "EMP ID", "NAME OF THE FACULTY"]],
        body: tableRows,
        theme: "grid",
        tableLineColor: [217, 210, 195],
        tableLineWidth: 0.2,
        headStyles: {
          fillColor: [38, 54, 74], // #26364A Top Header Navy
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
          halign: "left",
          lineColor: [217, 210, 195],
          lineWidth: 0.2,
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [28, 25, 23],
          fillColor: [253, 248, 238], // Website wash background (#FDF8EE)
          lineColor: [231, 223, 207], // Soft matching warm borders
          lineWidth: 0.15,
          rowPageBreak: "avoid",
        },
        alternateRowStyles: {
          fillColor: [247, 240, 225], // Subtle warm alternation (#F7F0E1)
        },
        columnStyles: {
          0: { cellWidth: 18 },
          1: { cellWidth: 26 },
          2: { cellWidth: 54 },
          3: { cellWidth: 20 },
          4: { cellWidth: 18 },
          5: { cellWidth: 20 },
          6: { cellWidth: 38, fontStyle: "bold" },
        },
        margin: { left: 8, right: 8, bottom: 16 },
        willDrawPage: (data) => {
          // Paint entire canvas in website background wash before content draws
          doc.setFillColor(253, 248, 238);
          doc.rect(0, 0, doc.internal.pageSize.width, doc.internal.pageSize.height, "F");

          if (data.pageNumber === 1) {
            doc.setFillColor(38, 54, 74); // #26364A
            doc.rect(0, 0, doc.internal.pageSize.width, 24, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(14);
            doc.setTextColor(255, 255, 255);
            doc.text("Koneru Lakshmaiah Education Foundation", 14, 11);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(190, 205, 225);
            doc.text(subTitleText, 14, 18);

            doc.setFontSize(8);
            doc.setTextColor(115, 115, 115);
            doc.text(`Generated on: ${today}  |  Total Allocations: ${targetRows.length}`, 14, 31);
          }
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFontSize(7.5);
          doc.setTextColor(120, 113, 108);
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}  ·  KLEF Academic Registration Portal`,
            14,
            doc.internal.pageSize.height - 8
          );
        },
      });

      const exportFileName = isEntire
        ? "KLEF-Faculty-Directory.pdf"
        : (studentId ? `KLEF-Faculty-Directory-${studentId}.pdf` : "KLEF-Faculty-Directory.pdf");
      doc.save(exportFileName);
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="faculty-directory-page">
      <PageHeading
        title="Faculty Information"
        description="Search and inspect faculty allocations, teaching components (L, T, P, S), and section distributions across all offered semester courses."
        aside={
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="faculty-download-icon-btn"
              onClick={() => setShowExportModal(true)}
              disabled={isExporting}
              title="Download faculty directory PDF options"
              aria-label="Download faculty directory PDF options"
            >
              <Download size={18} />
            </button>
          </div>
        }
      />

      {/* Directory Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-box">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search by faculty name, EMP ID, or course…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="admin-search-input"
          />
          {query && (
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600"
              onClick={() => setQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="admin-select-filter">
          <select
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value)}
            className="admin-filter-select"
          >
            <option value="All courses">All Courses</option>
            {courses.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} · {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-select-filter">
          <select
            value={component}
            onChange={(e) => setComponent(e.target.value)}
            className="admin-filter-select"
          >
            <option value="All components">All Components (L, T, P, S)</option>
            {Object.entries(componentNames).map(([key, name]) => (
              <option key={key} value={key}>
                {key} — {name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-select-filter">
          <select
            value={facultyOrder}
            onChange={(e) => setFacultyOrder(e.target.value)}
            className="admin-filter-select"
          >
            <option value="asc">Name · A → Z</option>
            <option value="desc">Name · Z → A</option>
          </select>
        </div>

        <div className="admin-filter-meta">
          {hasActiveFilters && (
            <button
              type="button"
              className="admin-clear-filter-btn"
              onClick={() => {
                setQuery("");
                setCourseCode("All courses");
                setComponent("All components");
              }}
            >
              Reset filters
            </button>
          )}
          <span className="admin-record-counter">
            {directoryRows.length} {directoryRows.length === 1 ? "Record" : "Records"}
          </span>
        </div>
      </div>

      {/* Directory Table */}
      <div className="admin-table-container">
        <table className="admin-data-table">
          <thead>
            <tr>
              <th style={{ width: "10%" }}>BUCKET NO.</th>
              <th style={{ width: "14%" }}>COURSE CODE</th>
              <th style={{ width: "26%" }}>NAME OF THE COURSE</th>
              <th style={{ width: "12%" }}>SECTION NUMBER</th>
              <th style={{ width: "10%" }}>DELIVERY COMPONENT</th>
              <th style={{ width: "10%" }}>EMP ID</th>
              <th style={{ width: "18%" }}>NAME OF THE FACULTY</th>
            </tr>
          </thead>
          <tbody>
            {directoryRows.map((r) => (
              <tr key={`${r.bucketNo}-${r.courseCode}-${r.sectionNumber}-${r.component}-${r.empId}`} className="admin-table-row">
                <td>
                  <span className="font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {r.bucketNo}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-xs text-blue-700 font-semibold">
                    {r.courseCode}
                  </span>
                </td>
                <td>
                  <span className="text-xs text-slate-800 font-medium">{r.courseName}</span>
                </td>
                <td>
                  <span className="font-semibold text-slate-800 text-xs">
                    {r.sectionNumber} <span className="text-slate-400 font-normal">({r.section})</span>
                  </span>
                </td>
                <td>
                  <span className="badge-component-tag" title={componentNames[r.component] || r.component}>
                    {r.component}
                  </span>
                </td>
                <td>
                  <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                    {r.empId}
                  </span>
                </td>
                <td>
                  <strong className="text-slate-900 font-semibold text-xs">{r.facultyName}</strong>
                </td>
              </tr>
            ))}

            {!directoryRows.length && (
              <tr>
                <td colSpan={7} className="admin-table-empty">
                  No faculty allocations match your active search or filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Export Options Pop-up via OverlayPortal */}
      {showExportModal && (
        <OverlayPortal
          isOpen={true}
          onClose={() => setShowExportModal(false)}
          className="clean-popup-backdrop"
        >
          <div className="clean-popup-card animate-in zoom-in-95 duration-150 max-w-lg w-full p-6 bg-white rounded-2xl shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Faculty Directory Export</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Choose your preferred export scope</p>
                </div>
              </div>
              <button
                type="button"
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                onClick={() => setShowExportModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                <p>
                  <strong>Notice:</strong> This faculty directory is customized exclusively for your registration (<strong>{studentId || "Student"}</strong>). It is sorted and filtered specifically by your eligible courses and section cohort, rather than the global generic directory.
                </p>
              </div>

              <p className="text-xs text-slate-600">
                You can download your personalized cohort directory or export the entire university catalog across all clusters:
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#d97706] hover:bg-[#b45309] shadow-sm transition-all"
                onClick={() => handleDownloadPdf("student")}
                disabled={isExporting}
              >
                <Download size={15} />
                <span>{isExporting ? "Generating PDF..." : "Download My Faculty Directory"}</span>
              </button>

              <button
                type="button"
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-all"
                onClick={() => handleDownloadPdf("entire")}
                disabled={isExporting}
              >
                <Users size={15} />
                <span>Download Entire Faculty Directory</span>
              </button>
            </div>
          </div>
        </OverlayPortal>
      )}
    </div>
  );
}
