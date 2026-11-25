import { createContext, useEffect, useMemo, useState } from "react";
import { clearSession, createSession, getAuthenticatedStudent } from "../services/authService";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [studentId, setStudentId] = useState(getAuthenticatedStudent);

  // Cross-tab synchronization: keep state updated if another tab logs in or logs out
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === "klef-active-browser-student") {
        if (e.newValue) {
          setStudentId(e.newValue);
        } else {
          setStudentId(null);
        }
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const value = useMemo(
    () => ({
      studentId,
      signIn(nextStudentId) {
        createSession(nextStudentId);
        setStudentId(nextStudentId);
      },
      signOut() {
        clearSession();
        setStudentId(null);
      },
    }),
    [studentId],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
