import {Game as BaseGame, ServerHandler as BaseHandler} from "./game.js";
import {AbstractServerHandler as AbstractHandler} from "../public/games/example/gameAPI.js";

import { fileURLToPath } from 'url';
import { basename } from 'path';
const __filename = fileURLToPath(import.meta.url);
const gameName = basename(__filename, '.game.js');

const isDev = process.env.NODE_ENV !== 'production';

export class Game extends BaseGame{
    static get minPlayers(){return 2};
    static get maxPlayers(){return 2};
    static get gameName(){return gameName};
    /**@type {Omit<import('../lobby').ServerLobby, "api"> & {api:import("../public/games/example/gameAPI.js").LobbyAPI}} */
    lobby;
    game_init(){
        super.game_init();
    }
} 

//const {ServerHandler: Handler} = await import(`../public/games/${gameName}/gameAPI.js`);
export class ServerHandler extends AbstractHandler(BaseHandler){
    constructor(game){super(game);}
    /**@type {Game} */ game;
}