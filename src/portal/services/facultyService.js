export { componentNames, faculty, sectionFor } from "./academicData";

export function getFacultyAlphabetically(faculty, direction = "asc") {
  const multiplier = direction === "desc" ? -1 : 1;
  return [...faculty].sort((a, b) => multiplier * a.name.localeCompare(b.name));
}
