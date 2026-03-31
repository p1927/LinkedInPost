from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path

import requests

from .utils import ensure_command
from .worker_config import pick_verification_origin


def verify_worker_endpoint(worker_url: str, cors_allowed_origins: str) -> None:
    try:
        response = requests.get(worker_url, timeout=30)
        status_code = response.status_code
        content_type = response.headers.get('content-type', '').lower()
        body_text = response.text
        try:
            payload = response.json()
        except json.JSONDecodeError as error:
            raise RuntimeError(
                f'Worker verification failed for {worker_url}: response body was not valid JSON.'
            ) from error
    except requests.exceptions.SSLError:
        status_code, headers, body_text = curl_http_request(worker_url)
        content_type = headers.get('content-type', '').lower()
        try:
            payload = json.loads(body_text)
        except json.JSONDecodeError as error:
            raise RuntimeError(
                f'Worker verification failed for {worker_url}: response body was not valid JSON.'
            ) from error

    if status_code < 200 or status_code >= 300:
        raise RuntimeError(
            f'Worker verification failed for {worker_url}: GET returned status {status_code}.'
        )

    if 'application/json' not in content_type:
        snippet = body_text[:160].replace('\n', ' ').strip()
        raise RuntimeError(
            'Worker verification failed: '
            f'{worker_url} returned {content_type or "an unknown content type"} instead of JSON. '
            'This usually means the workers.dev hostname is serving a static site instead of the API Worker. '
            f'Response preview: {snippet}'
        )

    backend = payload.get('data', {}).get('backend') if isinstance(payload, dict) else None
    if backend != 'cloudflare-worker':
        raise RuntimeError(
            'Worker verification failed: '
            f'{worker_url} did not return the expected backend marker. Found: {backend!r}'
        )

    origin = pick_verification_origin(cors_allowed_origins)
    if not origin:
        return

    try:
        preflight = requests.options(
            worker_url,
            headers={
                'Origin': origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type',
            },
            timeout=30,
        )
        preflight_status = preflight.status_code
        allow_origin = preflight.headers.get('Access-Control-Allow-Origin', '')
    except requests.exceptions.SSLError:
        preflight_status, preflight_headers, _body_text = curl_http_request(
            worker_url,
            method='OPTIONS',
            headers={
                'Origin': origin,
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type',
            },
        )
        allow_origin = preflight_headers.get('access-control-allow-origin', '')

    if preflight_status != 204 or allow_origin not in {'*', origin}:
        raise RuntimeError(
            'Worker verification failed: '
            f'preflight for origin {origin} returned status {preflight_status} '
            f'and Access-Control-Allow-Origin={allow_origin!r}.'
        )


def curl_http_request(
    url: str,
    method: str = 'GET',
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], str]:
    ensure_command('curl', 'curl is required when Python cannot verify the Worker TLS certificate chain.')

    with tempfile.NamedTemporaryFile('w+', delete=False) as headers_file:
        headers_path = headers_file.name
    with tempfile.NamedTemporaryFile('w+', delete=False) as body_file:
        body_path = body_file.name

    command = [
        'curl', '--silent', '--show-error', '--location',
        '--request', method, '--dump-header', headers_path,
        '--output', body_path, url,
    ]
    for header_name, header_value in (headers or {}).items():
        command.extend(['--header', f'{header_name}: {header_value}'])

    from .constants import ROOT
    try:
        subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True)
        response_headers = parse_curl_headers(Path(headers_path).read_text())
        status_code = int(response_headers.get(':status') or response_headers.get('status') or '0')
        body_text = Path(body_path).read_text()
        return status_code, response_headers, body_text
    except subprocess.CalledProcessError as error:
        stderr = error.stderr.strip() if error.stderr else ''
        raise RuntimeError(f'curl verification failed for {url}: {stderr}') from error
    finally:
        Path(headers_path).unlink(missing_ok=True)
        Path(body_path).unlink(missing_ok=True)


def parse_curl_headers(raw_headers: str) -> dict[str, str]:
    header_blocks = re.split(r'\r?\n\r?\n', raw_headers.strip())
    last_block = header_blocks[-1] if header_blocks else ''
    parsed: dict[str, str] = {}
    for index, line in enumerate(last_block.splitlines()):
        if index == 0:
            status_match = re.search(r'\s(\d{3})(?:\s|$)', line)
            if status_match:
                parsed['status'] = status_match.group(1)
            continue
        if ':' not in line:
            continue
        name, value = line.split(':', 1)
        parsed[name.strip().lower()] = value.strip()
    return parsed
