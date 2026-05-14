"""Tests for setup.cli module."""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch


def _load_cli_module():
    """Load setup/cli.py with setup.features mocked to avoid relative import errors."""
    fake_features = MagicMock(__version__='0.0.0')
    sys.modules['setup.features'] = fake_features

    spec = importlib.util.spec_from_file_location(
        'setup.cli',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py'))
    module = importlib.util.module_from_spec(spec)
    module.__package__ = 'setup'
    # Ensure setup and setup.cli are in sys.modules so relative imports work
    if 'setup' not in sys.modules or isinstance(sys.modules.get('setup'), type(sys)):
        sys.modules['setup'] = type(sys)('setup')
    sys.modules['setup.cli'] = module
    spec.loader.exec_module(module)
    return module


def test_all_flag_is_accepted():
    """--all must be accepted and set args.all=True."""
    module = _load_cli_module()

    with patch.object(sys, 'argv', ['setup.py', '--all']):
        args = module.parse_args()

    assert args.all is True
    assert args.deploy_worker is False
    assert args.cloudflare is False


def test_deploy_worker_flag_is_accepted():
    """--deploy-worker must be accepted and set args.deploy_worker=True."""
    module = _load_cli_module()

    with patch.object(sys, 'argv', ['setup.py', '--deploy-worker']):
        args = module.parse_args()

    assert args.deploy_worker is True
    assert args.web is False


def test_cloudflare_flag_is_accepted():
    """--cloudflare must be accepted and set args.cloudflare=True."""
    module = _load_cli_module()

    with patch.object(sys, 'argv', ['setup.py', '--cloudflare']):
        args = module.parse_args()

    assert args.cloudflare is True
    assert args.all is False


def test_install_worker_deps_flag_is_accepted():
    """--install-worker-deps must be accepted and set args.install_worker_deps=True."""
    module = _load_cli_module()

    with patch.object(sys, 'argv', ['setup.py', '--install-worker-deps']):
        args = module.parse_args()

    assert args.install_worker_deps is True
    assert args.cloudflare is False


def test_skip_google_flag_is_accepted():
    """--skip-google must be accepted and set args.skip_google=True."""
    module = _load_cli_module()

    with patch.object(sys, 'argv', ['setup.py', '--skip-google']):
        args = module.parse_args()

    assert args.skip_google is True
    assert args.all is False


def test_skip_google_defaults_to_false():
    """--skip-google defaults to False when no flag is given."""
    module = _load_cli_module()

    with patch.object(sys, 'argv', ['setup.py']):
        args = module.parse_args()

    assert args.skip_google is False
    assert args.web is False


def test_share_email_from_env():
    """--share-email must default to GOOGLE_SHARE_EMAIL env var."""
    module = _load_cli_module()

    with patch.dict(os.environ, {'GOOGLE_SHARE_EMAIL': 'test@example.com'}):
        with patch.object(sys, 'argv', ['setup.py']):
            args = module.parse_args()

    assert args.share_email == 'test@example.com'
    assert args.share_email != ''


def test_share_email_defaults_to_empty_string():
    """--share-email defaults to empty string when env var is not set."""
    module = _load_cli_module()

    with patch.dict(os.environ, {}, clear=True):
        with patch.object(sys, 'argv', ['setup.py']):
            args = module.parse_args()

    assert args.share_email == ''
    assert 'GOOGLE_SHARE_EMAIL' not in os.environ


def test_web_flag_is_accepted():
    """--web must be accepted and set args.web=True."""
    module = _load_cli_module()

    with patch.object(sys, 'argv', ['setup.py', '--web']):
        args = module.parse_args()

    assert args.web is True
    assert args.cloudflare is False


def test_multiple_flags_can_be_combined():
    """Multiple flags can be passed together."""
    module = _load_cli_module()

    with patch.object(sys, 'argv', ['setup.py', '--cloudflare', '--skip-google']):
        args = module.parse_args()

    assert args.cloudflare is True
    assert args.skip_google is True
    assert args.web is False