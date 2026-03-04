class Game {
    #lobby;
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
    receive(player, message) {throw new Error('receive() must be implemented');}

    onEnd() {throw new Error('onEnd() must be implemented');}
}

module.exports = Game