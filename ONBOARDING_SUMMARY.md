# Twenty CRM — Onboarding Tasks Summary

A walkthrough of the three onboarding tasks: what was built, the key files, how each works, and the architectural lessons learned along the way. Everything was verified running locally against seeded data.

---

## 0. Getting it running on Windows (6 cross-platform fixes)

Before any feature work, the repo needed fixes to run on Windows. These are all bugs in the repo's own tooling/scripts (not app logic) — two root causes: `/dist/` hardcoded with forward slashes, and `path.join` producing backslashes in logical resource keys. All are legitimate upstream PR candidates.

| # | File | Problem | Fix |
|---|------|---------|-----|
| 1 | `packages/twenty-sdk/project.json` | `rimraf` with single-quoted glob paths — cmd.exe passes the quotes literally → "Illegal characters in path" | Cross-platform `scripts/clean-dts.mjs` (rimraf JS API) |
| 2 | `packages/twenty-server/project.json` | Post-build `mkdir -p` + `cp -r` (Unix coreutils) → "syntax is incorrect" | `scripts/copy-client-sdk-assets.mjs` (Node `fs.cpSync`) |
| 3 | `packages/twenty-server/src/constants/assets-path.ts` | `__dirname.includes('/dist/')` fails on Windows backslash paths → assets resolved to wrong dir → seed crash | Separator-agnostic: `__dirname.split(/[\\/]/).includes('dist')` |
| 4 | `.../workspace-manager/dev-seeder/data/services/dev-seeder-data.service.ts` | Same `/dist/` check → sample-file seeding read the wrong path | Same separator-agnostic fix |
| 5 | `.../core-modules/sdk-client/constants/sdk-client-package-dirname.ts` | Same latent `/dist/` check | Same fix (harmless in dev, correct for prod) |
| 6 | `.../metadata-modules/logic-function/services/logic-function-from-source-helper.service.ts` | `join()` produced backslashes in a **storage resource key**, which the file-storage validator rejects | `posix.join()` so keys always use `/` |

Also fixed a pre-existing implicit-`any` TypeScript error in `twenty-front-component-renderer/.../createCommandConfirmationModalBridge.ts` that blocked the frontend build under the `tsgo` compiler.

**Run recipe (Windows):**
- DB + Redis: `docker compose -f packages/twenty-docker/docker-compose.dev.yml up -d`
- Seed: `nx run twenty-server:database:reset`
- Backend (via Git Bash, for inline `NODE_ENV=`): `cd packages/twenty-server && NODE_ENV=development npx nest start`
- Worker: `... npx nest start --entryFile queue-worker/queue-worker`
- Frontend: `nx run twenty-front:start` → http://localhost:3001 (prefilled login `tim@apple.dev`)

---

## 1. Frontend — "Recent Interactions"

A card showing the 5 most-recently-updated contacts/notes, built to learn the React codebase, existing data hooks, and the design system.

**Delivered:**
- A standalone page at **`/recent-interactions`** + a **sidebar nav link**.
- The list **merges recently-updated People + Notes** into one feed sorted by `updatedAt`, a **"See all"** header link, and a **skeleton loading state**.
- Promoted it to a **real, droppable `RECENT_INTERACTIONS` dashboard widget** (end-to-end: backend widget-type + configuration + frontend renderer + "Add widget" picker) — it now lives on the Sales Overview dashboard alongside the charts.

**Key files:**
- `packages/twenty-front/src/modules/recent-interactions/components/RecentInteractionsList.tsx` — shared data + rows (uses `useFindManyRecords`, `useGenerateDepthRecordGqlFieldsFromObject`, `RecordChip`)
- `.../recent-interactions/components/RecentInteractionsCard.tsx` and `RecentInteractionsNavigationSection.tsx`
- `.../pages/recent-interactions/RecentInteractionsPage.tsx` + route in `modules/app/hooks/useCreateWorkspaceAppRouter.tsx`
- Widget (backend): `page-layout-widget/enums/widget-type.enum.ts`, `widget-configuration-type.type.ts`, `dtos/recent-interactions-configuration.dto.ts`, the config map + validators
- Widget (frontend): `page-layout/widgets/recent-interactions/…`, registered in `WidgetContentRenderer.tsx` and the dashboard "Add widget" picker

**How it works:** two `useFindManyRecords` calls (person + note, `orderBy: updatedAt DescNullsLast`, `cache-and-network`) are merged, sorted, and sliced to 5; each row is a design-system `RecordChip` linking to the record. The widget reuses the same list component; the dashboard's widget shell provides the title/frame.

---

## 2. Backend — the "Expense" custom object

A new object with **Amount, Category, Date** and a relationship to **Company**, with full CRUD.

**Approach decision (important):** the brief said "jump into NestJS, write PostgreSQL migrations." In modern Twenty that mental model no longer maps to reality: `@WorkspaceEntity` decorators were **removed entirely**, standard objects now live in a declarative manifest + `STANDARD_OBJECTS` and are added via versioned **upgrade-commands** — far too heavy for this. So `Expense` was created the idiomatic way: **a custom object via the metadata API** (literally what "custom object" means).

**Delivered (via the metadata GraphQL API):**
- Object `Expense` with fields **Amount (CURRENCY)**, **Category (TEXT)**, **Date (DATE_TIME)**.
- A **MANY_TO_ONE relation to Company** (auto-created the reverse "Expenses" field on Company).

**What Twenty auto-generated from that metadata (no hand-written code):**
- **Postgres table** `_expense` (custom object tables are underscore-prefixed) with `amountAmountMicros` + `amountCurrencyCode` (the CURRENCY composite), `category`, `expenseDate`, `companyId`.
- **GraphQL CRUD** (`createExpense` / `expenses`) — verified by creating "Q3 Cloud Hosting" ($125, linked to Housecall Pro) and reading it back with the relation.
- **REST CRUD** (`/rest/expenses`, returns `{ data, totalCount, pageInfo }`).

**Reproducible from code:** because a custom object is runtime metadata (not source), it wouldn't survive `database:reset` or come back on a fresh checkout. To fix that, there's an idempotent NestJS command that recreates it via the metadata services:
- `packages/twenty-server/src/database/commands/seed-expense-object.command.ts` (registered in `database-command.module.ts`)
- Run: `nx run twenty-server:command -- workspace:seed:expense-object`
- It skips workspaces where `expense` already exists and creates it (object + fields + Company relation) where it doesn't — verified by creating it in the YCombinator workspace from scratch while skipping Apple.

**Key lesson:** in Twenty you essentially never hand-write SQL migrations for objects — the framework generates the DDL and the API from metadata. (The classic TypeORM migration system is **frozen**; core-schema changes go through the upgrade-command system.)

---

## 3. Advanced — Slack notification on "Closed-Won"

A background job that fires a Slack message when an Opportunity's stage becomes **Closed-Won**, using Redis to queue the work so it never blocks the UI.

**Delivered** (`packages/twenty-server/src/modules/opportunity/opportunity-slack-notification/`):
- **Listener** — `@OnDatabaseBatchEvent('opportunity', UPDATED)`; using the event's `before`/`after`, it fires only when `stage` *transitions into* `CLOSED_WON`, then enqueues a job on the Redis-backed `webhookQueue`.
- **Job/processor** — `@Processor`/`@Process`; formats a Slack Block Kit message (deal name, currency-formatted amount, close date) and POSTs it to the webhook read from `process.env.OPPORTUNITY_SLACK_WEBHOOK_URL`.
- Added a **"Closed-Won"** option to the Opportunity `stage` field (it didn't exist by default).

**How it works:** stage change → DB event → listener enqueues job → **worker** dequeues and POSTs to Slack. Verified live: a real message ("🎉 Deal Closed-Won! MacBook Pro Fleet Upgrade · $1,800,000.00") landed in the Slack channel.

**Key lesson — the server/worker split:** listeners run in the **server** process (registered via `modules.module.ts`), but job processors run in the **worker** process, which bootstraps a *different* module graph (`QueueWorkerModule → JobsModule`, not `AppModule`). The first trigger was a silent 0.75ms no-op because the processor was only registered server-side; registering the module in `JobsModule` too made the worker actually run it (a real 496ms HTTP POST). This server/worker separation is the core mental model for event-driven work in Twenty.

---

## Architecture takeaways

- **Metadata-driven objects:** define objects/fields via metadata → Twenty auto-generates the table, GraphQL, and REST. Custom-object tables are underscore-prefixed and live in per-workspace schemas.
- **Frozen migrations:** the TypeORM migration system is frozen; schema evolution happens through the metadata system and versioned upgrade-commands.
- **Caching:** page layouts (and other metadata) are served from a Redis "flat entity map" cache — direct DB edits require a cache flush to surface; the app's own mutations invalidate it automatically.
- **Server vs worker:** two separate NestJS processes with different module graphs. Listeners/HTTP live in the server; queued jobs live in the worker.
- **Typed end-to-end:** widget types, configurations, and object fields are strongly typed and often exhaustively mapped, so adding one touches several coordinated places — and the GraphQL types are code-generated from the running server schema (`nx run twenty-front:graphql:generate`).
