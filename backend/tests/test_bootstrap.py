import unittest

from app.bootstrap import initialize_database, should_auto_create_schema


class BootstrapTests(unittest.TestCase):
    def test_should_auto_create_schema_enabled_only_in_debug_when_unset(self):
        self.assertTrue(should_auto_create_schema(debug=True, db_auto_create=None))
        self.assertFalse(should_auto_create_schema(debug=False, db_auto_create=None))

    def test_should_auto_create_schema_honors_explicit_override(self):
        self.assertTrue(should_auto_create_schema(debug=False, db_auto_create=True))
        self.assertFalse(should_auto_create_schema(debug=True, db_auto_create=False))

    def test_initialize_database_calls_create_all_when_enabled(self):
        class FakeMetadata:
            def __init__(self):
                self.calls = []

            def create_all(self, bind):
                self.calls.append(bind)

        class FakeBase:
            metadata = FakeMetadata()

        engine = object()

        initialized = initialize_database(base=FakeBase, engine=engine, should_create=True)

        self.assertTrue(initialized)
        self.assertEqual(FakeBase.metadata.calls, [engine])

    def test_initialize_database_skips_create_all_when_disabled(self):
        class FakeMetadata:
            def __init__(self):
                self.calls = []

            def create_all(self, bind):
                self.calls.append(bind)

        class FakeBase:
            metadata = FakeMetadata()

        initialized = initialize_database(base=FakeBase, engine=object(), should_create=False)

        self.assertFalse(initialized)
        self.assertEqual(FakeBase.metadata.calls, [])


if __name__ == "__main__":
    unittest.main()
