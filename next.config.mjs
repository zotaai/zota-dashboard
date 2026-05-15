/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  // jsPDF and xlsx are browser-only; tell webpack not to bundle them server-side
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : []),
        "jspdf",
        "jspdf-autotable",
        "xlsx",
      ];
    }
    return config;
  },
};

export default nextConfig;
