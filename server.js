const express = require('express');
const cors = require('cors');
const youtubedl = require('youtube-dl-exec');

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
        const output = await youtubedl(url, {
            dumpSingleJson: true,
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: ['referer:youtube.com', 'user-agent:googlebot']
        });

        res.json({
            title: output.title || 'Unknown Title',
            thumbnail: output.thumbnail || (output.thumbnails && output.thumbnails[0]?.url) || '',
            duration: output.duration_string || `${Math.floor((output.duration || 0) / 60)}:${(output.duration || 0) % 60}`
        });
    } catch (err) {
        console.error('Extraction Error:', err);
        res.status(500).json({ error: 'Failed to fetch video details. Ensure link is public.' });
    }
});

// Download stream
app.get('/api/download', (req, res) => {
    const { url, quality } = req.query;
    if (!url || !quality) return res.status(400).send('Missing parameters');

    let formatOption = 'best';
    if (quality === 'mp3') {
        res.header('Content-Disposition', 'attachment; filename="audio.mp3"');
        res.header('Content-Type', 'audio/mpeg');
        formatOption = 'bestaudio/best';
    } else {
        const height = quality.replace('p', '');
        res.header('Content-Disposition', `attachment; filename="video_${quality}.mp4"`);
        res.header('Content-Type', 'video/mp4');
        formatOption = `bestvideo[height<=${height}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best`;
    }

    const subprocess = youtubedl.exec(url, {
        format: formatOption,
        output: '-'
    });

    subprocess.stdout.pipe(res);

    req.on('close', () => {
        subprocess.kill();
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));