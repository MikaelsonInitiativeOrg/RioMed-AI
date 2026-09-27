"""Local model template; AI_PROVIDER must be mock, ollama or lmstudio."""
import os
import sys
from ai_client import complete

if __name__ == "__main__":
    if os.getenv("AI_PROVIDER", "mock") not in ("mock", "ollama", "lmstudio"):
        raise SystemExit("Choose ollama/lmstudio for this local-only template, or mock for an offline setup test.")
    print(complete(" ".join(sys.argv[1:]) or "Explain one useful test for an AI prototype."))
