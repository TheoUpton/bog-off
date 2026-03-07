const fs = require('fs')

/**
 *@type {Object.<string, import('./game')>}
 */
const GAMES = {}

fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.game.js') && file !== 'example.game.js')
    .forEach(file => {
        const GameClass = require(`./${file}`)
        GAMES[GameClass.gameName] = GameClass
    })
;

/**
 * @param {import('../lobby').Lobby} lobby 
 * @param {import('ws').RawData} message 
 * @returns 
 */
function selectGame(lobby, message){
    if(message.type != "game_select"){
        console.error(`Unknown game type: ${message.type}`);
        return false;
    }
    if(!(message.game in GAMES)){
        console.error(`Unknown game ${message.game}`);
        return false;
    }
    const Game = GAMES[message.game];
    const game = new Game(lobby.readOnly());
    lobby.setGame(game);
}
module.exports = selectGame