# واحة د. منار مبارز — Manar Oasis

Arabic-first clinic website and course platform for Dr. Manar Mobarez's
women's-and-children's health practice (Maadi and Al Rehab, Cairo).

> واحة د. منار مبارز ليست مجرد عيادة رضاعة طبيعية وتغذية للأم والطفل،
> بل مساحة آمنة للأمهات.

**Stack** — Astro 7 (`output: 'server'`) · React islands · Tailwind v4 ·
Supabase (Postgres + Auth) · Resend · Cloudflare Workers

---

## Getting started

```bash
npm install
cp .env.example .env        # fill in Supabase + Resend credentials
cp .env .dev.vars           # the workerd dev runtime reads .dev.vars
npm run dev                 # http://localhost:4321
```

| Script | What it does |
|---|---|
| `npm run dev` | Astro dev server (runs in workerd, so `cloudflare:workers` env resolves) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | `wrangler dev` against the built output |
| `npm run check` | `astro check` — TypeScript across `.astro`, `.ts`, `.tsx` |
| `npm run deploy` | Build and `wrangler deploy` |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` after editing `wrangler.jsonc` |

### Environment

`.env` (build) and `.dev.vars` (dev runtime) hold the same keys. Both are
git-ignored — **never commit them**.

```
PUBLIC_SUPABASE_URL        PUBLIC_SITE_URL
PUBLIC_SUPABASE_ANON_KEY   PUBLIC_WHATSAPP
SUPABASE_SERVICE_ROLE_KEY  ← secret, bypasses RLS
RESEND_API_KEY             ← secret
EMAIL_FROM                 ADMIN_NOTIFY_EMAIL
```

In production, `PUBLIC_*` live in `wrangler.jsonc` → `vars`; the two secrets are
set with `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` and
`wrangler secret put RESEND_API_KEY`.

> **Env access:** `Astro.locals.runtime.env` was removed in Astro v6 and now
> throws. Use `import { env } from 'cloudflare:workers'` — wrapped for this
> project in `src/lib/env.ts` as `getEnv()` / `requireVar()`. Import that module
> only from on-demand routes; pulling it into a prerendered page breaks the build.

---

## Database setup

Run once, in order:

1. **Apply the schema.** Paste [`supabase/APPLY_ALL.sql`](supabase/APPLY_ALL.sql)
   into the Supabase SQL editor and run it. (It is the concatenation of
   `supabase/migrations/0001…0005`, which are also applyable individually.)
2. **Configure auth email** — follow
   [`supabase/auth-templates/README.md`](supabase/auth-templates/README.md):
   custom SMTP through Resend, the four Arabic RTL templates, and the redirect
   URL allow-list.
3. **Register** at `/auth/register` with the clinic's address, then run
   [`supabase/seed/promote_admin.sql`](supabase/seed/promote_admin.sql) to make
   that account an admin. There is deliberately no in-app way to self-promote.
4. **Set prices and publish** the two paid courses at `/admin/courses`. They ship
   unpublished at 0 EGP because the client had not set prices.

### Courses seeded

| Course | Access | State |
|---|---|---|
| بودكاست الواحة | `free` | **Published.** 8 YouTube episodes, open to everyone |
| كورس الاستعداد للرضاعة قبل الولادة | `paid` | Draft — needs price |
| الجمال يبدأ من الداخل | `paid` | Draft — needs price and curriculum |

`courses.access` decides the whole flow. A `free` course has every lesson
flagged `is_preview`, so RLS serves it to anonymous visitors and the sales page
links straight into the public player at `/courses/<slug>/<lesson>` — no
account, no request, no payment. A `paid` course keeps the request → offline
payment → admin activation flow and plays inside `/dashboard`.

### Schema

`profiles · courses → modules → lessons · enrollments · lesson_progress ·
enrollment_requests · contact_messages`

Doctors, clinics and branch addresses are **not** in the database — they live in
`src/config/*.ts` as static content, so every marketing page prerenders with no
query.

### Row Level Security

Two `SECURITY DEFINER` helpers carry the load, and they are load-bearing rather
than stylistic:

- `is_admin()` — a policy on `profiles` that itself selects `profiles` would
  recurse infinitely.
- `can_read_lesson(uuid)` — **this is what actually protects paid content.** A
  lesson is readable only when it is a free preview, or the caller holds a
  non-expired `active` enrollment on its course. Hiding a lesson in the UI is
  not the boundary; this policy is.

`enrollment_requests` and `contact_messages` have **no public INSERT policy** on
purpose. Public form submissions go through server endpoints using the
service-role key, so rows cannot be forged from a browser holding the anon key.

---

## Architecture notes

**Rendering.** Global `output: 'server'`; marketing pages opt back into static
with `export const prerender = true`, so Arabic content ships as real HTML for
SEO. Dashboard, admin and API routes render on demand.

**Two visual systems**, both taken from the client's posters and both real:

- **`oasis`** (default) — sandstone arches, date palms, deep green, gold
  rosettes. Clinic site and the breastfeeding course.
- **`botanical`** — cream, sage, gold serif, botanical linework. Women's
  wellness courses.

A course picks its own via `courses.theme`; the tokens swap under
`[data-theme="botanical"]` in `src/styles/global.css`.

**RTL.** `dir="rtl"` on `<html>`, and layout uses logical properties
(`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`) throughout — never `ml-`/`mr-`.

**Authorization.** Every protected route calls `requireUser` / `requireAdmin`
(`src/lib/guards.ts`) server-side. The «لوحة تحكم المدير» button renders only for
admins, but that is presentation — the server check is the boundary.

**Supabase types.** `src/lib/supabase/types.ts` is hand-written to match the
migrations. Every row type must be a `type` alias, **not an `interface`** —
interfaces get no implicit index signature, so they fail postgrest-js's
`Record<string, GenericTable>` constraint and silently collapse every query
result to `never`. Once the project is live, regenerate:

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
```

---

## Deployment

Push to `github.com/addaxpsych/manaroasis`, then connect the repo in the
Cloudflare dashboard (Workers → Builds). Set the `vars` and the two secrets
there. `npm run deploy` also works for a direct push from a machine with
`wrangler` authenticated.

---

## Brand assets

`designs/` holds the client's original posters. `scripts/extract-portraits.mjs`
crops the doctor portraits out of them into `public/images/team/`:

```bash
node scripts/extract-portraits.mjs
```

Known gaps, all needing client input:

- **No vector logo** — the mark exists only baked into JPEGs; `Logo.astro` traces
  its silhouette as SVG.
- **د. نادين كامل and د. ريهام محي الدين have no solo poster**, so their portraits
  are low-resolution crops from the team poster.
- **Video hosting is undecided.** `lessons.video_provider` + `video_id` support
  YouTube, Vimeo, Bunny and Cloudflare Stream, so launching on unlisted YouTube
  and switching later is a data change, not a code change. Note that unlisted
  YouTube links are freely shareable — worth settling before the first paid cohort.
