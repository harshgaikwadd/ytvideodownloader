const express = require('express');
const cors = require('cors');
const ytdl = require('@distube/ytdl-core');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Fetch metadata
app.post('/api/info', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        if (!ytdl.validateURL(url)) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        const info = await ytdl.getInfo(url);
        const details = info.videoDetails;

        const seconds = parseInt(details.lengthSeconds || '0');
        const durationStr = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

        res.json({
            title: details.title || 'Unknown Title',
            thumbnail: details.thumbnails[details.thumbnails.length - 1]?.url || '',
            duration: durationStr
        });
    } catch (err) {
        console.error('Info Error:', err.message);
        res.status(500).json({ error: 'Failed to fetch video details. Ensure link is public.' });
    }
});

// Download video or audio
app.get('/api/download', async (req, res) => {
    const { url, quality } = req.query;
    if (!url || !quality) return res.status(400).send('Missing parameters');

    try {
        if (!ytdl.validateURL(url)) {
            return res.status(400).send('Invalid YouTube URL');
        }

        if (quality === 'mp3') {
            res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
            res.header('Content-Type', 'audio/mpeg');
            return ytdl(url, { filter: 'audioonly', quality: 'highestaudio' }).pipe(res);
        }

        const height = quality.replace('p', '');
        res.header('Content-Disposition', `attachment; filename="video_${quality}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        ytdl(url, {
            filter: format => format.container === 'mp4' && format.height <= parseInt(height),
            quality: 'highestvideo'
        }).pipe(res);

    } catch (err) {
        console.error('Download Error:', err.message);
        res.status(500).send('Download error');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));