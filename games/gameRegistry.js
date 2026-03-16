//const fs = require('fs')
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

/**
 *@type {Object.<string, import('./game')>}
 */
const GAMES = {}

/**fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.game.js') && file !== 'example.game.js')
    .forEach(file => {
        const GameClass = import (`./${file}`)
        GAMES[GameClass.gameName] = GameClass
    })
;*/

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const files = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.game.js') && file !== 'example.game.js');

await Promise.all(files.map(async file => {
    const GameClass = (await import(`./${file}`)).default;
    GAMES[GameClass.gameName] = GameClass;
}));

/**
 * @param {import('../lobby').Player} player 
 * @param {import('ws').RawData} message 
 * @returns 
 */
function selectGame(player, message){
    if(message.type != "game_select"){
        console.error(`Unknown game type: ${message.type}`);
        return false;
    }
    if(!(message.game in GAMES)){
        console.error(`Unknown game ${message.game}`);
        return false;
    }
    player.gameSelected = GAMES[message.game];
    return true;
}

export function gameKeys(){ return Object.keys(GAMES);}

//module.exports = {selectGame, gameKeys}