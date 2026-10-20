---
type: llm
focus: last_message
---

The request has three mandatory requirements; the third ("it is fast") and the second ("handles non-English text sensibly") are vague.

PASS if the final reply states whether the spec is complete or incomplete and gives a coverage count, AND either (a) every one of the three requirements is stated as covered by a testable acceptance criterion with a concrete measurable target for "fast", or (b) the spec is reported as incomplete and names the uncovered requirement(s) as open questions with a recommended default.
FAIL if the reply calls the spec complete while a vague requirement (for example "fast" with no measurable target) has no acceptance criterion or open question, or if the reply gives no completeness statement or coverage count.
