# Coding Conventions

**Baseline:** 2026-11-21
**Scope:** `apps/api`, `apps/mobile`, `packages/shared`
**Related:** [ARCHITECTURE.md](ARCHITECTURE.md) · [TECH_STACK.md](TECH_STACK.md)

---

## 1. TypeScript

- `strict: true`, `noUncheckedIndexedAccess: true` (base config).
- No `any`. Use `unknown` at boundaries and narrow with Zod or type guards.
- Derive types from schemas: `type X = z.infer<typeof xSchema>`.
- Use `import type` for type-only imports.
- Prefer `const` and readonly shapes; avoid enums in app code — use the shared `as const`
  arrays and union types.
- Return early; avoid deep nesting.
- `noEmit` everywhere; the API runs through `tsx`.

## 2. Naming

| Kind | Convention | Example |
|---|---|---|
| Files (API) | kebab/lower | `security.ts`, `livekit.ts` |
| Files (mobile lib) | kebab/lower | `auth.tsx`, `session.ts` |
| Routes (mobile) | Expo Router conventions | `[conversationId].tsx` |
| React components | PascalCase | `ListingCard` |
| Hooks | `useX` | `useAuth` |
| Functions / variables | camelCase | `findOwnedListing` |
| Constants / enums arrays | UPPER_SNAKE | `SOCKET_EVENTS`, `ROLES` |
| Zod schemas | `xSchema` | `listingCreateSchema` |
| DTO types | `XDto` | `ListingDto`, `CallDto` |
| DB models | PascalCase singular | `CallSession` |
| Socket events | `domain:action` | `call:incoming` |

## 3. Imports

Order, with blank lines between groups:

1. Node built-ins (`node:crypto`, `node:http`).
2. External packages (`express`, `react`, `zod`).
3. Workspace packages (`@landconnect/shared`).
4. Relative imports (`./lib/prisma`, `@/components/ui`).

Prefer `import type` where possible. The mobile app uses the `@/` alias for `src/`.

## 4. API patterns

- One router per resource in `src/routes/`.
- Validate at the top of the handler with the shared Zod schema:
  ```ts
  const input = listingCreateSchema.parse(req.body);
  ```
- Use `AppError(status, message)` for expected failures; the central handler maps it.
- Let async errors bubble — Express 5 forwards them.
- Check authorization before doing work:
  `requireAuth` → `requireRole` → ownership/membership → validation.
- Never return Prisma rows; use `lib/serialize.ts`.
- Select only needed fields for nested users (`ownerSelect`).
- Use transactions for multi-query reads that must agree (`$transaction`).
- Emit realtime events after the database write succeeds.
- Do not log request bodies, tokens or passwords.

### Handler shape

```ts
router.post('/', requireAuth, requireRole('SELLER', 'BROKER'), async (req, res) => {
  const input = listingCreateSchema.parse(req.body);
  const listing = await prisma.listing.create({ /* … */ });
  res.status(201).json(toListingDto(listing));
});
```

## 5. Mobile patterns

- Routes are thin; data fetching belongs in TanStack Query hooks or `lib/`.
- One API wrapper (`lib/api.ts`) for all HTTP; no `fetch` in screens.
- Server state in TanStack Query; local state for drafts and transient UI only.
- Reuse `components/ui.tsx` primitives before creating new styles.
- Use tokens from `lib/theme.ts`; no hardcoded hex values in screens.
- Every pressable gets `accessibilityRole`; icon-only controls get `accessibilityLabel`.
- Handle loading, empty and error states explicitly.
- Use `router.replace` after auth/create to avoid stale back stacks.
- Socket access through `lib/socket.ts`; never instantiate a second connection.
- Clean up socket listeners and room membership in `useEffect` returns.

## 6. Shared package

- A schema or DTO used by both sides belongs in `packages/shared`.
- Event names live in `SOCKET_EVENTS`; never use string literals in handlers.
- Constants are `as const` arrays so runtime validation and types stay aligned.
- Do not import Node or React Native APIs into `shared`.

## 7. Error handling

| Layer | Rule |
|---|---|
| Zod | Parse at the boundary; 400 with details |
| Expected domain error | `AppError` with a correct status |
| Unexpected | Log server-side; generic 500 to the client |
| Client | Show inline, actionable messages; restore user input on send failure |
| Socket | Ignore malformed payloads; never crash the connection handler |

## 8. Comments

- Explain **why**, not what.
- Document non-obvious invariants (refresh rotation, membership checks, Decimal conversion).
- Keep comments next to the code they describe.
- Delete stale comments when behaviour changes.

## 9. Git and commits

- Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Imperative, lowercase subject, ≤ 72 chars, blank line before body.
- One logical change per commit.
- Commit working checkpoints before risky changes (native builds, refactors).
- Branch names: `feat/calling-media`, `fix/incoming-call`, `docs/specs`.
- Never commit `.env`, tokens, keystores or service credentials.
- Do not force-push shared branches.

Examples:

```
feat(calls): connect call screen to LiveKit room
fix(auth): revoke session family on refresh reuse
docs(spec): add architecture and API reference
```

## 10. Formatting and checks

- 2-space indentation, single quotes in TS/TSX, semicolons.
- Prettier defaults are acceptable; ESLint via `expo lint` for mobile.
- Before every commit:
  ```bash
  pnpm typecheck
  ```
- Before submission, also run the manual QA matrix.

## 11. Dependencies

- Prefer Expo-compatible packages (`npx expo install`).
- Pin major versions; use workspace protocol for internal packages.
- Justify any new native dependency in the PR/commit because it requires a dev build.
- Avoid adding a library for something the platform already provides.

## 12. Documentation

- New endpoint → update `API_SPEC.md`.
- Schema change → update `DATABASE_SCHEMA.md` and run `db:generate`.
- New env var → update `.env.example` and `ENVIRONMENT_VARIABLES.md`.
- Feature status change → update `REQUIREMENTS.md` and `TASK_TRACKER.md`.
- Known limitation → add to `KNOWN_ISSUES.md` with an ID.

## 13. Definition of a clean change

- [ ] Compiles with `pnpm typecheck`.
- [ ] No new secrets or PII in logs.
- [ ] Authorization checked server-side.
- [ ] Loading/empty/error states handled in UI.
- [ ] Docs updated.
- [ ] Manually exercised on a device or via curl.
