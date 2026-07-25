from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[2]
SQL_PATH = ROOT / "docs" / "supabase_listener_reciter_schema_v3.sql"


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


if __name__ == "__main__":
    unittest.main()
