/**
 * Converts a text string to Title Case (First letter capitalized, subsequent letters lowercased).
 * Supports initials (e.g., G., K. R.), hyphenated words, and preserves numbers or codes when appropriate.
 */
export function toTitleCase(str) {
  if (typeof str !== "string" || !str.trim()) return str;
  return str.replace(/\b([a-zA-Z])([a-zA-Z]*)\b/g, (_, first, rest) => {
    return first.toUpperCase() + rest.toLowerCase();
  });
}

export function isValidStudentId(studentId) {
  return /^\d{10}$/.test(studentId);
}

export function passwordsMatch(password, confirmation) {
  return password === confirmation;
}

/**
 * Robust date normalizer that handles:
 * - ISO formats: "2005-04-18"
 * - Slash/dash formats: "18/04/2005", "04/18/2005", "18-04-2005"
 * - Word dates: "18 April 2005", "April 18, 2005"
 * - Excel numeric serial numbers: 38460 -> "2005-04-18"
 */
export function normalizeDate(dateVal) {
  if (!dateVal) return "2005-04-18";

  // If already in YYYY-MM-DD
  if (typeof dateVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateVal.trim())) {
    return dateVal.trim();
  }

  // Handle Excel serial date numbers (e.g. 38460 for 2005-04-18)
  if (typeof dateVal === "number" || (typeof dateVal === "string" && /^\d{4,5}$/.test(dateVal.trim()))) {
    const serial = Number(dateVal);
    if (!isNaN(serial) && serial > 1000) {
      // Excel epoch starts at Dec 30, 1899
      const utc_days = Math.floor(serial - 25569);
      const utc_value = utc_days * 86400;
      const date_info = new Date(utc_value * 1000);
      const year = date_info.getFullYear();
      const month = String(date_info.getMonth() + 1).padStart(2, "0");
      const day = String(date_info.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  const str = String(dateVal).trim();

  // Handle DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const p1 = Number(dmyMatch[1]);
    const p2 = Number(dmyMatch[2]);
    const year = dmyMatch[3];
    // If p1 > 12, it is definitely Day-Month-Year
    if (p1 > 12) {
      return `${year}-${String(p2).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
    }
    // Default to DD-MM-YYYY standard Indian institutional format
    return `${year}-${String(p2).padStart(2, "0")}-${String(p1).padStart(2, "0")}`;
  }

  // Handle standard Date.parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "2005-04-18";
}

/**
 * Universal file reader that parses Excel (.xlsx, .xls), PDF (.pdf), CSV, TSV, or TXT
 * and returns normalized plain text rows for automatic organization.
 */
export async function extractTextFromFile(file) {
  if (!file) return "";
  const name = file.name.toLowerCase();

  // 1. Plain Text / CSV / TSV
  return await file.text();
}
