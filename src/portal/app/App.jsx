"use client";

import { BrowserRouter } from "react-router";
import { useEffect, useState } from "react";
import { AuthProvider } from "../context/AuthContext";
import { PortalRoutes } from "./routes";

export default function App() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="portal-loading">
        <div className="portal-loading-mark">KLEF</div>
        <p>Preparing your academic workspace…</p>
      </main>
    );
  }
  return (
    <AuthProvider>
      <BrowserRouter>
        <PortalRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
