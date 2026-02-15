import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
let supabaseHostname = '';
try {
  supabaseHostname = new URL(supabaseUrl).hostname;
} catch {
  // env var not set during build
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
  },
  images: {
    remotePatterns: supabaseHostname
      ? [{ protocol: 'https' as const, hostname: supabaseHostname, pathname: '/storage/v1/object/public/**' }]
      : [],
  },
};

export default nextConfig;
