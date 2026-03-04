const Game = require("./game");

class Example extends Game{
    static get gameName(){return "example"};
    /** @param {import('../lobby').Lobby} lobby */
    constructor(lobby){
        super(lobby)
    }

    receive(player, message) {}

    onEnd() {}
}

module.export = Example