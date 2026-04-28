"""Tests for the API keys step.

This step is the highest-leverage one — it writes 25+ vars across three files
and contains the recently-fixed SERPAPI_KEY → SERPAPI_API_KEY bug. The tests
assert: validation gates the flow, secrets land in the right files, and
GENERATION_WORKER_SECRET is mirrored as WORKER_SHARED_SECRET in the gen worker.
"""

from __future__ import annotations


def test_apikeys_rejects_missing_gemini(client, tmp_env):
    r = client.post('/step/apikeys', data={'xai_api_key': 'xai-mock'})
    assert r.status_code == 200  # re-renders the step with an error
    assert b'Gemini API key is required' in r.data
    # Nothing should have been written.
    assert tmp_env.read_root() == {}
    assert tmp_env.read_worker() == {}
    assert tmp_env.read_gen_worker() == {}


def test_apikeys_rejects_invalid_gemini_key(client, tmp_env, mock_gemini):
    mock_gemini(success=False)
    r = client.post('/step/apikeys', data={'gemini_api_key': 'AIza-bad'})
    assert r.status_code == 200
    assert b'validation failed' in r.data
    # Bad key was NOT written to any file
    assert 'GEMINI_API_KEY' not in tmp_env.read_root()


def test_apikeys_routes_keys_to_correct_files(client, tmp_env):
    """Verify the contract: which key lands in which file."""
    r = client.post('/step/apikeys', data={
        'gemini_api_key': 'AIza-gem',
        'xai_api_key': 'xai-key',
        'openrouter_api_key': 'or-key',
        'minimax_api_key': 'minimax-key',
        'fal_api_key': 'fal-key',
        'pixazo_api_key': 'pixazo-key',
        'openai_api_key': 'openai-key',
        'serpapi_api_key': 'serp-key',
        'newsapi_key': 'news-key',
        'linkedin_client_id': 'li-id',
        'linkedin_client_secret': 'li-secret',
        'worker_scheduler_secret': 'sched-secret',
        'github_token_encryption_key': 'gh-enc',
        'generation_worker_secret': 'gen-shared',
    })
    assert r.status_code == 302

    root = tmp_env.read_root()
    worker = tmp_env.read_worker()
    gen = tmp_env.read_gen_worker()

    # EVERY key written goes to root .env
    assert root['GEMINI_API_KEY'] == 'AIza-gem'
    assert root['FAL_API_KEY'] == 'fal-key'
    assert root['LINKEDIN_CLIENT_ID'] == 'li-id'
    assert root['WORKER_SCHEDULER_SECRET'] == 'sched-secret'

    # Worker-side keys land in worker/.dev.vars
    assert worker['GEMINI_API_KEY'] == 'AIza-gem'
    assert worker['XAI_API_KEY'] == 'xai-key'
    assert worker['NEWSAPI_KEY'] == 'news-key'
    assert worker['LINKEDIN_CLIENT_ID'] == 'li-id'
    assert worker['WORKER_SCHEDULER_SECRET'] == 'sched-secret'
    assert worker['GITHUB_TOKEN_ENCRYPTION_KEY'] == 'gh-enc'
    # MiniMax goes to worker but NOT gen worker
    assert worker['MINIMAX_API_KEY'] == 'minimax-key'

    # Gen-worker keys land in generation-worker/.dev.vars
    assert gen['GEMINI_API_KEY'] == 'AIza-gem'
    assert gen['XAI_API_KEY'] == 'xai-key'
    assert gen['FAL_API_KEY'] == 'fal-key'
    assert gen['PIXAZO_API_KEY'] == 'pixazo-key'
    assert gen['OPENAI_API_KEY'] == 'openai-key'
    assert gen['SERPAPI_API_KEY'] == 'serp-key'

    # Worker-only keys (LinkedIn OAuth, scheduler secret) NOT in gen worker
    assert 'LINKEDIN_CLIENT_ID' not in gen
    assert 'WORKER_SCHEDULER_SECRET' not in gen
    assert 'NEWSAPI_KEY' not in gen
    # MiniMax is worker-only too
    assert 'MINIMAX_API_KEY' not in gen


def test_apikeys_mirrors_generation_worker_secret(client, tmp_env):
    """GENERATION_WORKER_SECRET → WORKER_SHARED_SECRET in gen worker (same value)."""
    r = client.post('/step/apikeys', data={
        'gemini_api_key': 'AIza-gem',
        'generation_worker_secret': 'mirrored-secret-xyz',
    })
    assert r.status_code == 302

    worker = tmp_env.read_worker()
    gen = tmp_env.read_gen_worker()

    assert worker['GENERATION_WORKER_SECRET'] == 'mirrored-secret-xyz'
    # And the gen worker side gets it as WORKER_SHARED_SECRET with the same value
    assert gen['WORKER_SHARED_SECRET'] == 'mirrored-secret-xyz'


def test_apikeys_serpapi_key_uses_correct_name(client, tmp_env):
    """Regression: previously written as SERPAPI_KEY (bug). Must be SERPAPI_API_KEY."""
    r = client.post('/step/apikeys', data={
        'gemini_api_key': 'AIza-gem',
        'serpapi_api_key': 'serp-fixed-name',
    })
    assert r.status_code == 302
    root = tmp_env.read_root()
    assert 'SERPAPI_API_KEY' in root
    assert 'SERPAPI_KEY' not in root  # the buggy name is gone
    assert root['SERPAPI_API_KEY'] == 'serp-fixed-name'
