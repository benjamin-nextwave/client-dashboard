# Phase 3: Client Dashboard Shell & Branding - Research

**Researched:** 2026-02-15
**Domain:** Dynamic per-tenant theming with Tailwind CSS v4, Next.js 15 App Router layouts, dashboard navigation
**Confidence:** HIGH

## Summary

This phase transforms the existing minimal client layout (`(client)/layout.tsx`) into a fully branded dashboard shell. The client's `primary_color` (hex string from DB) and `logo_url` (Supabase Storage public URL) must be applied per-tenant at runtime, with zero CSS leakage between clients. All UI text must be in Dutch.

The core technical challenge is **dynamic per-tenant theming**. Tailwind CSS v4 is uniquely well-suited for this because it exposes all design tokens as native CSS custom properties. The recommended pattern is: define a `--color-brand` token via `@theme inline`, then set its value from the database via an inline `style` attribute on a wrapper element in the server-rendered layout. This means the brand color flows through all Tailwind utilities (`bg-brand`, `text-brand`, `border-brand`, etc.) without any client-side JavaScript for color switching.

For the logo, `next/image` with `remotePatterns` configuration handles optimized rendering of Supabase Storage URLs. The dashboard navigation is a straightforward sidebar/header pattern with hardcoded Dutch labels for the six required pages: Overzicht, Inbox, Verzonden, Voorkeuren, DNC, Afspraken.

**Primary recommendation:** Use Tailwind v4 `@theme inline` with a CSS custom property (`--color-brand`) set via inline style on the `(client)/layout.tsx` wrapper div. This gives you typed Tailwind utilities (`bg-brand`, `text-brand`) that resolve to the per-client color at runtime with zero JS overhead.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.12 | App Router, server components, layouts | Already in project |
| Tailwind CSS | 4.x | Utility-first CSS with native CSS variable theming | Already in project, v4 has first-class CSS variable support |
| React | 19.1.0 | UI components | Already in project |
| @supabase/ssr | 0.8.x | Server-side Supabase client | Already in project |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| next/image | (built-in) | Optimized image rendering for client logos | Logo display in navigation |

### No New Dependencies Needed

This phase requires **zero new npm packages**. Everything is achievable with the existing stack:
- Tailwind v4 CSS variables for dynamic theming
- next/image for logo optimization
- Server components for data fetching in layout
- Inline styles for per-tenant CSS variable injection

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (client)/
      layout.tsx              # MODIFY: branded dashboard shell with sidebar
      dashboard/
        page.tsx              # Overzicht page (already exists)
      inbox/
        page.tsx              # Inbox placeholder
      verzonden/
        page.tsx              # Verzonden placeholder
      voorkeuren/
        page.tsx              # Voorkeuren placeholder
      dnc/
        page.tsx              # DNC placeholder
      afspraken/
        page.tsx              # Afspraken placeholder
  components/
    client/
      sidebar-nav.tsx         # Navigation sidebar component
      client-logo.tsx         # Logo display component (next/image wrapper)
      brand-provider.tsx      # Wrapper that injects CSS variables via style attr
  lib/
    client/
      get-client-branding.ts  # Server function to fetch client branding data
  app/
    globals.css               # ADD @theme inline for --color-brand
```

### Pattern 1: CSS Variable Injection via Server Layout
**What:** The `(client)/layout.tsx` server component fetches the client's branding from Supabase (using `client_id` from JWT claims), then renders a wrapper `<div>` with an inline `style` attribute that sets `--color-brand` to the client's `primary_color` hex value.
**When to use:** Always -- this is the core theming mechanism.
**Example:**
```typescript
// Source: Tailwind v4 docs (https://tailwindcss.com/docs/theme)
// globals.css
@import "tailwindcss";

@theme inline {
  --color-brand: var(--brand-color);
}
```

```typescript
// src/app/(client)/layout.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNav } from '@/components/client/sidebar-nav'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const clientId = user.app_metadata?.client_id
  const { data: client } = await supabase
    .from('clients')
    .select('company_name, primary_color, logo_url')
    .eq('id', clientId)
    .single()

  const brandColor = client?.primary_color || '#3B82F6'

  return (
    <div
      className="flex min-h-screen bg-gray-50"
      style={{ '--brand-color': brandColor } as React.CSSProperties}
    >
      <SidebarNav
        companyName={client?.company_name ?? ''}
        logoUrl={client?.logo_url ?? null}
      />
      <main className="flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  )
}
```

### Pattern 2: Tailwind v4 @theme inline for Dynamic Brand Color
**What:** Define `--color-brand` in `@theme inline` so Tailwind generates utility classes (`bg-brand`, `text-brand`, `border-brand`, `ring-brand`) that resolve to the CSS variable at runtime.
**When to use:** Everywhere you need the client's brand color in the UI.
**Example:**
```css
/* globals.css */
@import "tailwindcss";

@theme inline {
  --color-brand: var(--brand-color, #3B82F6);
}
```

Then use throughout components:
```html
<button class="bg-brand text-white hover:bg-brand/90">
  Actie
</button>
<div class="border-brand border-l-4 p-4">
  Branded accent
</div>
<nav class="bg-brand text-white">
  ...
</nav>
```

The `var(--brand-color, #3B82F6)` fallback ensures a sensible default if the variable is not set.

### Pattern 3: Logo Display with next/image
**What:** Use `next/image` with `remotePatterns` for optimized logo rendering from Supabase Storage.
**When to use:** Displaying the client logo in the sidebar navigation.
**Example:**
```typescript
// next.config.ts -- add remotePatterns for Supabase Storage
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl
  ? new URL(supabaseUrl).hostname
  : '';

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https',
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

export default nextConfig;
```

```tsx
// Logo component
import Image from 'next/image'

function ClientLogo({ logoUrl, companyName }: { logoUrl: string | null; companyName: string }) {
  if (!logoUrl) {
    // Fallback: show company initial in a branded circle
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-white font-bold">
        {companyName.charAt(0).toUpperCase()}
      </div>
    )
  }

  return (
    <Image
      src={logoUrl}
      alt={`${companyName} logo`}
      width={160}
      height={40}
      className="h-10 w-auto object-contain"
      unoptimized={logoUrl.endsWith('.svg')}
    />
  )
}
```

### Pattern 4: Sidebar Navigation with Dutch Labels
**What:** A vertical sidebar with the client logo, navigation links using Dutch labels, and a sign-out button.
**When to use:** The main navigation shell for all client pages.
**Example:**
```typescript
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overzicht', icon: HomeIcon },
  { href: '/dashboard/inbox', label: 'Inbox', icon: InboxIcon },
  { href: '/dashboard/verzonden', label: 'Verzonden', icon: SendIcon },
  { href: '/dashboard/voorkeuren', label: 'Voorkeuren', icon: SettingsIcon },
  { href: '/dashboard/dnc', label: 'DNC', icon: ShieldIcon },
  { href: '/dashboard/afspraken', label: 'Afspraken', icon: CalendarIcon },
] as const
```

### Anti-Patterns to Avoid
- **Generating Tailwind classes dynamically with string interpolation:** Never do `bg-[${color}]`. Tailwind cannot scan runtime values. Use CSS variables instead via `@theme inline`.
- **Passing branding data through React context from layout to pages:** Not needed. The CSS variable is inherited by all descendants. Pages do not need to know the brand color explicitly.
- **Using `<img>` instead of `next/image`:** Loses optimization. Always use `next/image` for logos.
- **Fetching client data in every page component:** Fetch it once in the layout. Child pages inherit the CSS variable. If a child page needs the client data for other purposes, use React's `cache()` to deduplicate.
- **Storing brand color as RGB/HSL in DB:** The existing schema uses hex (`primary_color`). Keep it simple. CSS variables accept hex directly.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic theming | Custom theme context + CSS-in-JS | Tailwind v4 `@theme inline` + CSS variables | Native CSS, zero JS, SSR-compatible, no hydration mismatch |
| Image optimization | Manual resize/format logic | `next/image` with `remotePatterns` | Automatic srcset, lazy loading, format negotiation |
| Color palette generation (lighter/darker shades) | Custom color math library | CSS `color-mix()` or Tailwind opacity modifiers (`bg-brand/10`, `bg-brand/80`) | Browser-native, no bundle size |
| Navigation active state | Custom URL comparison logic | `usePathname()` from `next/navigation` | Built-in, handles App Router segments |

**Key insight:** Tailwind v4's CSS-first architecture means dynamic theming is a pure CSS problem. No JavaScript theme providers, no hydration issues, no context wrappers needed. Set a CSS variable on a parent element and every descendant utility class picks it up.

## Common Pitfalls

### Pitfall 1: Tailwind Class Purging with Dynamic Colors
**What goes wrong:** Using `bg-[${dynamicColor}]` causes Tailwind to not generate the class because it cannot scan the value at build time.
**Why it happens:** Tailwind generates utilities at build time by scanning source files. Dynamic string interpolation is invisible to the scanner.
**How to avoid:** Always use CSS variables via `@theme inline`. Define `--color-brand` once, then use `bg-brand` everywhere. The variable's value is set at runtime via inline style.
**Warning signs:** Colors not appearing, elements with no background when they should have one.

### Pitfall 2: CSS Variable Scope Leakage
**What goes wrong:** If `--brand-color` is set on `:root` or `<body>`, ALL clients sharing the same SSR output could theoretically see wrong colors during streaming.
**Why it happens:** Setting CSS variables too high in the DOM tree.
**How to avoid:** Set `--brand-color` on the `(client)/layout.tsx` wrapper div, NOT on `:root`. Each client's layout is independently rendered with their own data. The `@theme inline` definition in CSS uses `var(--brand-color, #fallback)` which resolves at the element level.
**Warning signs:** Wrong brand colors appearing briefly during page load.

### Pitfall 3: next/image Without remotePatterns Configuration
**What goes wrong:** Images from Supabase Storage fail with "Invalid src" or optimization errors.
**Why it happens:** Next.js blocks external image optimization by default for security.
**How to avoid:** Add the Supabase hostname to `remotePatterns` in `next.config.ts`. Extract the hostname from `NEXT_PUBLIC_SUPABASE_URL`.
**Warning signs:** Console errors about invalid image sources, broken image icons.

### Pitfall 4: SVG Logos Through next/image Optimization
**What goes wrong:** SVG logos get rasterized or fail optimization.
**Why it happens:** next/image tries to optimize all images including SVGs, which are already vector.
**How to avoid:** Use `unoptimized` prop when the logo URL ends in `.svg`. Alternatively, for SVGs you can use `dangerouslyAllowSVG` in next.config, but `unoptimized` per-image is safer.
**Warning signs:** Blurry logos, SVG rendering errors.

### Pitfall 5: Missing Logo Fallback
**What goes wrong:** If `logo_url` is null (client has no logo), the UI breaks or shows a broken image.
**Why it happens:** Not handling the null case for `logo_url` in the Client type.
**How to avoid:** Always provide a fallback. Use company initial in a colored circle, or a generic placeholder icon.
**Warning signs:** Broken image icons in the sidebar.

### Pitfall 6: html lang Attribute Not Set to Dutch
**What goes wrong:** Screen readers and search engines treat the page as English.
**Why it happens:** The root layout currently has `<html lang="en">`.
**How to avoid:** Change to `<html lang="nl">` in `src/app/layout.tsx` since the entire app is Dutch-language.
**Warning signs:** Accessibility audit warnings about language mismatch.

### Pitfall 7: Opacity Modifiers with @theme inline Colors
**What goes wrong:** `bg-brand/50` (50% opacity) might not work if the color format does not support alpha channel decomposition.
**Why it happens:** Tailwind v4 uses `color-mix()` for opacity modifiers, which works with any color format including hex. This is actually fine in v4, unlike v3 where you needed RGB channels.
**How to avoid:** This is a non-issue in Tailwind v4. Hex colors work with opacity modifiers out of the box via `color-mix(in oklch, var(--color-brand) 50%, transparent)`.
**Warning signs:** N/A -- just be aware this works differently than Tailwind v3.

## Code Examples

### Complete globals.css with Brand Theme
```css
/* src/app/globals.css */
@import "tailwindcss";

@theme inline {
  --color-brand: var(--brand-color, #3B82F6);
}
```

### Fetching Client Branding (Server-Side Helper)
```typescript
// src/lib/client/get-client-branding.ts
import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export const getClientBranding = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const clientId = user.app_metadata?.client_id
  if (!clientId) return null

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url')
    .eq('id', clientId)
    .single()

  return client
})
```

### Navigation Item with Active State
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItemProps {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

export function NavItem({ href, label, icon: Icon }: NavItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-brand/10 text-brand'
          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  )
}
```

### Sidebar Navigation Component
```typescript
// src/components/client/sidebar-nav.tsx
import { NavItem } from './nav-item'
import { ClientLogo } from './client-logo'

interface SidebarNavProps {
  companyName: string
  logoUrl: string | null
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overzicht' },
  { href: '/dashboard/inbox', label: 'Inbox' },
  { href: '/dashboard/verzonden', label: 'Verzonden' },
  { href: '/dashboard/voorkeuren', label: 'Voorkeuren' },
  { href: '/dashboard/dnc', label: 'DNC' },
  { href: '/dashboard/afspraken', label: 'Afspraken' },
]

export function SidebarNav({ companyName, logoUrl }: SidebarNavProps) {
  return (
    <aside className="flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Logo area */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4">
        <ClientLogo logoUrl={logoUrl} companyName={companyName} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>

      {/* Sign out */}
      <div className="border-t border-gray-200 p-3">
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Uitloggen
          </button>
        </form>
      </div>
    </aside>
  )
}
```

### next.config.ts with Supabase Image Support
```typescript
// next.config.ts
import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
let supabaseHostname = '';
try {
  supabaseHostname = new URL(supabaseUrl).hostname;
} catch {
  // env var not set during build, skip
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: 'https' as const,
            hostname: supabaseHostname,
            pathname: '/storage/v1/object/public/**',
          },
        ]
      : [],
  },
};

export default nextConfig;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Tailwind v3 `tailwind.config.js` extend colors | Tailwind v4 `@theme` in CSS | Tailwind v4 (Jan 2025) | No JS config file needed, CSS-first |
| Tailwind v3 required RGB decomposition for opacity | Tailwind v4 uses `color-mix()` | Tailwind v4 (Jan 2025) | Hex colors work with opacity modifiers natively |
| `next/image` `domains` config | `remotePatterns` config | Next.js 14+ | More secure, supports path restrictions |
| React Context for theme data | CSS custom properties + server components | Next.js 13+ App Router | No client-side JS needed for theming |

**Deprecated/outdated:**
- `tailwind.config.ts` / `tailwind.config.js`: Not needed in v4. Use `globals.css` with `@theme` directives. The project already has no config file.
- `next/image` `domains` config: Deprecated in Next.js 14. Use `remotePatterns` instead.
- `priority` prop on `next/image`: Deprecated in Next.js 16. Use `preload` instead. Since this project is on Next.js 15.5.12, `priority` still works.

## Open Questions

1. **Navigation icons approach**
   - What we know: The nav needs icons for each item (Overzicht, Inbox, etc.)
   - What's unclear: Whether to use an icon library (lucide-react, heroicons) or inline SVGs
   - Recommendation: Use inline SVG components (no extra dependency). Simple icons for 6 nav items do not warrant a full icon library. Alternatively, lucide-react is lightweight and commonly used with Next.js if icons are wanted.

2. **Mobile responsiveness of sidebar**
   - What we know: Desktop sidebar is straightforward
   - What's unclear: Whether mobile layout is in scope for this phase
   - Recommendation: Build desktop-first sidebar. Add a responsive collapse/drawer in a later phase if needed. Keep the mobile consideration minimal (hide sidebar, show hamburger) but don't over-engineer it now.

3. **Route structure under /dashboard**
   - What we know: Six pages needed: Overzicht, Inbox, Verzonden, Voorkeuren, DNC, Afspraken
   - What's unclear: Whether these should be `/dashboard/inbox` or `/inbox` etc.
   - Recommendation: Use `/dashboard` as the base with sub-routes (`/dashboard/inbox`, `/dashboard/verzonden`, etc.) since the middleware already routes clients to `/dashboard` and the `(client)` route group maps to this.

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4 Theme Variables docs](https://tailwindcss.com/docs/theme) - @theme directive, @theme inline, CSS variable generation
- [Tailwind CSS v4 Colors docs](https://tailwindcss.com/docs/colors) - color-mix() for opacity, --color-* namespace, arbitrary values
- [Next.js Image Component docs](https://nextjs.org/docs/app/api-reference/components/image) - remotePatterns, fill, unoptimized, SVG handling
- [Next.js Layout docs](https://nextjs.org/docs/app/api-reference/file-conventions/layout) - server component layouts, data fetching patterns
- Existing codebase analysis - `(client)/layout.tsx`, `database.ts` types, `storage.ts`, `middleware.ts`

### Secondary (MEDIUM confidence)
- [Tailwind v4 multi-theme discussion](https://github.com/tailwindlabs/tailwindcss/discussions/15600) - Community patterns for runtime theming
- [Next.js data fetching patterns](https://nextjs.org/docs/14/app/building-your-application/data-fetching/patterns) - Layout data fetching, React cache deduplication
- [Evil Martians OKLCH dynamic themes](https://evilmartians.com/chronicles/better-dynamic-themes-in-tailwind-with-oklch-color-magic) - Advanced dynamic theming patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all verified against existing project
- Architecture: HIGH - Tailwind v4 CSS variable pattern verified via official docs, Next.js layout pattern verified
- Pitfalls: HIGH - All pitfalls derived from official docs and verified behavior
- Code examples: MEDIUM - Patterns are correct per docs, but exact integration with this specific codebase may need minor adjustments

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable technologies, 30-day validity)
