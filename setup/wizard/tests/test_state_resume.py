"""Tests for resuming a partially-complete wizard run."""

from __future__ import annotations

from setup.wizard import state as state_module


def test_resume_partial_state_preserves_completed_steps(client, tmp_env, seed_state):
    """If state file shows mode + prereqs done, those should remain done after rendering later steps."""
    seed_state(['mode', 'prereqs'])

    # Render the cloudflare step (mid-flow) — should not regress earlier steps
    r = client.get('/step/cloudflare')
    assert r.status_code == 200

    s = state_module.load()
    assert s['mode'] is True
    assert s['prereqs'] is True
    assert s['cloudflare'] is False  # still pending


def test_state_reset_clears_all_steps(tmp_env, seed_state):
    seed_state(['mode', 'prereqs', 'google'])
    assert tmp_env.state_file.exists()

    state_module.reset()

    assert not tmp_env.state_file.exists()
    s = state_module.load()
    assert all(v is False for v in s.values())


def test_index_redirects_to_first_step(client, tmp_env):
    r = client.get('/')
    assert r.status_code == 302
    assert r.headers['Location'].endswith('/step/mode')
