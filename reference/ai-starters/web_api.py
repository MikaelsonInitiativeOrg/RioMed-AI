"""Local-only web/API starter. Run: python web_api.py"""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from ai_client import complete

PAGE = b'''<!doctype html><html lang="en"><meta charset="utf-8"><title>Build with Any AI</title>
<body><h1>Build with Any AI</h1><p>Local starter. Mock output is not real inference. Do not enter private data.</p>
<form><label>Public test prompt <textarea id="prompt" maxlength="12000" required></textarea></label><button>Run</button></form>
<pre id="out" aria-live="polite"></pre><script>
document.querySelector('form').addEventListener('submit',async e=>{e.preventDefault();const b=document.querySelector('button');b.disabled=true;try{const r=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:document.querySelector('#prompt').value})});const d=await r.json();document.querySelector('#out').textContent=d.output||d.error;}catch{document.querySelector('#out').textContent='Local server unavailable';}finally{b.disabled=false;}});
</script></body></html>'''


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_):
        pass  # Do not log submitted prompts.

    def send(self, code, data, content_type):
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self.send(200 if self.path == "/" else 404, PAGE if self.path == "/" else b"Not found", "text/html; charset=utf-8")

    def do_POST(self):
        if self.path != "/api":
            return self.send(404, b'{"error":"Not found"}', "application/json")
        # JSON-only plus strict loopback origin prevents cross-site browser requests.
        origin = self.headers.get("Origin")
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json" or (origin and origin not in ("http://127.0.0.1:8000", "http://localhost:8000")):
            return self.send(403, b'{"error":"Use the local starter page"}', "application/json")
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= 20000:
                raise ValueError("Request too large or empty.")
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError("Expected a JSON object.")
            result = {"output": complete(data.get("prompt"))}
            code = 200
        except (ValueError, RuntimeError) as exc:
            code, result = 400, {"error": str(exc)}
        self.send(code, json.dumps(result).encode(), "application/json")


if __name__ == "__main__":
    print("Local-only starter: http://127.0.0.1:8000 — never expose this development server publicly.")
    HTTPServer(("127.0.0.1", 8000), Handler).serve_forever()
