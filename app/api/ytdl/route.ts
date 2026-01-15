import { NextRequest, NextResponse } from 'next/server';
import ytdl from '@distube/ytdl-core';

export async function GET(req: NextRequest) {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL gerekli' }, { status: 400 });
    }

    try {
        if (!ytdl.validateURL(url)) {
            return NextResponse.json({ error: 'Geçersiz YouTube bağlantısı' }, { status: 400 });
        }

        const info = await ytdl.getInfo(url);

        // 1. Get standard formats (Video + Audio) - usually max 720p
        const standardFormats = ytdl.filterFormats(info.formats, 'videoandaudio');

        // 2. Get high quality video-only formats (1080p, 4K, etc.)
        // Strict preference for MP4
        const videoOnlyFormats = ytdl.filterFormats(info.formats, 'videoonly');
        const highResFormats = videoOnlyFormats.filter(f =>
            f.container === 'mp4' && // Only MP4 for high res to reduce clutter
            ((f.height && f.height > 720) || (f.qualityLabel && (f.qualityLabel.includes('1080p') || f.qualityLabel.includes('1440p') || f.qualityLabel.includes('2160p') || f.qualityLabel.includes('4320p'))))
        );

        // 3. Get Audio formats
        // STRICTLY only M4A (AAC) to simulate "MP3" feel. WebM is often unsupported.
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly').filter(f => f.container === 'mp4');

        // Combine relevant formats
        const allFormats = [...standardFormats, ...highResFormats, ...audioFormats];

        // Filter duplicates
        const uniqueFormatsMap = new Map();

        allFormats.forEach(f => {
            const isAudioOnly = !f.hasVideo && f.hasAudio;
            const isVideoOnly = f.hasVideo && !f.hasAudio;

            // Skip WebM for standard video too if we have mp4 preference (though 720p usually has both)
            if (f.container === 'webm') return;

            let key;
            if (isAudioOnly) {
                key = 'audio-best'; // Only keep ONE best audio
            } else {
                // Video: Group by quality (e.g. 1080p, 720p)
                // We merge "sessiz" status into the key so we don't duplicate logic unnecessarily, 
                // but since we only want MP4, we can just key by qualityLabel.
                key = f.qualityLabel;
            }

            if (!uniqueFormatsMap.has(key)) {
                uniqueFormatsMap.set(key, f);
            } else {
                const existing = uniqueFormatsMap.get(key);
                // Always prefer higher bitrate
                if ((f.bitrate || 0) > (existing.bitrate || 0)) {
                    uniqueFormatsMap.set(key, f);
                }
            }
        });

        // Convert options to easy UI format
        const relevantFormats = Array.from(uniqueFormatsMap.values())
            .map(f => {
                let qualityLabel = f.qualityLabel || 'Audio';
                let typeLabel = '';

                if (f.hasVideo) {
                    typeLabel = f.qualityLabel;
                    if (!f.hasAudio) typeLabel += ' (Sessiz)';
                } else {
                    // Force label to be "Ses (MP3)" for user satisfaction, although technically M4A
                    typeLabel = 'Ses (MP3)';
                }

                return {
                    itag: f.itag,
                    qualityLabel: typeLabel,
                    container: f.container,
                    hasAudio: f.hasAudio,
                    hasVideo: f.hasVideo,
                    contentLength: f.contentLength,
                    isHighRes: f.height && f.height > 720
                };
            })
            // Sort: Video (Desc Quality) > Audio
            .sort((a, b) => {
                if (a.hasVideo && !b.hasVideo) return -1;
                if (!a.hasVideo && b.hasVideo) return 1;
                return 0;
            });

        return NextResponse.json({
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails.pop()?.url,
            duration: new Date(parseInt(info.videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8),
            formats: relevantFormats
        });

    } catch (error: any) {
        console.error('YTDL Error:', error);
        return NextResponse.json({ error: error.message || 'Video bilgileri alınamadı' }, { status: 500 });
    }
}
