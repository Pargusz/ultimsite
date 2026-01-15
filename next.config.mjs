/** @type {import('next').NextConfig} */
const nextConfig = {
    // Ensure heavy binaries are treated as external
    serverExternalPackages: ['ffmpeg-static', 'sharp', 'canvas'],
    // Increase timeout for server actions if needed
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
};

export default nextConfig;
