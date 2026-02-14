import express from 'express';
import youplex from '../providers/Youplex.js';
import torrentService from '../services/torrent.js';
import ffmpeg from 'fluent-ffmpeg';

const router = express.Router();

router.get('/play', async (req, res) => {
    const { tmdbId, quality } = req.query;

    try {
        const results = await youplex.search(tmdbId);
        const selected = results[0];

        const { internalUrl, fileName, error } = await torrentService.getStream(selected.magnet, tmdbId);
        if (error) return res.status(404).send(error);

        if (fileName.toLowerCase().endsWith('.mkv')) {
            res.contentType('video/mp4');

            ffmpeg(internalUrl)
                .format('mp4')
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-movflags frag_keyframe+empty_moov+faststart', // faststart helps browser playback
                    '-preset ultrafast', // Fastest possible encoding
                    '-tune zerolatency', // Optimized for streaming
                    '-threads 0',        // Use all CPU cores
                    '-crf 23'            // Standard quality (lower starts faster than higher)
                ])
                .on('start', () => console.log('▶️ Stream started!'))
                .on('error', (err) => {
                    if (!err.message.includes('SIGKILL')) console.error(err);
                })
                .pipe(res, { end: true });
        } else {
            // MP4 is already fast because we use Redirect
            res.redirect(internalUrl);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
});

export default router;