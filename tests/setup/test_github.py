"""Tests for setup.github module."""

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
