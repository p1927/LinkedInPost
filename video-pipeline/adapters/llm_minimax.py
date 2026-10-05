"""LLM text provider: MiniMax chat completions (OpenAI-compatible). Uses the same MINIMAX_API_KEY as the TTS/image/video adapters.

Mirrors the repo's worker/src/llm/providers/minimax.ts: base https://api.minimax.io/v1, `response_format: json_object`, `reasoning_split`.
M2.5/M2.7 are *thinking* models: their <think> tokens count against max_completion_tokens, so we add a fixed overhead (same trick as the worker)
and strip any <think> block before the caller sees the text. Fallback chain over `models`; per model, a timeout / connection error / 429 / 5xx is retried with backoff (`retry_waits`, default
30/90/180 s, i.e. up to 4 attempts) before the next model is tried; auth errors fail immediately."""
import re
import time

import requests

from adapters.common import JsonLLM, minimax_headers

_BASE = "https://api.minimax.io/v1"
_THINKING = ("MiniMax-M2.7", "MiniMax-M2.5", "MiniMax-M3")


class MiniMaxLLM(JsonLLM):
    def __init__(self, models=("MiniMax-M2.7",), temperature=0.7, max_tokens=12000, think_overhead=6000, tries=3, timeout=420, retry_waits=(30, 90, 180)):
        self.models, self.temperature, self.max_tokens = list(models), temperature, max_tokens
        self.think_overhead, self.timeout = think_overhead, timeout
        self.retry_waits = tuple(retry_waits)[:max(0, tries)] if tries else ()  # `tries` = number of RETRIES (kept for config compatibility)

    def generate(self, prompt: str, system: str = "", json_mode: bool = True, temperature=None) -> str:
        msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
        last = None
        for model in self.models:
            body = {"model": model, "messages": msgs, "reasoning_split": True,
                    "temperature": self.temperature if temperature is None else temperature,
                    "max_completion_tokens": self.max_tokens + (self.think_overhead if model.startswith(_THINKING) else 0)}
            if json_mode:
                body["response_format"] = {"type": "json_object"}
            for attempt in range(len(self.retry_waits) + 1):
                retry = attempt < len(self.retry_waits)
                try:
                    r = requests.post(f"{_BASE}/chat/completions", json=body, headers=minimax_headers(), timeout=self.timeout)
                except (requests.Timeout, requests.ConnectionError) as e:  # ReadTimeout after 420 s killed ep19's run: retry, then fall back
                    last = f"{model} {type(e).__name__}"
                    if retry:
                        print(f"LLM {model}: {type(e).__name__}; retry {attempt + 1}/{len(self.retry_waits)} in {self.retry_waits[attempt]} s")
                        time.sleep(self.retry_waits[attempt])
                    continue
                if r.status_code in (401, 403):
                    raise RuntimeError(f"MiniMax auth failed: HTTP {r.status_code}")
                if r.status_code in (429, 500, 502, 503, 504, 529):
                    last = f"{model} HTTP {r.status_code}"
                    if retry:
                        print(f"LLM {model}: HTTP {r.status_code}; retry {attempt + 1}/{len(self.retry_waits)} in {self.retry_waits[attempt]} s")
                        time.sleep(self.retry_waits[attempt])
                    continue
                if not r.ok:
                    last = f"{model} HTTP {r.status_code}: {r.text[:200]}"
                    break
                data = r.json()
                br = data.get("base_resp") or {}
                if br.get("status_code", 0) != 0:
                    last = f"{model} {br.get('status_code')} {br.get('status_msg')}"
                    break
                text = ((data.get("choices") or [{}])[0].get("message") or {}).get("content") or ""
                text = re.sub(r"(?s)<think>.*?</think>", "", text).strip()
                if text:
                    return text
                last = f"{model} returned empty text"
        raise RuntimeError(f"LLM failed on all models: {last}")
