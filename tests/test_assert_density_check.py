"""Tests for assert_density_check.py — the test-auditing tool itself."""

from __future__ import annotations

import ast
import os
import tempfile
from pathlib import Path

import pytest

# Run from project root
ROOT = Path('/home/openclaw/workspaces/linkedin-post')
import sys
sys.path.insert(0, str(ROOT))

import assert_density_check as adc


class TestIsTrivialAssert:
    """Tests for is_trivial_assert()."""

    def test_assert_true_is_trivial(self):
        """assert True must be flagged as trivial."""
        tree = ast.parse('def test(): assert True')
        func = tree.body[0]
        assert adc.is_trivial_assert(func.body[0]) is True
        assert isinstance(adc.is_trivial_assert(func.body[0]), bool)

    def test_assert_false_is_trivial(self):
        """assert False must be flagged as trivial."""
        tree = ast.parse('def test(): assert False')
        func = tree.body[0]
        assert adc.is_trivial_assert(func.body[0]) is True
        assert isinstance(adc.is_trivial_assert(func.body[0]), bool)

    def test_assert_none_is_trivial(self):
        """assert None must be flagged as trivial."""
        tree = ast.parse('def test(): assert None')
        func = tree.body[0]
        assert adc.is_trivial_assert(func.body[0]) is True
        assert isinstance(adc.is_trivial_assert(func.body[0]), bool)

    def test_assert_one_equals_one_is_trivial(self):
        """assert 1 == 1 must be flagged as trivial."""
        tree = ast.parse('def test(): assert 1 == 1')
        func = tree.body[0]
        assert adc.is_trivial_assert(func.body[0]) is True
        assert isinstance(adc.is_trivial_assert(func.body[0]), bool)

    def test_assert_x_equals_x_is_trivial(self):
        """assert x == x must be flagged as trivial (same variable)."""
        tree = ast.parse('def test():\n    x = 1\n    assert x == x')
        func = tree.body[0]
        assert adc.is_trivial_assert(func.body[1]) is True
        assert isinstance(adc.is_trivial_assert(func.body[1]), bool)

    def test_assert_one_not_equal_one_is_not_trivial(self):
        """assert 1 != 1 must NOT be flagged as trivial."""
        tree = ast.parse('def test(): assert 1 != 1')
        func = tree.body[0]
        assert adc.is_trivial_assert(func.body[0]) is False
        assert isinstance(adc.is_trivial_assert(func.body[0]), bool)

    def test_assert_real_comparison_not_trivial(self):
        """assert x > 0 must NOT be flagged as trivial."""
        tree = ast.parse('def test():\n    x = 1\n    assert x > 0')
        func = tree.body[0]
        assert adc.is_trivial_assert(func.body[1]) is False
        assert isinstance(adc.is_trivial_assert(func.body[1]), bool)

    def test_assert_isinstance_not_trivial(self):
        """assert isinstance(x, int) must NOT be flagged as trivial."""
        tree = ast.parse('def test(): assert isinstance(x, int)')
        func = tree.body[0]
        assert adc.is_trivial_assert(func.body[0]) is False
        assert isinstance(adc.is_trivial_assert(func.body[0]), bool)


class TestCountRealAssertions:
    """Tests for count_real_assertions()."""

    def test_counts_zero_for_trivial_only(self):
        """Test with only trivial asserts must return 0."""
        tree = ast.parse('def test():\n assert True\n assert False\n assert 1 == 1')
        func = tree.body[0]
        assert adc.count_real_assertions(func) == 0
        assert isinstance(adc.count_real_assertions(func), int)

    def test_counts_real_assertions(self):
        """Test with real assertions must count each."""
        tree = ast.parse('def test():\n assert x > 0\n assert len(xs) == 3')
        func = tree.body[0]
        assert adc.count_real_assertions(func) == 2
        assert adc.count_real_assertions(func) > 0

    def test_counts_pytest_raises(self):
        """pytest.raises must count as 1 assertion."""
        tree = ast.parse('def test():\n with pytest.raises(ValueError):\n  int("bad")')
        func = tree.body[0]
        assert adc.count_real_assertions(func) >= 1
        assert isinstance(adc.count_real_assertions(func), int)

    def test_counts_self_assert_methods(self):
        """self.assertEqual etc. must count as assertions."""
        tree = ast.parse('class Test:\n def test(self):\n  self.assertEqual(x, 1)\n  self.assertTrue(y)')
        func = tree.body[0].body[0]
        assert adc.count_real_assertions(func) == 2
        assert adc.count_real_assertions(func) > 0


class TestBodyLines:
    """Tests for body_lines()."""

    def test_counts_non_blank_lines(self):
        """Must count only non-blank, non-comment lines (4 body lines, 2 non-blank non-comment)."""
        source = [
            'def test():',
            '    x = 1',
            '    # comment',
            '',
            '    assert x > 0',
        ]
        tree = ast.parse('\n'.join(source))
        func = tree.body[0]
        result = adc.body_lines(func, source)
        assert result == 2
        assert result >= 0

    def test_empty_body_returns_zero(self):
        """Must return 0 for empty body."""
        source = ['def test():', '    pass']
        tree = ast.parse('\n'.join(source))
        func = tree.body[0]
        result = adc.body_lines(func, source)
        assert result == 1
        assert result >= 0


class TestAuditFile:
    """Tests for audit_file()."""

    def test_detects_smoke_test(self):
        """Must flag test with only trivial asserts as SMOKE (0 real assertions)."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='_test.py', delete=False) as f:
            f.write('def test_smoke():\n    assert True\n    assert False\n    assert 1 == 1')
            path = f.name
        try:
            issues = adc.audit_file(Path(path))
            assert len(issues) == 1
            assert issues[0]['issue'] == 'SMOKE'
            assert issues[0]['assertions'] == 0
        finally:
            os.unlink(path)

    def test_detects_short_body(self):
        """Must flag test with >=2 real assertions but <3 body lines as SHORT_BODY."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='_test.py', delete=False) as f:
            # Two real assertions on two lines (no blank/comment lines)
            f.write('def test_short():\n    assert x > 0\n    assert y > 0')
            path = f.name
        try:
            issues = adc.audit_file(Path(path))
            short = [i for i in issues if i['issue'] == 'SHORT_BODY']
            assert len(short) >= 1, f"Expected SHORT_BODY issue, got: {issues}"
            assert short[0]['body_lines'] < 3
        finally:
            os.unlink(path)

    def test_passes_valid_test(self):
        """Must not flag test with >=2 real assertions and >=3 lines."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='_test.py', delete=False) as f:
            f.write('def test_valid():\n    assert x > 0\n    assert len(xs) >= 3\n    assert ok is True')
            path = f.name
        try:
            issues = adc.audit_file(Path(path))
            assert len(issues) == 0
            assert isinstance(len(issues), int)
        finally:
            os.unlink(path)

    def test_parse_error_returns_error_issue(self):
        """Must return issue with error message for unparseable file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='_test.py', delete=False) as f:
            f.write('{this is not valid python')
            path = f.name
        try:
            issues = adc.audit_file(Path(path))
            assert len(issues) == 1
            assert issues[0]['func'] == 'PARSE_ERROR'
            assert 'was never closed' in issues[0]['issue']
        finally:
            os.unlink(path)

    def test_non_test_functions_ignored(self):
        """Must ignore functions not starting with test_."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='_test.py', delete=False) as f:
            f.write('def helper():\n    assert True\ndef test_me():\n    assert x > 0\n    assert y > 0')
            path = f.name
        try:
            issues = adc.audit_file(Path(path))
            func_names = [i['func'] for i in issues]
            assert 'helper' not in func_names
            assert 'test_me' in func_names
        finally:
            os.unlink(path)
