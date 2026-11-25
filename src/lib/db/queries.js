import { getDatabase } from './client.js';
import { toTitleCase } from '../../portal/utils/validation.js';

/**
 * High-Performance Academic Query Engine
 * Powers UI filtering, multi-table joins, search, and dynamic dependencies.
 */
export const academicDb = {
  // --------------------------------------------------------------------------
  // 1. Clusters & Specializations
  // --------------------------------------------------------------------------
  getClusters() {
    const db = getDatabase();
    return db.prepare(`
      SELECT c.*, s.title as specialization_title, s.department
      FROM clusters c
      LEFT JOIN specializations s ON c.specialization_code = s.code
      ORDER BY c.id ASC
    `).all();
  },

  getSpecializations() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM specializations ORDER BY title ASC').all();
  },

  // --------------------------------------------------------------------------
  // 2. Buckets & Courses
  // --------------------------------------------------------------------------
  getBuckets() {
    const db = getDatabase();
    return db.prepare(`
      SELECT b.*, 
        (SELECT COUNT(*) FROM courses c WHERE c.bucket_id = b.id) as course_count
      FROM buckets b
      WHERE b.is_active = 1
      ORDER BY b.sort_order ASC
    `).all();
  },

  getCourses(filters = {}) {
    const db = getDatabase();
    let sql = `
      SELECT c.*, b.title as bucket_title, b.short_code as bucket_short
      FROM courses c
      JOIN buckets b ON c.bucket_id = b.id
      WHERE c.is_active = 1
    `;
    const params = [];

    if (filters.bucketId) {
      sql += ' AND c.bucket_id = ?';
      params.push(filters.bucketId);
    }
    if (filters.category) {
      sql += ' AND c.category_code = ?';
      params.push(filters.category);
    }
    if (filters.isCrt !== undefined) {
      sql += ' AND c.is_crt = ?';
      params.push(Number(filters.isCrt));
    }
    if (filters.search) {
      sql += ' AND (c.code LIKE ? OR c.name LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY b.sort_order ASC, c.code ASC';
    const courses = db.prepare(sql).all(...params);
    return courses.map((c) => ({
      ...c,
      components: JSON.parse(c.components || '["L"]'),
    }));
  },

  getCourseDetails(courseCode) {
    const db = getDatabase();
    const course = db.prepare(`
      SELECT c.*, b.title as bucket_title, b.short_code as bucket_short
      FROM courses c
      JOIN buckets b ON c.bucket_id = b.id
      WHERE c.code = ?
    `).get(courseCode);

    if (!course) return null;
    return {
      ...course,
      components: JSON.parse(course.components || '["L"]'),
    };
  },

  // --------------------------------------------------------------------------
  // 3. Faculty & Relational Allocations
  // --------------------------------------------------------------------------
  getFaculty(filters = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM faculty WHERE is_active = 1';
    const params = [];

    if (filters.search) {
      sql += ' AND (id LIKE ? OR name LIKE ? OR department LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }

    sql += ' ORDER BY name ASC';
    return db.prepare(sql).all(...params);
  },

  /**
   * Retrieves relational faculty allocations for a specific course, cluster, and component
   */
  getCourseAllocations({ courseCode, clusterId, component, sectionId }) {
    const db = getDatabase();
    let sql = `
      SELECT 
        fa.id as allocation_id,
        fa.course_code,
        fa.component,
        fa.sub_section,
        s.id as section_id,
        s.section_number,
        s.cluster_id,
        f.id as faculty_id,
        f.name as faculty_name,
        f.designation,
        f.department
      FROM faculty_allocations fa
      JOIN sections s ON fa.section_id = s.id
      JOIN faculty f ON fa.faculty_id = f.id
      WHERE fa.course_code = ?
    `;
    const params = [courseCode];

    if (clusterId) {
      sql += ' AND s.cluster_id = ?';
      params.push(clusterId);
    }
    if (component) {
      sql += ' AND fa.component = ?';
      params.push(component);
    }
    if (sectionId) {
      sql += ' AND fa.section_id = ?';
      params.push(sectionId);
    }

    sql += ' ORDER BY s.section_number ASC, fa.sub_section ASC';
    return db.prepare(sql).all(...params);
  },

  // --------------------------------------------------------------------------
  // 4. Student Management & Preferences
  // --------------------------------------------------------------------------
  getStudent(studentId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT s.*, c.name as cluster_name
      FROM students s
      LEFT JOIN clusters c ON s.cluster_id = c.id
      WHERE s.student_id = ?
    `).get(studentId);
  },

  getAllStudents(filters = {}) {
    const db = getDatabase();
    let sql = 'SELECT * FROM students WHERE 1=1';
    const params = [];

    if (filters.search) {
      sql += ' AND (name LIKE ? OR student_id LIKE ? OR university_email LIKE ? OR mobile_number LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.clusterId && filters.clusterId !== 'all') {
      sql += ' AND cluster_id = ?';
      params.push(filters.clusterId);
    }
    if (filters.residency && filters.residency !== 'all') {
      sql += ' AND residency_status = ?';
      params.push(filters.residency);
    }

    sql += ' ORDER BY student_id ASC';
    return db.prepare(sql).all(...params);
  },

  saveSubjectSelection(studentId, bucketId, courseCode) {
    const db = getDatabase();
    const id = `sel-${studentId}-${bucketId}`;
    db.prepare(`
      INSERT INTO student_subject_selections (id, student_id, bucket_id, course_code, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, bucket_id, term_id) DO UPDATE SET
        course_code = excluded.course_code,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, studentId, bucketId, courseCode);
    return true;
  },

  getStudentSubjectSelections(studentId) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT bucket_id, course_code
      FROM student_subject_selections
      WHERE student_id = ?
    `).all(studentId);
    const result = {};
    rows.forEach((r) => {
      result[r.bucket_id] = r.course_code;
    });
    return result;
  },

  saveFacultyPreference(studentId, prefKey, prefValue) {
    const db = getDatabase();
    const id = `pref-${studentId}-${prefKey}`;
    const valueString = typeof prefValue === 'string' ? prefValue : JSON.stringify(prefValue);
    db.prepare(`
      INSERT INTO student_faculty_preferences (id, student_id, preference_key, preference_value, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, preference_key, term_id) DO UPDATE SET
        preference_value = excluded.preference_value,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, studentId, prefKey, valueString);
    return true;
  },

  getStudentFacultyPreferences(studentId) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT preference_key, preference_value
      FROM student_faculty_preferences
      WHERE student_id = ?
    `).all(studentId);
    const result = {};
    rows.forEach((r) => {
      try {
        result[r.preference_key] = JSON.parse(r.preference_value);
      } catch {
        result[r.preference_key] = r.preference_value;
      }
    });
    return result;
  },

  saveSectionSelection(studentId, bucketId, courseCode, selectedSection, component = 'L', status = 'STUDENT_SELECTION_SUBMITTED') {
    const db = getDatabase();
    const id = `sec-${studentId}-${courseCode}-${component}`;
    db.prepare(`
      INSERT INTO student_section_selections (id, student_id, bucket_id, course_code, selected_section, component, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, course_code, component, term_id) DO UPDATE SET
        selected_section = excluded.selected_section,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, studentId, bucketId, courseCode, selectedSection, component, status);
    return true;
  },

  getStudentSectionSelections(studentId) {
    const db = getDatabase();
    return db.prepare(`
      SELECT bucket_id, course_code, selected_section, component, status, updated_at
      FROM student_section_selections
      WHERE student_id = ?
    `).all(studentId);
  },

  deleteSubjectSelection(studentId, bucketId) {
    const db = getDatabase();
    db.prepare('DELETE FROM student_subject_selections WHERE student_id = ? AND bucket_id = ?').run(studentId, bucketId);
    return true;
  },

  deleteFacultyPreference(studentId, prefKey) {
    const db = getDatabase();
    db.prepare('DELETE FROM student_faculty_preferences WHERE student_id = ? AND preference_key = ?').run(studentId, prefKey);
    return true;
  },

  deleteFacultyPreferencesBySubject(studentId, courseCode) {
    const db = getDatabase();
    db.prepare('DELETE FROM student_faculty_preferences WHERE student_id = ? AND preference_key LIKE ?').run(studentId, `${courseCode}-%`);
    return true;
  },

  deleteAllFacultyPreferences(studentId) {
    const db = getDatabase();
    db.prepare('DELETE FROM student_faculty_preferences WHERE student_id = ?').run(studentId);
    return true;
  },

  finalizePreferences(studentId) {
    const db = getDatabase();
    const id = `fin-${studentId}`;
    db.prepare(`
      INSERT INTO student_preference_finalizations (id, student_id, status, finalized_at, updated_at)
      VALUES (?, ?, 'FINALIZED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id) DO UPDATE SET
        status = 'FINALIZED',
        finalized_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, studentId);
    return { status: 'FINALIZED', finalized_at: new Date().toISOString() };
  },

  reopenPreferences(studentId) {
    const db = getDatabase();
    const id = `fin-${studentId}`;
    db.prepare(`
      INSERT INTO student_preference_finalizations (id, student_id, status, reopened_at, updated_at)
      VALUES (?, ?, 'REOPENED', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(student_id) DO UPDATE SET
        status = 'REOPENED',
        reopened_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `).run(id, studentId);
    return { status: 'REOPENED', reopened_at: new Date().toISOString() };
  },

  getFinalizationStatus(studentId) {
    const db = getDatabase();
    const record = db.prepare('SELECT status, finalized_at, reopened_at FROM student_preference_finalizations WHERE student_id = ?').get(studentId);
    return record || { status: 'EDITABLE', finalized_at: null, reopened_at: null };
  },

  // --------------------------------------------------------------------------
  // 5. Dashboard Summary Statistics & Administrative Intelligence
  // --------------------------------------------------------------------------
  getDashboardStats() {
    const db = getDatabase();
    const students = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
    const faculty = db.prepare('SELECT COUNT(*) as count FROM faculty').get().count;
    const allocations = db.prepare('SELECT COUNT(*) as count FROM faculty_allocations').get().count;
    const courses = db.prepare('SELECT COUNT(*) as count FROM courses WHERE is_active = 1').get().count;
    const buckets = db.prepare('SELECT COUNT(*) as count FROM buckets WHERE is_active = 1').get().count;
    const assignedBuckets = db.prepare('SELECT COUNT(*) as count FROM student_assigned_buckets').get().count;

    // Cluster distribution
    const clusterDist = db.prepare('SELECT cluster_id, COUNT(*) as count FROM students GROUP BY cluster_id ORDER BY cluster_id').all();
    
    // Career readiness distribution (CRT vs NonCRT)
    const crtDist = db.prepare(`
      SELECT 
        CASE 
          WHEN student_type LIKE 'CRT%' THEN 'CRT'
          WHEN student_type LIKE 'NonCRT%' THEN 'NonCRT'
          ELSE 'Other'
        END as category,
        COUNT(*) as count
      FROM students
      GROUP BY category
    `).all();

    // Placement status distribution
    const placementDist = db.prepare('SELECT placement_status, COUNT(*) as count FROM students GROUP BY placement_status ORDER BY count DESC').all();

    // Addon status distribution
    const addonDist = db.prepare('SELECT addon_status, COUNT(*) as count FROM students GROUP BY addon_status ORDER BY count DESC').all();

    // Exceptions & pending items
    const unverifiedClusters = db.prepare("SELECT COUNT(*) as count FROM students WHERE cluster_id = 'UNVERIFIED'").get().count;
    const missingSections = db.prepare("SELECT COUNT(*) as count FROM student_assigned_buckets WHERE lec_section IS NULL OR lec_section = 'NA' OR lec_section = ''").get().count;

    return {
      students,
      faculty,
      allocations,
      courses,
      buckets,
      assignedBuckets,
      clusterDist,
      crtDist,
      placementDist,
      addonDist,
      discrepancies: {
        unverifiedClusters,
        missingSections,
      },
    };
  },

  /**
   * Log an administrative change with full provenance tracking
   */
  logAudit({ entityType, entityId, action, originalValue, newValue, reason, sourceReference, adminIdentity }) {
    const db = getDatabase();
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db.prepare(`
      INSERT INTO audit_logs (id, entity_type, entity_id, action, original_value, new_value, reason, source_reference, admin_identity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      entityType,
      entityId,
      action,
      typeof originalValue === 'object' ? JSON.stringify(originalValue) : String(originalValue || ''),
      typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue || ''),
      reason,
      sourceReference || 'Administrative Portal Intervention',
      adminIdentity || 'admin-central'
    );
    return id;
  },

  /**
   * Retrieve audit logs
   */
  getAuditLogs(limit = 100) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
  },

  /**
   * Update student profile with full administrative provenance logging
   */
  updateStudentByAdmin(studentId, updates, adminIdentity = 'admin-central', reason = 'Administrative Profile Correction') {
    const db = getDatabase();
    const current = db.prepare('SELECT * FROM students WHERE student_id = ?').get(studentId);
    if (!current) throw new Error(`Student ${studentId} not found`);

    const fields = ['name', 'cluster_id', 'student_type', 'placement_status', 'specialization', 'personal_email', 'mobile_number', 'residency_status', 'date_of_birth'];
    const sets = [];
    const params = [];
    const changed = {};

    fields.forEach(f => {
      if (updates[f] !== undefined && updates[f] !== current[f]) {
        sets.push(`${f} = ?`);
        params.push(updates[f]);
        changed[f] = { from: current[f], to: updates[f] };
      }
    });

    if (sets.length === 0) return { updated: false, message: 'No changes detected' };

    params.push(studentId);
    db.prepare(`UPDATE students SET ${sets.join(', ')} WHERE student_id = ?`).run(...params);

    this.logAudit({
      entityType: 'STUDENT',
      entityId: studentId,
      action: 'UPDATE',
      originalValue: changed,
      newValue: updates,
      reason,
      sourceReference: 'Admin Portal Student Management UI',
      adminIdentity,
    });

    return { updated: true, changed };
  },

  /**
   * Retrieves full relational faculty allocations list for administrative management
   */
  getAllFacultyAllocations(filters = {}) {
    const db = getDatabase();
    let sql = `
      SELECT 
        fa.id,
        fa.faculty_id as employeeId,
        f.name as facultyName,
        f.designation,
        CASE
          WHEN fa.course_code LIKE '22PH%' THEN 'Physics'
          WHEN fa.course_code LIKE '23CY%' THEN 'Chemistry'
          WHEN fa.course_code LIKE 'OECE%' THEN 'Civil Engineering'
          WHEN fa.course_code LIKE 'OEEC%' THEN 'Electronics & Communication Engineering'
          WHEN fa.course_code LIKE 'OEEE%' THEN 'Electrical & Electronics Engineering'
          WHEN fa.course_code LIKE 'OEME%' THEN 'Mechanical Engineering'
          WHEN fa.course_code LIKE 'OEBT%' THEN 'Biotechnology'
          WHEN fa.course_code LIKE 'OEBB%' OR fa.course_code LIKE 'OECM%' THEN 'Management & Commerce'
          WHEN fa.course_code LIKE 'OEAG%' THEN 'Agriculture'
          WHEN fa.course_code LIKE 'OEAR%' THEN 'Architecture'
          WHEN fa.course_code LIKE 'OEFT%' THEN 'Food Technology'
          WHEN fa.course_code LIKE 'OEPY%' THEN 'Pharmacy'
          WHEN fa.course_code = '23UC0008' THEN 'Law & Humanities'
          WHEN fa.course_code = '23UC0009' THEN 'Environmental Sciences'
          WHEN f.department IS NOT NULL AND f.department != '' THEN f.department
          ELSE 'Computer Science & Engineering'
        END as department,
        s.id as section,
        s.cluster_id as cluster,
        fa.component,
        fa.course_code as courseCode,
        c.name as courseName
      FROM faculty_allocations fa
      JOIN faculty f ON fa.faculty_id = f.id
      JOIN courses c ON fa.course_code = c.code
      JOIN sections s ON fa.section_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (filters.search) {
      sql += ' AND (f.name LIKE ? OR fa.faculty_id LIKE ? OR fa.course_code LIKE ? OR c.name LIKE ? OR s.id LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    sql += ' ORDER BY fa.course_code ASC, s.section_number ASC';
    return db.prepare(sql).all(...params);
  },

  /**
   * Administrative CRUD: Create a new student record
   */
  createStudentByAdmin(studentData, adminIdentity = 'admin-central') {
    const db = getDatabase();
    const studentId = studentData.student_id || studentData.username;
    if (!studentId) throw new Error('Student ID is required');

    const id = `student-${studentId}`;
    const name = studentData.name || 'New Student';
    const email = studentData.university_email || `${studentId}@kluniversity.in`;
    const dob = studentData.date_of_birth || '2005-01-01';
    const cluster = studentData.cluster_id || 'Cluster-1';
    const program = studentData.program || 'CSE';
    const type = studentData.student_type || 'CRT';
    const placement = studentData.placement_status || 'YTB Placed';
    const spec = studentData.specialization || 'General Track';
    const residency = studentData.residency_status || 'Hosteler';

    const insert = db.prepare(`
      INSERT INTO students (
        id, student_id, name, university_email, personal_email, mobile_number,
        gender, date_of_birth, aadhaar_number, apaar_number, residency_status,
        parent_name, parent_phone_number, program, flexibility_track,
        addon_status_raw, addon_status, addon_verification, specialization,
        cluster_id, student_type, placement_status, counselor_name, counselor_id,
        counselor_mobile, counselor_email, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `);

    insert.run(
      id, studentId, name, email, studentData.personal_email || null, studentData.mobile_number || null,
      studentData.gender || 'Male', dob, studentData.aadhaar_number || null, studentData.apaar_number || null, residency,
      studentData.parent_name || null, studentData.parent_phone_number || null, program, 'CSE-2',
      'Specialization', 'Specialization', 'VERIFIED', spec,
      cluster, type, placement, studentData.counselor_name || null, studentData.counselor_id || null,
      studentData.counselor_mobile || null, studentData.counselor_email || null
    );

    this.logAudit({
      action: 'CREATE',
      entityType: 'students',
      entityId: studentId,
      adminIdentity: adminIdentity,
      originalValue: null,
      newValue: studentData,
      reason: 'Administrative student record creation',
      sourceReference: 'Admin Portal UI'
    });

    return this.getStudent(studentId);
  },

  /**
   * Administrative CRUD: Delete a student record
   */
  deleteStudentByAdmin(studentId, adminIdentity = 'admin-central') {
    const db = getDatabase();
    const existing = this.getStudent(studentId);
    if (!existing) throw new Error(`Student ${studentId} not found`);

    // Delete student assigned buckets first
    db.prepare('DELETE FROM student_assigned_buckets WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM student_subject_selections WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM student_faculty_preferences WHERE student_id = ?').run(studentId);
    db.prepare('DELETE FROM students WHERE student_id = ?').run(studentId);

    this.logAudit({
      action: 'DELETE',
      entityType: 'students',
      entityId: studentId,
      adminIdentity: adminIdentity,
      originalValue: existing,
      newValue: null,
      reason: 'Administrative student record deletion',
      sourceReference: 'Admin Portal UI'
    });

    return { success: true, studentId };
  },

  // --------------------------------------------------------------------------
  // Administrator Credentials SQL Management
  // --------------------------------------------------------------------------
  getAdministrator(username) {
    const db = getDatabase();
    try {
      return db.prepare('SELECT * FROM administrators WHERE username = ?').get(username);
    } catch {
      return null;
    }
  },

  updateAdministratorPassword(username, newPassword) {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO administrators (id, username, password_hash, name, role, updated_at)
      VALUES (?, ?, ?, 'System Administrator', 'admin', CURRENT_TIMESTAMP)
      ON CONFLICT(username) DO UPDATE SET
        password_hash = excluded.password_hash,
        updated_at = CURRENT_TIMESTAMP
    `).run(`admin-${username}`, username, newPassword);

    this.logAudit({
      entityType: 'ADMINISTRATOR',
      entityId: username,
      action: 'UPDATE_PASSWORD',
      originalValue: '***',
      newValue: '***',
      reason: 'Administrator updated account credentials',
      sourceReference: 'Admin Portal Security Page',
      adminIdentity: username,
    });

    return { success: true };
  },

  getStudentCustomPassword(studentId) {
    const db = getDatabase();
    try {
      db.exec('CREATE TABLE IF NOT EXISTS student_custom_passwords (student_id TEXT PRIMARY KEY, password TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);');
      const row = db.prepare('SELECT password FROM student_custom_passwords WHERE student_id = ?').get(studentId);
      return row ? row.password : null;
    } catch {
      return null;
    }
  },

  setStudentCustomPassword(studentId, password) {
    const db = getDatabase();
    try {
      db.exec('CREATE TABLE IF NOT EXISTS student_custom_passwords (student_id TEXT PRIMARY KEY, password TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);');
      db.prepare(`
        INSERT INTO student_custom_passwords (student_id, password, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(student_id) DO UPDATE SET password = excluded.password, updated_at = CURRENT_TIMESTAMP
      `).run(studentId, password);
      return true;
    } catch {
      return false;
    }
  },

  deleteStudentCustomPassword(studentId) {
    const db = getDatabase();
    try {
      db.exec('CREATE TABLE IF NOT EXISTS student_custom_passwords (student_id TEXT PRIMARY KEY, password TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);');
      db.prepare('DELETE FROM student_custom_passwords WHERE student_id = ?').run(studentId);
      return true;
    } catch {
      return false;
    }
  },
};
