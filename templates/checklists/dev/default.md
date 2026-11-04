---
platforms: [mobile, ios, android, web]
---

# Change EchoBridge

- [ ] Read the task and acceptance criteria, inspect the existing implementation, and record the proof to run.
- [ ] Select the closest recipe with the EchoBridge runner's list and describe commands; validate the recipe before execution.
- [ ] Implement the smallest change and add the required regression tests; the deterministic mark owns code validation.
- [ ] Run the relevant recipe against its real target, retain the artifact package, and record any uncovered criteria.
- [ ] Changed-file CI [DETERMINISTIC: ci.local_check] - call this step through `./mark N`; the engine runs the frozen command. Read failures and fix them; do not launch validation commands.

- [ ] Write artifacts/pr-description.md and artifacts/learnings.md, then close the task through ./mark.
