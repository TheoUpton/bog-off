const Game = require("./game");
const path = require('path')

class Example extends Game{
    static get gameName(){return path.basename(__filename, '.game.js')};
    /** @param {import('../lobby').Lobby} lobby */
    constructor(lobby){
        super(lobby)
    }

    receive(player, message) {}

    onEnd() {}
}

module.export = Example