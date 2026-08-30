# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Arabic-first (RTL) clinic website and course platform for **واحة د. منار مبارز**, a
women's-and-children's health practice in Cairo. Astro 7 + React islands +
Tailwind v4, deployed to Cloudflare Workers, with Supabase for auth/data and
Resend for email.

## Commands

```bash
npm run dev        # Astro dev server — runs in workerd, so cloudflare:workers env resolves
npm run build      # production build into dist/
npm run check      # astro check (TypeScript across .astro/.ts/.tsx) — the only static gate
npm run preview    # wrangler dev against the built output
npm run deploy     # build + wrangler deploy
npm run cf-typegen # regenerate worker-configuration.d.ts after editing wrangler.jsonc

node scripts/extract-portraits.mjs   # re-crop doctor portraits from designs/ into public/images/team/
```

**There is no test framework installed.** `npm run check` plus a real build is
the whole automated gate. Verify behaviour by running the app — and prefer
`npm run preview` (real workerd) over `npm run dev` when touching anything that
reads env or Supabase.

`.env` is used at build time; `.dev.vars` supplies the same values to the
workerd dev runtime. Both are git-ignored; keep them in sync.

## Traps that will cost you hours

These are non-obvious and have each already broken this project once.

**1. `Astro.locals.runtime.env` throws.** It was removed in Astro v6. Use
`import { env } from 'cloudflare:workers'`, wrapped here as `getEnv()` /
`requireVar()` in `src/lib/env.ts`. Import that module **only from on-demand
routes** — pulling `cloudflare:workers` into a prerendered page's build graph
fails the build.

**2. Supabase row types must be `type` aliases, never `interface`.** Interfaces
get no implicit index signature, so they fail postgrest-js's
`Record<string, GenericTable>` constraint, `Schema` silently resolves to
`never`, and *every* query result becomes `never`. The symptom is dozens of
"Property does not exist on type 'never'" errors with a misleading cause. Same
applies to the `Views`/`Enums`/`CompositeTypes` empty maps — use
`{ [_ in never]: never }`, not `Record<string, never>`.

**3. Middleware gates on `context.isPrerendered`, not a path allowlist.** It
must skip prerendering (no request session, and touching env would fail the
build) but run for *everything* else. An earlier allowlist of
`/dashboard|/admin|/api|/auth` left `/courses` with an undefined Supabase
client, and the defensive try/catch in `src/lib/courses.ts` turned that into a
permanently empty catalogue. Do not reintroduce path-based gating.

**4. `PUBLIC_SITE_URL` is a *build-time* value.** Canonical tags, JSON-LD,
OG images and robots/sitemap are baked into prerendered HTML, so a runtime-only
var cannot reach them. On Cloudflare it must be set as a **Build** variable.
`astro.config.mjs` prints a loud warning when it is localhost or a placeholder —
that guard exists because a deploy once shipped with localhost canonicals.

**5. Cloudflare plaintext vars are overwritten by `wrangler.jsonc` `vars` on
every deploy; Secrets survive.** The Supabase and Resend keys must therefore be
set as **Secrets**, never as dashboard Variables.

**6. Regenerate `package-lock.json` with npm 10.** Cloudflare builds with npm
10.9.2; npm 11 records `sharp`'s optional platform packages differently and
`npm ci` then fails in CI while passing locally:
`npx npm@10.9.2 install --package-lock-only`.

**7. Cloudflare has TWO separate variable sections, and putting a value in the
wrong one fails silently.** Settings → *Variables and secrets* is the **runtime**
env the Worker reads; Settings → *Builds* → *Variables* only exists inside the
build container. The Supabase and Resend keys belong in **runtime**; only
`PUBLIC_SITE_URL` is needed at **build** (and it is needed in both). Getting this
backwards makes every on-demand route fail while the prerendered pages keep
serving — a signature worth recognising, because it looks like a code bug.

**8. `translate-x` does not flip under `dir="rtl"`.** It is a physical axis, so
the common `start-1/2` + `-translate-x-1/2` centring trick drags the element off
the *left* edge instead of centring it. Centre with `start-0 end-0 mx-auto`
instead. (Sliding an arrow leftward on hover *is* correct in RTL — that is
forward, not a bug.)

**9. A malformed `PUBLIC_SITE_URL` used to kill the build** with a bare
`Invalid URL` naming neither the setting nor the value — pasting `NAME = value`
into a dashboard value box hits it. `astro.config.mjs` now parses the value
itself and falls back with a readable message, so this should stay non-fatal.

## Architecture

### Rendering split
Global `output: 'server'`. Marketing pages opt back into static with
`export const prerender = true` — that is what makes the Arabic content
indexable. Dashboard, admin, auth and API routes render on demand. When adding
a page, decide which side it is on first; it determines whether you may touch
env, Supabase or cookies.

### Two content sources, deliberately
- **Static TS** (`src/config/site.ts`, `team.ts`, `services.ts`) — clinic
  identity, the 7 doctors, the 8 عيادات, both branches. Lets every marketing
  page prerender with zero queries.
- **Supabase** — courses, modules, lessons, enrollments, progress, inbound forms.

Doctors are referenced from courses by config slug (`courses.instructor_slug`),
not a foreign key. Do not migrate marketing content into the database.

### Three course states
Two independent columns, because none of these collapse into one flag:

| State | Columns | Behaviour |
|---|---|---|
| **free** | `access='free'` | Every lesson is `is_preview`, so RLS serves it anonymously. Sales page links into the **public** player at `/courses/<slug>/<lesson>` — no account, no enrollment. (بودكاست الواحة) |
| **paid** | `access='paid'` | Request → offline payment → admin activation. Plays only inside `/dashboard/courses/<slug>/<lesson>`. |
| **قريباً** | `coming_soon=true` | Visible with hook, highlights and curriculum, but price hidden, lessons not linked, and the enrollment form replaced by a WhatsApp prompt. |

`is_published` cannot express "coming soon" on its own — false hides a course
entirely, true offers it for sale — hence the separate `coming_soon` column. It
also lifts the `/admin/courses` publish guard, which otherwise refuses a course
priced at 0 with no lessons; an announced course legitimately is exactly that.

Both players share `embedUrl()` in `src/lib/video.ts`.

### Authorization
`requireUser` / `requireAdmin` / `requireAdminApi` in `src/lib/guards.ts`, called
**server-side by every protected route**. The «لوحة تحكم المدير» nav button
renders only for admins, but that is presentation — never treat it as the
boundary.

The real boundary is RLS, and two `SECURITY DEFINER` helpers carry it:
- `is_admin()` — a policy on `profiles` that itself selects `profiles` recurses
  infinitely; this breaks the cycle.
- `can_read_lesson(uuid)` — **this is what protects paid content.** A lesson is
  readable only if it is a preview or the caller holds a non-expired `active`
  enrollment. `/api/progress` re-checks it via RPC so a user cannot record
  progress against a course they never bought.

`enrollment_requests` and `contact_messages` have **no public INSERT policy** by
design. Public forms post to server endpoints that use the service-role client,
so rows cannot be forged with the anon key. Keep it that way when adding forms.

Users cannot self-promote: the profile update policy pins `role` back to
`customer`. Admin elevation happens only via `supabase/seed/promote_admin.sql`.

### Database workflow
No live migration tooling is wired up. `supabase/migrations/0001…0006` are the
source of truth; `supabase/APPLY_ALL.sql` is their concatenation, pasted into
the Supabase SQL editor by hand, and `supabase/VERIFY.sql` asserts the result
(every row should read PASS). **After editing any migration, regenerate
`APPLY_ALL.sql`** — and verify the written file is non-empty before committing;
it has silently landed as a 0-byte blob before.

Everything is written to be safely re-runnable: `IF NOT EXISTS`, `OR REPLACE`,
policies dropped before creation, and seeds that skip a course which already has
modules. Preserve that when adding SQL.

`src/lib/supabase/types.ts` is hand-written to match the migrations. Once the
project is live, prefer regenerating it with
`npx supabase gen types typescript --project-id <ref>`.

## Diagnosing a broken deployment

The failure signature is worth memorising: **prerendered pages 200 while every
on-demand route fails**. That is almost never a code bug — it is middleware
throwing on a missing env var before any page runs.

- `GET /api/health` reports which env variable NAMES the running Worker sees,
  which are missing, any unexpected ones (where a typo shows up), and the
  build-time `PUBLIC_SITE_URL`. Names only; values are never read or returned.
  It is exempt from the Supabase setup in middleware so it works precisely when
  that configuration is broken.
- A config failure returns a branded Arabic 503 with an `x-config-error` header
  rather than an opaque 500, and logs the named cause to Workers observability
  (enabled in `wrangler.jsonc`).
- `curl -I <url>/courses | grep x-config-error` distinguishes a misconfigured
  Worker from a genuine application error in one request.

`/api/health` is a debugging aid, not a permanent fixture — it is reasonable to
remove it or move it behind `requireAdmin` once things are stable.

## Design system

Two visual systems, **both taken from the client's real posters** in `designs/`:
- **`oasis`** (default) — sandstone arches, palms, deep green, gold rosettes.
- **`botanical`** — cream, sage, gold serif, botanical linework; used by
  women's-wellness courses.

A course selects one via `courses.theme`; tokens swap under
`[data-theme="botanical"]` in `src/styles/global.css`. Components should read
the semantic tokens (`--accent`, `--surface`, `--ornament`, `--hairline`) rather
than palette colours directly, so they work in both.

**RTL:** `dir="rtl"` on `<html>`. Use logical properties throughout —
`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`, never `ml-`/`mr-`/`left-`/`right-`.
Phone numbers and prices use Western digits (`.num`, matching the posters).

## Content rules

Arabic copy is Egyptian-colloquial and warm; the positioning line the whole site
carries is *«واحة د. منار مبارز ليست مجرد عيادة رضاعة طبيعية وتغذية للأم والطفل،
بل مساحة آمنة للأمهات»*.

**Do not invent or paraphrase medical credentials, clinic addresses, or the
online-consultation disclaimer.** All of it is transcribed from the posters in
`designs/`. Doctor credentials are regulated claims; the disclaimer
(*«المقابلات الطبية أونلاين لا تغني أبداً عن المقابلة في العيادة للفحص والتشخيص»*)
is reproduced verbatim on purpose.

Courses ship unpublished at 0 EGP until the client sets prices in
`/admin/courses`; the publish button stays disabled while a course has no
lessons or a zero price.

## Known gaps

- Two doctors (نادين كامل، ريهام محي الدين) have no solo poster, so their
  portraits are low-resolution crops from the team image.
- **Resend cannot email customers until a DNS-verified sending domain exists** —
  `pages.dev`/`workers.dev` subdomains cannot be verified, so `EMAIL_FROM` is
  still `onboarding@resend.dev`, which only delivers to the Resend account
  owner. This blocks selling anything: a paying customer would receive neither
  a confirmation nor an activation email.
- الجمال يبدأ من الداخل is still an unpublished draft with no price and no
  curriculum. الاستعداد للرضاعة قبل الولادة is priced (600 EGP) and announced as
  قريباً; opening it for sale is a toggle in `/admin/courses`, not a code change.
- Video hosting is undecided. `lessons.video_provider` + `video_id` support
  YouTube, Vimeo, Bunny and Cloudflare Stream so it is a data change, not a code
  change — but unlisted YouTube links are freely shareable, which matters before
  the first paid cohort.
