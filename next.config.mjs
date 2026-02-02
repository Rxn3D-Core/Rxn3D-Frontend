import withBundleAnalyzer from '@next/bundle-analyzer';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployments
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // This prevents build failures from error page pre-rendering
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  images: {
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'rxn3d-media-files.s3.us-west-2.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
        pathname: '/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Skip error page generation to avoid SSR issues with @react-three/drei
  experimental: {
    turbo: {
      rules: {
        // Configure any custom rules here
      },
    },
  },
  // Enable React Fast Refresh
  reactStrictMode: true,
  // Enable page optimization
  swcMinify: true,
  // Enable compression
  compress: true,
  // Disable source maps in production for better performance
  productionBrowserSourceMaps: false,
  // Optimize fonts
  optimizeFonts: true,
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https:; img-src 'self' blob: data: https:; font-src 'self' data: https:; connect-src 'self' blob: https:; media-src 'self' blob: https:; worker-src 'self' blob:; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
          },
        ],
      },
    ];
  },
  // Enable webpack persistent caching
  webpack: (config, { dev, isServer }) => {
    // Enable persistent caching with memory-friendly settings
    config.cache = {
      type: 'filesystem',
      buildDependencies: {
        config: [__filename],
      },
      // Reduce memory usage by limiting cache size
      maxMemoryGenerations: 1,
    };
    
    // Apply optimizations for both dev and production
    if (!isServer) {
      // In dev mode, use lighter splitting to reduce memory usage
      const isDevMode = dev;
      config.optimization = {
        ...config.optimization,
        runtimeChunk: isDevMode ? false : 'single', // Disable in dev to save memory
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: isDevMode ? 15 : 25, // Fewer chunks in dev
          minSize: isDevMode ? 10000 : 20000, // Smaller min size in dev
          maxSize: isDevMode ? 150000 : 244000, // Smaller max size in dev (150KB vs 244KB)
          cacheGroups: {
            // Core React libraries
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
              enforce: true,
            },
            // Three.js and 3D libraries - separate chunk to lazy load
            three: {
              test: /[\\/]node_modules[\\/](three|@react-three)[\\/]/,
              name: 'three',
              chunks: 'async', // Only load when needed (async chunks)
              priority: 15,
              enforce: true,
            },
            // UI component libraries
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|framer-motion)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 10,
            },
            // Form libraries
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
              name: 'forms',
              chunks: 'all',
              priority: 10,
            },
            // Data fetching libraries
            data: {
              test: /[\\/]node_modules[\\/](@tanstack|zustand)[\\/]/,
              name: 'data',
              chunks: 'all',
              priority: 10,
            },
            // Chart and visualization libraries - lazy load
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
              name: 'charts',
              chunks: 'async', // Only load when needed
              priority: 8,
            },
            // Other vendor libraries
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 5,
              minChunks: 2, // Only split if used in 2+ places
            },
            // Common components - only in production
            ...(isDevMode ? {} : {
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                enforce: true,
                priority: 1,
              },
            }),
          },
        },
      };
    }
    
    // Optimize imports - alias is already configured in tsconfig.json
    
    return config;
  },
}

const config = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig);

export default config;
