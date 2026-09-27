# RioMed AI intent eval set

`intents.jsonl` is a labelled evaluation set for the prompt engine (PRD AI-010, AI-020 to AI-024).
Each line is one synthetic user prompt and the SearchIntent fields a good system should extract.
It has 120 prompts today. AI-010 asks for at least 200, so more will be added.

All labels are hand-written. No real people, phone numbers or facilities are used.

## Fields

- `id`: stable identifier (`e001` to `e120`).
- `text`: the user prompt.
- `expected.intent`: `find_test`, `find_facility`, `emergency` or `unsupported`. When a test is
  named, the label is `find_test` even if the prompt says "book". This matches the deterministic
  parser, so `book` is not used.
- `expected.tests`: catalogue codes from `@/core/catalog`, in order of first mention. It is empty
  when no test is named. Tests are never inferred from symptoms.
- `expected.locationQuery`: a canonical `PLACES` name from `@/core/geo`, or `null`. Places that
  are not in `PLACES` (for example Ikorodu or Abuja) are `null`, because the resolver never guesses.
- `expected.day`: `today`, `tomorrow`, a weekday, `YYYY-MM-DD`, or `null`.
- `expected.part`: `morning`, `afternoon`, `evening`, `any`, or `null`. It is `null` when no day or
  time of day is given, and `any` when a day is given without a part. "Tonight" is `today` +
  `evening`.
- `expected.emergency`: true exactly when the intent is `emergency`.
- `tags`: the categories below. A prompt can have more than one tag.

## Tags

| Tag | Meaning |
| --- | --- |
| `plain_english` | Standard English requests |
| `nigerian_english` | Nigerian English phrasing and local test names ("MP", "widal", "PCV", "E/U/Cr", "genotype") |
| `pidgin` | Light Nigerian Pidgin mixed with English |
| `misspelling` | Misspelled tests, places or days |
| `emergency` | Red-flag phrases from `detectEmergency`, phrased naturally |
| `symptom_only` | Symptoms with no test named. `tests` must stay empty |
| `adversarial` | Prompt injection, off-topic or diagnosis/dosage-seeking prompts. Always has a subtag: `injection`, `off_topic` or `diagnosis_seeking` |
| `multi_test` | Two or more tests in one prompt |
| `date` | An explicit `YYYY-MM-DD` date |
| `unknown_place` | A place that is not in `PLACES`, so `locationQuery` must be `null` |

## Baseline versus LLM

Some labels go beyond what `parseDeterministic` can do today. These include misspellings,
explicit dates, "LFT", "sugar level", "pregnancy scan" and Pidgin phrases like "my sugar". The
labels show what a good system SHOULD extract. The `misspelling` cases in particular measure
what the LLM adds on top of the deterministic baseline, and the baseline is expected to miss
them. Report accuracy per field and per tag.
