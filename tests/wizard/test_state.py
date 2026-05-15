"""Tests for setup/wizard/state module."""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

import setup.wizard.state as state_module


@pytest.fixture
def temp_state_file(tmp_path):
    """Point STATE_FILE at a temp location for isolation."""
    with patch.object(state_module, 'STATE_FILE', tmp_path / '.wizard_state.json'):
        yield tmp_path / '.wizard_state.json'


class TestLoad:
    def test_returns_default_when_no_file(self, temp_state_file):
        result = state_module.load()
        assert result == {step: False for step in state_module.STEPS}
        assert len(result) == len(state_module.STEPS)

    def test_returns_default_when_file_empty(self, temp_state_file):
        temp_state_file.write_text('')
        result = state_module.load()
        assert result == {step: False for step in state_module.STEPS}
        assert all(v is False for v in result.values())

    def test_returns_default_when_file_corrupted(self, temp_state_file):
        temp_state_file.write_text('{not valid json}')
        result = state_module.load()
        assert result == {step: False for step in state_module.STEPS}
        assert 'mode' in result and 'cloudflare' in result

    def test_returns_stored_state(self, temp_state_file):
        state_module.mark_complete('mode')
        result = state_module.load()
        assert result['mode'] is True
        assert result['prereqs'] is False

    def test_load_with_extra_keys_preserved(self, temp_state_file):
        custom_state = {step: False for step in state_module.STEPS}
        custom_state['mode'] = True
        custom_state['extra_key'] = 'preserved'
        temp_state_file.write_text(json.dumps(custom_state))
        result = state_module.load()
        assert result['extra_key'] == 'preserved'
        assert result['mode'] is True


class TestMarkComplete:
    def test_marks_step_true(self, temp_state_file):
        state_module.mark_complete('mode')
        assert state_module.is_complete('mode') is True
        assert temp_state_file.exists()

    def test_marks_multiple_steps(self, temp_state_file):
        state_module.mark_complete('mode')
        state_module.mark_complete('prereqs')
        assert state_module.is_complete('mode') is True
        assert state_module.is_complete('prereqs') is True

    def test_does_not_overwrite_other_steps(self, temp_state_file):
        state_module.mark_complete('mode')
        state_module.mark_complete('prereqs')
        state_module.mark_complete('google')
        result = state_module.load()
        assert result['mode'] is True
        assert result['prereqs'] is True
        assert result['google'] is True
        assert result['cloudflare'] is False

    def test_write_error_propagates(self, temp_state_file):
        state_module.mark_complete('mode')
        assert temp_state_file.exists()
        with patch('pathlib.Path.write_text', side_effect=OSError('read-only')):
            with pytest.raises(OSError, match='read-only'):
                state_module.mark_complete('prereqs')


class TestIsComplete:
    def test_returns_false_for_unknown_step(self, temp_state_file):
        unknown = 'nonexistent_step'
        assert state_module.is_complete(unknown) is False
        assert state_module.is_complete('another_' + unknown) is False

    def test_returns_true_for_completed_step(self, temp_state_file):
        state_module.mark_complete('verify')
        assert state_module.is_complete('verify') is True
        assert state_module.is_complete('mode') is False

    def test_returns_false_for_incomplete_step(self, temp_state_file):
        assert state_module.is_complete('mode') is False
        assert state_module.is_complete('prereqs') is False
        assert state_module.is_complete('google') is False


class TestReset:
    def test_removes_state_file(self, temp_state_file):
        state_module.mark_complete('mode')
        assert temp_state_file.exists()
        state_module.reset()
        assert not temp_state_file.exists()

    def test_reset_when_no_file_succeeds(self, temp_state_file):
        state_module.reset()
        assert not temp_state_file.exists()
        assert state_module.load() == {step: False for step in state_module.STEPS}

    def test_reset_clears_all_state(self, temp_state_file):
        state_module.mark_complete('mode')
        state_module.mark_complete('prereqs')
        state_module.reset()
        result = state_module.load()
        assert all(v is False for v in result.values())
        assert result['mode'] is False and result['prereqs'] is False
