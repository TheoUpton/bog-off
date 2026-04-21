//const fs = require('fs')
import { fileURLToPath } from 'url';
import { dirname, join} from 'path';
import fs from 'fs';

/**@type {Object.<string, import('./game').Game>}*/
export const GAMES = {}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const files = fs.readdirSync(__dirname)
    .filter(file => file.endsWith('.game.js') && file !== 'example.game.js');

await Promise.all(files.map(async file => {
    const path = "./" + file;
    const GameClass = (await import(path)).Game;
    GAMES[GameClass.gameName] = GameClass;
}));
Object.freeze(GAMES);

fs.writeFileSync(join(__dirname, "..",'public', 'game-keys.js'),
  `export const GAME_KEYS = Object.freeze(${JSON.stringify(Object.keys(GAMES))});`
);

export function gameKeys(){ return Object.keys(GAMES);}

export const gameAPIs = new Map();
for (const key of gameKeys()){
    const {ServerAPI , LobbyAPI, receiverKey} = await import(`../public/games/${key}/gameAPI.js`);
    const {ServerHandler} = await import(`./${key}.game.js`);
    gameAPIs.set(key, {ServerAPI, LobbyAPI, ServerHandler, receiverKey});
};
Object.freeze(gameAPIs);