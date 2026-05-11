#!/usr/bin/env python3
"""
mutation_tester.py — branch-deletion mutation tester.

Usage:
  python3 mutation_tester.py <source_file.py>
  python3 mutation_tester.py <source_file.py> --test-cmd "pytest tests/ -x -q"
  python3 mutation_tester.py <source_file.py> --max-mutations 30

Exit 0 = kill rate >= 60% (tests are real).
Exit 1 = kill rate < 60% (tests are decorative).
Exit 2 = no mutations found / parse error.

How it works:
  For each mutable node (if-body, return, raise, assert) in the source:
    1. Comment out that line in a scratch copy of the file
    2. Run the test suite against the mutated copy
    3. If tests still pass → mutation SURVIVED (tests didn't catch it)
    4. If tests fail → mutation KILLED (tests caught it)
  Kill rate = killed / total * 100%. Target >= 60%.
"""

import ast
import subprocess
import sys
import tempfile
import shutil
from pathlib import Path


def find_project_root(start: Path) -> Path:
    for marker in ("pytest.ini", "setup.cfg", "pyproject.toml", "setup.py"):
        p = start
        while p != p.parent:
            if (p / marker).exists():
                return p
            p = p.parent
    return start


def mutable_linenos(source: str) -> list[int]:
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []
    lines = set()
    for node in ast.walk(tree):
        # if-body first line, return, raise, assert — these are highest-value mutation targets
        if isinstance(node, ast.If) and node.body:
            lines.add(node.body[0].lineno)
        elif isinstance(node, (ast.Return, ast.Raise, ast.Assert)):
            lines.add(node.lineno)
        elif isinstance(node, ast.Assign):
            lines.add(node.lineno)
    return sorted(lines)


def apply_mutation(lines: list[str], lineno: int) -> list[str]:
    mutated = lines.copy()
    original = mutated[lineno - 1]
    indent = len(original) - len(original.lstrip())
    mutated[lineno - 1] = " " * indent + "pass  # MUTANT\n"
    return mutated


def run_tests(cmd: str, cwd: Path, timeout: int = 60) -> bool:
    try:
        r = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, timeout=timeout)
        return r.returncode == 0
    except subprocess.TimeoutExpired:
        return True  # timeout = survived (bad for us)


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)

    src_path = Path(args[0]).resolve()
    test_cmd = "python3 -m pytest -x -q --tb=no 2>&1 | tail -2"
    max_mutations = 20

    for i, a in enumerate(args):
        if a == "--test-cmd" and i + 1 < len(args):
            test_cmd = args[i + 1]
        if a == "--max-mutations" and i + 1 < len(args):
            max_mutations = int(args[i + 1])

    if not src_path.exists():
        print(f"ERROR: {src_path} not found")
        sys.exit(2)

    source = src_path.read_text()
    source_lines = source.splitlines(keepends=True)
    candidates = mutable_linenos(source)

    if not candidates:
        print(f"No mutable lines found in {src_path.name}")
        sys.exit(2)

    proj_root = find_project_root(src_path.parent)
    print(f"Source:   {src_path.relative_to(proj_root)}")
    print(f"Root:     {proj_root}")
    print(f"Mutating: {min(len(candidates), max_mutations)}/{len(candidates)} candidate lines")
    print(f"Test cmd: {test_cmd}")
    print()

    tmpdir = Path(tempfile.mkdtemp(prefix="muttest_"))
    try:
        tmp_proj = tmpdir / "proj"
        shutil.copytree(
            proj_root, tmp_proj,
            ignore=shutil.ignore_patterns("__pycache__", ".venv", "node_modules", ".git", "dist", "build"),
        )
        tmp_src = tmp_proj / src_path.relative_to(proj_root)

        killed = 0
        survived = 0
        survived_lines = []

        for lineno in candidates[:max_mutations]:
            original_line = source_lines[lineno - 1].rstrip()
            mutated_lines = apply_mutation(source_lines, lineno)
            tmp_src.write_text("".join(mutated_lines))

            passed = run_tests(test_cmd, tmp_proj)

            if passed:
                survived += 1
                survived_lines.append((lineno, original_line.strip()[:70]))
                status = "SURVIVED"
            else:
                killed += 1
                status = "killed  "

            print(f"  {status} line {lineno:4d}: {original_line.strip()[:60]}")

        # Restore original after last mutation
        tmp_src.write_text(source)

        total = killed + survived
        kill_rate = killed / total * 100 if total > 0 else 0

        print()
        print("=" * 60)
        if survived_lines:
            print("SURVIVED mutations (tests didn't catch these):")
            for lineno, snippet in survived_lines:
                print(f"  line {lineno}: {snippet}")
            print()
        print(f"Kill rate: {killed}/{total} = {kill_rate:.0f}%")
        print(f"Result:    {'PASS (tests are real)' if kill_rate >= 60 else 'FAIL (tests are decorative)'}")
        print(f"Target:    >= 60%")
        print("=" * 60)

        sys.exit(0 if kill_rate >= 60 else 1)

    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


if __name__ == "__main__":
    main()
