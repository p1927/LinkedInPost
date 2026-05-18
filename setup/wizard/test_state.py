import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock


import setup.wizard.state as state_module


@pytest.fixture(autouse=True)
def _reset_state_cache():
    """Clear the module-level _state cache between tests.

    Without this, tests that call mark_complete() (which sets _state) pollute
    the cache seen by subsequent tests that patch STATE_FILE to a different path.
    """
    state_module._state = None
    yield
    state_module._state = None


def _fresh_state():
    return {step: False for step in state_module.STEPS}


def test_load_returns_all_false_when_file_does_not_exist(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.load()
    assert result == _fresh_state()
    assert all(v is False for v in result.values())


def test_load_returns_saved_state_when_file_exists(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    saved = {**_fresh_state(), "prereqs": True}
    fake_path.write_text(json.dumps(saved))
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.load()
    assert result["prereqs"] is True
    assert result["google"] is False
    assert all(v is False for k, v in result.items() if k != "prereqs")


def test_load_returns_all_false_when_file_contains_invalid_json(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    fake_path.write_text("corrupted{{{")
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.load()
    assert result == _fresh_state()
    assert "prereqs" in result
    assert len(result) == len(state_module.STEPS)


def test_mark_complete_prereqs_writes_json_with_prereqs_true(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.mark_complete("prereqs")
        written = json.loads(fake_path.read_text())
    assert written["prereqs"] is True
    assert fake_path.exists()


def test_mark_complete_does_not_affect_other_steps(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.mark_complete("prereqs")
        written = json.loads(fake_path.read_text())
    for step in state_module.STEPS:
        if step != "prereqs":
            assert written[step] is False
    assert len(written) == len(state_module.STEPS)


def test_mark_complete_multiple_steps_accumulates(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.mark_complete("prereqs")
        state_module.mark_complete("google")
        written = json.loads(fake_path.read_text())
    assert written["prereqs"] is True
    assert written["google"] is True


def test_is_complete_returns_true_after_marking(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        state_module.mark_complete("prereqs")
        result = state_module.is_complete("prereqs")
    assert result is True
    assert state_module.is_complete("google") is False


def test_is_complete_returns_false_for_unmarked_step(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.is_complete("google")
    assert result is False
    assert state_module.is_complete("prereqs") is False


def test_is_complete_returns_false_for_unknown_step(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.is_complete("nonexistent_step")
    assert result is False
    assert "nonexistent_step" not in state_module.STEPS


def test_reset_removes_state_file(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    fake_path.write_text(json.dumps(_fresh_state()))
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.reset()
    assert not fake_path.exists()
    assert result is None or result == 0


def test_reset_is_idempotent_when_file_does_not_exist(tmp_path):
    fake_path = tmp_path / ".wizard_state.json"
    with patch.object(state_module, "STATE_FILE", fake_path):
        result = state_module.reset()
    assert not fake_path.exists()
    # reset() returns None; verifying no exception raised proves idempotency
    assert result is None or not fake_path.exists()