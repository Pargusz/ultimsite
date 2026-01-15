import { NextRequest, NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

import { getCookieFilePath } from '../cookie-helper';

export const dynamic = 'force-dynamic';

// Helper to run spawning properly in Promise
const runCommand = (cmd: string, args: string[]) => {
    // ... existing runCommand impl ...
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
    const itag = req.nextUrl.searchParams.get('itag');

    if (!url) {
        return NextResponse.json({ error: 'URL gerekli' }, { status: 400 });
    }
    try {

        // 1. Resolve Tools
        let ytDlpPath = path.resolve('./bin/yt-dlp');
        if (!fs.existsSync(ytDlpPath)) {
            // Fallback to system-wide installation (Docker)
            ytDlpPath = 'yt-dlp';
        }

        // ... ffmpeg resolution ...
        let ffmpegPath = null;
        try { ffmpegPath = (await import('ffmpeg-static')).default; } catch (e) { }

        // Manual FFmpeg fallback
        if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
            const possible = [
                path.resolve(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
                path.resolve(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
            ];
            for (const p of possible) { if (fs.existsSync(p)) { ffmpegPath = p; break; } }
        }
        if (!ffmpegPath) ffmpegPath = 'ffmpeg'; // system fallback

        // Prepare Cookies (Get path once)
        const cookiePath = getCookieFilePath();

        // 2. Get Title (Fast)
        // Execute binary directly (macOS executable)
        // Args: [--print, title, ...]
        const titleArgs: string[] = [
            '--print', 'title',
            '--no-warnings',
            '--no-playlist',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            url
        ];

        if (cookiePath) {
            titleArgs.push('--cookies', cookiePath);
        }

        const titleResult = await runCommand(ytDlpPath, titleArgs);

        const videoTitle = titleResult.stdout.trim().replace(/[^\w\s-]/gi, '') || 'video';

        // 3. Determine Mode (Audio or Video)
        const isAudio = itag === 'audio-best' || itag === '140' || itag === '251';

        const extension = isAudio ? 'mp3' : 'mp4';
        const contentType = isAudio ? 'audio/mpeg' : 'video/mp4';
        const filename = `${videoTitle}.${extension}`;

        // 4. Download
        // Use system temp dir to avoid permission issues in production (e.g. Render)
        const tempDir = os.tmpdir();
        // No need to mkdirSync for system temp dir usually, but we can try-catch it if we want a subdir
        // For simplicity, just use tmpdir directly.

        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const outputTemplate = path.join(tempDir, `dl-${uniqueId}.%(ext)s`);

        // Construct Args for main download
        // IMPORTANT: ytDlpPath is the COMMAND, not an ARG
        const args: string[] = [
            url,
            '-o', outputTemplate,
            '--no-playlist',
            '--no-warnings',
            '--no-check-certificates',
            '--force-overwrites',
            '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--ffmpeg-location', ffmpegPath
        ];

        if (cookiePath) {
            args.push('--cookies', cookiePath);
        }

        if (isAudio) {
            // === MP3 MODE ===
            args.push(
                '-x',
                '--audio-format', 'mp3',
                '--audio-quality', '0' // Best quality
            );
        } else {
            // === VIDEO MODE ===
            if (itag && !isAudio && /^\d+$/.test(itag)) {
                args.push('-f', `${itag}+bestaudio/best`);
            } else {
                args.push('-f', 'bestvideo+bestaudio/best');
            }
            args.push('--merge-output-format', 'mp4');
        }

        // Execute binary directly
        await runCommand(ytDlpPath, args);

        // Find the actual output file
        const expectedOutput = path.join(tempDir, `dl-${uniqueId}.${extension}`);

        if (!fs.existsSync(expectedOutput)) {
            throw new Error('Dosya indirme başarısız (Dosya bulunamadı)');
        }

        // 5. Serve
        const stats = fs.statSync(expectedOutput);
        const fileStream = fs.createReadStream(expectedOutput);

        const headers = new Headers();
        headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
        headers.set('Content-Type', contentType);
        headers.set('Content-Length', stats.size.toString());

        const readable = new ReadableStream({
            start(controller) {
                fileStream.on('data', chunk => controller.enqueue(chunk));
                fileStream.on('end', () => {
                    controller.close();
                    try { fs.unlinkSync(expectedOutput); } catch (e) { }
                });
                fileStream.on('error', err => {
                    controller.error(err);
                    try { fs.unlinkSync(expectedOutput); } catch (e) { }
                });
            },
            cancel() {
                fileStream.destroy();
                try { fs.unlinkSync(expectedOutput); } catch (e) { }
            }
        });

        return new NextResponse(readable, { headers });

    } catch (error: any) {
        console.error('Final Download Error:', error);

        const errorMessage = error.message || '';

        // Check for specific YouTube bot detection / cookie required errors
        if (errorMessage.includes('Sign in to confirm') || errorMessage.includes('cookies')) {
            return NextResponse.json({
                error: 'İndirme Başarısız (Doğrulama Gerekli)',
                details: 'YouTube sunucuyu engelledi. YOUTUBE_COOKIES ayarı gerekli. Lütfen COOKIES_GUIDE.md dosyasını okuyun.',
                requiresCookies: true
            }, { status: 429 });
        }

        return NextResponse.json({
            error: 'İşlem Başarısız',
            details: errorMessage
        }, { status: 500 });
    }
}
