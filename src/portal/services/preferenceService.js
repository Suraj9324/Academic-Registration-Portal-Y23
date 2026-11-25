import { readLocalRecord, writeLocalRecord } from "./api";

export function getPreferenceStorageKey(studentId) {
  return `klef-faculty-preferences-${studentId}`;
}

export function loadPreferences(studentId) {
  return readLocalRecord(getPreferenceStorageKey(studentId), {});
}

export function savePreferences(studentId, preferences) {
  // 1. Write to local record for instant optimistic UI
  writeLocalRecord(getPreferenceStorageKey(studentId), preferences);

  // 2. Synchronize to persistent backend database
  if (!studentId || !preferences) return;
  Object.entries(preferences).forEach(([prefKey, prefValue]) => {
    fetch('/portal-api/student-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, prefKey, prefValue })
    }).catch((err) => console.error('Error auto-saving preference to DB:', err));
  });
}

export async function fetchRemotePreferences(studentId) {
  if (!studentId) return {};
  try {
    const res = await fetch(`/portal-api/student-preferences?studentId=${studentId}`);
    const data = await res.json();
    if (data.ok && data.data) {
      writeLocalRecord(getPreferenceStorageKey(studentId), data.data);
      return data.data;
    }
  } catch (err) {
    console.error('Error fetching remote preferences:', err);
  }
  return loadPreferences(studentId);
}

export async function deleteRemotePreference(studentId, prefKey) {
  if (!studentId || !prefKey) return;
  try {
    await fetch('/portal-api/delete-faculty-preference', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, prefKey })
    });
  } catch (err) {
    console.error('Error deleting remote preference:', err);
  }
}
