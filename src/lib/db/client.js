import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { buckets, faculty } from '../../portal/services/academicData.js';
import { toTitleCase } from '../../portal/utils/validation.js';

let dbInstance = null;

const DB_DIR = path.join(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'academic_portal.sqlite');
const SCHEMA_FILE = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');

/**
 * Get or initialize the persistent SQLite database instance
 */
export function getDatabase() {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  dbInstance = new DatabaseSync(DB_FILE);

  // Execute schema
  if (fs.existsSync(SCHEMA_FILE)) {
    const schemaSql = fs.readFileSync(SCHEMA_FILE, 'utf-8');
    dbInstance.exec(schemaSql);
  }

  // Seed reference data if tables are empty
  seedInitialData(dbInstance);

  return dbInstance;
}

/**
 * Automatically seed reference curriculum, faculty, sections, and allocations
 */
function seedInitialData(db) {
  const termsCount = db.prepare('SELECT COUNT(*) as count FROM academic_terms').get().count;
  if (termsCount === 0) {
    db.prepare(`
      INSERT INTO academic_terms (id, academic_year, semester_code, semester_number, is_active)
      VALUES 
        ('2026-27-EVEN', '2026-27', 'ODD', 5, 1),
        ('2026-27-EVEN', '2026-27', 'EVEN', 6, 0)
    `).run();
  }

  const specCount = db.prepare('SELECT COUNT(*) as count FROM specializations').get().count;
  if (specCount === 0) {
    db.prepare(`
      INSERT INTO specializations (code, title, department)
      VALUES 
        ('GAI', 'Generative AI for Agentic and Multi-Modal Intelligence', 'Computer Science & Engineering'),
        ('CSE', 'Computer Science & Engineering Core', 'Computer Science & Engineering'),
        ('AIDS', 'Artificial Intelligence & Data Science', 'Artificial Intelligence & Data Science'),
        ('CSIT', 'Computer Science & Information Technology', 'Computer Science & Engineering')
    `).run();
  }

  const clusterCount = db.prepare('SELECT COUNT(*) as count FROM clusters').get().count;
  if (clusterCount === 0) {
    db.prepare(`
      INSERT INTO clusters (id, name, section_start, section_end, section_range, description, is_recommended, specialization_code)
      VALUES 
        ('Cluster 1', 'Cluster 1', 1, 50, 'S1 — S50', 'Section range 1 through 50 for primary cohort registrations.', 0, 'CSE'),
        ('Cluster 2', 'Cluster 2', 51, 100, 'S51 — S100', 'Section range 51 through 100 aligned with your specialization cohort.', 1, 'GAI')
    `).run();
  }

  const catCount = db.prepare('SELECT COUNT(*) as count FROM course_categories').get().count;
  if (catCount === 0) {
    db.prepare(`
      INSERT INTO course_categories (code, name, type, description)
      VALUES 
        ('SDC', 'Skill Development Course', 'ACADEMIC', 'Practical and hands-on developer training'),
        ('PCC', 'Professional Core Course', 'ACADEMIC', 'Core computer science foundational courses'),
        ('PE', 'Professional Elective', 'ACADEMIC', 'Electives aligned with technology specialization tracks'),
        ('FCC', 'Foundation / Core Choice', 'ACADEMIC', 'Foundational technical options'),
        ('BSC', 'Basic Science Course', 'ACADEMIC', 'Mathematical and scientific foundational thinking'),
        ('HFC', 'Humanities and Flexible Choice', 'ACADEMIC', 'Social, ethical, and flexible education'),
        ('CRT', 'Campus Recruitment Training', 'CAREER_READINESS', 'Structured placement and quantitative training'),
        ('NCRT', 'Non-Campus Recruitment Track', 'CAREER_READINESS', 'Standard core academic research and higher studies pathway')
    `).run();
  }

  // Seed Sections S1 through S100
  const sectionsCount = db.prepare('SELECT COUNT(*) as count FROM sections').get().count;
  if (sectionsCount === 0) {
    const insertSec = db.prepare(`
      INSERT OR IGNORE INTO sections (id, section_number, cluster_id, capacity)
      VALUES (?, ?, ?, 60)
    `);
    for (let i = 1; i <= 100; i++) {
      const clusterId = i <= 50 ? 'Cluster 1' : 'Cluster 2';
      insertSec.run(`S-${i}`, i, clusterId);
    }
  }

  // Seed Buckets and Courses
  const bucketCount = db.prepare('SELECT COUNT(*) as count FROM buckets').get().count;
  if (bucketCount === 0) {
    const insertBucket = db.prepare(`
      INSERT OR IGNORE INTO buckets (id, short_code, title, sort_order, min_credits, max_credits)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertCourse = db.prepare(`
      INSERT OR IGNORE INTO courses (code, name, bucket_id, category_code, credits, lecture_hours, tutorial_hours, practical_hours, skill_hours, components, description, prerequisite, is_crt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    buckets.forEach((b, idx) => {
      insertBucket.run(b.id, b.short, b.title, idx + 1, 2, 4);
      b.subjects.forEach((s) => {
        const ltps = s.ltps || [3, 0, 0, 0];
        // Map bucket short_code to existing course_categories (e.g., PCC-1 -> PCC, PE-1 -> PE)
        let catCode = b.short.replace(/-\d+$/, '');
        if (!['SDC', 'PCC', 'PE', 'FCC', 'BSC', 'HFC', 'CRT', 'NCRT'].includes(catCode)) {
          catCode = 'PCC';
        }
        insertCourse.run(
          s.code,
          toTitleCase(s.name),
          b.id,
          catCode,
          s.credits || 3,
          ltps[0] || 0,
          ltps[1] || 0,
          ltps[2] || 0,
          ltps[3] || 0,
          JSON.stringify(s.components || ['L']),
          s.description || '',
          s.prerequisite || '',
          0 // standard academic course
        );
      });
    });
  }

  // Seed Faculty Master & Allocations
  const facCount = db.prepare('SELECT COUNT(*) as count FROM faculty').get().count;
  if (facCount === 0) {
    const insertFac = db.prepare(`
      INSERT OR IGNORE INTO faculty (id, name, designation, department, email, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    faculty.forEach((f) => {
      insertFac.run(
        f.id,
        toTitleCase(f.name),
        f.designation || 'Assistant Professor',
        f.department || 'Computer Science & Engineering',
        `${f.id.toLowerCase()}@kluniversity.in`,
        '+91 98480 12345'
      );
    });

    // Populate relational faculty_allocations across sections and courses
    const insertAlloc = db.prepare(`
      INSERT OR IGNORE INTO faculty_allocations (id, faculty_id, course_code, section_id, sub_section, component, term_id)
      VALUES (?, ?, ?, ?, ?, ?, '2026-27-EVEN')
    `);

    // Fetch all courses and faculty
    const allCourses = db.prepare('SELECT code, name, components FROM courses').all();
    const allFaculty = db.prepare('SELECT id, name FROM faculty').all();

    allCourses.forEach((c) => {
      const components = JSON.parse(c.components || '["L"]');
      // Allocate faculty for Cluster 1 (e.g. S-1 to S-10) and Cluster 2 (S-51 to S-60)
      const targetSections = [1, 2, 3, 5, 12, 18, 48, 51, 52, 53, 54, 55, 58, 62, 70];

      targetSections.forEach((secNum) => {
        const secId = `S-${secNum}`;
        const facIndex = (secNum + c.code.charCodeAt(2)) % allFaculty.length;
        const assignedFac = allFaculty[facIndex];

        components.forEach((comp) => {
          if (comp === 'L') {
            const allocId = `alloc-${c.code}-${secId}-L-${assignedFac.id}`;
            insertAlloc.run(allocId, assignedFac.id, c.code, secId, null, 'L');
          } else {
            // Sub-sections A, B, C for Tutorial, Practical, Skill
            ['A', 'B', 'C'].forEach((sub, subIdx) => {
              const subFacIndex = (facIndex + subIdx + 1) % allFaculty.length;
              const subFac = allFaculty[subFacIndex];
              const allocId = `alloc-${c.code}-${secId}-${comp}-${sub}-${subFac.id}`;
              insertAlloc.run(allocId, subFac.id, c.code, secId, sub, comp);
            });
          }
        });
      });
    });
  }

  // Seed Default Student
  const stuCount = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  if (stuCount === 0) {
    db.prepare(`
      INSERT OR IGNORE INTO students (
        id, student_id, name, university_email, personal_email, mobile_number, gender,
        date_of_birth, aadhaar_number, apaar_number, residency_status, parent_name,
        parent_phone_number, cluster_id, specialization_code, is_crt, counselor_name, counselor_id
      ) VALUES (
        'student-2400030952', '2400030952', 'Anirudh Varma', '2400030952@kluniversity.in',
        'anirudh.varma@gmail.com', '+91 98765 43210', 'Male', '2005-04-18', '1234 5678 9012',
        'APAAR-9876-5432', 'Hosteler', 'K. R. Varma', '+91 98765 00000', 'Cluster 2',
        'GAI', 0, 'Dr. S. Srinivasa Rao', 'KLEF0864'
      )
    `).run();
  }

  // Seed Default Administrator Account in SQL table if not present (mirroring student persistence)
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS administrators (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const adminUser = db.prepare('SELECT COUNT(*) as count FROM administrators WHERE username = ?').get('8897337687').count;
    if (adminUser === 0) {
      const defaultAdminPass = process.env.ADMIN_PASSWORD || 'Janu@143';
      db.prepare(`
        INSERT INTO administrators (id, username, password_hash, name, email, phone, role)
        VALUES ('admin-8897337687', '8897337687', ?, 'G. Bhaanu Sai', 'bhaanusai.g@kluniversity.in', '+91 8897337687', 'admin')
      `).run(defaultAdminPass);
    }
  } catch (err) {
    console.warn('Note on administrators table seeding:', err);
  }
}
