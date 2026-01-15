/** @type {import('next').NextConfig} */
const nextConfig = {
    // Ensure heavy binaries are treated as external
    serverExternalPackages: ['ffmpeg-static', 'sharp'],
    // Increase timeout for server actions if needed
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    webpack: (config) => {
        config.resolve.alias.canvas = false;
        return config;
    },
    output: 'standalone',
};

export default nextConfig;
