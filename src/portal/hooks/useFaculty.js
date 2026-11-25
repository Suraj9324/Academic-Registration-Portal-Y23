import { useMemo } from "react";
import { faculty, getFacultyAlphabetically } from "../services/facultyService";

export function useFaculty(direction = "asc") {
  return useMemo(() => getFacultyAlphabetically(faculty, direction), [direction]);
}
