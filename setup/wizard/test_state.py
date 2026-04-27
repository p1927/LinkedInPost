import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock


# We import the module under test after patching so STATE_FILE references
# are controlled via mock. We reload each test via direct patching.
import setup.wizard.state as state_module


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fresh_state():
    """Return a default state dict with all steps False."""
    return {step: False for step in state_module.STEPS}


# ---------------------------------------------------------------------------
# load()
# ---------------------------------------------------------------------------

def test_load_returns_all_false_when_file_does_not_exist(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.load()
    assert result == _fresh_state()


def test_load_returns_saved_state_when_file_exists(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    saved = {**_fresh_state(), "prereqs": True}
    fake_path.write_text(json.dumps(saved))
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.load()
    assert result["prereqs"] is True
    assert result["google"] is False


def test_load_returns_all_false_when_file_contains_invalid_json(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    fake_path.write_text("corrupted{{{")
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.load()
    assert result == _fresh_state()


# ---------------------------------------------------------------------------
# mark_complete()
# ---------------------------------------------------------------------------

def test_mark_complete_prereqs_writes_json_with_prereqs_true(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.mark_complete("prereqs")
        written = json.loads(fake_path.read_text())
    assert written["prereqs"] is True


def test_mark_complete_does_not_affect_other_steps(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.mark_complete("prereqs")
        written = json.loads(fake_path.read_text())
    for step in state_module.STEPS:
        if step != "prereqs":
            assert written[step] is False


def test_mark_complete_multiple_steps_accumulates(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.mark_complete("prereqs")
        state_module.mark_complete("google")
        written = json.loads(fake_path.read_text())
    assert written["prereqs"] is True
    assert written["google"] is True


# ---------------------------------------------------------------------------
# is_complete()
# ---------------------------------------------------------------------------

def test_is_complete_returns_true_after_marking(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.mark_complete("prereqs")
        assert state_module.is_complete("prereqs") is True


def test_is_complete_returns_false_for_unmarked_step(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        assert state_module.is_complete("google") is False


def test_is_complete_returns_false_for_unknown_step(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        assert state_module.is_complete("nonexistent_step") is False


# ---------------------------------------------------------------------------
# reset()
# ---------------------------------------------------------------------------

def test_reset_removes_state_file(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    fake_path.write_text(json.dumps(_fresh_state()))
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.reset()
    assert not fake_path.exists()


def test_reset_is_idempotent_when_file_does_not_exist(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        # Should not raise even if file is absent
        state_module.reset()
    assert not fake_path.exists()
