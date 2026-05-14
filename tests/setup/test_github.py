"""Tests for setup.github module."""

import subprocess
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class TestInferGithubRepo:
    """Tests for infer_github_repo()."""

    def test_parses_https_github_url(self):
        from setup.github import infer_github_repo
        with patch('setup.github.get_git_remote_url', return_value='https://github.com/owner/repo.git'):
            result = infer_github_repo()
            assert result == 'owner/repo'
            assert isinstance(result, str)
            assert '/' in result

    def test_parses_ssh_github_url(self):
        from setup.github import infer_github_repo
        with patch('setup.github.get_git_remote_url', return_value='git@github.com:owner/repo.git'):
            result = infer_github_repo()
            assert result == 'owner/repo'
            assert 'owner' in result

    def test_returns_empty_on_no_remote(self):
        from setup.github import infer_github_repo
        with patch('setup.github.get_git_remote_url', return_value=''):
            result = infer_github_repo()
            assert result == ''
            assert len(result) == 0


class TestInferGithubPagesOrigin:
    """Tests for infer_github_pages_origin()."""

    def test_constructs_github_io_url(self):
        from setup.github import infer_github_pages_origin
        result = infer_github_pages_origin('owner/repo')
        assert result == 'https://owner.github.io'
        assert result.startswith('https://')
        assert '.github.io' in result

    def test_returns_empty_for_invalid_repo(self):
        from setup.github import infer_github_pages_origin
        result = infer_github_pages_origin('invalid')
        assert result == ''
        assert len(result) == 0

    def test_returns_empty_for_empty_input(self):
        from setup.github import infer_github_pages_origin
        result = infer_github_pages_origin('')
        assert result == ''
        assert len(result) == 0


class TestSyncGithubSecretsAuthFailure:
    """Tests for sync_github_secrets() when gh auth is invalid/revoked."""

    def test_gh_auth_failure_reports_error_per_secret_and_continues(self):
        """When gh secret set fails with auth error, fail() is called for that secret
        and the loop continues to remaining secrets rather than raising."""
        from setup import github as gh_module
        from dataclasses import dataclass

        @dataclass
        class FakeBootstrap:
            google_client_id: str = 'fake-google-id'
            worker_url: str = 'https://fake.workers.dev'
            cors_allowed_origins: str = 'http://localhost:5173'
            scheduler_secret: str = 'fake-scheduler'
            github_repo: str = 'fake/repo'
            gmail_client_id: str = ''
            gmail_client_secret: str = ''

        calls = []

        def mock_run(cmd, cwd=None, capture_output=True, input_text=None):
            if cmd[0] == 'gh' and 'secret' in cmd[1]:
                calls.append('gh:' + cmd[2])
                err = subprocess.CalledProcessError(1, cmd)
                err.stderr = 'Error: HTTP 401: Unauthorized'
                raise RuntimeError('GitHub authentication failed') from err
            return MagicMock(stdout='', stderr='')

        with patch('setup.verification.verify_worker_endpoint'), \
             patch('setup.cloudflare.get_cloudflare_account_id', return_value='fake-acct'), \
             patch.object(gh_module, 'run_command', mock_run), \
             patch.object(gh_module, 'fail', lambda l, v: calls.append(f'fail:{v}')), \
             patch.object(gh_module, 'ok', lambda l, v: calls.append(f'ok:{v}')), \
             patch.object(gh_module, 'warn', lambda l, v: calls.append(f'warn:{v}')):

            dv_backup = ''
            if gh_module.WORKER_DEV_VARS.exists():
                dv_backup = gh_module.WORKER_DEV_VARS.read_text()
                gh_module.WORKER_DEV_VARS.write_text('')

            try:
                gh_module.sync_github_secrets(FakeBootstrap(), None)
            finally:
                if dv_backup is not None:
                    gh_module.WORKER_DEV_VARS.write_text(dv_backup)

        # Should have called fail() for at least the first secret,
        # and NOT raised an exception that would have aborted the loop
        assert 'fail:VITE_GOOGLE_CLIENT_ID' in calls, f"Expected auth failure to be reported via fail(), got: {calls}"
        # Loop should have continued to at least one more secret
        assert len(calls) > 1, f"Expected loop to continue after failure, got only: {calls}"


class TestBootstrapWorkerConfig:
    """Tests for bootstrap_worker_config()."""

    def test_loads_github_repo_from_git(self):
        from setup.github import bootstrap_worker_config
        args = MagicMock()
        args.github_repo = ''
        args.github_pages_origin = ''
        args.allowed_emails = ''
        args.admin_emails = ''
        args.share_email = ''
        args.google_client_id = ''
        args.instagram_app_id = ''
        args.instagram_app_secret = ''
        args.linkedin_client_id = ''
        args.linkedin_client_secret = ''
        args.linkedin_person_urn = ''
        args.telegram_bot_token = ''
        args.meta_app_id = ''
        args.meta_app_secret = ''
        args.whatsapp_phone_number_id = ''
        args.gmail_client_id = ''
        args.gmail_client_secret = ''
        with patch('setup.github.infer_github_repo', return_value='testOwner/testRepo'):
            with patch('setup.github.infer_github_pages_origin', return_value='https://testOwner.github.io'):
                with patch('setup.github.load_worker_encryption_key', return_value='test-key'):
                    with patch('setup.github.read_worker_dev_var', return_value=''):
                        with patch('setup.github.generate_encryption_key', return_value='gen-key'):
                            result = bootstrap_worker_config(args, None)
                            assert result.github_repo == 'testOwner/testRepo'
                            assert isinstance(result.github_repo, str)
                            assert 'testOwner' in result.github_repo