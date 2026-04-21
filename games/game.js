export class Game {
    #lobby; #phase = Game.phases.empty; 
    /**@type {Set} */
    #game_set_acks = new Set(); 
    _initial_state = {global: undefined, user: new Map()}
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
        this._initial_state.user.clear();
    }
    game_init(){
        this.#phase = Game.phases.init;
        for(const user in [...this.#game_set_acks.values()])
            this.#send_initial_state(user)
    }
    game_set_ack(user){
        this.#game_set_acks.add(user);
        if(this.phase === Game.phases.init) 
            this.#send_initial_state(user);
    }
    #send_initial_state(user){
        user.api?.send.init_state(this._initial_state.global, this._initial_state.user.get(user));
    }
    /**@type {Set} */
    #game_loaded_acks = new Set();
    _game_loaded_ack(user){
        this.#game_loaded_acks.add(user);
        if(this.#game_loaded_acks.size < this.lobby.size - this.lobby.dcCount) return;
        this.#send_start();
    }
    #send_start(){
        this.#phase = Game.phases.active;
        this.#game_loaded_acks.clear();
        this.lobby.api.broadcast.start();
    }
    /**@param {Omit<import("../user.js").User, "api"> & {api: import("../public/shared/base-gameAPI.js").ServerAPI}} user  */
    user_reconnected(user){
        if(!user.isPlayer){} 
        switch(this.phase){
            case Game.phases.init: return user.api.send.init_state(this._initial_state);
        }
    }
    _gameOver(){}
}
import {AbstractServerHandler} from "../public/shared/base-gameAPI.js";
import {Handler} from "../public/shared/API.js";
export class ServerHandler extends AbstractServerHandler(Handler){
    /**@type {Game} */ get game(){return super.target;}
    state_set(){this.game._game_loaded_ack(this.user);}
}