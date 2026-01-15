import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

// Helper to run spawning properly in Promise
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
    const itag = req.nextUrl.searchParams.get('itag');

    if (!url) {
        return NextResponse.json({ error: 'URL gerekli' }, { status: 400 });
    }

    try {
        // 1. Resolve Tools
        const ytDlpPath = path.resolve('./bin/yt-dlp');
        if (!fs.existsSync(ytDlpPath)) {
            throw new Error('yt-dlp binary missing. Server needs restart/setup.');
        }

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

        // 2. Get Title (Fast)
        // Execute binary directly (macOS executable)
        // Args: [--print, title, ...]
        const titleResult = await runCommand(ytDlpPath, [
            '--print', 'title',
            '--no-warnings',
            '--no-playlist',
            url
        ]);

        const videoTitle = titleResult.stdout.trim().replace(/[^\w\s-]/gi, '') || 'video';

        // 3. Determine Mode (Audio or Video)
        const isAudio = itag === 'audio-best' || itag === '140' || itag === '251';

        const extension = isAudio ? 'mp3' : 'mp4';
        const contentType = isAudio ? 'audio/mpeg' : 'video/mp4';
        const filename = `${videoTitle}.${extension}`;

        // 4. Download
        const tempDir = path.resolve('./tmp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const outputTemplate = path.join(tempDir, `dl-${uniqueId}.%(ext)s`);

        // Construct Args for main download
        // IMPORTANT: ytDlpPath is the COMMAND, not an ARG
        const args = [
            url,
            '-o', outputTemplate,
            '--no-playlist',
            '--no-warnings',
            '--no-check-certificates',
            '--force-overwrites',
            '--ffmpeg-location', ffmpegPath
        ];

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
        return NextResponse.json({
            error: 'İşlem Başarısız',
            details: error.message
        }, { status: 500 });
    }
}
