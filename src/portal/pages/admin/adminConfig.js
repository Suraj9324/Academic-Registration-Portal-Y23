export const adminNavigation = [
  ["Dashboard", "Dashboard"],
  ["Students", "Students List"],
  ["Faculty", "Faculty List"],
  ["Buckets", "Course Buckets"],
  ["Courses", "Course Catalog"],
  ["Reset-Password", "Reset Password"],
  ["My-Profile", "My Profile"],
];

export const resources = {
  Students: "students",
  Faculty: "faculty",
  Buckets: "buckets",
  Courses: "courses",
};

export const singularLabels = {
  Students: "student profile",
  Faculty: "faculty member",
  Buckets: "course bucket",
  Courses: "course",
};

export const fields = {
  Students: [
    ["name", "Student Name", "text", true],
    ["username", "Student ID (10 digits)", "text", true],
    ["dateOfBirth", "Date of Birth", "date", true],
    ["universityEmail", "University Email (Auto-generated)", "email", false, true],
    ["personalEmail", "Personal Email ID (Optional)", "email"],
    ["mobileNumber", "Mobile Number", "tel"],
    ["gender", "Gender", "select", false, false, ["Male", "Female", "Other", "Prefer not to say"]],
    ["aadhaarNumber", "Aadhaar Number", "text"],
    ["aapaarNumber", "APAAR Number", "text"],
    ["residencyStatus", "Status (Hosteler / Day Scholar)", "select", false, false, ["Hosteler", "Day Scholar"]],
    ["parentName", "Parent Name", "text"],
    ["parentPhoneNumber", "Parent Phone Number", "tel"],
    ["cluster", "Cluster Allocation", "select", false, false, ["Cluster 1", "Cluster 2"]],
    ["counselor.name", "Counselor Name", "text"],
    ["counselor.employeeId", "Counselor EMP ID", "text"],
    ["counselor.designation", "Counselor Designation", "text"],
    ["counselor.mobileNumber", "Counselor Mobile Number", "tel"],
    ["counselor.email", "Counselor Email Address", "email"],
  ],
  Faculty: [
    ["employeeId", "EMP ID", "text", true],
    ["facultyName", "Faculty Name", "text", true],
    ["section", "Section (e.g., S - 1)", "text", true],
    ["component", "Component", "multiselect", true, false, ["L", "T", "P", "S"]],
    ["courseCode", "Course Code", "text", true],
    ["courseName", "Course Name", "text", true],
  ],
  Buckets: [
    ["code", "Bucket Code (e.g. C0, C1)", "text", true],
    ["shortName", "Short Name (e.g. SDC, PCC-1)", "text", true],
    ["title", "Bucket Title", "text", true],
    ["sortOrder", "Display Order", "number", true],
    ["active", "Available to Students", "checkbox"],
  ],
  Courses: [
    ["bucket", "Course Bucket", "bucket", true],
    ["courseCode", "Course Code", "text", true],
    ["name", "Course Name", "text", true],
    ["credits", "Credits", "number", true],
    ["lectureHours", "Lecture Hours (L)", "number"],
    ["tutorialHours", "Tutorial Hours (T)", "number"],
    ["practicalHours", "Practical Hours (P)", "number"],
    ["skillHours", "Skill Hours (S)", "number"],
    ["components", "Components", "multiselect", true, false, ["L", "T", "P", "S"]],
    ["description", "Course Description", "textarea"],
    ["prerequisite", "Prerequisites", "text"],
    ["active", "Active in Course Catalog", "checkbox"],
  ],
};

export function readValue(record, path) {
  return path.split(".").reduce((value, key) => value?.[key], record) ?? "";
}

function autoCapitalizeWords(text) {
  if (typeof text !== "string" || !text.trim()) return text;
  return text.replace(/\b([a-zA-Z])([a-zA-Z]*)\b/g, (_, first, rest) => {
    return first.toUpperCase() + rest.toLowerCase();
  });
}

export function normalizeForm(source, section) {
  const value = {};
  for (const [key] of fields[section] || []) {
    let val = readValue(source, key);
    // Auto-capitalize names, titles, departments, designations
    if (
      typeof val === "string" &&
      (key.toLowerCase().includes("name") ||
        key.toLowerCase().includes("title") ||
        key.toLowerCase().includes("department") ||
        key.toLowerCase().includes("designation"))
    ) {
      val = autoCapitalizeWords(val);
    }
    value[key] = val;
  }
  return value;
}
