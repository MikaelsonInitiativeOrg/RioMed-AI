"""Small provider adapter. Mock by default; no keys embedded or logged."""
import json
import os
import urllib.error
import urllib.request
from urllib.parse import urlparse


def complete(prompt):
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 12000:
        raise ValueError("Provide 1–12,000 characters of public/test input.")
    provider = os.getenv("AI_PROVIDER", "mock").lower()
    if provider == "mock":
        return "[MOCK — no AI inference] Connected starter. Configure your own model before claiming AI use."
    model = os.getenv("AI_MODEL", "").strip()
    if not model:
        raise ValueError("Set AI_MODEL to a currently available/installed model ID.")
    key = os.getenv("AI_API_KEY", "")
    headers = {"Content-Type": "application/json"}
    if provider == "gemini":
        if not key:
            raise ValueError("Set AI_API_KEY privately for your eligible Gemini account.")
        from urllib.parse import quote
        url = "https://generativelanguage.googleapis.com/v1beta/models/" + quote(model, safe="") + ":generateContent"
        headers["x-goog-api-key"] = key
        body = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"maxOutputTokens": 512}}
    elif provider in ("groq", "ollama", "lmstudio"):
        if provider == "groq":
            if not key:
                raise ValueError("Set AI_API_KEY privately for your eligible Groq account.")
            base = "https://api.groq.com/openai/v1"
            headers["Authorization"] = "Bearer " + key
        else:
            base = os.getenv("AI_BASE_URL", "http://localhost:11434/v1" if provider == "ollama" else "http://localhost:1234/v1").rstrip("/")
            parsed = urlparse(base)
            if parsed.scheme != "http" or parsed.hostname not in ("localhost", "127.0.0.1", "::1") or parsed.username or parsed.password or parsed.query or parsed.fragment:
                raise ValueError("Local model endpoints must use loopback HTTP without credentials/query parameters.")
        url = base + "/chat/completions"
        body = {"model": model, "messages": [{"role": "user", "content": prompt}], "max_tokens": 512, "stream": False}
    else:
        raise ValueError("Supported providers: mock, gemini, groq, ollama, lmstudio.")
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            result = json.loads(response.read(1_000_000))
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"Provider returned HTTP {exc.code}. Check account/model/region/quota. No automatic retry or paid upgrade.") from None
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
        raise RuntimeError("Provider unavailable or invalid response. Use your fallback; do not expose credentials.") from None
    try:
        if provider == "gemini":
            return "".join(part.get("text", "") for part in result["candidates"][0]["content"]["parts"])
        return result["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError):
        raise RuntimeError("No usable model output. Check safety blocks/model response before retrying.") from None
