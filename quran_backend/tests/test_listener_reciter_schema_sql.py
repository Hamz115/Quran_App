from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
SQL_PATH = ROOT / "docs" / "supabase_listener_reciter_schema_v3.sql"
SUPABASE_API_PATH = ROOT / "quran_frontend" / "src" / "lib" / "supabase-api.ts"


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


if __name__ == "__main__":
    unittest.main()
