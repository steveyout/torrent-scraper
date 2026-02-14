const YouplexProvider = require('./YouplexProvider');


class ProviderManager {
    constructor() {
            this.providers = [ YouplexProvider ];
    }

    async searchAll(query) {
        // Search all providers in parallel
        const results = await Promise.all(
            this.providers.map(p => p.search(query).catch(() => []))
        );
        // Flatten into one list and sort by seeders
        return results.flat().sort((a, b) => b.seeds - a.seeds);
    }
}
module.exports = new ProviderManager();