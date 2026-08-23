/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Restricts these libraries' imports to only the modules actually used per
  // file at build time, instead of pulling each package's full barrel export
  // into every chunk that touches it — meaningfully shrinks the client bundle
  // given how much of the app imports from drei/lucide-react.
  experimental: {
    optimizePackageImports: ['@react-three/drei', 'lucide-react'],
  },
};

export default nextConfig;
