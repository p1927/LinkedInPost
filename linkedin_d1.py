"""
Cloudflare Worker + D1 client for linkedin_bot.py.

Pipeline state (drafts, approval, publish) lives in D1; the bot calls the Worker using
VITE_WORKER_URL and WORKER_SCHEDULER_SECRET (same secret as minute-level scheduling).

Optional LINKEDIN_BOT_MIRROR_SHEET mirrors changes to Google Draft/Post tabs for visibility.
"""

from __future__ import annotations

import os
from typing import Any

import requests


def worker_base_url() -> str:
    return os.environ.get('VITE_WORKER_URL', '').strip()


def worker_scheduler_secret() -> str:
    return os.environ.get('WORKER_SCHEDULER_SECRET', '').strip()


def mirror_sheet_enabled() -> bool:
    raw = os.environ.get('LINKEDIN_BOT_MIRROR_SHEET', 'true').strip().lower()
    return raw not in {'0', 'false', 'no'}


def worker_internal_post(path: str, json_body: dict | None = None, timeout: int = 120) -> dict[str, Any]:
    url = f'{worker_base_url().rstrip("/")}{path}'
    response = requests.post(
        url,
        headers={
            'Content-Type': 'application/json',
            'X-Scheduler-Secret': worker_scheduler_secret(),
        },
        json=json_body if json_body is not None else {},
        timeout=timeout,
    )
    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError(f'Worker returned non-JSON ({response.status_code}): {response.text[:500]}') from exc
    if not response.ok or not data.get('ok'):
        msg = data.get('error') if isinstance(data, dict) else response.text
        raise RuntimeError(f'Worker request failed ({response.status_code}): {msg}')
    return data


def worker_get_merged_rows() -> list[dict[str, Any]]:
    data = worker_internal_post('/internal/merged-rows')
    rows = data.get('data')
    if not isinstance(rows, list):
        raise RuntimeError('Worker merged-rows response missing data array.')
    return rows


def worker_github_automation_gemini_model() -> str:
    """Gemini model for GitHub draft jobs — matches Worker workspace LLM policy (not a Python default)."""
    data = worker_internal_post('/internal/github-automation-gemini-model')
    inner = data.get('data')
    if not isinstance(inner, dict):
        raise RuntimeError('Worker github-automation-gemini-model response missing data object.')
    model = str(inner.get('googleModel') or '').strip()
    if not model:
        raise RuntimeError('Worker returned an empty googleModel.')
    return model.removeprefix('models/')


def worker_github_automation_generate_variants(payload: dict[str, Any]) -> dict[str, Any]:
    """Runs GitHub draft variant generation on the Cloudflare Worker (D1 `github_automation` LLM ref)."""
    data = worker_internal_post('/internal/github-automation-generate-variants', payload, timeout=180)
    inner = data.get('data')
    if not isinstance(inner, dict):
        raise RuntimeError('Worker github-automation-generate-variants response missing data object.')
    return inner


def worker_pipeline_upsert(row: dict[str, Any]) -> None:
    worker_internal_post('/internal/pipeline-upsert', {'row': row})


def merged_row_blocks_new_draft(row: dict[str, Any]) -> bool:
    st = (row.get('status') or '').strip().lower()
    if st in ('drafted', 'approved', 'published'):
        return True
    for key in ('variant1', 'variant2', 'variant3', 'variant4'):
        if (row.get(key) or '').strip():
            return True
    if (row.get('selectedText') or '').strip():
        return True
    return False


def build_worker_sheet_row(
    *,
    topic_row_index: int,
    topic_id: str,
    topic: str,
    date: str,
    status: str,
    variant1: str,
    variant2: str,
    variant3: str,
    variant4: str,
    image_link1: str,
    image_link2: str,
    image_link3: str,
    image_link4: str,
    selected_text: str = '',
    selected_image_id: str = '',
    post_time: str = '',
    source_sheet: str = 'Draft',
    published_at: str | None = None,
    carry_from: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Payload shape matches Worker SheetRow (camelCase)."""
    base_email = {
        'emailTo': '',
        'emailCc': '',
        'emailBcc': '',
        'emailSubject': '',
    }
    base_rules = {
        'topicGenerationRules': '',
        'generationTemplateId': '',
        'selectedImageUrlsJson': '',
    }
    if carry_from:
        base_email = {
            'emailTo': carry_from.get('emailTo') or '',
            'emailCc': carry_from.get('emailCc') or '',
            'emailBcc': carry_from.get('emailBcc') or '',
            'emailSubject': carry_from.get('emailSubject') or '',
        }
        base_rules = {
            'topicGenerationRules': carry_from.get('topicGenerationRules') or '',
            'generationTemplateId': carry_from.get('generationTemplateId') or '',
            'selectedImageUrlsJson': carry_from.get('selectedImageUrlsJson') or '',
        }
    return {
        'rowIndex': topic_row_index,
        'sourceSheet': source_sheet,
        'topicRowIndex': topic_row_index,
        'topicId': topic_id.strip(),
        'topic': topic,
        'date': date,
        'status': status,
        'variant1': variant1,
        'variant2': variant2,
        'variant3': variant3,
        'variant4': variant4,
        'imageLink1': image_link1,
        'imageLink2': image_link2,
        'imageLink3': image_link3,
        'imageLink4': image_link4,
        'selectedText': selected_text,
        'selectedImageId': selected_image_id,
        'postTime': post_time,
        **base_email,
        **base_rules,
        'publishedAt': published_at,
    }


def merged_dict_to_sheet_row_14(d: dict[str, Any]) -> list[str]:
    """Draft/Post sheet row A:N (14 columns) for optional mirroring."""
    return [
        d.get('topic') or '',
        d.get('date') or '',
        d.get('status') or '',
        d.get('variant1') or '',
        d.get('variant2') or '',
        d.get('variant3') or '',
        d.get('variant4') or '',
        d.get('imageLink1') or '',
        d.get('imageLink2') or '',
        d.get('imageLink3') or '',
        d.get('imageLink4') or '',
        d.get('selectedText') or '',
        d.get('selectedImageId') or '',
        d.get('postTime') or '',
    ]


def upsert_row_after_publish(base: dict[str, Any], published_row_14: list[str], topic_row_index: int, published_at_iso: str) -> dict[str, Any]:
    """Build full SheetRow dict for D1 after a successful LinkedIn post (mirrors sheet row shape)."""
    out = dict(base)
    out['rowIndex'] = topic_row_index
    out['topicRowIndex'] = topic_row_index
    out['sourceSheet'] = 'Post'
    out['status'] = 'Published'
    out['topic'] = published_row_14[0]
    out['date'] = published_row_14[1]
    out['variant1'] = published_row_14[3]
    out['variant2'] = published_row_14[4]
    out['variant3'] = published_row_14[5]
    out['variant4'] = published_row_14[6]
    out['imageLink1'] = published_row_14[7]
    out['imageLink2'] = published_row_14[8]
    out['imageLink3'] = published_row_14[9]
    out['imageLink4'] = published_row_14[10]
    out['selectedText'] = published_row_14[11]
    out['selectedImageId'] = published_row_14[12]
    out['postTime'] = published_row_14[13]
    out.setdefault('selectedImageUrlsJson', base.get('selectedImageUrlsJson') or '')
    out.setdefault('emailTo', base.get('emailTo') or '')
    out.setdefault('emailCc', base.get('emailCc') or '')
    out.setdefault('emailBcc', base.get('emailBcc') or '')
    out.setdefault('emailSubject', base.get('emailSubject') or '')
    out.setdefault('topicGenerationRules', base.get('topicGenerationRules') or '')
    out.setdefault('generationTemplateId', base.get('generationTemplateId') or '')
    out['publishedAt'] = published_at_iso
    return out
