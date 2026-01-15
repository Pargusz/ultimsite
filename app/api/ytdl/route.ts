import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

import { getCookieFilePath } from './cookie-helper';

export const dynamic = 'force-dynamic';

// Helper to run command
const runCommand = (cmd: string, args: string[]) => {
    return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
        const proc = spawn(cmd, args);
        let stdout = '';
        let stderr = '';
        proc.stdout.on('data', d => stdout += d.toString());
        proc.stderr.on('data', d => stderr += d.toString());
        proc.on('close', code => {
            if (code === 0) resolve({ stdout, stderr });
            else reject(new Error(`Command failed: ${stderr || 'Unknown error'}`));
        });
        proc.on('error', reject);
    });
};

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL gerekli' }, { status: 400 });
    }

    try {
        // 1. Resolve yt-dlp path
        let ytDlpPath = path.resolve('./bin/yt-dlp');
        if (!fs.existsSync(ytDlpPath)) {
            ytDlpPath = 'yt-dlp'; // System fallback (Docker)
        }

        // 2. Prepare Cookies
        const cookiePath = getCookieFilePath();

        // 3. Fetch Metadata using yt-dlp
        // --dump-json provides all info in a structured format
        // --no-playlist prevents processing entire playlists if a playlist URL is provided
        const args = [
            '--dump-json',
            '--no-playlist',
            '--no-warnings',
            '--no-check-certificates',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            url
        ];

        if (cookiePath) {
            args.push('--cookies', cookiePath);
        }

        const { stdout } = await runCommand(ytDlpPath, args);
        const info = JSON.parse(stdout);

        // 3. Process Formats
        const formats = info.formats || [];

        // Filter and map formats similar to before
        const relevantFormats = formats
            .filter((f: any) => {
                // Keep only mp4 and clean audio
                // Filter out m3u8 (HLS) streams which are hard to download directly without ffmpeg re-encoding
                return f.protocol === 'https' || f.protocol === 'http';
            })
            .map((f: any) => {
                const hasVideo = f.vcodec !== 'none';
                const hasAudio = f.acodec !== 'none';
                const container = f.ext;

                // Determine Quality Label
                let qualityLabel = 'Audio';
                if (hasVideo) {
                    qualityLabel = f.height ? `${f.height}p` : 'Video';
                    if (!hasAudio) qualityLabel += ' (Sessiz)';
                } else {
                    qualityLabel = 'Ses (MP3)'; // Start with generic label
                }

                return {
                    itag: f.format_id, // yt-dlp uses format_id string/number
                    qualityLabel,
                    container,
                    hasAudio,
                    hasVideo,
                    contentLength: f.filesize || f.filesize_approx || 0,
                    isHighRes: f.height && f.height > 720,
                    height: f.height
                };
            })
            // Filter duplicates roughly
            .reduce((acc: any[], curr: any) => {
                // Logic: if we already have this qualityLabel (e.g. 1080p), keep the one with audio if possible, or higher filesize
                const existingIndex = acc.findIndex(i => i.qualityLabel === curr.qualityLabel);
                if (existingIndex > -1) {
                    const existing = acc[existingIndex];
                    // If current has audio and existing doesn't, replace
                    if (curr.hasAudio && !existing.hasAudio) {
                        acc[existingIndex] = curr;
                    }
                    // Or if both same audio status, prefer larger size (usually better quality)
                    else if (curr.hasAudio === existing.hasAudio && curr.contentLength > existing.contentLength) {
                        acc[existingIndex] = curr;
                    }
                } else {
                    acc.push(curr);
                }
                return acc;
            }, [])
            .filter((f: any) => {
                // Final cleanup: Only defined containers
                return ['mp4', 'm4a', 'webm'].includes(f.container);
            })
            .sort((a: any, b: any) => {
                // Sort: Video (Desc Quality) > Audio
                if (a.hasVideo && !b.hasVideo) return -1;
                if (!a.hasVideo && b.hasVideo) return 1;
                if (a.hasVideo && b.hasVideo) return (b.height || 0) - (a.height || 0);
                return 0;
            });

        // 4. Return simplified response
        return NextResponse.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration_string, // yt-dlp gives formatted duration
            formats: relevantFormats
        });

    } catch (error: any) {
        console.error('YTDL Error:', error);

        const errorMessage = error.message || '';

        // Check for specific YouTube bot detection / cookie required errors
        if (errorMessage.includes('Sign in to confirm') || errorMessage.includes('cookies')) {
            return NextResponse.json({
                error: 'Sunucu doğrulama hatası (Bot/Cookie)',
                details: 'YouTube bot tespiti yaptı. Lütfen "COOKIES_GUIDE.md" dosyasındaki adımları takip ederek YOUTUBE_COOKIES ayarını yapın.',
                requiresCookies: true
            }, { status: 429 }); // 429 Too Many Requests is appropriate for rate limiting/blocking mechanism
        }

        return NextResponse.json({ error: errorMessage || 'Video bilgileri alınamadı' }, { status: 500 });
    }
}
