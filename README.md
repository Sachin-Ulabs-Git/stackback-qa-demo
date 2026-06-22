# StackBack QA Demo

Demo repository for testing the StackBack Linear QA automation workflow.

## How it works

1. QA raises a ticket in Linear → lands in **Triage**
2. Dev picks it up → moves to **Confirmed**
3. Dev opens a PR with `Closes TES-XX` in the description → Linear auto-moves to **In Review**
4. PR merged → Linear auto-closes to **Done**

## Branch naming

Branches follow the Linear auto-generated format:
```
tes-XX-short-description
```

## PR description format is this

Always include the closing keyword:
```
Closes TES-XX
```
