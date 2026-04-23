import {randomUUID} from "crypto";

import {Lobby} from "../public/shared/lobby.js";
import { ServerHandler, ServerAPI, receiverKey, LobbyAPI } from "../public/shared/LobbyAPI.js";
import { default as config} from "../devconfig.js";
import { GAMES, gameAPIs } from "./games/gameRegistry.js";


const isDev = process.env.NODE_ENV !== 'production';

export class ServerLobby extends Lobby {
    #api;
    get api(){return this.#api;}
    #broadcaster = (message, ...excludedUsers) => {
        this.users.forEach(user => {
            if(excludedUsers.includes(user)) return;
            if(user.isConnected) user.api?._sender(message);
        })
    };
    isReady(){return [...this.players.values()].every(player => player.ready)}
    /**@typedef {Omit<import("../public/shared/API.js"), "Handler"> & {ServerHandler: typeof import("../public/shared/API.js").Handler} & {target: *}} API */
    /**@type {API}*/
    #userAPI;
    /**@param {Object} param0 @param {API} param0.API @param {typeof ServerLobby} param0.LobbyClass*/
    _generateLobbyCopy({API, LobbyClass, id}){
        const copy = LobbyClass ? new LobbyClass(id): new ServerLobby();
        if(!API.target) API.target = copy;
        const lobbyAPI = new API.LobbyAPI({broadcaster: copy.#broadcaster});
        API.ack_code = lobbyAPI._ack_code;
        copy.#userAPI = API;
        copy.#api = lobbyAPI;
        return copy;
    }
    /**@param {import("../public/shared/user.js").User} user  */
    _generateUserProxy(user){
        const proxy = user.proxy;
        const {ServerAPI, ServerHandler, receiverKey, target, ack_code} = this.#userAPI;
        const oldAPI = user.api;
        const sender = oldAPI.wrapSender(receiverKey);
        const handler = new ServerHandler(proxy, target);
        const api = new ServerAPI({sender, handler, ack_code});
        proxy._api = api;
        oldAPI.registerReceivable(receiverKey, api);
        return proxy;
    }
}
export class MainLobby extends ServerLobby{
    #id;
    /**@type {import("../public/shared/LobbyAPI.js").LobbyAPI} */
    constructor(id){
        super();
        this.#id = id;
    }
    get id(){return this.#id;}
    /**@type {import("../public/shared/LobbyAPI.js").LobbyAPI} */
    get api(){return super.api;}
    addUser(user){
        const proxy = super.addUser(user);
        proxy.ready = false;
        proxy.isConnected = true;
        if(isDev) proxy.game_selected = GAMES[config.autoGame];
        return proxy;
    }
    reconnectUser(user){
        super.reconnectUser(user);
        const proxy = this.getUser(user);
        proxy.isConnected = true;
    }
    disconnectedUser(user){
        const proxy = this.getUser(user);
        proxy.ready = false;
        super.disconnectedUser(user);
    }
    #game;
    /** @type {import('../games/game.js').Game} */
    get game(){return this.#game;}

    /** returns true if there no active players in the lobby */
    isEmpty(){return ![...this.players].some(player => player.isConnected)}
    #randomPlayer(){
        const players = [...this.players.values()];
        return players.length <1 ? null : players[Math.floor(Math.random() * players.length)];
    }
    /** */
    _setGame(){
        let player = this.#randomPlayer();
        while(player.game_selected == null) player = this.#randomPlayer();
        const gameClass = player.game_selected;
        this.#setGameInstance(gameClass);
        //this.api.broadcast.game_set(this.game.NAME);
    }
    /**@type {Map<(typeof import("../games/game.js").Game), import("../games/game.js").Game>} */
    #gameInstances = new Map();
    game_set_ack(user, gameName){
        if(gameName != this.game.NAME) return console.error(`Ack mismatch received`);
        //this.#informListener(this.game_set_ack.name, user)
    }
    /** @param {typeof import("../games/game.js").Game} gameClass */
    #setGameInstance(gameClass){
        //this.#game_set_acks = new set();
        this.api.broadcast.game_set(gameClass.gameName);
        this.#game = this.#gameInstances.get(gameClass) ?? this.#instantiateGame(gameClass);
        this.game.game_init();
    }
    /** @param {typeof import("../games/game.js").Game} gameClass */
    #instantiateGame(gameClass){
        const game = new gameClass();        
        /** @type {import("../public/shared/base-gameAPI.js") & {ServerHandler: typeof import("../games/game.js").ServerHandler}}*/
        const {ServerAPI, LobbyAPI, ServerHandler, receiverKey} = gameAPIs.get(game.NAME); 
        const API = {ServerAPI, LobbyAPI, ServerHandler, receiverKey, target: game};
        const lobbyProxy = this.createProxy({API});
        game._lobby = lobbyProxy;
        this.#gameInstances.set(gameClass, game);
        return game;
    }
    toJSON(){
        return {
            id: this.id,
            ...super.toJSON()
        }
    }
}
export class _LobbyHandler extends ServerHandler{
    /**@type {MainLobby} */ get lobby(){return super.target;}
    /**@type {import("../public/shared/LobbyAPI.js").ServerAPI} */ get api(){return super.api;}
    /**@type {import("../public/shared/user.js").User} */ get user(){return super.user;}

    leave_lobby(){
        this.lobby.api.broadcast.user_left();
        this.lobby.removeUser(this.user);
        if(this.lobby.isEmpty()) Lobbies.delete(this.lobby.id);
        if(this.lobby.isReady() && !this.lobby.isEmpty()) startGame(this.lobby);
    }
    user_update({attribute, value}){
        switch (attribute){
            case "ready": 
                if(!(value===true || value === false)) 
                    return console.error(`Invalid ready state ${value} sent from ${this.user._privateId}`);
                //if(this.lobby.readyPlayer(this.user, value) === false) return;
                if(this.user.ready == value) return false;
                if(!this.user.game_selected) return false;
                this.user.ready = value;
                break;
            case "game_selected": 
                if(!(value in GAMES)) 
                    return console.error(`Invalid game selection "${value}" sent from id:${this.user._privateId}`);
                this.user._game_selected =  GAMES[value]; 
                break;
            default: return;
        }
        if(!this.lobby) return;
        this.lobby.api.broadcast.user_update(this.user, attribute, value);
        if(attribute != "ready" || value !== true) return;
        if(!this.lobby.isReady()) return;
        this.lobby._setGame();
    }
    game_set_ack(gameName){
        this.lobby.game_set_ack(this.user, gameName)
    }
}

export const Lobbies = (() => {
    /**@type {Map<UUID, ServerLobby>} */
    const lobbies = new Map();
    let lobbyCount = 0;
    function generateId() {
        if (isDev) return String(++lobbyCount);
        /**@type {UUID} */
        let id;
        do {id = randomUUID();} while (lobbies.has(id));
        return id;
    };
    const LobbyClass = MainLobby;
    const API = {ServerAPI, receiverKey, ServerHandler: _LobbyHandler, LobbyAPI};
    lobbies.create = () => {
        const id = generateId();
        const lobby = MainLobby.prototype._generateLobbyCopy.call(null, {API, LobbyClass, id});
        lobbies.set(id, lobby);
        return lobbies.get(id);
    }
    return lobbies;
})();