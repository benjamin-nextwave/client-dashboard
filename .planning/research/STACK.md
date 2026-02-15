# Stack Research

**Domain:** Multi-tenant B2B client dashboard platform (cold email outreach agency)
**Researched:** 2026-02-15
**Confidence:** HIGH (versions verified via npm registry; architecture rationale based on established patterns)

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | ^16.1 | Full-stack React framework | App Router is mature at v16. Server Components reduce client bundle for dashboard pages. API routes handle Instantly.ai proxy calls. Middleware enables tenant-aware routing. Already decided by team. |
| TypeScript | ^5.9 | Type safety | Non-negotiable for multi-tenant apps where data isolation bugs are catastrophic. Supabase client is fully typed. |
| Tailwind CSS | ^4.1 | Utility-first styling | v4 has CSS-first config and native CSS cascade layers. Pairs with shadcn/ui. Critical for white-label theming via CSS custom properties. Already decided by team. |
| React | ^19 | UI library | Ships with Next.js 16. Server Components, useOptimistic, and useActionState are stable. |

### Database and Backend

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Supabase (PostgreSQL) | supabase-js ^2.95 | Database, auth, realtime | Row Level Security (RLS) is the backbone of multi-tenant data isolation. One database, one schema, RLS policies filter by tenant_id. Realtime subscriptions for live inbox updates. Already decided by team. |
| @supabase/ssr | ^0.8 | Server-side Supabase auth in Next.js | Replaces deprecated @supabase/auth-helpers-nextjs. Handles cookie-based sessions in App Router server components and middleware. |
| Supabase Edge Functions | (managed) | Scheduled jobs, webhooks | Cron-based campaign sync from Instantly.ai API. Avoids Vercel function timeout limits for long-running syncs. |

### Infrastructure

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Vercel | (managed) | Hosting and deployment | Native Next.js support, edge middleware for tenant routing, preview deployments for testing white-label configs. Already decided by team. |
| Vercel Cron | (managed) | Scheduled API syncs | Trigger Supabase Edge Functions or Next.js API routes on schedule to pull Instantly.ai campaign data. |

### UI Component Library

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| shadcn/ui | ^3.8 (CLI) | Pre-built accessible components | Not a dependency -- copies components into your codebase. Full control for white-label customization. Built on Radix UI primitives. Tables, dialogs, dropdowns, forms all included. |
| Radix UI | ^1.1 (primitives) | Headless accessible components | Underlying primitives for shadcn/ui. Keyboard navigation, ARIA, focus management out of the box. |
| class-variance-authority | ^0.7 | Component variant management | Standard pattern with shadcn/ui for managing component variants (e.g., button sizes, alert types). |
| clsx + tailwind-merge | ^2.1 / ^3.4 | Class name utilities | clsx for conditional classes, tailwind-merge to resolve Tailwind conflicts. Standard shadcn/ui utilities. |

### Data Visualization

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Recharts | ^3.7 | Campaign statistics charts | **Use Recharts, not Chart.js.** Recharts is React-native (declarative JSX components), renders SVG, supports Server Components hydration patterns, and integrates naturally with React state. Chart.js requires a canvas wrapper and imperative API -- awkward in React. Recharts has built-in responsive containers, tooltips, and clean defaults suitable for dashboards. |

### Data Processing

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Papa Parse | ^5.5 | CSV parsing and generation | De facto standard for CSV in JavaScript. Handles streaming for large files, auto-detects delimiters, supports Web Workers for non-blocking parsing. Already decided by team. |
| @tanstack/react-table | ^8.21 | Data tables with sorting, filtering, pagination | Headless table logic -- pairs with shadcn/ui table components. Handles column definitions, sorting, filtering, pagination without opinionated UI. Essential for contact lists and campaign data grids. |

### Forms and Validation

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| React Hook Form | ^7.71 | Form state management | Uncontrolled form approach = minimal re-renders. Handles CSV import config forms, client settings, email compose. |
| Zod | ^4.3 | Schema validation | Runtime validation for API inputs, CSV row validation, form schemas. Integrates with React Hook Form via @hookform/resolvers. TypeScript-first -- infers types from schemas. |

### State and Data Fetching

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| @tanstack/react-query | ^5.90 | Server state management | Caching, background refetching, optimistic updates for Instantly.ai API data. Avoids stale dashboard data. Handles loading/error states declaratively. |
| nuqs | ^2.8 | URL search params state | Type-safe URL state for table filters, date ranges, pagination. Shareable URLs, browser back/forward works. Better than useState for dashboard filter state. |

### Internationalization

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| next-intl | ^4.8 | i18n for Next.js App Router | Client UI in Dutch, operator UI in English. next-intl has first-class App Router support with server component message loading. Simpler than next-i18next for App Router. |

### Email Integration

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Resend | ^6.9 | Transactional emails (notifications) | For sending system notifications (not campaign emails -- those go through Instantly.ai). Clean API, good DX. |
| React Email | ^5.2 | Email templates in React | Build notification email templates with React components. Pairs with Resend. |

### Utility Libraries

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| date-fns | ^4.1 | Date manipulation and formatting | Tree-shakeable, immutable, supports locale (nl for Dutch date formatting). Better than dayjs for tree-shaking in Next.js. |
| lucide-react | ^0.564 | Icons | Tree-shakeable icon set. Default icons for shadcn/ui. Consistent style. |
| sonner | ^2.0 | Toast notifications | Shadcn/ui recommended toast library. Simple API, good defaults, accessible. |
| next-themes | ^0.4 | Theme management | Manages dark/light mode and can be extended for white-label theme switching per tenant. |

### Development Tools

| Tool | Version | Purpose | Notes |
|------|---------|---------|-------|
| ESLint | ^10.0 | Linting | v10 is current. Use flat config (eslint.config.mjs). Next.js provides eslint-config-next. |
| Prettier | ^3.8 | Code formatting | Use prettier-plugin-tailwindcss for consistent class ordering. |
| @types/react | ^19.2 | React type definitions | Must match React 19. |

## Installation

```bash
# Core framework
npx create-next-app@latest dashboard --typescript --tailwind --eslint --app --src-dir

# Database and auth
npm install @supabase/supabase-js @supabase/ssr

# UI components (shadcn/ui -- run init, then add components as needed)
npx shadcn@latest init
npx shadcn@latest add button card dialog dropdown-menu input label select separator sheet table tabs toast

# Data visualization
npm install recharts

# Data processing
npm install papaparse @tanstack/react-table
npm install -D @types/papaparse

# Forms and validation
npm install react-hook-form zod @hookform/resolvers

# State and data fetching
npm install @tanstack/react-query nuqs

# Internationalization
npm install next-intl

# Email (for system notifications, not campaign emails)
npm install resend react-email

# Utilities
npm install date-fns lucide-react sonner next-themes

# Dev dependencies
npm install -D prettier prettier-plugin-tailwindcss @types/react @types/node
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Recharts | Chart.js + react-chartjs-2 | Only if you need WebGL rendering for 10K+ data points (unlikely for campaign dashboards). Chart.js is canvas-based, better for massive datasets but worse React integration. |
| @tanstack/react-table | AG Grid | Only if you need Excel-like editing, pivot tables, or 100K+ row virtual scrolling. AG Grid is heavy (200KB+) and the free version is limited. |
| shadcn/ui | Mantine or Ant Design | Only if you want pre-built opinionated components and do NOT need white-label customization. shadcn/ui is better here because you own the code and can fully customize per tenant. |
| next-intl | next-i18next | Never for App Router. next-i18next was designed for Pages Router. next-intl has native App Router support. |
| @supabase/ssr | @supabase/auth-helpers-nextjs | Never. auth-helpers-nextjs is deprecated. @supabase/ssr is the official replacement. |
| nuqs | Raw useSearchParams | Only for trivial single-param cases. nuqs adds type safety, serialization, and proper history management. |
| date-fns | dayjs | Only if bundle size is extreme concern and you use all date functions (dayjs is smaller baseline but less tree-shakeable). For Next.js with tree-shaking, date-fns wins. |
| Resend | SendGrid or AWS SES | Only if you need high-volume transactional email (50K+/month). For notification emails to operators/clients, Resend is simpler and has better DX. |
| React Hook Form | Formik | Never. Formik has performance issues with re-renders and is less actively maintained. React Hook Form is the standard. |
| Zod | Yup | Preference. Zod has better TypeScript inference and is more popular in the Next.js ecosystem. Yup works fine but Zod is the modern default. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| @supabase/auth-helpers-nextjs | Deprecated. Will stop receiving updates. | @supabase/ssr ^0.8 |
| next-i18next | Designed for Pages Router, does not work well with App Router Server Components. | next-intl ^4.8 |
| Redux / Zustand | Over-engineering for this use case. Server state (API data) belongs in React Query. Client state is minimal (theme, UI toggles) and handled by React context or URL state. | @tanstack/react-query + nuqs + React context |
| Moment.js | Deprecated by its own maintainers. Massive bundle size (300KB+). Not tree-shakeable. | date-fns ^4.1 |
| Material UI (MUI) | Opinionated design system makes white-label theming painful. Heavy bundle. Runtime CSS-in-JS conflicts with Server Components. | shadcn/ui (Tailwind-based, full code ownership) |
| Prisma | Adds unnecessary ORM layer on top of Supabase. Supabase JS client already provides typed queries. Prisma would bypass RLS policies (dangerous for multi-tenant). | Supabase JS client with RLS |
| NextAuth.js / Auth.js | Unnecessary complexity when Supabase Auth is already included. Adding a separate auth layer creates two sources of truth for sessions. | Supabase Auth via @supabase/ssr |
| Axios | Unnecessary dependency. fetch() is native in Next.js and Node.js. Next.js extends fetch with caching and revalidation. | Native fetch (extended by Next.js) |
| styled-components / Emotion | CSS-in-JS libraries have known issues with React Server Components. Runtime style injection conflicts with streaming SSR. | Tailwind CSS (already decided) |

## Stack Patterns by Variant

**For white-label theming:**
- Use CSS custom properties (--brand-primary, --brand-secondary, etc.) set at the :root level per tenant
- Tailwind CSS v4 supports CSS-first config, define theme tokens as CSS variables
- next-themes handles the theme provider, extend it to load tenant-specific CSS variables from Supabase
- Store brand colors, logo URL, and company name in a `tenants` table

**For the Instantly.ai API integration:**
- Use Next.js API routes as a proxy layer (clients never call Instantly.ai directly)
- Cache responses with React Query (staleTime: 5 minutes for campaign stats)
- Use Vercel Cron or Supabase Edge Functions for periodic data sync to local database
- Store synced data in Supabase to reduce API calls and enable historical reporting

**For CSV processing with large files:**
- Use Papa Parse with `worker: true` for browser-side parsing (non-blocking)
- For server-side processing (API routes), use Papa Parse streaming mode
- Validate each row with Zod schemas before database insertion
- Use @tanstack/react-table for displaying parsed data with virtual scrolling if needed

**For Dutch language client UI:**
- next-intl with two locales: `nl` (client dashboard) and `en` (operator admin)
- date-fns `nl` locale for Dutch date formatting
- Store locale preference per tenant in Supabase

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@16.1 | react@19, typescript@5.9 | Next.js 16 requires React 19 |
| @supabase/ssr@0.8 | @supabase/supabase-js@2.x, next@14+ | Official Supabase SSR package for Next.js App Router |
| tailwindcss@4.1 | next@16, postcss@8 | Tailwind v4 uses CSS-first config, different from v3's tailwind.config.js |
| recharts@3.7 | react@18+, react@19 | Recharts 3.x supports React 19 |
| @tanstack/react-table@8.x | react@18+, react@19 | Headless, no UI dependency conflicts |
| @tanstack/react-query@5.x | react@18+, react@19 | v5 has React 19 support |
| next-intl@4.x | next@14+, next@15+, next@16+ | v4 designed for App Router |
| shadcn/ui CLI@3.8 | tailwindcss@4.x, react@19 | Latest CLI supports Tailwind v4 config format |
| eslint@10.x | next@16 | Requires flat config format (eslint.config.mjs) |

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Core framework versions | HIGH | Verified via npm registry on 2026-02-15 |
| Supabase ecosystem | HIGH | Versions verified; @supabase/ssr replacing auth-helpers is well-established |
| Recharts over Chart.js | HIGH | React-native design is objectively better fit for React dashboards |
| shadcn/ui for white-label | HIGH | Code ownership model is uniquely suited for per-tenant customization |
| next-intl for i18n | MEDIUM | Verified version exists and supports App Router; specific v4 + Next.js 16 compatibility not independently verified |
| Instantly.ai API patterns | LOW | No official docs verified; API proxy pattern is standard but specific rate limits, endpoints, and auth flow need phase-specific research |
| Tailwind CSS v4 config | MEDIUM | v4 is a major rewrite with CSS-first config; migration from v3 patterns may have edge cases |

## Sources

- npm registry (npm view [package] version) -- all version numbers verified 2026-02-15
- Training data for architectural patterns and library comparisons (May 2025 cutoff)
- Note: WebSearch and WebFetch were unavailable during this research. Instantly.ai API specifics and some compatibility claims rely on training data and should be independently verified.

---
*Stack research for: NextWave Solutions multi-tenant B2B dashboard platform*
*Researched: 2026-02-15*
