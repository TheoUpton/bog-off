import {Client} from "../public/shared/lobby.js"
export class Game {
    #lobby; #phase = Game.phases.empty; 
    /**@type {Set} */
    #game_set_acks = new Set();//#emitters = new Map(); 
    _initial_state = {global: undefined, client: new Map()}
    static phases = Object.freeze({
        empty: new Number(0),
        init: new Number(1),
        active: new Number(2),
        ended: new Number(3),
    });
    constructor() {
        if (new.target === Game) throw new Error('Game is abstract');
        this.clear();
    }
    /** @returns {Omit<import('../lobby').ServerLobby, "api"> & {api:import("../public/shared/base-gameAPI.js").LobbyAPI}}} */
    get lobby(){return this.#lobby;}
    set _lobby(lobby){this.#lobby = lobby;}
    get phase(){return this.#phase;}
    //set _phase(phase){this.#phase = phase;}
    get NAME(){return this.constructor.gameName;}
    get MIN_PLAYERS(){return this.constructor.minPlayers;}
    get MAX_PLAYERS(){return this.constructor.maxPlayers;}

    clear(){
        this.#game_set_acks.clear();
        this.#game_loaded_acks.clear();
        this.#phase = Game.phases.empty;
    }
    reset(){
        this._initial_state.global = undefined;
        this._initial_state.client.clear();
    }
    game_init(){
        this.#phase = Game.phases.init;
        for(const client in [...this.#game_set_acks.values()])
            this.#send_initial_state(client)
    }
    game_set_ack(client){
        this.#game_set_acks.add(client);
        if(this.phase === Game.phases.init) 
            this.#send_initial_state(client);
    }
    #send_initial_state(client){
        client.api?.send.init_state(this._initial_state.global, this._initial_state.client.get(client));
    }
    /**@type {Set} */
    #game_loaded_acks = new Set();
    _game_loaded_ack(client){
        this.#game_loaded_acks.add(client);
        if(this.#game_loaded_acks.size < this.lobby.size - this.lobby.dcCount) return;
        this.#send_start();
    }
    #send_start(){
        this.#phase = Game.phases.active;
        this.#game_loaded_acks.clear();
        this.lobby.api.broadcast.start();
    }
    /**@param {Omit<import("../lobby.js").ServersideClient, "api"> & {api: import("../public/shared/base-gameAPI.js").ServerAPI}} client  */
    client_reconnected(client){
        if(client.type !== Client.type.player){} 
        switch(this.phase){
            case Game.phases.init: return client.api.send.init_state(this._initial_state);
        }
    }
    _gameOver(){}
}
import {AbstractServerHandler} from "../public/shared/base-gameAPI.js";
import {ServerHandler as BaseServerHandler} from "../public/shared/API.js";
export class ServerHandler extends AbstractServerHandler(BaseServerHandler){
//}
//export class Handler extends ServerHandler{
    #game;
    constructor(game){super(); this.#game = game;}    
    /**@returns  {Game}  */
    get game(){return this.#game;}
    state_set(){this.game._game_loaded_ack(this.client);}
}