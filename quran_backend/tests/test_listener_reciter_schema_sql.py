from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
SQL_PATH = ROOT / "docs" / "supabase_listener_reciter_schema_v3.sql"
SUPABASE_API_PATH = ROOT / "quran_frontend" / "src" / "lib" / "supabase-api.ts"
BACKEND_MAIN_PATH = ROOT / "quran_backend" / "main.py"
SYNC_SERVICE_PATH = ROOT / "quran_backend" / "sync_service.py"
BACKEND_SPEC_PATH = ROOT / "quran_backend" / "QuranTrackBackend.spec"
TAURI_CARGO_PATH = ROOT / "quran_frontend" / "src-tauri" / "Cargo.toml"
TOUR_CONTEXT_PATH = ROOT / "quran_frontend" / "src" / "contexts" / "TourContext.tsx"
TOUR_PATH = ROOT / "quran_frontend" / "src" / "lib" / "tour.ts"
TEACHER_CLASSES_PATH = ROOT / "quran_frontend" / "src" / "pages" / "TeacherClasses.tsx"
DASHBOARD_PATH = ROOT / "quran_frontend" / "src" / "pages" / "Dashboard.tsx"
FRONTEND_API_PATH = ROOT / "quran_frontend" / "src" / "api.ts"
LOCAL_API_PATH = ROOT / "quran_frontend" / "src" / "lib" / "local-api.ts"
CLASSROOM_PATH = ROOT / "quran_frontend" / "src" / "pages" / "Classroom.tsx"
UPDATER_PATH = ROOT / "quran_frontend" / "src" / "lib" / "updater.ts"


class ListenerReciterSchemaSqlTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sql = SQL_PATH.read_text(encoding="utf-8")

    def test_migration_renames_canonical_tables_and_columns(self):
        sql = self.sql
        self.assertIn("ALTER TABLE public.teacher_students RENAME TO listener_reciters", sql)
        self.assertIn("ALTER TABLE public.class_students RENAME TO class_reciters", sql)
        self.assertIn("RENAME COLUMN teacher_id TO listener_id", sql)
        self.assertIn("RENAME COLUMN student_id TO reciter_id", sql)
        self.assertIn("ALTER TABLE public.profiles RENAME COLUMN student_id TO user_code", sql)

    def test_classes_teacher_id_is_kept_for_dual_write_compatibility(self):
        sql = re.sub(r"--.*", "", self.sql)
        self.assertNotIn("ALTER TABLE public.classes DROP COLUMN teacher_id", sql)
        self.assertIn("sync_classes_listener_teacher_ids", sql)
        self.assertIn("teacher_id = listener_id", sql)

    def test_obsolete_is_class_teacher_is_not_recreated(self):
        sql = self.sql
        self.assertIn("DROP FUNCTION IF EXISTS public.is_class_teacher(uuid)", sql)
        self.assertNotIn("CREATE FUNCTION public.is_class_teacher", sql)
        self.assertIn("CREATE FUNCTION public.is_session_listener", sql)

    def test_legacy_compatibility_views_respect_underlying_rls(self):
        sql = self.sql
        self.assertEqual(sql.count("WITH (security_invoker = true) AS"), 2)

    def test_v2_assignment_fallback_omits_canonical_column(self):
        api_source = SUPABASE_API_PATH.read_text(encoding="utf-8")
        self.assertNotIn("reciter_id: undefined", api_source)
        self.assertGreaterEqual(
            api_source.count("map(({ reciter_id, ..."),
            2,
            "Both assignment write fallbacks must remove reciter_id before PostgREST infers columns",
        )

    def test_active_ui_uses_listener_reciter_copy(self):
        ui_paths = [
            ROOT / "quran_frontend/src/pages/Classes.tsx",
            ROOT / "quran_frontend/src/pages/TeacherClasses.tsx",
            ROOT / "quran_frontend/src/pages/TeacherDashboard.tsx",
            ROOT / "quran_frontend/src/pages/StudentDashboard.tsx",
            ROOT / "quran_frontend/src/pages/Classroom.tsx",
            ROOT / "quran_frontend/src/pages/QuranReader.tsx",
            ROOT / "quran_frontend/src/components/teacher-classes/ReportPanel.tsx",
            ROOT / "quran_frontend/src/components/teacher-classes/ReportPerformanceTab.tsx",
            ROOT / "quran_frontend/src/lib/report-export.ts",
            ROOT / "quran_mobile/lib/presentation/providers/providers.dart",
            ROOT / "quran_mobile/lib/presentation/screens/dashboard/dashboard_screen.dart",
            ROOT / "quran_mobile/lib/presentation/screens/classes/classes_screen.dart",
            ROOT / "quran_mobile/lib/presentation/screens/classes/create_class_screen.dart",
            ROOT / "quran_mobile/lib/presentation/screens/classroom/classroom_screen.dart",
            ROOT / "quran_mobile/lib/presentation/screens/reader/quran_reader_screen.dart",
            ROOT / "quran_mobile/lib/presentation/screens/classes/report/report_panel.dart",
            ROOT / "quran_mobile/lib/presentation/screens/classes/report/report_performance_tab.dart",
        ]
        ui_source = "\n".join(path.read_text(encoding="utf-8") for path in ui_paths)
        for legacy_copy in (
            "Select Students",
            "No students added yet",
            "Same for all students",
            "Different per student",
            "Assign to Student",
            "All Students",
            "Student since",
            "Student Progress Report",
            "Teacher Notes",
            "Add Student",
            "No students yet",
            "Select a student",
            "New Class",
            "Create Class",
            "Classroom Settings",
            "Class Notes",
            "MISTAKES IN THIS CLASS",
            "Class Date",
            "Loading classes",
            "Loading class",
            "this class",
            "MISTAKES / CLASS",
            "New Class",
            "Create Class",
            "No classes yet",
            "Loading classes",
            "Classes This Week",
            "Classes Attended",
            "Mistakes from previous classes",
            "No previous classes",
            "Same as last class",
            "'Class'",
        ):
            self.assertNotIn(legacy_copy, ui_source)

    def test_packaged_sidecar_uses_rls_user_token_without_privileged_env(self):
        spec = BACKEND_SPEC_PATH.read_text(encoding="utf-8")
        sync_service = SYNC_SERVICE_PATH.read_text(encoding="utf-8")
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")

        self.assertNotIn("('.env', '.')", spec)
        self.assertIn("'.env.public'", spec)
        self.assertNotIn("SUPABASE_SERVICE_KEY", sync_service)
        self.assertNotIn("verify_signature", backend_main)
        self.assertIn(".auth.get_user(token)", backend_main)
        self.assertIn("client.postgrest.auth(access_token)", sync_service)

    def test_sqlite_sync_ids_use_partial_unique_indexes(self):
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")

        for table in (
            "classes",
            "assignments",
            "mistakes",
            "mistake_occurrences",
        ):
            self.assertNotIn(
                f'"ALTER TABLE {table} ADD COLUMN supabase_id TEXT UNIQUE"',
                backend_main,
            )
            self.assertIn(f"ALTER TABLE {table} ADD COLUMN supabase_id TEXT", backend_main)
        self.assertIn(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_supabase_id",
            backend_main,
        )

    def test_tauri_executable_version_matches_release(self):
        cargo = TAURI_CARGO_PATH.read_text(encoding="utf-8")
        self.assertIn('version = "2.0.0"', cargo)

    def test_local_session_creation_returns_canonical_id_when_online(self):
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")

        self.assertIn(
            'push_pending_classes(supabase_user_id, user["access_token"])',
            backend_main,
        )
        self.assertIn(
            '"SELECT supabase_id FROM classes WHERE id = ?"',
            backend_main,
        )
        self.assertIn('"id": canonical_id or str(class_id)', backend_main)

    def test_local_sync_pulls_child_records_and_avoids_sqlite_row_get(self):
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")
        sync_service = SYNC_SERVICE_PATH.read_text(encoding="utf-8")

        self.assertNotIn('existing.get("supabase_id")', backend_main)
        self.assertIn('table("class_reciters").select("*")', sync_service)
        self.assertIn('table("assignments").select("*")', sync_service)
        self.assertIn('table("mistake_occurrences").select("*")', sync_service)
        self.assertIn('"reciter_id", list(target_ids)', sync_service)

    def test_desktop_tour_uses_canonical_dashboard_route(self):
        tour_context = TOUR_CONTEXT_PATH.read_text(encoding="utf-8")

        self.assertNotIn("navigate('/dashboard')", tour_context)
        self.assertNotIn("location.pathname === '/dashboard'", tour_context)
        self.assertIn("location.pathname === '/'", tour_context)

    def test_dashboard_tour_waits_for_async_targets(self):
        tour = TOUR_PATH.read_text(encoding="utf-8")
        dashboard = DASHBOARD_PATH.read_text(encoding="utf-8")

        self.assertIn(
            "waitForElement: '[data-tour=\"add-student-btn\"]'",
            tour,
        )
        self.assertIn(
            "waitForElement: '[data-tour=\"start-class-btn\"]'",
            tour,
        )
        self.assertIn('data-tour="add-student-btn"', dashboard)
        self.assertIn('data-tour="start-class-btn"', dashboard)
        self.assertIn(
            "element: '[data-tour=\"mode-by-surah\"]'",
            tour,
        )

    def test_tour_transitions_do_not_use_legacy_fixed_delays(self):
        tour_context = TOUR_CONTEXT_PATH.read_text(encoding="utf-8")

        self.assertIn("new MutationObserver", tour_context)
        self.assertIn("maxWait = 1_500", tour_context)
        self.assertIn("document.addEventListener(eventType, handler, true)", tour_context)
        self.assertIn("eventTarget?.closest(target)", tour_context)
        self.assertIn("if (stepDef.waitForPath || stepDef.waitForPathPrefix)", tour_context)
        self.assertIn("location.pathname === stepDef.waitForPath", tour_context)
        self.assertIn("advanceToStepRef.current(currentStep + 1)", tour_context)
        self.assertEqual(
            tour_context.count("!targetElement?.closest('[data-tour=\"word-popup\"]')"),
            2,
        )
        self.assertNotIn("const delay = waitSelector ? 200 : 600", tour_context)
        self.assertNotIn("setTimeout(() => showStep(0), 300)", tour_context)
        self.assertEqual(
            TOUR_PATH.read_text(encoding="utf-8").count("waitForElement: '[data-tour=\"word-popup\"]'"),
            1,
        )

    def test_tutorial_mistakes_are_disposable_and_existing_lookup_is_optional(self):
        classroom = CLASSROOM_PATH.read_text(encoding="utf-8")
        supabase_api = SUPABASE_API_PATH.read_text(encoding="utf-8")

        self.assertIn("const { isActive: isTourActive } = useTour()", classroom)
        self.assertIn("if (isTourActive) return", classroom)
        self.assertIn("if (isTeacher && !selectedStudentId && !isTourActive) return", classroom)
        self.assertIn("(isTourActive || summaryMistakes.length > 0", classroom)
        self.assertIn("((selectedStudentId && classData.students) || isTourActive)", classroom)
        self.assertIn("if (isTourActive || !selectedStudentId) return", classroom)
        self.assertGreaterEqual(supabase_api.count("query.maybeSingle()"), 2)

    def test_local_mistake_identity_is_scoped_per_reciter(self):
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")

        self.assertIn("legacy_mistake_identity", backend_main)
        self.assertIn("CREATE TABLE mistakes_reciter_scoped", backend_main)
        self.assertIn("idx_mistakes_reciter_location", backend_main)
        self.assertIn("supabase_reciter_id", backend_main)
        self.assertNotIn(
            "UNIQUE(surah_number, ayah_number, word_index, char_index)",
            backend_main,
        )

    def test_session_portion_suggestions_do_not_overwrite_back_navigation(self):
        teacher_classes = TEACHER_CLASSES_PATH.read_text(encoding="utf-8")

        self.assertIn(
            "suggestedPortionsAppliedFor.current === selectedStudentsKey",
            teacher_classes,
        )
        self.assertIn("suggestedPortionsAppliedFor.current = null", teacher_classes)

    def test_mistake_sync_is_serialized_without_long_sqlite_write_lock(self):
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")
        sync_service = SYNC_SERVICE_PATH.read_text(encoding="utf-8")

        self.assertIn("with _mistake_sync_lock:", sync_service)
        self.assertIn("PRAGMA busy_timeout = 15000", sync_service)
        commit_index = sync_service.index(
            "conn.commit()\n\n    for local_id, supabase_id, success in sync_results:"
        )
        occurrence_index = sync_service.index(
            "push_mistake_occurrences(conn, supabase, local_id, supabase_id)",
            commit_index,
        )
        self.assertLess(commit_index, occurrence_index)
        self.assertIn("existing_occurrence = conn.execute", backend_main)
        self.assertIn(
            "SET supabase_id = ?, sync_status = 'synced'",
            sync_service,
        )
        self.assertIn("Remove only non-canonical duplicates", sync_service)

    def test_class_pull_releases_sqlite_writes_before_network_requests(self):
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")
        sync_service = SYNC_SERVICE_PATH.read_text(encoding="utf-8")
        class_pull = sync_service[sync_service.index("def pull_classes("):]

        self.assertIn("sqlite3.connect(APP_DB, timeout=15)", backend_main)
        self.assertIn('conn.execute("PRAGMA busy_timeout = 15000")', backend_main)

        local_id_index = class_pull.index("local_class_id = local_class_row")
        assignment_request_index = class_pull.index(
            'supabase.table("assignments").select("*")',
            local_id_index,
        )
        class_commit_index = class_pull.index("conn.commit()", local_id_index)
        self.assertLess(class_commit_index, assignment_request_index)

        assignment_write_index = class_pull.index(
            'results["assignments"] += 1',
            assignment_request_index,
        )
        enrollment_request_index = class_pull.index(
            'supabase.table("class_reciters").select("*")',
            assignment_write_index,
        )
        assignment_commit_index = class_pull.index(
            "conn.commit()",
            assignment_write_index,
        )
        self.assertLess(assignment_commit_index, enrollment_request_index)

    def test_per_reciter_performance_is_mirrored_into_local_snapshot(self):
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")
        sync_service = SYNC_SERVICE_PATH.read_text(encoding="utf-8")
        frontend_api = FRONTEND_API_PATH.read_text(encoding="utf-8")

        self.assertIn(
            '@app.put("/api/local/classes/{class_id}/student-performance")',
            backend_main,
        )
        self.assertIn("updateLocalStudentPerformance", frontend_api)
        self.assertIn('enrollment.get("performance")', sync_service)

    def test_confirmed_portion_edits_are_mirrored_and_clear_ayah_bounds(self):
        backend_main = BACKEND_MAIN_PATH.read_text(encoding="utf-8")
        frontend_api = FRONTEND_API_PATH.read_text(encoding="utf-8")
        local_api = LOCAL_API_PATH.read_text(encoding="utf-8")
        classroom = CLASSROOM_PATH.read_text(encoding="utf-8")

        self.assertIn(
            '@app.put("/api/local/assignments/{assignment_id}")',
            backend_main,
        )
        self.assertIn("c.supabase_listener_id = ?", backend_main)
        self.assertIn("updateLocalAssignment", frontend_api)
        self.assertIn(
            "await updateLocalAssignment(assignmentId, data)",
            frontend_api,
        )
        self.assertIn("/api/local/assignments/${assignmentId}", local_api)
        self.assertIn("start_ayah: editPortionStartAyah ?? null", classroom)
        self.assertIn("assignments: current.assignments.map", classroom)

    def test_automatic_updater_failure_does_not_block_application(self):
        updater = UPDATER_PATH.read_text(encoding="utf-8")

        self.assertIn("if (onEvent)", updater)
        self.assertIn("Automatic update check failed", updater)

    def test_signed_out_session_cannot_be_reauthenticated_by_stale_profile_fetch(self):
        auth_context = TOUR_CONTEXT_PATH.parent.joinpath(
            "AuthContext.tsx"
        ).read_text(encoding="utf-8")

        self.assertIn("latestAuthUserIdRef.current = null", auth_context)
        self.assertIn(
            "latestAuthUserIdRef.current === newSession.user.id",
            auth_context,
        )
        self.assertIn("isAuthenticated: !!user && !!session", auth_context)
        self.assertIn("Supabase auth callbacks run under", auth_context)
        self.assertNotIn(
            "async (event, newSession) =>",
            auth_context,
        )
        self.assertIn("isMounted && !newSession?.user", auth_context)


if __name__ == "__main__":
    unittest.main()
