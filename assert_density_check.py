#!/usr/bin/env python3
"""
assert_density_check.py — audit test files for weak assertions.

Usage:
  python3 assert_density_check.py /path/to/tests/  [--fail-under 2]
  python3 assert_density_check.py /path/to/single_test.py

Exit 0 = all pass, Exit 1 = weak tests found.

Rules:
  - Each test function must have >= MIN_ASSERTIONS real assertions
  - assert True / assert 1 == 1 / assert False / assert None count as ZERO
  - Test function body must have >= MIN_LINES non-blank lines
  - Smoke-import tests (only import + assert True) flagged as SMOKE
"""

import ast
import sys
import os
from pathlib import Path

MIN_ASSERTIONS = int(os.environ.get("MIN_ASSERTIONS", "2"))
MIN_LINES = int(os.environ.get("MIN_LINES", "3"))

TRIVIAL_ASSERT_VALUES = {
    "True", "False", "None", "1", "0", "''" , '""',
}

def is_trivial_assert(node: ast.Assert) -> bool:
    test = node.test
    # assert True / assert False / assert None
    if isinstance(test, ast.Constant) and str(test.value) in TRIVIAL_ASSERT_VALUES:
        return True
    # assert 1 == 1 / assert x == x
    if isinstance(test, ast.Compare):
        if len(test.comparators) == 1:
            left = ast.dump(test.left)
            right = ast.dump(test.comparators[0])
            if left == right:
                return True
            # assert 1 == 1
            if (isinstance(test.left, ast.Constant) and
                    isinstance(test.comparators[0], ast.Constant) and
                    test.left.value == test.comparators[0].value):
                return True
    return False

def count_real_assertions(func_node: ast.FunctionDef) -> int:
    count = 0
    for node in ast.walk(func_node):
        if isinstance(node, ast.Assert):
            if not is_trivial_assert(node):
                count += 1
        # count pytest.raises / self.assertX / self.assertEqual etc.
        elif isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Attribute):
                if func.attr in ("raises", "warns", "deprecated"):
                    count += 1
                elif func.attr.startswith("assert") and func.attr != "assert_":
                    count += 1
    return count

def body_lines(func_node: ast.FunctionDef, source_lines: list[str]) -> int:
    start = func_node.body[0].lineno - 1
    end = func_node.end_lineno
    body = source_lines[start:end]
    return sum(1 for l in body if l.strip() and not l.strip().startswith('#'))

def audit_file(path: Path) -> list[dict]:
    issues = []
    try:
        source = path.read_text()
        tree = ast.parse(source)
        source_lines = source.splitlines()
    except Exception as e:
        return [{"file": str(path), "func": "PARSE_ERROR", "issue": str(e), "assertions": 0}]

    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if not node.name.startswith("test_"):
            continue

        assertions = count_real_assertions(node)
        lines = body_lines(node, source_lines)

        # Detect smoke-only: just imports and trivial asserts
        has_only_trivial = all(
            isinstance(n, ast.Assert) and is_trivial_assert(n)
            for n in ast.walk(node)
            if isinstance(n, ast.Assert)
        )

        if assertions < MIN_ASSERTIONS:
            issue_type = "SMOKE" if (assertions == 0 and has_only_trivial) else "WEAK"
            issues.append({
                "file": str(path),
                "func": node.name,
                "line": node.lineno,
                "assertions": assertions,
                "body_lines": lines,
                "issue": issue_type,
            })
        elif lines < MIN_LINES:
            issues.append({
                "file": str(path),
                "func": node.name,
                "line": node.lineno,
                "assertions": assertions,
                "body_lines": lines,
                "issue": "SHORT_BODY",
            })

    return issues

def main():
    args = sys.argv[1:]
    if not args:
        print("Usage: assert_density_check.py <path_or_dir> [<path_or_dir> ...]")
        sys.exit(1)

    all_issues = []
    total_funcs = 0

    for arg in args:
        p = Path(arg)
        if p.is_file():
            files = [p]
        else:
            files = list(p.rglob("test_*.py")) + list(p.rglob("*_test.py"))

        for f in sorted(files):
            if any(part in f.parts for part in (".venv", "__pycache__", "rescued", "node_modules")):
                continue
            issues = audit_file(f)
            all_issues.extend(issues)
            # Count all test funcs in file
            try:
                tree = ast.parse(f.read_text())
                total_funcs += sum(
                    1 for n in ast.walk(tree)
                    if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                    and n.name.startswith("test_")
                )
            except Exception:
                pass

    weak = [i for i in all_issues if i.get("issue") in ("WEAK", "SMOKE")]
    short = [i for i in all_issues if i.get("issue") == "SHORT_BODY"]
    errors = [i for i in all_issues if i.get("issue") not in ("WEAK", "SMOKE", "SHORT_BODY")]

    if weak:
        print(f"\n{'='*60}")
        print(f"WEAK/SMOKE tests (< {MIN_ASSERTIONS} real assertions):")
        print(f"{'='*60}")
        for i in weak:
            print(f"  {i['file']}:{i['line']} {i['func']}() — {i['assertions']} assertions [{i['issue']}]")

    if short:
        print(f"\n{'='*60}")
        print(f"SHORT test bodies (< {MIN_LINES} non-blank lines):")
        print(f"{'='*60}")
        for i in short:
            print(f"  {i['file']}:{i['line']} {i['func']}() — {i['body_lines']} lines")

    if errors:
        print(f"\nPARSE ERRORS:")
        for i in errors:
            print(f"  {i['file']}: {i['issue']}")

    print(f"\n{'='*60}")
    print(f"SUMMARY: {len(weak)} weak/smoke, {len(short)} short-body, {errors and len(errors) or 0} errors")
    print(f"         {total_funcs} total test functions scanned")
    density_ok = total_funcs - len(weak) - len(short)
    print(f"         {density_ok}/{total_funcs} meet the density bar")
    print(f"{'='*60}")

    sys.exit(1 if (weak or short) else 0)

if __name__ == "__main__":
    main()
