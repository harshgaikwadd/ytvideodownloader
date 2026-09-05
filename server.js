const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Fetch metadata using yt-dlp execution
app.post('/api/info', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    // Use npx yt-dlp to dump JSON format
    const command = `npx --yes yt-dlp --dump-json "${url}"`;

    exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
        if (error) {
            console.error('Info Error:', stderr || error.message);
            return res.status(500).json({ error: 'Failed to fetch video details. Ensure link is public.' });
        }

        try {
            const info = JSON.parse(stdout);
            res.json({
                title: info.title || 'Unknown Title',
                thumbnail: info.thumbnail || (info.thumbnails && info.thumbnails[0]?.url) || '',
                duration: info.duration_string || `${Math.floor(info.duration / 60)}:${info.duration % 60}` || 'N/A'
            });
        } catch (e) {
            console.error('JSON Parse Error:', e);
            res.status(500).json({ error: 'Failed to parse video information.' });
        }
    });
});

// Download stream
app.get('/api/download', (req, res) => {
    const { url, quality } = req.query;
    if (!url || !quality) return res.status(400).send('Missing parameters');

    let formatArg = '';
    if (quality === 'mp3') {
        res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
        res.header('Content-Type', 'audio/mpeg');
        formatArg = '-x --audio-format mp3';
    } else {
        const height = quality.replace('p', '');
        res.header('Content-Disposition', `attachment; filename="video_${quality}.mp4"`);
        res.header('Content-Type', 'video/mp4');
        formatArg = `-f "bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best"`;
    }

    const command = `npx --yes yt-dlp ${formatArg} -o - "${url}"`;
    const child = exec(command);

    child.stdout.pipe(res);

    child.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr: ${data}`);
    });

    req.on('close', () => {
        child.kill();
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));