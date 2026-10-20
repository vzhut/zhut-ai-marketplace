---
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review"]
max_turns: 25
timeout_seconds: 600
allowed_tools: [Agent, Read, Write, Edit, Glob, Grep, Bash, Skill]
---

Use the spec-creator agent to write a requirements spec for a small string library function `slugify(text)` that turns a title into a URL slug. Mandatory requirements: (1) the result contains only lowercase letters, digits and hyphens; (2) it handles non-English text sensibly; (3) it is fast. No design material exists. Save the spec and tell me whether it is complete.
