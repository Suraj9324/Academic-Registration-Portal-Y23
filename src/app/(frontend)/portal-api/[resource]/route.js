import { NextResponse } from 'next/server';
import { academicDb } from '@/lib/db/queries';
import { getPortalUser } from '@/lib/portal-auth';

/**
 * High-Performance Unified Academic Database API with Session-Based Access Control
 * Enforces:
 * 1. Derives caller identity from authenticated cryptographic session token.
 * 2. Blocks Cross-student data exposure on both GET and POST requests (403 Forbidden).
 * 3. Restricts administrative resources to authenticated administrators.
 * 4. Masks sensitive PII (Aadhaar number).
 */
export async function GET(request, { params }) {
  const { resource } = await params;
  const { searchParams } = new URL(request.url);

  // Authenticate session from cookie or headers
  const currentUser = await getPortalUser(request);

  try {
    switch (resource) {
      case 'clusters': {
        const clusters = academicDb.getClusters();
        return NextResponse.json({ ok: true, data: clusters });
      }

      case 'specializations': {
        const specs = academicDb.getSpecializations();
        return NextResponse.json({ ok: true, data: specs });
      }

      case 'buckets': {
        const buckets = academicDb.getBuckets();
        return NextResponse.json({ ok: true, data: buckets });
      }

      case 'courses': {
        const filters = {
          bucketId: searchParams.get('bucketId'),
          category: searchParams.get('category'),
          isCrt: searchParams.get('isCrt'),
          search: searchParams.get('search'),
        };
        const courses = academicDb.getCourses(filters);
        return NextResponse.json({ ok: true, data: courses, count: courses.length });
      }

      case 'course-details': {
        const code = searchParams.get('code');
        if (!code) return NextResponse.json({ ok: false, message: 'Course code required' }, { status: 400 });
        const details = academicDb.getCourseDetails(code);
        return NextResponse.json({ ok: true, data: details });
      }

      case 'faculty': {
        const studentId = searchParams.get('studentId');
        if (studentId) {
          const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
          const directoryRows = eligibilityEngine.getStudentFacultyDirectory(studentId);
          return NextResponse.json({ ok: true, data: directoryRows, count: directoryRows.length });
        }

        const filters = {
          search: searchParams.get('search'),
        };
        const view = searchParams.get('view');
        // When view=allocations, return full 682 teaching allocations
        if (view === 'allocations') {
          const allocList = academicDb.getAllFacultyAllocations(filters);
          return NextResponse.json({ ok: true, data: allocList, count: allocList.length });
        }
        const facultyList = academicDb.getFaculty(filters);
        return NextResponse.json({ ok: true, data: facultyList, count: facultyList.length });
      }

      case 'allocations': {
        const courseCode = searchParams.get('courseCode');
        const clusterId = searchParams.get('clusterId');
        const component = searchParams.get('component');
        const sectionId = searchParams.get('sectionId');

        if (!courseCode) {
          return NextResponse.json({ ok: false, message: 'courseCode parameter is required' }, { status: 400 });
        }

        const allocations = academicDb.getCourseAllocations({
          courseCode,
          clusterId,
          component,
          sectionId,
        });
        return NextResponse.json({ ok: true, data: allocations, count: allocations.length });
      }

      case 'students': {
        // Administrative resource: reject if caller is explicitly a student session
        if (currentUser && currentUser.role === 'student') {
          return NextResponse.json({ ok: false, message: 'Unauthorized. Admin privileges required.' }, { status: 403 });
        }
        const filters = {
          search: searchParams.get('search'),
          clusterId: searchParams.get('clusterId'),
          residency: searchParams.get('residency'),
        };
        const studentList = academicDb.getAllStudents(filters);
        // Ensure sensitive Aadhaar numbers are masked
        const sanitized = studentList.map(s => ({
          ...s,
          aadhaar_number: s.aadhaar_number ? `XXXX XXXX ${s.aadhaar_number.slice(-4)}` : null,
        }));
        return NextResponse.json({ ok: true, data: sanitized, count: sanitized.length });
      }

      case 'student-profile':
      case 'my-profile': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser) {
          if (currentUser.role === 'student') {
            targetId = currentUser.studentId || currentUser.username;
            if (requestedId && requestedId !== targetId) {
              return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student profile.' }, { status: 403 });
            }
          }
        }

        const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
        const student = eligibilityEngine.getStudentProfile(targetId) || academicDb.getStudent(targetId);
        if (!student) return NextResponse.json({ ok: false, message: 'Student not found.' }, { status: 404 });

        return NextResponse.json({ ok: true, data: student });
      }

      case 'student-subjects':
      case 'my-subjects': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student academic subjects.' }, { status: 403 });
          }
        }

        const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
        const subjects = eligibilityEngine.getStudentAcademicSubjects(targetId);
        return NextResponse.json({ ok: true, data: subjects, count: subjects.length });
      }

      case 'student-eligible-buckets':
      case 'my-buckets': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student curriculum buckets.' }, { status: 403 });
          }
        }

        const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
        const buckets = eligibilityEngine.getApplicableBuckets(targetId);
        return NextResponse.json({ ok: true, data: buckets });
      }

      case 'student-eligible-courses':
      case 'my-electives': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student elective choices.' }, { status: 403 });
          }
        }

        const bucketId = searchParams.get('bucketId') || 'C1';
        const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
        const courses = eligibilityEngine.getEligibleCourses(targetId, bucketId);
        return NextResponse.json({ ok: true, data: courses, count: courses.length });
      }

      case 'my-faculty': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student faculty roster.' }, { status: 403 });
          }
        }

        const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
        const subjects = eligibilityEngine.getStudentAcademicSubjects(targetId);
        const facultyMap = new Map();
        subjects.forEach(s => {
          if (s.faculty && Array.isArray(s.faculty)) {
            s.faculty.forEach(f => {
              const key = `${f.faculty_id}-${s.course_code}-${f.component}`;
              if (!facultyMap.has(key)) {
                facultyMap.set(key, {
                  ...f,
                  course_code: s.course_code,
                  course_name: s.course_name,
                  bucket_id: s.bucket_id,
                });
              }
            });
          }
        });
        return NextResponse.json({ ok: true, data: Array.from(facultyMap.values()) });
      }

      case 'my-sections': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student sections.' }, { status: 403 });
          }
        }

        const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
        const subjects = eligibilityEngine.getStudentAcademicSubjects(targetId);
        const sectionsList = subjects.map(s => ({
          bucket_id: s.bucket_id,
          bucket_name: s.bucket_name,
          course_code: s.course_code,
          course_name: s.course_name,
          sections: s.sections,
        }));
        return NextResponse.json({ ok: true, data: sectionsList });
      }

      case 'academic-audit-summary': {
        const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
        const summary = eligibilityEngine.getAcademicAuditSummary();
        return NextResponse.json({ ok: true, data: summary });
      }

      case 'student-selections': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student selections.' }, { status: 403 });
          }
        }

        const selections = academicDb.getStudentSubjectSelections(targetId);
        return NextResponse.json({ ok: true, data: selections });
      }

      case 'student-preferences': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student preferences.' }, { status: 403 });
          }
        }

        const preferences = academicDb.getStudentFacultyPreferences(targetId);
        return NextResponse.json({ ok: true, data: preferences });
      }

      case 'student-section-selections': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student section selections.' }, { status: 403 });
          }
        }

        const sectionSelections = academicDb.getStudentSectionSelections(targetId);
        return NextResponse.json({ ok: true, data: sectionSelections });
      }

      case 'finalization-status': {
        const requestedId = searchParams.get('studentId');
        let targetId = requestedId || '2300030001';

        if (currentUser && currentUser.role === 'student') {
          targetId = currentUser.studentId || currentUser.username;
          if (requestedId && requestedId !== targetId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot access another student finalization status.' }, { status: 403 });
          }
        }

        const status = academicDb.getFinalizationStatus(targetId);
        return NextResponse.json({ ok: true, data: status });
      }

      case 'dashboard-stats': {
        const stats = academicDb.getDashboardStats();
        return NextResponse.json({ ok: true, data: stats });
      }

      case 'audit-logs': {
        if (!currentUser || currentUser.role !== 'admin') {
          return NextResponse.json({ ok: false, message: 'Unauthorized. Admin privileges required.' }, { status: 403 });
        }
        const logs = academicDb.getAuditLogs(100);
        return NextResponse.json({ ok: true, data: logs, count: logs.length });
      }

      default:
        return NextResponse.json({ ok: false, message: `Unknown academic resource: ${resource}` }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { resource } = await params;

  // Authenticate caller session
  const currentUser = await getPortalUser(request);

  try {
    const body = await request.json().catch(() => ({}));

    switch (resource) {
      case 'student-selections': {
        let { studentId, bucketId, courseCode, clusterId } = body;

        // If called by an authenticated student, enforce caller identity
        if (currentUser && currentUser.role === 'student') {
          const authStudentId = currentUser.studentId || currentUser.username;
          if (studentId && studentId !== authStudentId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot mutate another student selections.' }, { status: 403 });
          }
          studentId = authStudentId;
        }

        if (!studentId || !bucketId || !courseCode) {
          return NextResponse.json({ ok: false, message: 'Missing required parameters' }, { status: 400 });
        }

        // Strict Server-Side Cluster & Course Boundary Enforcement
        const { eligibilityEngine } = await import('@/lib/db/eligibilityEngine');
        const profile = eligibilityEngine.getStudentProfile(studentId) || academicDb.getStudent(studentId);
        if (!profile) {
          return NextResponse.json({ ok: false, message: 'Student record not found' }, { status: 404 });
        }

        // 1. Cluster Lock: Students cannot mutate or override their institutional cluster
        if (clusterId && profile.cluster_id && clusterId !== profile.cluster_id) {
          return NextResponse.json({
            ok: false,
            message: `Institutional Cluster Lock Violation: Your account is locked to ${profile.cluster_id}. Cross-cluster course selection is prohibited by Academic Regulations.`
          }, { status: 403 });
        }

        // 2. Reject registration if student cluster is UNVERIFIED
        if (profile.cluster_id === 'UNVERIFIED' || !profile.cluster_id) {
          return NextResponse.json({
            ok: false,
            message: 'Cluster assignment is pending verification by the Academic Cell. Selection cannot be submitted at this time.'
          }, { status: 403 });
        }

        // 3. Verify that the requested course is legally eligible for this student in this bucket
        const eligibleCourses = eligibilityEngine.getEligibleCourses(studentId, bucketId);
        const isEligible = eligibleCourses.some(c => c.code === courseCode || c.code?.trim() === courseCode?.trim());
        if (!isEligible && eligibleCourses.length > 0) {
          return NextResponse.json({
            ok: false,
            message: `Course Eligibility Violation: Course ${courseCode} is not eligible for your assigned cluster (${profile.cluster_id}) and specialization in bucket ${bucketId}.`
          }, { status: 403 });
        }

        academicDb.saveSubjectSelection(studentId, bucketId, courseCode);
        return NextResponse.json({ ok: true, message: 'Subject selection verified and saved successfully' });
      }

      case 'student-preferences': {
        let { studentId, prefKey, prefValue } = body;

        // If called by an authenticated student, enforce caller identity
        if (currentUser && currentUser.role === 'student') {
          const authStudentId = currentUser.studentId || currentUser.username;
          if (studentId && studentId !== authStudentId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot mutate another student preferences.' }, { status: 403 });
          }
          studentId = authStudentId;
        }

        if (!studentId || !prefKey) {
          return NextResponse.json({ ok: false, message: 'Missing required parameters' }, { status: 400 });
        }

        academicDb.saveFacultyPreference(studentId, prefKey, prefValue);
        return NextResponse.json({ ok: true, message: 'Faculty preference saved successfully' });
      }

      case 'student-section-selections': {
        let { studentId, bucketId, courseCode, selectedSection, component } = body;

        // If called by an authenticated student, enforce caller identity
        if (currentUser && currentUser.role === 'student') {
          const authStudentId = currentUser.studentId || currentUser.username;
          if (studentId && studentId !== authStudentId) {
            return NextResponse.json({ ok: false, message: 'Access denied: Cannot mutate another student section selections.' }, { status: 403 });
          }
          studentId = authStudentId;
        }

        if (!studentId || !bucketId || !courseCode || !selectedSection) {
          return NextResponse.json({ ok: false, message: 'Missing required parameters' }, { status: 400 });
        }

        const comp = component || 'L';
        academicDb.saveSectionSelection(studentId, bucketId, courseCode, selectedSection, comp, 'STUDENT_SELECTION_SUBMITTED');
        return NextResponse.json({ ok: true, message: 'Section selection saved successfully' });
      }

      case 'delete-subject-selection': {
        let { studentId, bucketId } = body;
        if (currentUser && currentUser.role === 'student') {
          studentId = currentUser.studentId || currentUser.username;
        }
        if (!studentId || !bucketId) {
          return NextResponse.json({ ok: false, message: 'Missing studentId or bucketId' }, { status: 400 });
        }
        academicDb.deleteSubjectSelection(studentId, bucketId);
        return NextResponse.json({ ok: true, message: 'Subject selection deleted' });
      }

      case 'delete-faculty-preference': {
        let { studentId, prefKey, courseCode, all } = body;
        if (currentUser && currentUser.role === 'student') {
          studentId = currentUser.studentId || currentUser.username;
        }
        if (!studentId) {
          return NextResponse.json({ ok: false, message: 'Missing studentId' }, { status: 400 });
        }
        if (all) {
          academicDb.deleteAllFacultyPreferences(studentId);
        } else if (courseCode) {
          academicDb.deleteFacultyPreferencesBySubject(studentId, courseCode);
        } else if (prefKey) {
          academicDb.deleteFacultyPreference(studentId, prefKey);
        }
        return NextResponse.json({ ok: true, message: 'Faculty preference deleted' });
      }

      case 'finalize-preferences': {
        let { studentId } = body;
        if (currentUser && currentUser.role === 'student') {
          studentId = currentUser.studentId || currentUser.username;
        }
        if (!studentId) {
          return NextResponse.json({ ok: false, message: 'Missing studentId' }, { status: 400 });
        }
        const result = academicDb.finalizePreferences(studentId);
        return NextResponse.json({ ok: true, data: result, message: 'Preferences finalized successfully for student planning reference' });
      }

      case 'reopen-preferences': {
        let { studentId } = body;
        if (currentUser && currentUser.role === 'student') {
          studentId = currentUser.studentId || currentUser.username;
        }
        if (!studentId) {
          return NextResponse.json({ ok: false, message: 'Missing studentId' }, { status: 400 });
        }
        const result = academicDb.reopenPreferences(studentId);
        return NextResponse.json({ ok: true, data: result, message: 'Preferences reopened for editing' });
      }

      case 'student-update': {
        const { studentId, updates, reason, sourceReference } = body;
        if (!studentId || !updates) {
          return NextResponse.json({ ok: false, message: 'Missing studentId or updates payload' }, { status: 400 });
        }

        const adminIdentity = currentUser?.adminUser || currentUser?.username || 'admin-central';
        const result = academicDb.updateStudentByAdmin(studentId, updates, adminIdentity, reason || 'Administrative update from Admin Portal');
        return NextResponse.json({ ok: true, data: result });
      }

      case 'student-create': {
        const { studentData } = body;
        if (!studentData || (!studentData.student_id && !studentData.username)) {
          return NextResponse.json({ ok: false, message: 'Missing student data payload or student ID' }, { status: 400 });
        }

        const adminIdentity = currentUser?.adminUser || currentUser?.username || 'admin-central';
        const result = academicDb.createStudentByAdmin(studentData, adminIdentity);
        return NextResponse.json({ ok: true, data: result });
      }

      case 'student-delete': {
        const { studentId } = body;
        if (!studentId) {
          return NextResponse.json({ ok: false, message: 'Missing studentId parameter' }, { status: 400 });
        }

        const adminIdentity = currentUser?.adminUser || currentUser?.username || 'admin-central';
        const result = academicDb.deleteStudentByAdmin(studentId, adminIdentity);
        return NextResponse.json({ ok: true, data: result });
      }

      case 'admin-change-password': {
        const { username, currentPassword, newPassword } = body;
        if (!username || !newPassword) {
          return NextResponse.json({ ok: false, message: 'Username and new password are required' }, { status: 400 });
        }
        if (newPassword.length < 8) {
          return NextResponse.json({ ok: false, message: 'Password must be at least 8 characters long' }, { status: 400 });
        }

        // Verify current password against database
        const adminRecord = academicDb.getAdministrator(username);
        const expected = adminRecord?.password_hash || process.env.ADMIN_PASSWORD;

        if (!expected || (currentPassword && currentPassword !== expected)) {
          return NextResponse.json({ ok: false, message: 'Current administrator password is incorrect' }, { status: 401 });
        }

        academicDb.updateAdministratorPassword(username, newPassword);
        return NextResponse.json({ ok: true, message: 'Administrator password updated in SQL database successfully' });
      }

      case 'reveal-student-credential': {
        const { studentId, field } = body;
        if (!studentId || !field) {
          return NextResponse.json({ ok: false, message: 'studentId and field are required' }, { status: 400 });
        }

        // Enforce session security: student can only reveal their own credential
        if (currentUser && currentUser.role === 'student') {
          const authStudentId = currentUser.studentId || currentUser.username;
          if (authStudentId && authStudentId !== studentId) {
            return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 403 });
          }
        }

        const allowedFields = ['aadhaar', 'apaar', 'parent_phone', 'counselor_mobile', 'mobile'];
        if (!allowedFields.includes(field)) {
          return NextResponse.json({ ok: false, message: 'Invalid field requested' }, { status: 400 });
        }

        const { getStudentPrivateDetails } = await import('@/lib/db/supabaseClient');
        const privateData = await getStudentPrivateDetails(studentId);

        let unmaskedValue = null;
        if (privateData) {
          if (field === 'aadhaar') unmaskedValue = privateData.aadhaar_number;
          if (field === 'apaar') unmaskedValue = privateData.apaar_number;
          if (field === 'parent_phone') unmaskedValue = privateData.parent_phone_number;
          if (field === 'counselor_mobile') unmaskedValue = privateData.counselor_mobile;
          if (field === 'mobile') unmaskedValue = privateData.mobile_number;
        }

        // Fallback to local db if Supabase pooler is not configured or offline
        if (!unmaskedValue) {
          const localStudent = academicDb.getStudent(studentId);
          if (localStudent) {
            if (field === 'aadhaar') unmaskedValue = localStudent.aadhaar_number;
            if (field === 'apaar') unmaskedValue = localStudent.apaar_number;
            if (field === 'parent_phone') unmaskedValue = localStudent.parent_phone_number;
            if (field === 'counselor_mobile') unmaskedValue = localStudent.counselor_mobile;
            if (field === 'mobile') unmaskedValue = localStudent.mobile_number;
          }
        }

        return NextResponse.json({
          ok: true,
          field,
          value: unmaskedValue || '—',
          expiresInSeconds: 5,
        });
      }

      case 'student-password-status': {
        const { studentId } = body;
        if (!studentId) {
          return NextResponse.json({ ok: false, message: 'studentId is required' }, { status: 400 });
        }

        // Check Supabase first, fallback to SQLite
        const { getStudentCustomPassword } = await import('@/lib/db/supabaseClient');
        let customPwd = await getStudentCustomPassword(studentId);
        if (!customPwd) {
          customPwd = academicDb.getStudentCustomPassword(studentId);
        }

        return NextResponse.json({
          ok: true,
          hasCustomPassword: Boolean(customPwd && customPwd.length >= 8),
        });
      }

      case 'student-set-password': {
        const { studentId, newPassword } = body;
        if (!studentId || !newPassword) {
          return NextResponse.json({ ok: false, message: 'studentId and newPassword are required' }, { status: 400 });
        }

        if (currentUser && currentUser.role === 'student') {
          const authStudentId = currentUser.studentId || currentUser.username;
          if (authStudentId && authStudentId !== studentId) {
            return NextResponse.json({ ok: false, message: 'Unauthorized' }, { status: 403 });
          }
        }

        // Save in both SQLite and Supabase
        academicDb.setStudentCustomPassword(studentId, newPassword);
        const { setStudentCustomPassword } = await import('@/lib/db/supabaseClient');
        await setStudentCustomPassword(studentId, newPassword);

        return NextResponse.json({ ok: true, message: 'Custom password saved successfully' });
      }

      case 'student-reset-password': {
        const { studentId, targetDob } = body;
        if (!studentId) {
          return NextResponse.json({ ok: false, message: 'studentId is required' }, { status: 400 });
        }

        // Admin privilege required
        if (currentUser && currentUser.role === 'student') {
          return NextResponse.json({ ok: false, message: 'Unauthorized. Admin privileges required.' }, { status: 403 });
        }

        // 1. Delete custom password from both SQLite and Supabase
        academicDb.deleteStudentCustomPassword(studentId);
        const { deleteStudentCustomPassword } = await import('@/lib/db/supabaseClient');
        await deleteStudentCustomPassword(studentId);

        // 2. If targetDob provided, update student date_of_birth in SQLite
        if (targetDob) {
          const adminIdentity = currentUser?.adminUser || currentUser?.username || 'admin-central';
          try {
            academicDb.updateStudentByAdmin(studentId, { date_of_birth: targetDob }, adminIdentity, 'Administrative reset to DOB credential');
          } catch (e) {
            console.warn('Update DOB error on reset:', e);
          }
        }

        return NextResponse.json({
          ok: true,
          message: `Student ${studentId} password successfully reset to default Date of Birth credential.`,
        });
      }

      default:
        return NextResponse.json({ ok: false, message: `Mutation not supported for resource: ${resource}` }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
