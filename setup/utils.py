from __future__ import annotations

import base64
import secrets
import shutil
import subprocess
from pathlib import Path


def ok(label: str, value: str) -> None:
    print(f'  [ok] {label}: {value}')


def warn(label: str, value: str) -> None:
    print(f'  [warn] {label}: {value}')


def fail(label: str, reason: str) -> None:
    print(f'  [fail] {label}: {reason}')


def generate_encryption_key() -> str:
    return base64.b64encode(secrets.token_bytes(32)).decode('ascii')


def ensure_command(command: str, help_text: str) -> None:
    if shutil.which(command):
        return
    raise RuntimeError(f'{command} is not available. {help_text}')


def run_command(
    command: list[str],
    cwd: Path,
    capture_output: bool,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(
            command,
            cwd=cwd,
            check=True,
            capture_output=capture_output,
            text=True,
            input=input_text,
        )
    except subprocess.CalledProcessError as error:
        stdout = error.stdout.strip() if error.stdout else ''
        stderr = error.stderr.strip() if error.stderr else ''
        details = '\n'.join(part for part in [stdout, stderr] if part)
        raise RuntimeError(f'Command failed: {" ".join(command)}\n{details}') from error
