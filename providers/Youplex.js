import axios from 'axios';
import BaseProvider from './BaseProvider.js'; // Extension is mandatory in ESM

class Youplex extends BaseProvider {
    constructor() {
        super('Youplex');
        this.apiUrl = 'https://fusme.link/movie';
    }

    /**
     * @param {string} tmdbId - The TMDB ID of the movie
     * @param {string} lang - Language code (default 'en')
     */
    async search(tmdbId, lang = 'en') {
        try {
            // Fetch movie data from the Youplex API
            const { data } = await axios.get(`${this.apiUrl}/${tmdbId}`);

            if (!data || !data.torrents || !data.torrents[lang]) {
                console.log(`\x1b[33m%s\x1b[0m`, `[Youplex] No torrents found for TMDB: ${tmdbId} in language: ${lang}`);
                return [];
            }

            const languageTorrents = data.torrents[lang];

            // Convert the nested quality object into a sorted array
            return Object.keys(languageTorrents).map(quality => {
                const torrent = languageTorrents[quality];

                // 🛠️ Quick Fix: Replace HTML encoded &amp; in magnets if they exist
                const cleanMagnet = torrent.url ? torrent.url.replace(/&amp;/g, '&') : '';

                return {
                    title: torrent.title,
                    magnet: cleanMagnet,
                    seeders: torrent.seed || 0,
                    peers: torrent.peer || 0,
                    size: torrent.filesize,
                    quality: quality,
                    source: this.name,
                    provider: torrent.provider
                };
            }).sort((a, b) => b.seeders - a.seeders); // Prioritize health (seeds)

        } catch (error) {
            console.error(`\x1b[31m%s\x1b[0m`, `[Youplex] Error fetching from API: ${error.message}`);
            return [];
        }
    }
}

// Export as default for ESM
export default new Youplex();