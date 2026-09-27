# Build with Any AI — four starter templates

> **Reference only.** These Python starters were shared as AI-integration reference material for
> this project. They are not part of the application, which is TypeScript (see
> [docs/PRD.md](../../docs/PRD.md), section 9). `kaggle_notebook.ipynb` was not provided, so
> `test_notebook` in `test_starters.py` fails until it is added.

Build with the stack that fits your problem. These are equal participation options, not a consolation track. Brev is optional, limited to up to 125 reviewed high-compute projects globally; no voucher is guaranteed. Judging assesses the quality, relevance and demonstrated contribution of AI, not the provider or access to credits.

## Start here

Python 3.10+ is sufficient for templates 1–3; they use the standard library. All start without cloud credentials in an explicitly labelled mock mode. **Mock output is not AI inference**: connect and test your actual model before claiming AI use. Never publish credentials or confidential data. Use synthetic/public data during setup.

1. **Web/API:** `python web_api.py`, then visit http://127.0.0.1:8000. A local page calls a server-side model adapter. No API keys enter browser code. This is a local development server, not a production/public deployment.
2. **RAG:** `python rag.py "What is the Brev rule?"`. Retrieves labelled passages from the included small public example corpus, then asks your selected model for a source-grounded answer. Replace the corpus with permissioned data, evaluate citations and refusal behaviour. Retrieval is lexical, not vector embedding.
3. **Local model:** `python local_model.py "Explain my prototype idea"`. Start Ollama or LM Studio, load a model your laptop can run, then set the local variables below. The script rejects non-loopback servers for this template.
4. **Kaggle notebook:** upload `kaggle_notebook.ipynb` to Kaggle. Run the CPU baseline first. If your account is eligible and a GPU is available, enable one and rerun; the notebook automatically falls back to CPU. It trains a tiny neural classifier on synthetic data, reports held-out accuracy and saves a checkpoint. Replace the toy task with your project and evaluate honestly.

## Connect a real model (explicit opt-in)

Set `AI_PROVIDER` to `gemini`, `groq`, `ollama` or `lmstudio`; set `AI_MODEL` to an available model ID shown in your provider's current model list or local runtime. For Gemini/Groq set `AI_API_KEY` in your terminal environment, never in code or a public notebook. For local models set `AI_BASE_URL` to `http://localhost:11434/v1` (Ollama) or `http://localhost:1234/v1` (LM Studio). Do not enable paid billing merely to run these examples. Inspect your actual account plan and limits first. The adapter makes one bounded request per call and does not retry on rate limits or errors.

Example local configuration:

```sh
export AI_PROVIDER=ollama
export AI_MODEL='your-installed-model-id'
export AI_BASE_URL=http://localhost:11434/v1
python local_model.py 'Summarize this public test sentence.'
```

## Access is conditional, never guaranteed

- Gemini free tier: eligible models/accounts/regions only; quota and rate limits apply. https://ai.google.dev/gemini-api/docs/billing
- Groq free plan: model- and account-specific rate/token limits. https://console.groq.com/docs/rate-limits
- Ollama / LM Studio: local hardware, disk/RAM and model licence constraints; download models before the event where possible. https://docs.ollama.com/ and https://lmstudio.ai/docs
- Kaggle: account eligibility/verification, GPU availability, session/weekly quotas, queues and region restrictions may apply. Do not rely on continuous inference hosting. https://www.kaggle.com/docs/notebooks
- Hugging Face public demos: free static Spaces can host a public interface or recorded demonstration. Hosted Gradio/Docker/GPU options have separate eligibility, plans and limits. A static page cannot keep API secrets; use a secured backend or a recorded demo. Public Spaces expose source/content: never upload private participant data or keys. https://huggingface.co/docs/hub/spaces-overview

All external services are subject to their current terms, account eligibility, quotas/rate limits, model availability and regional access. Free options are not a promise of capacity or an event sponsorship.

## 45-minute Alternative Stack Clinic (delivery plan)

Time, facilitator and joining link are to be confirmed by organizers. This plan does not add an unconfirmed time to the event schedule.

- 0–5 min: choose stack; verify account/hardware; agree a fallback.
- 5–15: web/API, private keys, one real request, handle 429/errors.
- 15–25: RAG retrieval, grounded answer, citations and no-answer test.
- 25–35: local model, memory limits, one inference, CPU/smaller-model fallback.
- 35–42: Kaggle CPU/GPU check, train/evaluate, export checkpoint/demo.
- 42–45: questions and each team's next test.

## Submission disclosure

State your chosen stack/model/version, what AI actually does, why it helps, account/hardware constraints, tests/results, limitations and fallback. Distinguish mock/recorded output from live inference. Conventional software is welcome; do not claim an AI contribution where none exists. Brev allocation is independent of judging. See https://hackathon.gomycode.com/onboarding for forms and deadlines.

## Verification

Run `python test_starters.py` for offline mock, retrieval, privacy/error-handling and notebook-schema checks. Real provider calls require your own eligible access and have not been capacity-tested for the event. The tiny Kaggle training task is a starter, not evidence for your project.
