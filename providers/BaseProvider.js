export default class BaseProvider {
    constructor(name) {
        this.name = name;
    }

    async search(id, lang) {
        throw new Error(`Search method not implemented for ${this.name}`);
    }
}