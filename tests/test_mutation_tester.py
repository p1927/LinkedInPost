"""
Tests for mutation_tester.py — branch-deletion mutation tester.
"""

import subprocess
import textwrap
from pathlib import Path
from unittest.mock import patch

import pytest

import mutation_tester


# ─── mutable_linenos ────────────────────────────────────────────────────────────

def test_mutable_linenos_if_body():
    src = textwrap.dedent("""
        def foo(x):
            if x > 0:
                return x
    """).strip()
    lines = mutation_tester.mutable_linenos(src)
    assert len(lines) >= 1
    assert 3 in lines  # if body (return) on line 3
    assert 2 not in lines  # 'if' keyword itself is not a mutation target

def test_mutable_linenos_return():
    src = textwrap.dedent("""
        def foo():
            return 42
    """).strip()
    lines = mutation_tester.mutable_linenos(src)
    assert 2 in lines
    assert len(lines) == 1

def test_mutable_linenos_raise():
    src = textwrap.dedent("""
        def foo():
            raise ValueError("bad")
    """).strip()
    lines = mutation_tester.mutable_linenos(src)
    assert 2 in lines
    assert len(lines) == 1

def test_mutable_linenos_assert():
    src = textwrap.dedent("""
        def foo():
            assert x > 0
    """).strip()
    lines = mutation_tester.mutable_linenos(src)
    assert 2 in lines
    assert len(lines) == 1

def test_mutable_linenos_syntax_error():
    with pytest.raises(mutation_tester.SyntaxParseError) as exc_info:
        mutation_tester.mutable_linenos("def foo(\n")
    assert "Syntax error" in str(exc_info.value)

def test_mutable_linenos_assign():
    src = textwrap.dedent("""
        x = 1
    """).strip()
    lines = mutation_tester.mutable_linenos(src)
    assert 1 in lines
    assert len(lines) == 1  # only the assignment, no return/raise/assert

def test_mutable_linenos_multiple():
    """Multiple mutation targets: assign + if-body + return + raise."""
    src = textwrap.dedent("""
        def foo():
            x = 1
            if x:
                return x
            raise ValueError("bad")
    """).strip()
    lines = mutation_tester.mutable_linenos(src)
    # if x: body is on line 4 (return x), so only 3 unique targets
    assert 2 in lines  # x = 1
    assert 4 in lines  # if body (return x)
    assert 5 in lines  # raise


# ─── find_project_root ──────────────────────────────────────────────────────────

def test_find_project_root_finds_pyproject(tmp_path):
    (tmp_path / "pyproject.toml").touch()
    (tmp_path / "src").mkdir()
    result = mutation_tester.find_project_root(tmp_path / "src")
    assert result == tmp_path
    assert (result / "pyproject.toml").exists()

def test_find_project_root_finds_setup_cfg(tmp_path):
    (tmp_path / "setup.cfg").touch()
    sub = tmp_path / "sub" / "deep"
    sub.mkdir(parents=True)
    result = mutation_tester.find_project_root(sub)
    assert result == tmp_path
    assert (result / "setup.cfg").exists()

def test_find_project_root_finds_pytest_ini(tmp_path):
    (tmp_path / "pytest.ini").touch()
    sub = tmp_path / "sub"
    sub.mkdir()
    result = mutation_tester.find_project_root(sub)
    assert result == tmp_path
    assert (result / "pytest.ini").exists()

def test_find_project_root_no_marker(tmp_path):
    result = mutation_tester.find_project_root(tmp_path)
    assert result == tmp_path
    assert isinstance(result, Path)


# ─── apply_mutation ─────────────────────────────────────────────────────────────

def test_apply_mutation_replaces_target_line(tmp_path):
    lines = ["def foo():\n", "    return 42\n"]
    mutated = mutation_tester.apply_mutation(lines, 2)
    assert mutated[1] == "    pass  # MUTANT\n"
    assert mutated[0] == lines[0]  # line 1 unchanged

def test_apply_mutation_preserves_indent(tmp_path):
    lines = ["def foo():\n", "        return 42\n"]
    mutated = mutation_tester.apply_mutation(lines, 2)
    assert mutated[1] == "        pass  # MUTANT\n"
    assert mutated[0] == lines[0]

def test_apply_mutation_only_one_line_changed():
    lines = ["def foo():\n", "    return 42\n", "    x = 1\n"]
    mutated = mutation_tester.apply_mutation(lines, 2)
    assert mutated[0] == lines[0]
    assert mutated[2] == lines[2]  # line 3 unchanged


# ─── run_tests ─────────────────────────────────────────────────────────────────

def test_run_tests_passes_on_zero_rc():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = type("R", (), {"returncode": 0})()
        result = mutation_tester.run_tests("echo ok", Path.cwd())
        assert result is True
        mock_run.assert_called_once()
        call_args = mock_run.call_args
        assert "echo ok" in str(call_args) or call_args[1].get("shell") is True

def test_run_tests_fails_on_nonzero_rc():
    with patch("subprocess.run") as mock_run:
        mock_run.return_value = type("R", (), {"returncode": 1})()
        result = mutation_tester.run_tests("echo fail", Path.cwd())
        assert result is False
        mock_run.assert_called_once()

def test_run_tests_timeout_returns_true():
    with patch("subprocess.run") as mock_run:
        mock_run.side_effect = subprocess.TimeoutExpired("cmd", 60)
        result = mutation_tester.run_tests("sleep 100", Path.cwd())
        assert result is True  # timeout = mutation survived
        mock_run.assert_called_once()


# ─── integration: full mutation pass ──────────────────────────────────────────

def test_kill_rate_exit_code(tmp_path):
    """
    Run mutation_tester against a simple file with a test.
    Kill rate should be computable and exit code reflects it.
    """
    mod = tmp_path / "mod.py"
    mod.write_text(textwrap.dedent("""
        def double(x):
            return x * 2

        def triple(x):
            return x * 3
    """).strip() + "\n")

    tests = tmp_path / "test_mod.py"
    tests.write_text(textwrap.dedent("""
        from mod import double
        def test_double():
            assert double(2) == 4
    """).strip() + "\n")

    (tmp_path / "pytest.ini").touch()

    result = subprocess.run(
        [
            "python3",
            str(Path(__file__).parent.parent / "mutation_tester.py"),
            str(mod),
            "--test-cmd",
            "python3 -m pytest test_mod.py -x -q --tb=no 2>&1 | tail -1",
            "--max-mutations",
            "4",
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )
    output = result.stdout + result.stderr
    # Exit 0 = kill rate >= 60%, Exit 1 = < 60%
    assert result.returncode in (0, 1)
    assert "Kill rate:" in output
    # Should have at least 1 survived mutation (triple has no test)
    assert "SURVIVED" in output or "SURVIVED" in output
