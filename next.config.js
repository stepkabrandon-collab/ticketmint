/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Solana/Anchor browser compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Polyfill Node.js modules that wallet adapter / web3.js expect
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs:     false,
        net:    false,
        tls:    false,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        http:   require.resolve("stream-http"),
        https:  require.resolve("https-browserify"),
        zlib:   require.resolve("browserify-zlib"),
        path:   require.resolve("path-browserify"),
      };
    }

    // pino-pretty is an optional dep used by pino (pulled in by Supabase).
    // It's never actually needed at runtime — ignore it to prevent build errors.
    config.plugins.push(
      new (require("webpack").IgnorePlugin)({
        resourceRegExp: /^pino-pretty$/,
      })
    );

    return config;
  },

  // Allow images from Supabase Storage, Arweave, IPFS gateways
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co"      },
      { protocol: "https", hostname: "arweave.net"         },
      { protocol: "https", hostname: "*.arweave.net"       },
      { protocol: "https", hostname: "ipfs.io"             },
      { protocol: "https", hostname: "*.ipfs.io"           },
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },

  // Disable x-powered-by header in production
  poweredByHeader: false,
};

module.exports = nextConfig;
