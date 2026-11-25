import { useEffect, useState } from "react";
import { readLocalRecord, writeLocalRecord } from "../services/api";
import { getSelectionStorageKey, initialSelections } from "../services/subjectService";

export function useSubjects(studentId) {
  const storageKey = getSelectionStorageKey(studentId);
  const [selections, setSelections] = useState(() =>
    readLocalRecord(storageKey, initialSelections),
  );

  // Synchronize remote database subject selections on student mount
  useEffect(() => {
    if (!studentId) return;
    fetch(`/portal-api/student-selections?studentId=${studentId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data && Object.keys(res.data).length > 0) {
          setSelections((prev) => ({
            ...prev,
            ...res.data,
          }));
          writeLocalRecord(storageKey, {
            ...readLocalRecord(storageKey, initialSelections),
            ...res.data,
          });
        }
      })
      .catch((err) => console.error("Error loading remote selections:", err));
  }, [studentId, storageKey]);

  // Auto-save selections to both localStorage and database
  useEffect(() => {
    if (!studentId) return;
    writeLocalRecord(storageKey, selections);

    // Persist each selected course to persistent database
    Object.entries(selections).forEach(([bucketId, courseCode]) => {
      if (!courseCode || courseCode === 'NONE') return;
      fetch('/portal-api/student-selections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, bucketId, courseCode }),
      }).catch((err) => console.error('Error auto-saving subject selection to DB:', err));
    });
  }, [selections, storageKey, studentId]);

  return { selections, setSelections };
}
