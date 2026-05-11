"""Tests for setup.cli module."""

from __future__ import annotations

import importlib.util
import os
import sys
from pathlib import Path
from unittest.mock import patch


def test_all_flag_is_accepted():
    """--all must be accepted and set args.all=True."""
    spec = importlib.util.spec_from_file_location(
        'setup_cli',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py')
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules['setup_cli'] = module
    spec.loader.exec_module(module)

    with patch.object(sys, 'argv', ['setup.py', '--all']):
        args = module.parse_args()

    assert args.all is True


def test_deploy_worker_flag_is_accepted():
    """--deploy-worker must be accepted and set args.deploy_worker=True."""
    spec = importlib.util.spec_from_file_location(
        'setup_cli2',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py')
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules['setup_cli2'] = module
    spec.loader.exec_module(module)

    with patch.object(sys, 'argv', ['setup.py', '--deploy-worker']):
        args = module.parse_args()

    assert args.deploy_worker is True


def test_cloudflare_flag_is_accepted():
    """--cloudflare must be accepted and set args.cloudflare=True."""
    spec = importlib.util.spec_from_file_location(
        'setup_cli3',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py')
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules['setup_cli3'] = module
    spec.loader.exec_module(module)

    with patch.object(sys, 'argv', ['setup.py', '--cloudflare']):
        args = module.parse_args()

    assert args.cloudflare is True


def test_install_worker_deps_flag_is_accepted():
    """--install-worker-deps must be accepted and set args.install_worker_deps=True."""
    spec = importlib.util.spec_from_file_location(
        'setup_cli4',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py')
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules['setup_cli4'] = module
    spec.loader.exec_module(module)

    with patch.object(sys, 'argv', ['setup.py', '--install-worker-deps']):
        args = module.parse_args()

    assert args.install_worker_deps is True


def test_skip_google_flag_is_accepted():
    """--skip-google must be accepted and set args.skip_google=True."""
    spec = importlib.util.spec_from_file_location(
        'setup_cli5',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py')
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules['setup_cli5'] = module
    spec.loader.exec_module(module)

    with patch.object(sys, 'argv', ['setup.py', '--skip-google']):
        args = module.parse_args()

    assert args.skip_google is True


def test_skip_google_defaults_to_false():
    """--skip-google defaults to False when no flag is given."""
    spec = importlib.util.spec_from_file_location(
        'setup_cli6',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py')
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules['setup_cli6'] = module
    spec.loader.exec_module(module)

    with patch.object(sys, 'argv', ['setup.py']):
        args = module.parse_args()

    assert args.skip_google is False


def test_share_email_from_env():
    """--share-email must default to GOOGLE_SHARE_EMAIL env var."""
    spec = importlib.util.spec_from_file_location(
        'setup_cli7',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py')
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules['setup_cli7'] = module
    spec.loader.exec_module(module)

    with patch.dict(os.environ, {'GOOGLE_SHARE_EMAIL': 'test@example.com'}):
        with patch.object(sys, 'argv', ['setup.py']):
            args = module.parse_args()

    assert args.share_email == 'test@example.com'


def test_web_flag_is_accepted():
    """--web must be accepted and set args.web=True."""
    spec = importlib.util.spec_from_file_location(
        'setup_cli8',
        Path('/home/openclaw/workspaces/linkedin-post/setup/cli.py')
    )
    module = importlib.util.module_from_spec(spec)
    sys.modules['setup_cli8'] = module
    spec.loader.exec_module(module)

    with patch.object(sys, 'argv', ['setup.py', '--web']):
        args = module.parse_args()

    assert args.web is True