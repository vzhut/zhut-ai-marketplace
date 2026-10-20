---
type: llm
---

PASS if the reply returns a "Clarification needed" block asking for the spec path, and does not report a verification verdict or PASS/MISSING counts.
FAIL if it reports a verdict, invents spec items, or runs checks without a spec.
