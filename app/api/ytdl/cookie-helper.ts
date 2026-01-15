import fs from 'fs';
import path from 'path';

/**
 * Checks for YOUTUBE_COOKIES env var and writes it to a temp file.
 * Returns the path to the cookie file or null if not available.
 */
export const getCookieFilePath = (): string | null => {
    const cookiesContent = process.env.YOUTUBE_COOKIES;

    // If no cookies are provided, return null to skip --cookies arg
    if (!cookiesContent || cookiesContent.trim() === '') {
        return null;
    }

    // Use /tmp directory which is usually writable in Docker/Serverless
    const cookiePath = path.resolve('/tmp', 'youtube_cookies.txt');

    // Optimization: If file exists and content matches, don't write again (optional, but good for disk I/O)
    // For simplicity, we just overwrite to ensure freshness if env var changed.
    try {
        fs.writeFileSync(cookiePath, cookiesContent, 'utf-8');
        return cookiePath;
    } catch (error) {
        console.error('Failed to write cookie file:', error);
        return null;
    }
};
