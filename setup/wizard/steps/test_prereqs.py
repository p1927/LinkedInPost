import sys
from unittest.mock import patch, MagicMock

from setup.wizard.steps import prereqs


class TestCheckPrereqs:
    def _run_with_mocks(self, *, py_version, node_found, node_version, wrangler_found, git_found):
        mock_version_info = MagicMock()
        mock_version_info.__getitem__ = lambda self, i: (py_version[0], py_version[1])[i]
        mock_version_info.__iter__ = lambda self: iter((py_version[0], py_version[1]))
        mock_version_info[:2] = (py_version[0], py_version[1])
        mock_sys = MagicMock(version_info=mock_version_info)

        with patch.object(prereqs, 'sys', mock_sys), \
             patch.object(prereqs, 'shutil') as mock_shutil:
            def which_side_effect(cmd):
                if cmd == 'node':
                    return '/usr/bin/node' if node_found else None
                if cmd in ('wrangler', 'npx'):
                    return '/usr/local/bin/wrangler' if wrangler_found else None
                if cmd == 'git':
                    return '/usr/bin/git' if git_found else None
                return None

            mock_shutil.which.side_effect = which_side_effect

            with patch.object(prereqs, 'subprocess') as mock_subprocess:
                if node_found and node_version is not None:
                    mock_subprocess.run.return_value = MagicMock(stdout=f'v{node_version}.0.0', returncode=0)
                elif node_found:
                    mock_subprocess.run.return_value = MagicMock(stdout='', returncode=1)
                else:
                    mock_subprocess.run.return_value = MagicMock(stdout='', returncode=1)
                mock_subprocess.TimeoutExpired = Exception

                return prereqs.check_prereqs()

    def test_python_version_ok(self):
        checks = self._run_with_mocks(py_version=(3, 11), node_found=True, node_version=18, wrangler_found=True, git_found=True)
        py_check = next(c for c in checks if c['name'] == 'Python 3.11+')
        assert py_check['ok'] is True
        assert len(checks) == 4

    def test_python_version_too_low(self):
        checks = self._run_with_mocks(py_version=(3, 10), node_found=True, node_version=18, wrangler_found=True, git_found=True)
        py_check = next(c for c in checks if c['name'] == 'Python 3.11+')
        assert py_check['ok'] is False
        assert 'fix' in py_check

    def test_node_found_version_ok(self):
        checks = self._run_with_mocks(py_version=(3, 12), node_found=True, node_version=20, wrangler_found=True, git_found=True)
        node_check = next(c for c in checks if c['name'] == 'Node.js 18+')
        assert node_check['ok'] is True
        assert '20' in str(node_check.get('found', ''))

    def test_node_found_version_too_low(self):
        checks = self._run_with_mocks(py_version=(3, 12), node_found=True, node_version=16, wrangler_found=True, git_found=True)
        node_check = next(c for c in checks if c['name'] == 'Node.js 18+')
        assert node_check['ok'] is False
        assert 'fix' in node_check

    def test_node_not_found(self):
        checks = self._run_with_mocks(py_version=(3, 12), node_found=False, node_version=None, wrangler_found=True, git_found=True)
        node_check = next(c for c in checks if c['name'] == 'Node.js 18+')
        assert node_check['ok'] is False
        assert 'not found' in str(node_check.get('found', ''))

    def test_wrangler_found(self):
        checks = self._run_with_mocks(py_version=(3, 12), node_found=True, node_version=18, wrangler_found=True, git_found=True)
        wrangler_check = next(c for c in checks if c['name'] == 'Wrangler CLI')
        assert wrangler_check['ok'] is True
        assert wrangler_check.get('found') is not None

    def test_git_found(self):
        checks = self._run_with_mocks(py_version=(3, 12), node_found=True, node_version=18, wrangler_found=True, git_found=True)
        git_check = next(c for c in checks if c['name'] == 'Git')
        assert git_check['ok'] is True
        assert git_check.get('found') is not None

    def test_all_ok_true(self):
        checks = self._run_with_mocks(py_version=(3, 12), node_found=True, node_version=20, wrangler_found=True, git_found=True)
        assert all(c['ok'] for c in checks)
        assert len(checks) == 4

    def test_node_subprocess_error(self):
        """subprocess.run error (non-timeout) must not crash check_prereqs."""
        mock_version_info = MagicMock()
        mock_version_info.__getitem__ = lambda self, i: (3, 12)[i]
        mock_version_info.__iter__ = lambda self: iter((3, 12))
        mock_version_info[:2] = (3, 12)
        mock_sys = MagicMock(version_info=mock_version_info)

        # Custom TimeoutExpired that won't catch OSError (different exception hierarchy)
        class CustomTimeoutExpired(Exception):
            pass

        with patch.object(prereqs, 'sys', mock_sys), \
             patch.object(prereqs, 'shutil') as mock_shutil:
            def which_side_effect(cmd):
                if cmd == 'node':
                    return '/usr/bin/node'
                if cmd in ('wrangler', 'npx'):
                    return '/usr/local/bin/wrangler'
                if cmd == 'git':
                    return '/usr/bin/git'
                return None
            mock_shutil.which.side_effect = which_side_effect

            with patch.object(prereqs, 'subprocess') as mock_subprocess:
                mock_subprocess.run.side_effect = OSError('node broken')
                mock_subprocess.TimeoutExpired = CustomTimeoutExpired
                checks = prereqs.check_prereqs()
        node_check = next(c for c in checks if c['name'] == 'Node.js 18+')
        assert node_check['ok'] is False
        assert node_check['found'] == 'error'
        assert len(checks) == 4

    def test_one_fails_returns_false(self):
        checks = self._run_with_mocks(py_version=(3, 10), node_found=True, node_version=20, wrangler_found=True, git_found=True)
        assert not all(c['ok'] for c in checks)
        py_check = next(c for c in checks if c['name'] == 'Python 3.11+')
        assert py_check['ok'] is False
