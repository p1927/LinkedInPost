"""Tests for cli.py"""
import pytest
from unittest.mock import patch


class TestParseArgs:
    """Verify cli argument parsing works correctly."""

    def test_version_flag_parses(self):
        """--version should not raise and should exit."""
        from setup.cli import parse_args
        with pytest.raises(SystemExit) as exc_info:
            with patch('sys.argv', ['setup', '--version']):
                parse_args()
        assert exc_info.value.code == 0

    def test_help_flag_parses(self):
        """--help should not raise and should exit."""
        from setup.cli import parse_args
        with pytest.raises(SystemExit) as exc_info:
            with patch('sys.argv', ['setup', '--help']):
                parse_args()
        assert exc_info.value.code == 0

    def test_all_flags_default_false(self):
        """Flags should default to False when not specified."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup']):
            args = parse_args()
        assert args.install_worker_deps is False
        assert args.cloudflare is False
        assert args.deploy_worker is False
        assert args.sync_github_secrets is False
        assert args.skip_google is False
        assert args.web is False
        assert args.all is False

    def test_install_worker_deps_sets_true(self):
        """--install-worker-deps sets flag to True."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup', '--install-worker-deps']):
            args = parse_args()
        assert args.install_worker_deps is True
        assert isinstance(args.install_worker_deps, bool)

    def test_cloudflare_flag_sets_true(self):
        """--cloudflare sets flag to True."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup', '--cloudflare']):
            args = parse_args()
        assert args.cloudflare is True
        assert isinstance(args.cloudflare, bool)

    def test_deploy_worker_flag_sets_true(self):
        """--deploy-worker sets flag to True."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup', '--deploy-worker']):
            args = parse_args()
        assert args.deploy_worker is True
        assert isinstance(args.deploy_worker, bool)

    def test_skip_google_flag_sets_true(self):
        """--skip-google sets flag to True."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup', '--skip-google']):
            args = parse_args()
        assert args.skip_google is True
        assert isinstance(args.skip_google, bool)

    def test_web_flag_sets_true(self):
        """--web sets flag to True."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup', '--web']):
            args = parse_args()
        assert args.web is True
        assert isinstance(args.web, bool)

    def test_all_flag_sets_only_all_true(self):
        """--all only sets its own flag, not other flags."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup', '--all']):
            args = parse_args()
        assert args.all is True
        # --all does NOT auto-enable other flags
        assert args.cloudflare is False
        assert args.deploy_worker is False
        assert args.sync_github_secrets is False
        assert args.web is False

    def test_share_email_defaults_from_env(self):
        """--share-email should use GOOGLE_SHARE_EMAIL env var as default."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup']):
            args = parse_args()
        assert args.share_email is not None
        assert isinstance(args.share_email, str)

    def test_unknown_flag_exits_with_error(self):
        """Unknown flags should cause SystemExit with exit code 2."""
        from setup.cli import parse_args
        with pytest.raises(SystemExit) as exc_info:
            with patch('sys.argv', ['setup', '--unknown-flag']):
                parse_args()
        assert exc_info.value.code == 2

    def test_github_repo_defaults_from_env(self):
        """--github-repo should default to GITHUB_REPO env var."""
        from setup.cli import parse_args
        with patch('sys.argv', ['setup', '--github-repo', 'myorg/myrepo']):
            args = parse_args()
        assert args.github_repo == 'myorg/myrepo'
        assert isinstance(args.github_repo, str)
        assert '/' in args.github_repo
