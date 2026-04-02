/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Required for Three.js WebGPU renderer compatibility
    // Preserve existing externals (may be a function in webpack 5) before appending
    const existingExternals = config.externals || [];
    config.externals = [
      ...(Array.isArray(existingExternals) ? existingExternals : [existingExternals]),
      { canvas: "canvas" },
    ];

    // Handle WGSL shader files for WebGPU
    config.module.rules.push({
      test: /\.wgsl$/,
      type: "asset/source",
    });

    return config;
  },
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
