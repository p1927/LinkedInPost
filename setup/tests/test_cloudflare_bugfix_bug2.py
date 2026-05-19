"""Regression tests for Bug 2 in cloudflare.py.

Bug 2: provision_d1_database() - D1 creation subprocess failures must be properly raised
"""
from __future__ import annotations

from unittest.mock import patch, MagicMock

import pytest


class TestBug2_D1CreationSubprocessFailure:
    """Bug 2: D1 creation subprocess failures must be properly raised, not silently swallowed."""

    def test_both_json_and_fallback_commands_fail_raises(self) -> None:
        """If both --json and fallback commands fail, the error must be raised."""
        from setup.cloudflare import provision_d1_database
        import setup.cloudflare as cf_module

        call_count = 0

        def fake_run_command(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            # Both calls fail
            raise RuntimeError(f'Command failed: wrangler d1 create (attempt {call_count})')

        with patch.object(cf_module, 'run_command', side_effect=fake_run_command):
            with patch.object(cf_module, '_extract_d1_database_id', return_value=''):
                with patch.object(cf_module, '_apply_d1_migrations'):
                    with pytest.raises(RuntimeError, match='Command failed'):
                        provision_d1_database()
                    assert call_count == 2

    def test_fallback_command_failure_raises_with_correct_message(self) -> None:
        """If --json command fails and fallback also fails, error propagates."""
        from setup.cloudflare import provision_d1_database
        import setup.cloudflare as cf_module

        call_count = 0

        def fake_run_command(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First call (--json) fails
                raise RuntimeError('Command failed: wrangler d1 create --json')
            else:
                # Second call (fallback) also fails
                raise RuntimeError('Command failed: wrangler d1 create (fallback)')

        with patch.object(cf_module, 'run_command', side_effect=fake_run_command):
            with patch.object(cf_module, '_extract_d1_database_id', return_value=''):
                with patch.object(cf_module, '_apply_d1_migrations'):
                    with pytest.raises(RuntimeError, match='fallback'):
                        provision_d1_database()
                    assert call_count == 2

    def test_json_command_succeeds_normal_flow(self) -> None:
        """Normal flow: --json command succeeds, no fallback needed."""
        from setup.cloudflare import provision_d1_database
        import setup.cloudflare as cf_module

        mock_result = MagicMock()
        mock_result.stdout = '{"uuid": "test-uuid-1234"}'

        call_count = 0

        def fake_run_command(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            # First call (with --json) succeeds
            return mock_result

        with patch.object(cf_module, 'run_command', side_effect=fake_run_command):
            with patch.object(cf_module, '_extract_d1_database_id', return_value='test-uuid-1234'):
                with patch.object(cf_module, '_patch_d1_database_id') as mock_patch:
                    with patch.object(cf_module, '_apply_d1_migrations'):
                        provision_d1_database()

        assert call_count == 1
        mock_patch.assert_called_once_with('test-uuid-1234')

    def test_fallback_command_succeeds_after_json_fails(self) -> None:
        """If --json fails but fallback succeeds, normal flow continues."""
        from setup.cloudflare import provision_d1_database
        import setup.cloudflare as cf_module

        mock_result = MagicMock()
        mock_result.stdout = '{"uuid": "fallback-uuid-5678"}'

        call_count = 0

        def fake_run_command(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # First call (--json) fails
                raise RuntimeError('Command failed: wrangler d1 create --json')
            else:
                # Second call (fallback) succeeds
                return mock_result

        with patch.object(cf_module, 'run_command', side_effect=fake_run_command):
            with patch.object(cf_module, '_extract_d1_database_id', return_value='fallback-uuid-5678'):
                with patch.object(cf_module, '_patch_d1_database_id') as mock_patch:
                    with patch.object(cf_module, '_apply_d1_migrations'):
                        provision_d1_database()

        assert call_count == 2
        mock_patch.assert_called_once_with('fallback-uuid-5678')

    def test_first_command_succeeds_with_empty_stdout_raises_clear_error(self) -> None:
        """If first command succeeds but returns empty stdout, raise clear error.

        This is a regression test for bug 2: the error message should indicate
        the command produced no output, not that we couldn't parse the ID.
        """
        from setup.cloudflare import provision_d1_database
        import setup.cloudflare as cf_module

        mock_result = MagicMock()
        mock_result.stdout = ''  # Empty output!

        with patch.object(cf_module, 'run_command', return_value=mock_result) as mock_run:
            with patch.object(cf_module, '_extract_d1_database_id', return_value=''):
                with patch.object(cf_module, '_apply_d1_migrations'):
                    with pytest.raises(RuntimeError, match='produced no output'):
                        provision_d1_database()
                    mock_run.assert_called_once()
