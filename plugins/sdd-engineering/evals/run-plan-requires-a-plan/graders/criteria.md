---
type: llm
---

PASS if the reply says no plan path was given (or the plan does not exist) and stops, pointing the user to implementation-planner or asking for a plan path.
FAIL if it starts implementing, spawns an implementer, or invents a plan.
