# AI Development Rules and Usage Summary

**Baseline:** 2026-11-21
**Related:** [EXPLANATION.md](EXPLANATION.md) · [DEMO_AND_SUBMISSION.md](DEMO_AND_SUBMISSION.md) · [CODING_CONVENTIONS.md](CODING_CONVENTIONS.md)

---

## 1. What the brief permits

The assignment explicitly allows and encourages AI-assisted development tools, including
ChatGPT, Claude, Cursor and GitHub Copilot, for coding assistance, debugging, architecture
planning, problem-solving and implementation support.

It also states that candidates must understand and be able to explain the code, architecture,
technical decisions and implementation process independently.

Therefore:

- Using AI is **permitted**.
- Understanding and explaining the result is **mandatory**.
- Disclosure is **expected** as part of the submission.

## 2. Tools actually used

| Tool | Role |
|---|---|
| **Claude Code** (CLI agent) | Architecture planning, scaffolding, implementation, refactoring, documentation |
| Installed agent skills | `expo-*`, `react-native-*`, `nodejs-backend-patterns`, `prisma-postgres`, `neon-postgres`, `socket-io`, `webrtc`, `expo-design-system`, `detailed-code-explainer` |
| Built-in model knowledge | Library APIs, TypeScript/Prisma/Express patterns |
| Manual review | Every change read, run and verified by the author |

No AI-generated code is included without review.

## 3. Operating principles

1. **Understand before shipping.** If I cannot explain a line in an interview, it does not ship.
2. **Verify, don't trust.** Run typecheck, boot the API, exercise the flow on a device.
3. **AI proposes, the developer decides.** Architecture, schema and security choices are reviewed
   deliberately, not accepted by default.
4. **Keep the human in the loop on secrets.** AI never sees real `.env` values, database
   credentials or LiveKit secrets.
5. **Document the why.** Every non-obvious decision is in the docs, not only in the code.
6. **Report honestly.** Unfinished features are listed in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## 4. Allowed vs forbidden use

### Allowed
- Scaffolding files and boilerplate.
- Generating Zod schemas, DTOs and repetitive route handlers.
- Explaining library APIs and error messages.
- Drafting documentation from the real code.
- Suggesting tests and edge cases.
- Refactoring for clarity.
- Debugging with logs and stack traces (redacted).

### Forbidden
- Pasting passwords, API keys, connection strings or user PII into a prompt.
- Shipping generated code that has not been read and understood.
- Letting AI invent APIs, versions or packages without checking.
- Using AI to fabricate test results, screenshots or demo evidence.
- Copying code with unknown licensing into the submission.
- Delegating final security or architecture decisions without review.

## 5. Workflow used

```
1. Write or refine the spec (this doc set)
2. Plan the change (files, data flow, risks)
3. Generate a first pass with AI
4. Read the diff; check types, permissions, error paths
5. Run pnpm typecheck and the relevant manual flow
6. Commit a working checkpoint
7. Update docs and known issues
```

For risky work (native modules, auth, calls), steps 4–6 are repeated on a physical device.

## 6. Prompt hygiene

- Use placeholders (`<DATABASE_URL>`) instead of real values.
- Redact tokens and emails from logs before sharing.
- Ask for explanations, not just code, when learning a library.
- Keep prompts scoped to one file or concern to reduce hallucinated cross-file assumptions.
- Cross-check package names and versions against official docs before installing.

## 7. Verification checklist for AI-generated code

- [ ] Compiles under strict TypeScript.
- [ ] Validation happens at the boundary.
- [ ] Authorization is checked server-side.
- [ ] No secret or PII in code, logs or comments.
- [ ] Error paths return the right status and message.
- [ ] The flow was exercised on a device or via curl.
- [ ] The author can explain each non-obvious decision.
- [ ] Documentation reflects the change.

## 8. Attribution and honesty

- The submission states that AI tools were used and for what.
- AI assistance is not hidden or downplayed.
- Limitations are documented rather than papered over.
- The demo shows real functionality, not a mock-up.

## 9. Draft AI usage summary (for the submission email)

> **AI tools used:** Claude Code (Anthropic) as a pair-programming agent, supported by installed
> Expo/React Native/Prisma/Socket.IO/WebRTC skills.
>
> **How it contributed:** Claude Code helped scaffold the Turborepo, generate the Prisma schema
> and shared Zod contracts, draft the Express routes and Socket.IO layer, build the Expo screens,
> and produce this documentation from the actual code. It was used for architecture
> brainstorming, debugging TypeScript/native-build errors, and reviewing security-sensitive flows
> such as refresh-token rotation and role checks.
>
> **What I did:** I chose the stack and architecture, reviewed and adjusted every generated file,
> ran the app and database locally, verified auth/listings/messaging/calling behaviour, and made
> the final decisions on token design, role enforcement, privacy and the LiveKit/P2P calling
> approach.
>
> **Boundaries:** No real credentials or personal data were shared with AI tools. AI-generated
> code was not merged without review and testing. All architectural and security decisions can be
> explained independently in the interview.

## 10. Interview preparation

Be ready to explain, without notes:

1. Why Expo + Node + Prisma + Neon.
2. How access and refresh tokens work, including rotation and reuse detection.
3. Where each role check happens and why the server is authoritative.
4. Why Socket.IO rooms are used for chat and calls.
5. How the call state machine and LiveKit token flow work.
6. What is missing (media tracks, maps, uploads) and exactly how to finish it.
7. What AI produced, what was changed, and why.
8. One bug or challenge encountered and how it was solved.

If any answer is "the AI wrote it", that item is not ready to submit.
