export const pageSegments = {
  overview: "Academic-Overview.php",
  cluster: "Cluster-Selection.php",
  subjects: "Subject-Selection.php",
  preferences: "Faculty-Preferences.php",
  directory: "Faculty-Directory.php",
  "my-preference": "My-Preference.php",
  profile: "My-Profile.php",
};

export const segmentPages = {
  "Academic-Overview.php": "overview",
  "Cluster-Selection.php": "cluster",
  "Subject-Selection.php": "subjects",
  "Faculty-Preferences.php": "preferences",
  "Faculty-Directory.php": "directory",
  "My-Preference.php": "my-preference",
  "My-Profile.php": "profile",
  // Backwards compatibility for paths without .php
  "Academic-Overview": "overview",
  "Cluster-Selection": "cluster",
  "Subject-Selection": "subjects",
  "Faculty-Preferences": "preferences",
  "Faculty-Directory": "directory",
  "My-Preference": "my-preference",
  "My-Profile": "profile",
};

export function slugify(text = "") {
  return String(text)
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Constructs portal URLs.
 * Supports deep bucket and course paths:
 * - Subject Selection:
 *   /KLEF/8-2/{studentId}/{studentName}/Subject-Selection/{bucketNum}/{bucketCode}.php
 * - Faculty Preferences:
 *   /KLEF/8-2/{studentId}/{studentName}/Faculty-Preferences/{bucketNum}/{bucketCode}/{courseName}/{courseCode}.php
 */
export function portalPath(studentId, studentName, page, params = {}) {
  const encId = encodeURIComponent(studentId);
  const encName = encodeURIComponent(studentName);

  if (page === "subjects" && params.bucketId && params.bucketShort) {
    const bNum = params.bucketId;
    const bCode = slugify(params.bucketShort);
    return `/KLEF/8-2/${encId}/${encName}/Subject-Selection/${bNum}/${bCode}.php`;
  }

  if (page === "preferences" && params.bucketId && params.bucketShort) {
    const bNum = params.bucketId;
    const bCode = slugify(params.bucketShort);
    const cName = slugify(params.courseName || "Course");
    const cCode = slugify(params.courseCode || "NONE");
    return `/KLEF/8-2/${encId}/${encName}/Faculty-Preferences/${bNum}/${bCode}/${cName}/${cCode}.php`;
  }

  const segment = pageSegments[page] || (page.endsWith(".php") ? page : `${page}.php`);
  return `/KLEF/8-2/${encId}/${encName}/${segment}`;
}
