class Game {
    #lobby; #emitters = new Map();
    /** @param {import('../lobby').Lobby} lobby */
    constructor(lobby) {
        if (new.target === Game) throw new Error('Game is abstract');
        if (!lobby) throw new Error("Lobby cannot be empty");
        this.#lobby = lobby
    }
    /** @returns {import('../lobby').Lobby} */
    get lobby(){return this.#lobby;}
    /**
     * @param {import('../lobby').Player} player 
     * @param {import('ws').RawData} message 
     */
    receiveMessage(player, message) {throw new Error('receive() must be implemented');}

    listen(emitter, method, callback) {
        emitter.addListener(method, callback);
        if (!this.#emitters.has(emitter)) this.#emitters.set(emitter, new Set());
        this.#emitters.get(emitter).add({ method, callback });
    }
    unlisten(emitter, method, callback) {
        emitter.removeListener(method, callback);
        const listeners = this.#emitters.get(emitter);
        if (!listeners) return;
        const entry = [...listeners].find(l => l.method === method && l.callback === callback);
        if (entry) listeners.delete(entry);
        if (listeners.size === 0) this.#emitters.delete(emitter);
    }
    deafen(){
        this.#emitters.forEach((listeners, emitter) => {
            listeners.forEach(({ method, callback }) => emitter.removeListener(method, callback));
        });
        this.#emitters.clear();
    }
}

module.exports = Game