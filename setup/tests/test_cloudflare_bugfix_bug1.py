"""Regression tests for Bug 1 in cloudflare.py.

Bug 1: get_cloudflare_account_id() - bare except Exception catches KeyboardInterrupt/SystemExit
"""
from __future__ import annotations

from unittest.mock import patch, MagicMock

import pytest


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
            # Simulate RuntimeError from run_command (command not found or failed)
            mock_run.side_effect = RuntimeError('Command failed: npx not found')

            # Should return empty string, not raise
            result = get_cloudflare_account_id()
            assert result == ''
            mock_run.assert_called_once()
