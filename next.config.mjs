/** @type {import('next').NextConfig} */

// GitHub Pages serves the app under /repo-name; set NEXT_PUBLIC_BASE_PATH in CI.
// Locally this is empty so dev mode works at http://localhost:3000
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig = {
  output: "export",        // static HTML export — no Node server needed
  basePath,
  assetPrefix: basePath,
  images: {
    unoptimized: true,     // required for static export
  },
};

export default nextConfig;
