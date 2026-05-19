"""Regression tests for cloudflare.py bugs.

Bug 1: get_cloudflare_account_id() - bare except Exception catches KeyboardInterrupt/SystemExit
Bug 2: provision_d1_database() - D1 creation RuntimeError fallback masks subprocess failures
Bug 3: ensure_cloudflare_auth() - subprocess errors and token validation
"""
from __future__ import annotations

import subprocess
from unittest.mock import patch, MagicMock

import pytest

# We need to mock at the module level where run_command is defined, which is setup/utils.py
# But the functions in cloudflare.py import run_command from .utils
# We patch where the object is looked up, not where it is defined


class TestBug1_KeyboardInterruptNotCaught:
    """Bug 1: get_cloudflare_account_id() must not catch KeyboardInterrupt/SystemExit."""

    def test_keyboard_interrupt_propagates(self) -> None:
        """KeyboardInterrupt must NOT be caught by the bare except Exception."""
        with patch('setup.utils.subprocess.run') as mock_run:
            # Simulate KeyboardInterrupt raised during subprocess call
            mock_run.side_effect = KeyboardInterrupt()

            from setup.cloudflare import get_cloudflare_account_id

            with pytest.raises(KeyboardInterrupt):
                get_cloudflare_account_id()
            # Verify run_command was called (exception propagates, not silently swallowed)
            mock_run.assert_called_once()

    def test_system_exit_propagates(self) -> None:
        """SystemExit must NOT be caught by the bare except Exception."""
        with patch('setup.utils.subprocess.run') as mock_run:
            # Simulate SystemExit raised during subprocess call
            mock_run.side_effect = SystemExit(1)

            from setup.cloudflare import get_cloudflare_account_id

            with pytest.raises(SystemExit):
                get_cloudflare_account_id()
            mock_run.assert_called_once()

    def test_runtime_error_still_caught(self) -> None:
        """Other RuntimeErrors (e.g. command failures) should still be caught gracefully."""
        from setup.cloudflare import get_cloudflare_account_id

        with patch('setup.utils.subprocess.run') as mock_run:
            mock_run.side_effect = RuntimeError('Command failed: npx not found')

            result = get_cloudflare_account_id()
            assert result == ''
            # Verify the command was attempted before the error was caught
            mock_run.assert_called_once()


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
            raise RuntimeError(f'Command failed: wrangler d1 create (attempt {call_count})')

        with patch.object(cf_module, 'run_command', side_effect=fake_run_command):
            with patch.object(cf_module, '_extract_d1_database_id', return_value=''):
                with patch.object(cf_module, '_apply_d1_migrations'):
                    with pytest.raises(RuntimeError, match='Command failed'):
                        provision_d1_database()
                    assert call_count == 2, 'Both --json and fallback commands should be attempted'

    def test_fallback_command_failure_raises_with_correct_message(self) -> None:
        """If --json command fails and fallback also fails, error propagates."""
        from setup.cloudflare import provision_d1_database
        import setup.cloudflare as cf_module

        call_count = 0

        def fake_run_command(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise RuntimeError('Command failed: wrangler d1 create --json')
            else:
                raise RuntimeError('Command failed: wrangler d1 create (fallback)')

        with patch.object(cf_module, 'run_command', side_effect=fake_run_command):
            with patch.object(cf_module, '_extract_d1_database_id', return_value=''):
                with patch.object(cf_module, '_apply_d1_migrations'):
                    with pytest.raises(RuntimeError, match='fallback'):
                        provision_d1_database()
                    assert call_count == 2, 'Should fall back after first command fails'

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
        """If first command succeeds but returns empty stdout, raise clear error."""
        from setup.cloudflare import provision_d1_database
        import setup.cloudflare as cf_module

        mock_result = MagicMock()
        mock_result.stdout = ''  # Empty output!

        with patch.object(cf_module, 'run_command', return_value=mock_result):
            with patch.object(cf_module, '_extract_d1_database_id', return_value=''):
                with patch.object(cf_module, '_apply_d1_migrations'):
                    with pytest.raises(RuntimeError, match='produced no output'):
                        provision_d1_database()
                    # Verify the --json command was tried first (empty stdout from that)
                    cf_module.run_command.assert_called_once()


class TestEnsureCloudflareAuth:
    """Tests for ensure_cloudflare_auth() — covers mutations in lines 40-68."""

    def test_successful_auth_with_oauth(self) -> None:
        """Successful wrangler whoami returns without raising."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = '{"account":{"id":"abc123","name":"myaccount"}}'
        mock_result.stderr = ''

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            ensure_cloudflare_auth()
            mock_run.assert_called_once()
            args, kwargs = mock_run.call_args
            assert args[0] == ['npx', 'wrangler', 'whoami']

    def test_successful_auth_with_api_token(self) -> None:
        """Auth succeeds when CLOUDFLARE_API_TOKEN is set and wrangler validates it."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = '{"account":{"id":"abc123","name":"myaccount"}}'
        mock_result.stderr = ''

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            with patch.dict('os.environ', {'CLOUDFLARE_API_TOKEN': 'mytoken123456'}, clear=False):
                ensure_cloudflare_auth()
            mock_run.assert_called_once()
            args, kwargs = mock_run.call_args
            assert args[0] == ['npx', 'wrangler', 'whoami']

    def test_npx_not_found_raises_runtime_error(self) -> None:
        """FileNotFoundError from missing npx must raise RuntimeError with clear message."""
        from setup.cloudflare import ensure_cloudflare_auth

        with patch('subprocess.run', side_effect=FileNotFoundError('npx not found')) as mock_run:
            with pytest.raises(RuntimeError, match='npx is not on PATH'):
                ensure_cloudflare_auth()
            mock_run.assert_called_once()

    def test_invalid_access_token_fails(self) -> None:
        """'Invalid access token' in output must cause RuntimeError."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = ''
        mock_result.stderr = 'Invalid access token'

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            with pytest.raises(RuntimeError, match='CLOUDFLARE_API_TOKEN'):
                ensure_cloudflare_auth()
            mock_run.assert_called_once()
            assert 'npx' in str(mock_run.call_args)

    def test_not_authenticated_fails(self) -> None:
        """'You are not authenticated' in output must cause RuntimeError."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = 'You are not authenticated'
        mock_result.stderr = ''

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            with pytest.raises(RuntimeError, match='No Cloudflare authentication detected'):
                ensure_cloudflare_auth()
            mock_run.assert_called_once()

    def test_code_9109_auth_error(self) -> None:
        """'code: 9109' in output must cause RuntimeError."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = 'error: code: 9109'
        mock_result.stderr = ''

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            with pytest.raises(RuntimeError, match='CLOUDFLARE_API_TOKEN'):
                ensure_cloudflare_auth()
            mock_run.assert_called_once()

    def test_code_10000_auth_error(self) -> None:
        """'code: 10000' in output must cause RuntimeError."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = 'error: code: 10000'
        mock_result.stderr = ''

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            with pytest.raises(RuntimeError, match='CLOUDFLARE_API_TOKEN'):
                ensure_cloudflare_auth()
            mock_run.assert_called_once()

    def test_token_present_in_error_message_masked(self) -> None:
        """When token is set and auth fails, error message must mask the token."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = 'Invalid access token'
        mock_result.stderr = ''

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            with patch.dict('os.environ', {'CLOUDFLARE_API_TOKEN': 'mysecretlongtokenABC'}, clear=False):
                with pytest.raises(RuntimeError, match=r'token ends …\w{5}'):
                    ensure_cloudflare_auth()
            mock_run.assert_called_once()

    def test_no_token_in_error_message(self) -> None:
        """When no token is set and auth fails, error says token is unset."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = 'You are not authenticated'
        mock_result.stderr = ''

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            with pytest.raises(RuntimeError, match='CLOUDFLARE_API_TOKEN is unset'):
                ensure_cloudflare_auth()
            mock_run.assert_called_once()

    def test_combined_stdout_stderr_checked(self) -> None:
        """Error string in stderr (not stdout) must still be detected."""
        from setup.cloudflare import ensure_cloudflare_auth

        mock_result = MagicMock()
        mock_result.returncode = 1
        mock_result.stdout = ''
        mock_result.stderr = 'You are not authenticated'

        with patch('subprocess.run', return_value=mock_result) as mock_run:
            with pytest.raises(RuntimeError, match='No Cloudflare authentication detected'):
                ensure_cloudflare_auth()
            mock_run.assert_called_once()
