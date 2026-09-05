const express = require('express');
const cors = require('cors');
const { YtDlp } = require('@abdullah2993/ytdlp-nodejs');

const app = express();
const ytdlp = new YtDlp();

app.use(cors());
app.use(express.json());

// Fetch metadata
app.post('/api/info', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const info = await ytdlp.getInfoAsync(url);
        res.json({
            title: info.title,
            thumbnail: info.thumbnail,
            duration: info.duration_string,
        });
    } catch (err) {
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
            const streamBuilder = ytdlp.stream(url, {
                format: {
                    filter: 'audioonly',
                    type: 'mp3'
                }
            });
            return streamBuilder.pipe(res);
        }

        res.header('Content-Disposition', `attachment; filename="video_${quality}.mp4"`);
        const streamBuilder = ytdlp.stream(url, {
            format: {
                filter: 'mergevideo',
                quality: quality,
                type: 'mp4'
            }
        });
        streamBuilder.pipe(res);
    } catch (err) {
        res.status(500).send('Download error');
    }
});

app.listen(5000, () => console.log('Server running on port 5000'));