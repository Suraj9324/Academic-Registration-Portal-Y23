import { useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams, useLocation } from "react-router";
import PortalShell from "../components/layout/PortalShell";
import { useAuth } from "../hooks/useAuth";
import { useSubjects } from "../hooks/useSubjects";
import AcademicOverview from "../pages/AcademicOverview";
import ClusterSelection from "../pages/ClusterSelection";
import Developer from "../pages/Developer";
import FacultyDirectory from "../pages/FacultyDirectory";
import FacultyPreferences from "../pages/FacultyPreferences";
import Login from "../pages/Login";
import MyPreferences from "../pages/MyPreferences";
import MyProfile from "../pages/MyProfile";
import ResetPassword from "../pages/ResetPassword";
import SubjectSelection from "../pages/SubjectSelection";
import Admin from "../pages/Admin";
import RegistrationGuidelinesModal from "../components/academic/RegistrationGuidelinesModal";
import { loadPreferences, savePreferences, fetchRemotePreferences } from "../services/preferenceService";
import { buckets, faculty, initialSelections } from "../services/academicData";
import { getStudentCluster, saveLastRoute, saveStudentCluster } from "../services/studentService";
import { portalPath, segmentPages, slugify } from "../utils/routes";

function PortalRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const studentId = params.studentId || "";
  const studentName = params.studentName || "";

  // Determine active bucket and course from deep URL params if present
  const urlBucketNum = params.bucketNum || "";
  const urlBucketCode = params.bucketCode || "";
  const urlCourseName = params.courseName || "";
  const urlCourseCode = params.courseCode || "";

  // Resolve page from pageName param or deep route path
  let pageName = params.pageName || "";
  if (location.pathname.includes("/Subject-Selection")) {
    pageName = "Subject-Selection.php";
  } else if (location.pathname.includes("/Faculty-Preferences")) {
    pageName = "Faculty-Preferences.php";
  }

  const page = segmentPages[pageName] || "overview";
  const { studentId: authenticatedStudent, signOut } = useAuth();
  const { selections, setSelections } = useSubjects(studentId);
  const [preferences, setPreferences] = useState(() => loadPreferences(studentId));
  const [cluster, setCluster] = useState(() => getStudentCluster(studentId));
  const [dataVersion, setDataVersion] = useState(0);
  const [showGuidelines, setShowGuidelines] = useState(false);

  // Check if student has agreed to registration guidelines for this sign in session
  useEffect(() => {
    if (!studentId) {
      setShowGuidelines(false);
      return;
    }
    try {
      const agreedKey = `guidelines_session_agreed_${studentId}`;
      const hasAgreed = sessionStorage.getItem(agreedKey);
      if (!hasAgreed) {
        setShowGuidelines(true);
      } else {
        setShowGuidelines(false);
      }
    } catch {
      setShowGuidelines(true);
    }
  }, [studentId]);

  const handleAgreeGuidelines = () => {
    try {
      sessionStorage.setItem(`guidelines_session_agreed_${studentId}`, 'true');
    } catch {}
    setShowGuidelines(false);
    setPage("overview");
  };

  // Synchronize preferences from local storage and remote database
  useEffect(() => {
    setPreferences(loadPreferences(studentId));
    setCluster(getStudentCluster(studentId));

    if (studentId) {
      fetchRemotePreferences(studentId).then((remotePrefs) => {
        if (remotePrefs && Object.keys(remotePrefs).length > 0) {
          setPreferences((prev) => ({
            ...prev,
            ...remotePrefs,
          }));
        }
      });
    }
  }, [studentId]);

  useEffect(() => {
    savePreferences(studentId, preferences);
  }, [preferences, studentId]);

  // Persist current exact URL route as last visited route for refresh & re-login preservation
  useEffect(() => {
    if (authenticatedStudent === studentId) {
      saveLastRoute(window.location.pathname);
    }
  }, [authenticatedStudent, location.pathname, studentId]);

  const setPage = (nextPage) => {
    if (nextPage === "subjects") {
      const savedBId = localStorage.getItem(`klef-active-bucket-${studentId}`) || "C0";
      const bObj = buckets.find((b) => b.id === savedBId) || buckets[0];
      navigate(portalPath(studentId, studentName, "subjects", {
        bucketId: bObj.id,
        bucketShort: bObj.short,
      }));
      return;
    }

    if (nextPage === "preferences") {
      const savedBId = localStorage.getItem(`klef-active-bucket-${studentId}`) || "C0";
      const bObj = buckets.find((b) => b.id === savedBId) || buckets[0];
      const selectedCourseCode = selections[bObj.id];
      const sub = bObj.subjects.find((s) => s.code === selectedCourseCode) || bObj.subjects[0];
      navigate(portalPath(studentId, studentName, "preferences", {
        bucketId: bObj.id,
        bucketShort: bObj.short,
        courseName: sub?.name || "Course",
        courseCode: sub?.code || "NONE",
      }));
      return;
    }

    navigate(portalPath(studentId, studentName, nextPage));
  };

  // Handlers for bucket changes that update URL dynamically
  const handleSubjectBucketChange = (newBucketId) => {
    localStorage.setItem(`klef-active-bucket-${studentId}`, newBucketId);
    const bObj = buckets.find((b) => b.id === newBucketId) || buckets[0];
    const newPath = portalPath(studentId, studentName, "subjects", {
      bucketId: bObj.id,
      bucketShort: bObj.short,
    });
    navigate(newPath, { replace: true });
  };

  const handlePreferencesBucketChange = (newBucketId, subjectObj) => {
    localStorage.setItem(`klef-active-bucket-${studentId}`, newBucketId);
    const bObj = buckets.find((b) => b.id === newBucketId) || buckets[0];
    const sub = subjectObj || bObj.subjects.find((s) => s.code === selections[newBucketId]) || bObj.subjects[0];
    const newPath = portalPath(studentId, studentName, "preferences", {
      bucketId: bObj.id,
      bucketShort: bObj.short,
      courseName: sub?.name || "Course",
      courseCode: sub?.code || "NONE",
    });
    navigate(newPath, { replace: true });
  };

  // Resolve initial active bucket from URL param or localStorage
  const activeBucketFromUrl = urlBucketNum || localStorage.getItem(`klef-active-bucket-${studentId}`) || "C0";

  const content = useMemo(() => {
    if (page === "overview") return <AcademicOverview studentId={studentId} />;
    if (page === "cluster")
      return (
        <ClusterSelection
          studentId={studentId}
          cluster={cluster}
          setCluster={(nextCluster) => {
            setCluster(nextCluster);
            saveStudentCluster(studentId, nextCluster);
          }}
          goTo={setPage}
        />
      );
    if (page === "subjects")
      return (
        <SubjectSelection
          studentId={studentId}
          studentName={studentName}
          selections={selections}
          setSelections={setSelections}
          goTo={setPage}
          activeBucketId={activeBucketFromUrl}
          onBucketChange={handleSubjectBucketChange}
        />
      );
    if (page === "preferences")
      return (
        <FacultyPreferences
          studentId={studentId}
          studentName={studentName}
          selections={selections}
          prefs={preferences}
          setPrefs={setPreferences}
          cluster={cluster || "Cluster 2"}
          activeBucketId={activeBucketFromUrl}
          onBucketChange={handlePreferencesBucketChange}
        />
      );
    if (page === "directory") return <FacultyDirectory cluster={cluster || "Cluster 2"} studentId={studentId} selections={selections} />;
    if (page === "my-preference")
      return (
        <MyPreferences
          studentId={studentId}
          selections={selections}
          setSelections={setSelections}
          prefs={preferences}
          setPrefs={setPreferences}
          cluster={cluster || "Cluster 2"}
          onResetAll={() => {
            setSelections({});
            setPreferences({});
          }}
        />
      );
    return <MyProfile studentId={studentId} />;
  }, [activeBucketFromUrl, cluster, dataVersion, page, preferences, selections, studentId, studentName]);

  if (authenticatedStudent !== studentId) return <Navigate to="/KLEF/8-2/GBS.php" replace />;

  return (
    <PortalShell
      page={page}
      setPage={setPage}
      studentId={studentId}
      onLogout={() => {
        signOut();
        window.location.href = "/KLEF/8-2/GBS.php";
      }}
    >
      {showGuidelines && (
        <RegistrationGuidelinesModal
          studentId={studentId}
          onAgree={handleAgreeGuidelines}
        />
      )}
      {content}
    </PortalShell>
  );
}

export function PortalRoutes() {
  return (
    <Routes>
      {/* Primary GBS.php and login endpoints */}
      <Route path="/" element={<Navigate to="/KLEF/8-2/GBS.php" replace />} />
      <Route path="/login" element={<Navigate to="/KLEF/8-2/GBS.php" replace />} />
      <Route path="/KLEF/8-2/GBS.php" element={<Login />} />
      <Route path="/KLEF/8-2/GBS/Auth/Reset-Password-Steps.php" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/reset-password.php" element={<ResetPassword />} />

      {/* Developer Information Endpoint */}
      <Route path="/KLEF/8-2/Developer/G-Bhaanu-Sai.php" element={<Developer />} />
      <Route path="/KLEF/8-2/Developer/G-Bhaanu-Sai" element={<Developer />} />

      {/* Administrator Portal Endpoints */}
      <Route path="/KLEF/8-2/Admin/G-Bhaanu-Sai/:pageName?" element={<Admin />} />

      {/* Deep Structured Routes for Subject Selection and Faculty Preferences */}
      <Route
        path="/KLEF/8-2/:studentId/:studentName/Subject-Selection/:bucketNum/:bucketCode.php"
        element={<PortalRoute />}
      />
      <Route
        path="/KLEF/8-2/:studentId/:studentName/Subject-Selection/:bucketNum/:bucketCode"
        element={<PortalRoute />}
      />
      <Route
        path="/KLEF/8-2/:studentId/:studentName/Faculty-Preferences/:bucketNum/:bucketCode/:courseName/:courseCode.php"
        element={<PortalRoute />}
      />
      <Route
        path="/KLEF/8-2/:studentId/:studentName/Faculty-Preferences/:bucketNum/:bucketCode/:courseName/:courseCode"
        element={<PortalRoute />}
      />

      {/* Standard Student Portal Endpoints */}
      <Route path="/KLEF/8-2/:studentId/:studentName/:pageName" element={<PortalRoute />} />

      {/* Legacy backwards-compatible routes */}
      <Route path="/KLEF/3-2/Developer/G-Bhaanu-Sai" element={<Developer />} />
      <Route path="/KLEF/3-2/Admin/G-Bhaanu-Sai/:pageName?" element={<Admin />} />
      <Route path="/KLEF/3-2/:studentId/:studentName/:pageName" element={<PortalRoute />} />

      <Route path="*" element={<Navigate to="/KLEF/8-2/GBS.php" replace />} />
    </Routes>
  );
}
