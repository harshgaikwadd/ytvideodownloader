const express = require('express');
const cors = require('cors');
const { exec, spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Fetch metadata using yt-dlp CLI
app.post('/api/info', (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    exec(`npx yt-dlp --dump-json "${url}"`, (error, stdout, stderr) => {
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
            res.status(500).json({ error: 'Failed to parse video info.' });
        }
    });
});

// Stream video or audio using yt-dlp process
app.get('/api/download', (req, res) => {
    const { url, quality } = req.query;
    if (!url || !quality) return res.status(400).send('Missing parameters');

    let args = [];

    if (quality === 'mp3') {
        res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
        res.header('Content-Type', 'audio/mpeg');
        args = ['-x', '--audio-format', 'mp3', '-o', '-', url];
    } else {
        const height = quality.replace('p', '');
        res.header('Content-Disposition', `attachment; filename="video_${quality}.mp4"`);
        res.header('Content-Type', 'video/mp4');
        args = ['-f', `bestvideo[height<=${height}]+bestaudio/best`, '--merge-output-format', 'mp4', '-o', '-', url];
    }

    const ytdlpProcess = spawn('npx', ['yt-dlp', ...args]);

    ytdlpProcess.stdout.pipe(res);

    ytdlpProcess.stderr.on('data', (data) => {
        console.error(`yt-dlp stderr: ${data}`);
    });

    req.on('close', () => {
        ytdlpProcess.kill();
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));