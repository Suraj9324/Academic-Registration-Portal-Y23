export { buckets, initialSelections } from "./academicData";

export function getSelectionStorageKey(studentId) {
  return `klef-subject-selections-${studentId}`;
}
