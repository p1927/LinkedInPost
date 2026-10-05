"""LLM text provider (Gemini REST). DISABLED by default (see providers.yaml `llm_gemini:` with `enabled: false`); kept for future use.

To re-enable: uncomment GEMINI_API_KEY in ../.env, then point `llm:` / `llm_verify:` at this class
(class_path: adapters.llm_gemini.GeminiLLM, models: [gemini-2.5-flash, ...]) or set `enabled: true` on the `llm_gemini:` block.

Reuse notes (see docs/plans/youtube-automation/DIRECTOR-AND-VARIETY-PLAN.md):
- model fallback chain + 429/503 backoff: pattern from youtube-agentic-ai-studio (gemini_client.py)
- parse_json() / generate_json(): shared in adapters/common.py (JsonLLM)
The API key goes in a header, never in the URL."""
import time

import requests

from adapters.common import JsonLLM, env

_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiLLM(JsonLLM):
    def __init__(self, models=("gemini-2.5-flash",), temperature=0.8, tries=3, timeout=300):
        self.models, self.temperature, self.tries, self.timeout = list(models), temperature, tries, timeout

    def generate(self, prompt: str, system: str = "", json_mode: bool = True, temperature=None) -> str:
        body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": self.temperature if temperature is None else temperature}}
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}
        if json_mode:
            body["generationConfig"]["responseMimeType"] = "application/json"
        last = None
        for model in self.models:
            for attempt in range(self.tries):
                r = requests.post(_URL.format(model=model), json=body, timeout=self.timeout,
                                  headers={"x-goog-api-key": env("GEMINI_API_KEY")})
                if r.status_code in (429, 500, 503):  # transient: back off, then try again / next model
                    last = f"{model} HTTP {r.status_code}"
                    time.sleep(15 * (attempt + 1))
                    continue
                if r.status_code in (401, 403):  # auth problems will not fix themselves
                    raise RuntimeError(f"Gemini auth failed: HTTP {r.status_code}")
                if not r.ok:
                    last = f"{model} HTTP {r.status_code}: {r.text[:200]}"
                    break
                parts = (r.json().get("candidates") or [{}])[0].get("content", {}).get("parts") or []
                text = "".join(p.get("text", "") for p in parts)
                if text.strip():
                    return text
                last = f"{model} returned empty text"
        raise RuntimeError(f"LLM failed on all models: {last}")
