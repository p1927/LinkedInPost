from __future__ import annotations

import datetime as dt
from dataclasses import dataclass

import requests


@dataclass(frozen=True)
class SchedulerDecision:
    should_publish_now: bool
    should_schedule_with_worker: bool
    scheduled_time: dt.datetime | None


def parse_post_time(value: str) -> dt.datetime | None:
    trimmed = value.strip()
    if not trimmed:
        return None

    return dt.datetime.strptime(trimmed, '%Y-%m-%d %H:%M')


def decide_publish_timing(now: dt.datetime, post_time_str: str) -> SchedulerDecision:
    scheduled_time = parse_post_time(post_time_str) if post_time_str.strip() else None
    if scheduled_time is None:
                return SchedulerDecision(should_publish_now=True, should_schedule_with_worker=False, scheduled_time=None)

    if scheduled_time.minute == 0:
                return SchedulerDecision(
                        should_publish_now=now >= scheduled_time,
                        should_schedule_with_worker=False,
                        scheduled_time=scheduled_time,
                )

    if now >= scheduled_time:
                return SchedulerDecision(should_publish_now=True, should_schedule_with_worker=False, scheduled_time=scheduled_time)

    within_next_hour = scheduled_time <= (now + dt.timedelta(hours=1))
    return SchedulerDecision(
        should_publish_now=False,
        should_schedule_with_worker=within_next_hour,
        scheduled_time=scheduled_time,
    )


def schedule_linkedin_publish_with_worker(
    worker_url: str,
    scheduler_secret: str,
    topic: str,
    date_str: str,
    scheduled_time: str,
    topic_id: str | None = None,
) -> None:
    if not worker_url:
        raise RuntimeError('VITE_WORKER_URL is required to schedule minute-level Cloudflare publish tasks.')
    if not scheduler_secret:
        raise RuntimeError('WORKER_SCHEDULER_SECRET is required to schedule minute-level Cloudflare publish tasks.')

    endpoint = f'{worker_url.rstrip("/")}/internal/schedule-linkedin-publish'
    payload: dict[str, str] = {
        'topic': topic,
        'date': date_str,
        'scheduledTime': scheduled_time,
    }
    tid = (topic_id or '').strip()
    if tid:
        payload['topicId'] = tid

    response = requests.post(
        endpoint,
        headers={
            'Content-Type': 'application/json',
            'X-Scheduler-Secret': scheduler_secret,
        },
        json=payload,
        timeout=30,
    )
    if not response.ok:
        raise RuntimeError(f'Cloudflare scheduler request failed: {response.text or response.status_code}')
