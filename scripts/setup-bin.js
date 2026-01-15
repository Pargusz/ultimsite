const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const BIN_DIR = path.join(__dirname, '..', 'bin');
const BIN_PATH = path.join(BIN_DIR, 'yt-dlp');

if (!fs.existsSync(BIN_DIR)) {
    fs.mkdirSync(BIN_DIR, { recursive: true });
}

const platform = process.platform;
let url = '';

if (platform === 'linux') {
    url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';
    console.log('Detected Linux (Vercel/Server). Downloading Linux binary...');
} else if (platform === 'darwin') {
    url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos';
    console.log('Detected macOS. Downloading Mac binary...');
} else {
    console.error('Unsupported platform: ' + platform);
    process.exit(0); // Soft exit to not break install on Windows dev if happens
}

const file = fs.createWriteStream(BIN_PATH);

https.get(url, (response) => {
    if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        https.get(response.headers.location, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log('Download completed.');
                    try {
                        fs.chmodSync(BIN_PATH, '755');
                        console.log('Permissions set to 755.');
                    } catch (e) {
                        console.error('Failed to set permissions:', e);
                    }
                });
            });
        });
    } else {
        response.pipe(file);
        file.on('finish', () => {
            file.close(() => {
                console.log('Download completed.');
                try {
                    fs.chmodSync(BIN_PATH, '755');
                    console.log('Permissions set to 755.');
                } catch (e) {
                    console.error('Failed to set permissions:', e);
                }
            });
        });
    }
}).on('error', (err) => {
    console.error('Error downloading file:', err);
    // process.exit(1); 
});
