import { getDatabase } from './client.js';
import optionSheetRules from './optionSheetRules.json' with { type: 'json' };

/**
 * Multi-Dimensional Academic Eligibility Engine
 * Evaluates student options based on:
 * - Academic Year & Semester (2026-27 EVEN)
 * - Program & Specialization
 * - Cluster (Cluster-1 / Cluster-2)
 * - Student Type (CRT / NonCRT / NonCRT-PS / etc.)
 * - Placement Status (Placed / YTB Placed / etc.)
 * - Add-on Status (Specialization, Minor, Second Major, No Add-on)
 * - Buckets (C0 - C8)
 */
export const eligibilityEngine = {
  /**
   * Retrieves verified student profile with authoritative dimensions
   */
  getStudentProfile(studentId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT 
        s.*,
        c.name as cluster_name,
        c.section_range as cluster_range
      FROM students s
      LEFT JOIN clusters c ON s.cluster_id = c.id
      WHERE s.student_id = ?
    `).get(studentId);
  },

  /**
   * Evaluates and returns all applicable academic buckets for a student
   */
  getApplicableBuckets(studentId) {
    const db = getDatabase();
    const student = this.getStudentProfile(studentId);
    if (!student) return [];

    // Query distinct buckets assigned to this student from student_assigned_buckets
    const assigned = db.prepare(`
      SELECT DISTINCT
        sab.bucket_id as id,
        b.short_code,
        b.title,
        b.sort_order,
        b.min_credits,
        b.max_credits,
        sab.is_mandatory
      FROM student_assigned_buckets sab
      JOIN buckets b ON sab.bucket_id = b.id
      WHERE sab.student_id = ?
      ORDER BY b.sort_order ASC
    `).all(studentId);

    // If specific bucket assignments exist in DB, return them with course choices
    if (assigned && assigned.length > 0) {
      return assigned.map((b) => {
        const choices = db.prepare(`
          SELECT 
            sab.default_course_code,
            sab.default_course_desc,
            c.name as course_name,
            sab.lec_section,
            sab.prac_section,
            sab.skill_section
          FROM student_assigned_buckets sab
          LEFT JOIN courses c ON sab.default_course_code = c.code
          WHERE sab.student_id = ? AND sab.bucket_id = ?
        `).all(studentId, b.id);

        return {
          ...b,
          default_course_code: choices.length === 1 ? choices[0].default_course_code : null,
          default_course_name: choices.length === 1 ? (choices[0].course_name || choices[0].default_course_desc) : `${choices.length} Options Available`,
          assignedChoicesCount: choices.length,
          lec_section: choices[0]?.lec_section || 'NA',
          prac_section: choices[0]?.prac_section || 'NA',
          skill_section: choices[0]?.skill_section || 'NA',
        };
      });
    }

    // Fallback: standard academic buckets
    return db.prepare(`
      SELECT id, short_code, title, sort_order, min_credits, max_credits, 1 as is_mandatory
      FROM buckets
      WHERE is_active = 1
      ORDER BY sort_order ASC
    `).all();
  },

  /**
   * Evaluates and returns eligible courses for a student in a specific bucket
   */
  getEligibleCourses(studentId, bucketId) {
    const db = getDatabase();
    const student = this.getStudentProfile(studentId);
    if (!student) return [];

    // 1. Check if student has a fixed prescribed course in this bucket (e.g. C0, C3, C7, C4, C5, C6)
    const assignedRow = db.prepare(`
      SELECT default_course_code, lec_section, prac_section, skill_section
      FROM student_assigned_buckets
      WHERE student_id = ? AND bucket_id = ?
    `).get(studentId, bucketId);

    // 2. Open Electives Buckets (C1: OE1, C2: OE2)
    // Students can choose from approved Open Electives excluding CSE department offerings
    if (bucketId === 'C1' || bucketId === 'C2') {
      const oeCategory = bucketId === 'C1' ? 'OE1' : 'OE2';
      const oeCourses = db.prepare(`
        SELECT 
          c.code,
          c.name,
          c.bucket_id,
          c.category_code,
          c.credits,
          c.lecture_hours,
          c.tutorial_hours,
          c.practical_hours,
          c.skill_hours,
          c.components,
          c.description,
          c.prerequisite,
          c.is_crt
        FROM courses c
        WHERE c.bucket_id = ? AND c.category_code = ? AND c.is_active = 1
        ORDER BY c.code ASC
      `).all(bucketId, oeCategory);

      // Rule: In KL University R23 curriculum, courses marked '(Not For CSE)' are intended for
      // other engineering disciplines and are NOT permitted for CSE program students.
      // CSE students must choose from interdisciplinary Open Electives offered by Civil, Mech,
      // Biotech, Management, EEE, ECE, Architecture, Pharmacy, Food Tech, etc.
      const isCSE = student.program?.toUpperCase().includes('CSE') || !student.program;
      const filtered = oeCourses.filter((course) => {
        if (isCSE && (course.name?.includes('(Not For CSE)') || course.description?.includes('(Not For CSE)'))) {
          return false;
        }
        return true;
      });

      return filtered.map((c) => ({
        ...c,
        components: JSON.parse(c.components || '["L"]'),
        ltps: (c.lecture_hours !== null && c.lecture_hours !== undefined)
          ? [c.lecture_hours, c.tutorial_hours ?? 0, c.practical_hours ?? 0, c.skill_hours ?? 0]
          : [3, 0, 0, 0],
        isPrescribed: false,
        assignedSections: {
          lec: assignedRow?.lec_section || 'S1-S35',
          prac: assignedRow?.prac_section || 'NA',
          skill: assignedRow?.skill_section || 'NA',
        },
      }));
    }

    // 3. For prescribed or elective buckets, return all authoritative course choices mapped to student in this bucket
    const assignedRows = db.prepare(`
      SELECT default_course_code, lec_section, prac_section, skill_section
      FROM student_assigned_buckets
      WHERE student_id = ? AND bucket_id = ?
    `).all(studentId, bucketId);

    let courses = [];
    if (assignedRows && assignedRows.length > 0) {
      for (const aRow of assignedRows) {
        const queryCourse = aRow.default_course_code;
        if (queryCourse && queryCourse !== 'OE1' && queryCourse !== 'OE2') {
          const c = db.prepare(`
            SELECT * FROM courses WHERE code = ?
          `).get(queryCourse);
          if (c) {
            courses.push({
              ...c,
              components: JSON.parse(c.components || '["L"]'),
              ltps: (c.lecture_hours !== null && c.lecture_hours !== undefined)
                ? [c.lecture_hours, c.tutorial_hours ?? 0, c.practical_hours ?? 0, c.skill_hours ?? 0]
                : [3, 0, 0, 0],
              isPrescribed: assignedRows.length === 1,
              assignedSections: {
                lec: aRow.lec_section || 'NA',
                prac: aRow.prac_section || 'NA',
                skill: aRow.skill_section || 'NA',
              },
            });
          }
        }
      }
    }

    // If no course found from assigned records, fetch catalog courses in the bucket
    if (courses.length === 0) {
      const dbCourses = db.prepare(`
        SELECT * FROM courses WHERE bucket_id = ? AND is_active = 1
      `).all(bucketId);

      courses = dbCourses.map((c) => ({
        ...c,
        components: JSON.parse(c.components || '["L"]'),
        ltps: (c.lecture_hours !== null && c.lecture_hours !== undefined)
          ? [c.lecture_hours, c.tutorial_hours ?? 0, c.practical_hours ?? 0, c.skill_hours ?? 0]
          : [3, 0, 0, 0],
        isPrescribed: false,
        assignedSections: {
          lec: assignedRow?.lec_section || 'NA',
          prac: assignedRow?.prac_section || 'NA',
          skill: assignedRow?.skill_section || 'NA',
        },
      }));
    }

    return courses;
  },

  /**
   * Retrieves verified faculty allocations for a course, scoped to cluster, section, and component
   */
  getFacultyAllocations(courseCode, sectionOrCluster, component) {
    const db = getDatabase();
    let sql = `
      SELECT 
        fa.id as allocation_id,
        fa.course_code,
        fa.section_id,
        fa.sub_section,
        fa.component,
        f.id as faculty_id,
        f.name as faculty_name,
        f.designation,
        f.department,
        s.section_number,
        s.cluster_id
      FROM faculty_allocations fa
      JOIN faculty f ON fa.faculty_id = f.id
      JOIN sections s ON fa.section_id = s.id
      WHERE fa.course_code = ?
    `;
    const params = [courseCode];

    if (sectionOrCluster && sectionOrCluster !== 'NA') {
      if (sectionOrCluster.startsWith('S-') || /^\d+$/.test(sectionOrCluster)) {
        const secId = sectionOrCluster.startsWith('S-') ? sectionOrCluster : `S-${sectionOrCluster}`;
        sql += ' AND fa.section_id = ?';
        params.push(secId);
      } else if (sectionOrCluster.startsWith('Cluster-')) {
        sql += " AND (s.cluster_id = ? OR s.cluster_id = 'NA')";
        params.push(sectionOrCluster);
      }
    }
    if (component) {
      sql += ' AND fa.component = ?';
      params.push(component);
    }

    sql += ' ORDER BY s.section_number ASC, fa.sub_section ASC';
    return db.prepare(sql).all(...params);
  },

  /**
   * Retrieves all personalized academic subjects and faculty mappings for an individual student
   */
  getStudentAcademicSubjects(studentId) {
    const db = getDatabase();
    const student = this.getStudentProfile(studentId);
    if (!student) return [];

    const applicableBuckets = this.getApplicableBuckets(studentId);
    const result = [];

    for (const b of applicableBuckets) {
      const assignedRows = db.prepare(`
        SELECT default_course_code, default_course_desc, lec_section, prac_section, skill_section, is_mandatory
        FROM student_assigned_buckets
        WHERE student_id = ? AND bucket_id = ?
      `).all(studentId, b.id);

      const isMultiChoice = assignedRows.length > 1 || assignedRows.some(r => r.default_course_code === 'OE1' || r.default_course_code === 'OE2');
      const eligibleCourses = this.getEligibleCourses(studentId, b.id);

      for (const row of assignedRows) {
        let courseCode = row.default_course_code;
        let courseName = row.default_course_desc;
        let credits = 3;
        let category = 'CORE';
        let components = ['L'];
        let lecture_hours = null;
        let tutorial_hours = null;
        let practical_hours = null;
        let skill_hours = null;

        if (courseCode && courseCode !== 'OE1' && courseCode !== 'OE2') {
          const c = db.prepare('SELECT * FROM courses WHERE code = ?').get(courseCode);
          if (c) {
            courseName = c.name;
            credits = c.credits;
            category = c.category_code;
            components = JSON.parse(c.components || '["L"]');
            lecture_hours = c.lecture_hours;
            tutorial_hours = c.tutorial_hours;
            practical_hours = c.practical_hours;
            skill_hours = c.skill_hours;
          }
        }

        // Section mappings with Option Sheet authoritative override
        let prescribedRange = this.getOptionSheetSectionRange(
          student.specialization,
          courseCode,
          student.student_type,
          student.placement_status
        );

        const secMapping = {
          lecSection: row.lec_section || 'NA',
          pracSection: row.prac_section || 'NA',
          skillSection: row.skill_section || 'NA',
        };

        // If an Option Sheet section rule exists for this course, ensure secMapping and optionSheetRange reflect it
        if (prescribedRange) {
          if (courseCode === '23IE4053A') {
            // For Capstone Project, the Option Sheet prescribes Practical/Skill sections
            secMapping.pracSection = prescribedRange;
          } else if (components.includes('L')) {
            secMapping.lecSection = prescribedRange;
          }
        }

        // Query matched faculty for each component
        const facultyList = [];
        
        // Helper to check if a section string represents a range
        const isRange = (s) => s && s !== 'NA' && s.replace(/S-?/g, '').includes('-');
        const isSpecific = (s) => s && s !== 'NA' && !s.replace(/S-?/g, '').includes('-');

        const hasSpecificLec = isSpecific(secMapping.lecSection);
        const hasSpecificPrac = isSpecific(secMapping.pracSection);
        const hasSpecificSkill = isSpecific(secMapping.skillSection);
        const hasAnySpecific = hasSpecificLec || hasSpecificPrac || hasSpecificSkill;
        const hasAnyRange = isRange(secMapping.lecSection) || isRange(secMapping.pracSection) || isRange(secMapping.skillSection);

        // 1. Confirmed Lecture Faculty matching (ONLY if section is a specific single section)
        if (hasSpecificLec) {
          const matchSecs = this.parseSectionRange(secMapping.lecSection);
          for (const sNum of matchSecs) {
            const allocs = this.getFacultyAllocations(courseCode, `S-${sNum}`, 'L');
            allocs.forEach(a => {
              if (!facultyList.some(f => f.faculty_id === a.faculty_id && f.component === 'L')) {
                facultyList.push({
                  faculty_id: a.faculty_id,
                  faculty_name: a.faculty_name,
                  component: 'L',
                  section_id: a.section_id,
                  designation: a.designation,
                  allocation_type: 'CONFIRMED_ASSIGNMENT',
                });
              }
            });
          }
        }

        // 2. Confirmed Practical Faculty matching (ONLY if section is a specific single section)
        if (hasSpecificPrac) {
          const matchSecs = this.parseSectionRange(secMapping.pracSection);
          for (const sNum of matchSecs) {
            const allocs = this.getFacultyAllocations(courseCode, `S-${sNum}`, 'P');
            allocs.forEach(a => {
              if (!facultyList.some(f => f.faculty_id === a.faculty_id && f.component === 'P')) {
                facultyList.push({
                  faculty_id: a.faculty_id,
                  faculty_name: a.faculty_name,
                  component: 'P',
                  section_id: a.section_id,
                  designation: a.designation,
                  allocation_type: 'CONFIRMED_ASSIGNMENT',
                });
              }
            });
          }
        }

        // 3. Confirmed Skill Faculty matching (ONLY if section is a specific single section)
        if (hasSpecificSkill) {
          const matchSecs = this.parseSectionRange(secMapping.skillSection);
          for (const sNum of matchSecs) {
            const allocs = this.getFacultyAllocations(courseCode, `S-${sNum}`, 'S');
            allocs.forEach(a => {
              if (!facultyList.some(f => f.faculty_id === a.faculty_id && f.component === 'S')) {
                facultyList.push({
                  faculty_id: a.faculty_id,
                  faculty_name: a.faculty_name,
                  component: 'S',
                  section_id: a.section_id,
                  designation: a.designation,
                  allocation_type: 'CONFIRMED_ASSIGNMENT',
                });
              }
            });
          }
        }

        // 4. Parallel Section-Faculty Alternatives Pool (When source is a range)
        const facultyOptionsList = [];
        if (hasAnyRange) {
          const rangeStr = secMapping.lecSection !== 'NA' ? secMapping.lecSection : (secMapping.pracSection !== 'NA' ? secMapping.pracSection : secMapping.skillSection);
          const rangeNums = this.parseSectionRange(rangeStr);
          for (const sNum of rangeNums) {
            const allocs = this.getFacultyAllocations(courseCode, `S-${sNum}`);
            allocs.forEach(a => {
              if (!facultyOptionsList.some(fo => fo.faculty_id === a.faculty_id && fo.section_id === a.section_id && fo.component === a.component)) {
                facultyOptionsList.push({
                  faculty_id: a.faculty_id,
                  faculty_name: a.faculty_name,
                  component: a.component,
                  section_id: a.section_id,
                  designation: a.designation,
                  allocation_type: 'ELIGIBLE_SECTION_FACULTY_OPTION',
                });
              }
            });
          }
        }

        // Determine exact mapping and section verification status
        let mappingStatus = 'PENDING_INSTITUTIONAL_CONFIRMATION';
        let statusBadge = isMultiChoice ? 'ELIGIBLE_TO_SELECT' : 'PRESCRIBED';

        if (student.cluster_id === 'UNVERIFIED') {
          mappingStatus = 'PENDING_INSTITUTIONAL_CONFIRMATION';
          statusBadge = 'PENDING_INSTITUTIONAL_CONFIRMATION';
        } else if (hasAnySpecific && facultyList.length > 0) {
          // Both specific section AND matching faculty verified
          mappingStatus = 'STUDENT_FACULTY_MAPPING_VERIFIED';
          statusBadge = 'STUDENT_FACULTY_MAPPING_VERIFIED';
        } else if (hasAnySpecific && facultyList.length === 0) {
          // Specific student section assigned, but faculty not yet in CSF
          mappingStatus = 'STUDENT_SECTION_ASSIGNED';
          statusBadge = 'STUDENT_SECTION_ASSIGNED';
        } else if (hasAnyRange) {
          // Section range represents parallel alternatives
          mappingStatus = 'SECTION_OPTIONS_AVAILABLE';
          statusBadge = isMultiChoice ? 'ELIGIBLE_TO_SELECT' : 'SECTION_OPTIONS_AVAILABLE';
        } else {
          mappingStatus = 'PENDING_INSTITUTIONAL_CONFIRMATION';
          statusBadge = 'PENDING_INSTITUTIONAL_CONFIRMATION';
        }

        result.push({
          bucket_id: b.id,
          bucket_name: b.title,
          course_code: courseCode,
          course_name: courseName,
          credits,
          category,
          components,
          lecture_hours,
          tutorial_hours,
          practical_hours,
          skill_hours,
          ltps: (lecture_hours !== null && lecture_hours !== undefined)
            ? [lecture_hours, tutorial_hours ?? 0, practical_hours ?? 0, skill_hours ?? 0]
            : null,
          is_prescribed: !isMultiChoice,
          is_elective: isMultiChoice,
          available_options_count: isMultiChoice ? eligibleCourses.length : 1,
          eligible_courses: isMultiChoice ? eligibleCourses : [],
          sections: secMapping,
          optionSheetRange: prescribedRange || null,
          section_format: hasAnySpecific ? 'SPECIFIC' : (hasAnyRange ? 'RANGE' : 'NA'),
          faculty: facultyList.length > 0 ? facultyList : null,
          faculty_options: facultyOptionsList.length > 0 ? facultyOptionsList : null,
          faculty_display: facultyList.length > 0 
            ? facultyList.map(f => `${f.faculty_name} (${f.component} - ${f.section_id})`).join(', ')
            : (hasAnySpecific ? 'Faculty allocation pending verification' : (hasAnyRange ? 'Parallel section options available (Select preferred faculty)' : 'Section and faculty pending institutional confirmation')),
          mapping_status: mappingStatus,
          status: statusBadge,
          provenance: 'Data One.xlsx',
        });
      }
    }

    return result;
  },

  /**
   * Helper to parse section string like "S-10", "S1-S5", "S31-S34", "10" into array of numbers
   */
  parseSectionRange(str) {
    if (!str || str === 'NA') return [];
    const clean = str.replace(/S-?/g, '').trim();
    if (clean.includes('-')) {
      const parts = clean.split('-').map(p => parseInt(p.trim(), 10));
      if (!isNaN(parts[0]) && !isNaN(parts[1])) {
        const nums = [];
        for (let i = parts[0]; i <= parts[1]; i++) nums.push(i);
        return nums;
      }
    }
    const num = parseInt(clean, 10);
    return !isNaN(num) ? [num] : [];
  },

  /**
   * Administrative summary metrics for the academic audit
   */
  getAcademicAuditSummary() {
    const db = getDatabase();

    const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
    const totalFaculty = db.prepare('SELECT COUNT(*) as count FROM faculty').get().count;
    const totalAllocations = db.prepare('SELECT COUNT(*) as count FROM faculty_allocations').get().count;
    const totalCourses = db.prepare('SELECT COUNT(*) as count FROM courses').get().count;
    const totalBuckets = db.prepare('SELECT COUNT(*) as count FROM buckets').get().count;

    // Cluster distribution
    const clusterDist = db.prepare(`
      SELECT cluster_id, COUNT(*) as count
      FROM students
      GROUP BY cluster_id
    `).all();

    // Specialization distribution
    const specDist = db.prepare(`
      SELECT specialization, COUNT(*) as count
      FROM students
      GROUP BY specialization
      ORDER BY count DESC
    `).all();

    // Student Type (CRT vs Non-CRT) distribution
    const typeDist = db.prepare(`
      SELECT student_type, COUNT(*) as count
      FROM students
      GROUP BY student_type
    `).all();

    // Placement status distribution
    const placementDist = db.prepare(`
      SELECT placement_status, COUNT(*) as count
      FROM students
      GROUP BY placement_status
    `).all();

    // Add-on (Honors / Minor / Second Major) distribution
    const addonDist = db.prepare(`
      SELECT addon_status, COUNT(*) as count
      FROM students
      GROUP BY addon_status
    `).all();

    return {
      totalStudents,
      totalFaculty,
      totalAllocations,
      totalCourses,
      totalBuckets,
      clusterDist,
      specDist,
      typeDist,
      placementDist,
      addonDist,
    };
  },

  /**
   * Resolves the prescribed section range from the official Option Sheet rules
   * for a given student's specialization, course code, student type, and placement status.
   */
  getOptionSheetSectionRange(specialization, courseCode, studentType, placementStatus) {
    if (!specialization) return null;
    const specUpper = String(specialization).toUpperCase().trim();
    const rule = optionSheetRules.find((r) => specUpper.includes(r.spec) || r.spec.includes(specUpper));
    if (!rule) return null;

    const isCRT = studentType && String(studentType).toUpperCase().includes('CRT') && !String(studentType).toUpperCase().includes('NON');
    const isPlaced = placementStatus && String(placementStatus).toUpperCase() === 'PLACED';

    let rangeStr = null;
    switch (courseCode) {
      case '23IE4053R': rangeStr = rule.pri_23IE4053R; break;
      case '23IE4053A': rangeStr = rule.pri_23IE4053A; break;
      case '23IE4055A': rangeStr = rule.pri_23IE4055A; break;
      case '23IE4057A': rangeStr = rule.pri_23IE4057A; break;
      case 'OE1': rangeStr = rule.oe1; break;
      case 'OE2': rangeStr = rule.oe2; break;
      case rule.pe4_code: rangeStr = rule.pe4_sec; break;
      case rule.pe5_code: rangeStr = rule.pe5_sec; break;
      case '23CY1001': rangeStr = isCRT ? rule.cy1001_crt : rule.cy1001_ncrt; break;
      case '22PH4101': rangeStr = isCRT ? rule.ph4101_crt : rule.ph4101_ncrt; break;
      case '22PH4102': rangeStr = isCRT ? rule.ph4102_crt : rule.ph4102_ncrt; break;
      case '23UC0008': rangeStr = isPlaced ? (rule.uc0008_placed || rule.uc0008_crt) : (isCRT ? rule.uc0008_crt : rule.uc0008_ncrt); break;
      case '23UC0009': rangeStr = isCRT ? rule.uc0009_crt : rule.uc0009_ncrt; break;
      case '23UC0026': rangeStr = rule.uc0026; break;
      default: rangeStr = null;
    }
    return rangeStr;
  },

  /**
   * Retrieves student-scoped faculty directory rows strictly based on:
   * 1. The courses assigned to the student (and active cluster for Open Electives)
   * 2. The section range prescribed for the student's specialization and cohort
   * 3. Arranged strictly by Bucket No -> Section Number -> Component -> Faculty Name
   */
  getStudentFacultyDirectory(studentId) {
    const db = getDatabase();
    const student = this.getStudentProfile(studentId);
    if (!student) return [];

    const mySubjects = db.prepare(`
      SELECT 
        sab.bucket_id,
        sab.default_course_code,
        sab.default_course_desc,
        c.name as course_name
      FROM student_assigned_buckets sab
      LEFT JOIN courses c ON sab.default_course_code = c.code
      WHERE sab.student_id = ?
      ORDER BY sab.bucket_id ASC
    `).all(studentId);

    const rows = [];
    const seen = new Set();

    for (const s of mySubjects) {
      if (s.default_course_code === 'OE1' || s.default_course_code === 'OE2') {
        const oeAllocs = db.prepare(`
          SELECT 
            fa.course_code,
            c.name as course_name,
            fa.section_id,
            sec.section_number,
            fa.component,
            fa.faculty_id,
            f.name as faculty_name
          FROM faculty_allocations fa
          JOIN courses c ON fa.course_code = c.code
          JOIN sections sec ON fa.section_id = sec.id
          JOIN faculty f ON fa.faculty_id = f.id
          WHERE c.bucket_id = ? AND (sec.cluster_id = ? OR sec.cluster_id = 'NA')
        `).all(s.bucket_id, student.cluster_id);

        for (const a of oeAllocs) {
          const key = `${s.bucket_id}-${a.course_code}-${a.section_number}-${a.component}-${a.faculty_id}`;
          if (!seen.has(key)) {
            seen.add(key);
            rows.push({
              bucketNo: s.bucket_id,
              courseCode: a.course_code,
              courseName: a.course_name,
              sectionNumber: a.section_number,
              section: a.section_id,
              component: a.component,
              empId: a.faculty_id,
              facultyName: a.faculty_name,
            });
          }
        }
        continue;
      }

      // Check Option Sheet prescribed section range for this specialization
      const rangeStr = this.getOptionSheetSectionRange(
        student.specialization,
        s.default_course_code,
        student.student_type,
        student.placement_status
      );
      const nums = this.parseSectionRange(rangeStr);
      const secIds = nums.map((n) => `S-${n}`);

      let q = `
        SELECT 
          fa.course_code,
          c.name as course_name,
          fa.section_id,
          sec.section_number,
          fa.component,
          fa.faculty_id,
          f.name as faculty_name
        FROM faculty_allocations fa
        JOIN courses c ON fa.course_code = c.code
        JOIN sections sec ON fa.section_id = sec.id
        JOIN faculty f ON fa.faculty_id = f.id
        WHERE fa.course_code = ?
      `;
      const params = [s.default_course_code];

      if (secIds.length > 0) {
        const testAllocs = db.prepare(`${q} AND fa.section_id IN (${secIds.map(() => '?').join(',')})`).all(s.default_course_code, ...secIds);
        if (testAllocs.length > 0) {
          q += ` AND fa.section_id IN (${secIds.map(() => '?').join(',')})`;
          params.push(...secIds);
        } else if (student.cluster_id) {
          q += " AND (sec.cluster_id = ? OR sec.cluster_id = 'NA')";
          params.push(student.cluster_id);
        }
      } else if (student.cluster_id) {
        q += " AND (sec.cluster_id = ? OR sec.cluster_id = 'NA')";
        params.push(student.cluster_id);
      }

      let allocs = db.prepare(q).all(...params);
      if (allocs.length === 0) {
        // Fallback: fetch all allocations for this course regardless of cluster or section
        allocs = db.prepare(`
          SELECT 
            fa.course_code,
            c.name as course_name,
            fa.section_id,
            sec.section_number,
            fa.component,
            fa.faculty_id,
            f.name as faculty_name
          FROM faculty_allocations fa
          JOIN courses c ON fa.course_code = c.code
          JOIN sections sec ON fa.section_id = sec.id
          JOIN faculty f ON fa.faculty_id = f.id
          WHERE fa.course_code = ?
        `).all(s.default_course_code);
      }
      for (const a of allocs) {
        const key = `${s.bucket_id}-${a.course_code}-${a.section_number}-${a.component}-${a.faculty_id}`;
        if (!seen.has(key)) {
          seen.add(key);
          rows.push({
            bucketNo: s.bucket_id,
            courseCode: a.course_code,
            courseName: a.course_name || s.course_name || s.default_course_desc,
            sectionNumber: a.section_number,
            section: a.section_id,
            component: a.component,
            empId: a.faculty_id,
            facultyName: a.faculty_name,
          });
        }
      }
    }

    // Sort strictly by Bucket No -> Section Number -> Component -> Faculty Name
    rows.sort((a, b) => {
      return (
        a.bucketNo.localeCompare(b.bucketNo, undefined, { numeric: true }) ||
        (a.sectionNumber - b.sectionNumber) ||
        a.component.localeCompare(b.component) ||
        a.facultyName.localeCompare(b.facultyName)
      );
    });

    return rows;
  },
};
