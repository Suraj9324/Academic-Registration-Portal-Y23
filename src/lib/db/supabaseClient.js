import { Pool } from 'pg';

let pool = null;

export function getSupabasePool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pool;
}

/**
 * Fetch verified student confidential identity details from Supabase PostgreSQL
 */
export async function getStudentPrivateDetails(studentId) {
  const p = getSupabasePool();
  if (!p) return null;

  try {
    const res = await p.query(
      'SELECT student_id, aadhaar_number, apaar_number, mobile_number, parent_phone_number, counselor_name, counselor_mobile, counselor_email FROM students WHERE student_id = $1 LIMIT 1',
      [studentId]
    );
    if (res.rows && res.rows.length > 0) {
      return res.rows[0];
    }
  } catch (err) {
    console.warn('[Supabase] Could not query student confidential details:', err.message);
  }
  return null;
}

export async function getStudentCustomPassword(studentId) {
  const p = getSupabasePool();
  if (!p) return null;

  try {
    const res = await p.query(
      'SELECT password FROM student_custom_passwords WHERE student_id = $1 LIMIT 1',
      [studentId]
    );
    if (res.rows && res.rows.length > 0) {
      return res.rows[0].password;
    }
  } catch (err) {
    console.warn('[Supabase] Could not query custom password:', err.message);
  }
  return null;
}

export async function setStudentCustomPassword(studentId, password) {
  const p = getSupabasePool();
  if (!p) return false;

  try {
    await p.query(
      `INSERT INTO student_custom_passwords (student_id, password, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (student_id) DO UPDATE SET password = EXCLUDED.password, updated_at = NOW()`,
      [studentId, password]
    );
    return true;
  } catch (err) {
    console.warn('[Supabase] Could not save custom password:', err.message);
    return false;
  }
}

export async function deleteStudentCustomPassword(studentId) {
  const p = getSupabasePool();
  if (!p) return false;

  try {
    await p.query('DELETE FROM student_custom_passwords WHERE student_id = $1', [studentId]);
    return true;
  } catch (err) {
    console.warn('[Supabase] Could not delete custom password:', err.message);
    return false;
  }
}
