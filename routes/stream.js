import express from 'express';
import youplex from '../providers/Youplex.js';
import torrentService from '../services/torrent.js';
import ffmpeg from 'fluent-ffmpeg';
import os from 'os';

const router = express.Router();

router.get('/play', async (req, res) => {
    const { tmdbId } = req.query;

    try {
        const results = await youplex.search(tmdbId);
        if (!results || results.length === 0) return res.status(404).json({ error: "No results" });

        /** * 🎯 SMART SELECTION LOGIC
         * 1. Sort by extension: MP4 is better than MKV for CPU.
         * 2. Sort by size: Smaller files (under 2GB) are faster to start.
         */
        const sortedResults = results.sort((a, b) => {
            const isAMp4 = a.name?.toLowerCase().endsWith('.mp4');
            const isBMp4 = b.name?.toLowerCase().endsWith('.mp4');

            // Priority 1: MP4 vs MKV
            if (isAMp4 && !isBMp4) return -1;
            if (!isAMp4 && isBMp4) return 1;

            // Priority 2: Smallest size (assuming size is provided in results)
            return (a.size || 0) - (b.size || 0);
        });

        const selected = sortedResults[0];
        const { internalUrl, fileName, error } = await torrentService.getStream(selected.magnet, tmdbId);

        if (error) return res.status(404).json({ error });

        // Handle based on file type
        if (fileName.toLowerCase().endsWith('.mp4')) {
            // 🔥 ZERO CPU PATH: Direct redirect
            console.log(`✅ Direct streaming MP4: ${fileName}`);
            return res.redirect(internalUrl);
        } else {
            // ⚠️ CPU INTENSIVE PATH: Transcoding MKV
            console.log(`🌀 Transcoding MKV to MP4: ${fileName}`);
            res.contentType('video/mp4');

            // Limit threads based on system load to protect other users
            const cpuCores = os.cpus().length;
            const safeThreads = cpuCores > 2 ? 2 : 1;

            ffmpeg(internalUrl)
                .format('mp4')
                .videoCodec('libx264')
                .audioCodec('aac')
                .outputOptions([
                    '-movflags frag_keyframe+empty_moov+faststart',
                    '-preset ultrafast', // Use "ultrafast" to minimize CPU load
                    '-tune zerolatency',
                    `-threads ${safeThreads}`,
                    '-crf 28' // Slightly higher compression = lower CPU & bandwidth
                ])
                .on('error', (err) => {
                    if (!err.message.includes('SIGKILL')) console.error('FFmpeg error:', err.message);
                })
                .pipe(res, { end: true });
        }
    } catch (err) {
        console.error('Stream Error:', err);
        res.status(500).json({ error: "Streaming failed" });
    }
});

export default router;