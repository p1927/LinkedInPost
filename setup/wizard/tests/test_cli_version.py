"""Test that setup/cli.py --version flag outputs version info."""

from __future__ import annotations

import subprocess
import sys

import pytest

# Use the project root as cwd
from setup.constants import ROOT


def test_version_flag_outputs_version_and_exits_zero():
    """--version should print version string and exit 0."""
    result = subprocess.run(
        [sys.executable, '-m', 'setup.cli', '--version'],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f'expected exit 0, got {result.returncode}; stderr={result.stderr}'
    assert 'setup' in result.stdout and '0.1.0' in result.stdout, f'version string missing from output: {result.stdout!r}'


def test_version_flag_is_consistent_across_runs():
    """Running --version twice should produce identical output."""
    args = [sys.executable, '-m', 'setup.cli', '--version']
    result1 = subprocess.run(args, cwd=str(ROOT), capture_output=True, text=True)
    result2 = subprocess.run(args, cwd=str(ROOT), capture_output=True, text=True)
    assert result1.stdout == result2.stdout, 'version output should be deterministic'
    assert result1.returncode == result2.returncode == 0
