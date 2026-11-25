import roster from "./studentRosterData.json";

export const specializationClusterMap = {
  "DATA SCIENCE AND BIG DATA ANALYTICS": "Cluster 1",
  "CLOUD NATIVE SOFTWARE ENGINEERING": "Cluster 1",
  "CLOUD INFRASTRUCTURE DESIGN AND ENGINEERING": "Cluster 1",
  "DATA ENGINEERING FOR AI": "Cluster 1",
  "SOFTWARE MODELLING AND DEVOPS": "Cluster 1",
  "BLOCKCHAIN ENGINEERING FOR WEB3": "Cluster 1",
  "CLOUD AND EDGE COMPUTING": "Cluster 1",
  "CYBER SECURITY AND BLOCKCHAIN TECHNOLOGY": "Cluster 1",
  "DISTRIBUTED LEDGER ANALYTICS": "Cluster 1",
  "SOCIAL AND DIGITAL MEDIA ANALYTICS": "Cluster 1",
  "GAME DEVELOPMENT AND UX DESIGN": "Cluster 1",
  "CROSS PLATFORM DEVELOPMENT FRAME WORKS": "Cluster 1",
  "INDUSTRIAL BIOTECHNOLOGY": "Cluster 1",
  "MEDICAL BIOTECHNOLOGY": "Cluster 1",
  "AI-DRIVEN LANGUAGE TECHNOLOGIES": "Cluster 2",
  "AI FOR COMPUTATIONAL INTELLIGENCE": "Cluster 2",
  "AI SYSTEMS FOR VISUAL INTELLIGENCE": "Cluster 2",
  "ROBOTICS AND AUTOMATION": "Cluster 2",
  "AI AND AUTONOMOUS SYSTEMS": "Cluster 2",
  "AI-DRIVEN EDGE ARCHITECTURES AND APPLICATIONS": "Cluster 2",
  "GENERATIVE AI FOR AGENTIC AND MULTI-MODAL INTELLIGENCE": "Cluster 2",
  "GEN AI AND ML": "Cluster 2",
  "GREEN ENERGY TECHNOLOGIES": "Cluster 2",
  "SMART MANUFACTURING": "Cluster 2",
  "ENERGY & CFD": "Cluster 2",
  "STRUCTURAL ENGINEERING AND CONSTRUCTION TECHNOLOGY": "Cluster 2",
  "VLSI": "Cluster 2",
  "5G/6G WIRELESS TECHNOLOGIES": "Cluster 2",
  "EMBEDDED SYSTEMS": "Cluster 2",
  "NANOTECHNOLOGY AND OPTOELECTRONICS": "Cluster 2"
};

export function getStudentRosterInfo(studentId) {
  if (roster && roster[studentId]) {
    return roster[studentId];
  }
  // Try checking localStorage for cached profile first
  try {
    const cached = localStorage.getItem(`klef-student-profile-${studentId}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && (parsed.specialization || parsed.name)) {
        return {
          name: parsed.name || "Student",
          specialization: parsed.specialization || "",
          cluster: parsed.cluster_id === "Cluster-1" ? "Cluster 1" : "Cluster 2"
        };
      }
    }
  } catch {}

  return {
    name: "Student",
    specialization: "",
    cluster: "Cluster 2"
  };
}

export function getClusterForSpecialization(specialization) {
  if (!specialization) return "Cluster 2";
  const normalized = specialization.trim().toUpperCase();
  return specializationClusterMap[normalized] || "Cluster 2";
}

export function getStudentCluster(studentId) {
  const info = getStudentRosterInfo(studentId);
  return info.cluster || getClusterForSpecialization(info.specialization);
}

export function saveStudentCluster(studentId, cluster) {
  localStorage.setItem(`klef-cluster-${studentId}`, cluster);
}

export function saveLastRoute(pathname) {
  localStorage.setItem("klef-last-route", pathname);
}

export function getLastRoute() {
  return localStorage.getItem("klef-last-route");
}
