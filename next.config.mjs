// Baseline security headers, applied to every response as defense-in-depth.
// Deliberately no Content-Security-Policy: a strict CSP fights Next's inline
// runtime scripts and is easy to break for little gain on a private pool.
// HSTS is intentionally omitted too — TLS terminates at Pangolin, so the proxy
// is the right place to set it; adding it here could bite the plain-HTTP LAN
// access used during local testing.
const securityHeaders = [
  // Stop the browser from MIME-sniffing a response into a different type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding the app in an <iframe> elsewhere (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs to other origins in the Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Turn off browser features the app never uses.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    // Runs src/instrumentation.ts at server startup (used for DB migrations)
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@libsql/client"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
