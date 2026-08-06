"""OpenRouter chat client with JSON-mode helper + agent_log bookkeeping."""
from __future__ import annotations

import json
import os
import re
import time
import urllib.request

from .. import db

OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")
URL = "https://openrouter.ai/api/v1/chat/completions"


class LlmError(RuntimeError):
    pass


def chat(model: str, system: str, user: str, max_tokens: int = 2000,
         temperature: float = 0.2, retries: int = 3) -> tuple[str, dict]:
    if not OPENROUTER_KEY:
        raise LlmError("OPENROUTER_API_KEY not set")
    body = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
    }
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://legacy-bridge-terminal-data-umga.vercel.app",
                "X-Title": "LBC Research Pipeline",
            })
            with urllib.request.urlopen(req, timeout=180) as r:
                d = json.loads(r.read().decode())
            content = d["choices"][0]["message"]["content"]
            usage = d.get("usage", {})
            return content, usage
        except Exception as e:
            last = e
            time.sleep(3 * (attempt + 1))
    raise LlmError(f"LLM call failed after {retries} tries: {last}")


def chat_json(model: str, system: str, user: str, **kw) -> tuple[dict, dict]:
    """chat() that extracts the first JSON object from the reply."""
    content, usage = chat(model, system + "\nReply with a single JSON object and nothing else.",
                          user, **kw)
    m = re.search(r"\{[\s\S]*\}", content)
    if not m:
        raise LlmError(f"no JSON in reply: {content[:200]}")
    try:
        return json.loads(m.group(0)), usage
    except json.JSONDecodeError as e:
        raise LlmError(f"bad JSON in reply: {e}: {m.group(0)[:300]}")


def log(agent: str, desk_id: str | None, model: str, usage: dict,
        output=None, error: str | None = None):
    try:
        db.insert("research", "agent_log", [{
            "agent": agent, "desk_id": desk_id, "model": model,
            "input_tokens": usage.get("prompt_tokens"),
            "output_tokens": usage.get("completion_tokens"),
            "output": output, "error": error,
        }])
    except Exception:
        pass


def get_model(role: str, default: str = "anthropic/claude-sonnet-4.5") -> str:
    models = db.get_config("models", {}) or {}
    return models.get(role, default)
