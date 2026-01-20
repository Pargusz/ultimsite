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

        // 3. Fetch Metadata using yt-dlp with speed flags
        const args = [
            '--dump-json',
            '--no-playlist',
            '--flat-playlist',
            '--no-warnings',
            '--no-check-certificates',
            '--no-call-home',
            '--geo-bypass',
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

        const relevantFormats = formats
            .filter((f: any) => f.format_id)
            .map((f: any) => {
                const hasVideo = f.vcodec !== 'none';
                const hasAudio = f.acodec !== 'none';
                const container = f.ext;

                let qualityLabel = 'Audio';
                if (hasVideo) {
                    qualityLabel = f.height ? `${f.height}p` : 'Video';
                    if (!hasAudio) qualityLabel += ' (Sessiz)';
                } else {
                    qualityLabel = 'Ses (MP3)';
                }

                return {
                    itag: f.format_id,
                    qualityLabel,
                    container,
                    hasAudio,
                    hasVideo,
                    contentLength: f.filesize || f.filesize_approx || 0,
                    isHighRes: f.height && f.height > 720,
                    height: f.height
                };
            })
            .reduce((acc: any[], curr: any) => {
                const existingIndex = acc.findIndex(i => i.qualityLabel === curr.qualityLabel);
                if (existingIndex > -1) {
                    const existing = acc[existingIndex];
                    if (curr.hasAudio && !existing.hasAudio) {
                        acc[existingIndex] = curr;
                    }
                    else if (curr.hasAudio === existing.hasAudio && curr.contentLength > existing.contentLength) {
                        acc[existingIndex] = curr;
                    }
                } else {
                    acc.push(curr);
                }
                return acc;
            }, [])
            .filter((f: any) => ['mp4', 'm4a', 'webm'].includes(f.container))
            .sort((a: any, b: any) => {
                if (a.hasVideo && !b.hasVideo) return -1;
                if (!a.hasVideo && b.hasVideo) return 1;
                if (a.hasVideo && b.hasVideo) return (b.height || 0) - (a.height || 0);
                return 0;
            });

        relevantFormats.push({
            itag: 'audio-best',
            qualityLabel: 'MP3 (En İyi Ses)',
            container: 'mp3',
            hasAudio: true,
            hasVideo: false,
            contentLength: 0,
            isHighRes: false,
            height: 0
        });

        return NextResponse.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration_string,
            formats: relevantFormats
        });

    } catch (error: any) {
        console.error('YTDL Error:', error);
        return NextResponse.json({ error: error.message || 'Video bilgileri alınamadı' }, { status: 500 });
    }
}
