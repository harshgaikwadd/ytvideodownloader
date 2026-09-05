const express = require('express');
const cors = require('cors');
const { YtDlp } = require('@abdullah2993/ytdlp-nodejs');

const app = express();
const ytdlp = new YtDlp();

// Environment port for Render / Heroku compatibility
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Fetch metadata
app.post('/api/info', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const info = await ytdlp.getInfoAsync(url);
        res.json({
            title: info.title || 'Unknown Title',
            thumbnail: info.thumbnail || '',
            duration: info.duration_string || info.duration || 'N/A',
        });
    } catch (err) {
        console.error('Info Error:', err);
        res.status(500).json({ error: 'Failed to fetch video details' });
    }
});

// Download video or audio
app.get('/api/download', async (req, res) => {
    const { url, quality } = req.query;
    if (!url || !quality) return res.status(400).send('Missing parameters');

    try {
        if (quality === 'mp3') {
            res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
            res.header('Content-Type', 'audio/mpeg');
            
            const streamBuilder = ytdlp.stream(url, {
                format: 'bestaudio/best'
            });
            return streamBuilder.pipe(res);
        }

        res.header('Content-Disposition', `attachment; filename="video_${quality}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        // Extract numeric height (e.g., '1080p' -> '1080')
        const height = quality.replace('p', '');
        
        const streamBuilder = ytdlp.stream(url, {
            format: `bestvideo[height<=${height}]+bestaudio/best`
        });
        
        streamBuilder.pipe(res);
    } catch (err) {
        console.error('Download Error:', err);
        res.status(500).send('Download error');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));