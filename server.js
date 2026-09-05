const express = require('express');
const cors = require('cors');
const play = require('play-dl');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('API is running smoothly!');
});

// Fetch metadata
app.post('/api/info', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        // Validate link type
        const ytType = play.yt_validate(url);
        if (!ytType || ytType !== 'video') {
            return res.status(400).json({ error: 'Invalid YouTube video URL' });
        }

        const videoInfo = await play.video_info(url);
        const details = videoInfo.video_details;

        res.json({
            title: details.title || 'Unknown Title',
            thumbnail: details.thumbnails[details.thumbnails.length - 1]?.url || '',
            duration: details.durationRaw || 'N/A'
        });
    } catch (err) {
        console.error('Info Error:', err);
        res.status(500).json({ error: 'Failed to fetch video details. Ensure link is public.' });
    }
});

// Download stream
app.get('/api/download', async (req, res) => {
    const { url, quality } = req.query;
    if (!url || !quality) return res.status(400).send('Missing parameters');

    try {
        if (quality === 'mp3') {
            res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
            res.header('Content-Type', 'audio/mpeg');
            
            const stream = await play.stream(url, { quality: 0 }); // Highest audio quality
            return stream.stream.pipe(res);
        }

        res.header('Content-Disposition', `attachment; filename="video_${quality}.mp4"`);
        res.header('Content-Type', 'video/mp4');

        const stream = await play.stream(url, { quality: 2 }); // Video stream
        stream.stream.pipe(res);
    } catch (err) {
        console.error('Download Error:', err);
        res.status(500).send('Download error');
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));