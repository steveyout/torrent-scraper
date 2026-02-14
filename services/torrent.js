import path from 'path';
import fs from 'fs-extra';
import WebTorrent from 'webtorrent';

// HIGH-SPEED TRACKER LIST (Updated for 2026)
const trackerList = [
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://tracker.openbittorrent.com:6969/announce',
    'udp://9.rarbg.com:2810/announce',
    'udp://exodus.desync.com:6969/announce',
    'udp://open.stealth.si:80/announce',
    'udp://tracker.torrent.eu.org:451/announce',
    'udp://tracker.moeking.me:6969/announce',
    'udp://explodie.org:6969/announce',
    'udp://tracker1.bt.moack.co.kr:80/announce',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz'
];

const client = new WebTorrent({
    maxConns: 100,
    downloadLimit: -1,
    uploadLimit: -1,
    utp: true,
    webSeeds: true
});

const serverInstance = client.createServer();
serverInstance.server.listen(0);

class TorrentService {
    constructor() {
        this.basePath = path.join(import.meta.dirname, '../streams');
        fs.ensureDirSync(this.basePath);
    }

    async getStream(magnet, id) {
        const infoHash = this._parseInfoHash(magnet);
        let torrent = await client.get(infoHash);

        if (torrent) {
            if (torrent.ready) return this._handleReady(torrent);
            return new Promise((resolve) => {
                torrent.once('metadata', () => resolve(this._handleReady(torrent)));
            });
        }

        return new Promise((resolve, reject) => {
            const savePath = path.join(this.basePath, id);

            try {
                // We inject our high-speed trackers directly into the add options
                const newTorrent = client.add(magnet, {
                    path: savePath,
                    strategy: 'sequential',
                    announce: trackerList
                }, (torrent) => {
                    // PRIORITIZE THE HEAD AND TAIL (Speeds up player initialization)
                    // Most players read the first 10 and last 5 pieces to find duration/metadata
                    torrent.critical(0, 10);

                    resolve(this._handleReady(torrent));
                });

                newTorrent.on('error', (err) => reject(err));
            } catch (err) {
                reject(err);
            }
        });
    }

    _handleReady(torrent) {
        const file = torrent.files.find(f => f.name.match(/\.(mp4|mkv|avi|mov)$/i));
        if (!file) return { error: "No video file found" };

        // REAL-TIME SPEED LOGGING
        torrent.on('download', () => {
            const speed = (torrent.downloadSpeed / 1024 / 1024).toFixed(2);
            const peers = torrent.numPeers;
            const progress = (torrent.progress * 100).toFixed(1);

            // Use process.stdout.write for a single-line refreshing log
            process.stdout.write(`\r🚀 [Swarm Intelligence] Speed: ${speed} MB/s | Peers: ${peers} | Progress: ${progress}%   `);
        });

        const port = serverInstance.server.address().port;
        const internalUrl = `http://localhost:${port}${file.streamURL}`;
        return { internalUrl, fileName: file.name };
    }

    _parseInfoHash(magnet) {
        const match = magnet.match(/xt=urn:btih:([a-zA-Z0-9]+)/);
        return match ? match[1].toLowerCase() : magnet;
    }
}

export default new TorrentService();