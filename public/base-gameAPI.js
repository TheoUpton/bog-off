import * as API from "./API.js";

export class ServerAPI extends API.ServerAPI{
    /**@param {ServerHandler} handler */
    constructor(sender, handler, broadcaster, ack_code){super(sender, handler, broadcaster, ack_code);}
    get send(){
        const sender = this.sender;
        const superSend = super.send;
        //const clientProto = ClientHandler.prototype;
        const ack_code = this._ack_code;
        return {
            ...superSend,
            /**@param {Object} state @return {void}*/
            init_state: (global, client) => sender({type: clientProto.init_state.name, ack_code: ack_code.getCurrent(), state:{global, client}}),
            start: () => sender({type:clientProto.start.name}),
        };
    }
    /*get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        //const clientProto = ClientHandler.prototype;
        const client = this.client;
        return {
            ...superBroadcast,
        }
    }*/
    get receive(){
        /**@type {import("../games/game.js").ServerHandler} */
        const handler = this.handler;
        return (message) => {
            if(super.receive(message) !== false) return true;
            switch(message.type){
                case handler.state_set.name: return handler.state_set();
            }
        }
    }
}
export const AbstractServerHandler = (Handler) => class extends Handler {
//}
//export class ServerHandler extends API.ClientHandler{
    //#game;
    //constructor(game){super(); this.#game = game;}
    ///**@returns  {Game}  */
    //get game(){return this.#game;}
    /**@type {ServerAPI} */
    get api(){return this._api;}
    state_set(){}
}
const serverProto = AbstractServerHandler(class {}).prototype;

export class LobbyAPI extends API.LobbyAPI{
    constructor(lobby, broadcaster, ack_code){super(lobby, broadcaster, ack_code);}
    get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        //const clientProto = ClientHandler.prototype;
        const ack_code = this._ack_code;
        return {
            ...superBroadcast,
            init_state: (state) => broadcaster({type: clientProto.init_state.name, ack_code: ack_code.generate(), state}),
            start: () => broadcaster({type:clientProto.start.name}),
        }
    }
}

export class ClientAPI extends API.ClientAPI{
    /**@param {import("./base-game.js").ClientHandler} handler */
    constructor(sender, handler){super(sender, handler);}
    get send() {
        const sender = this.sender;
        const superSend = super.send;
        //**@type {import("../games/game.js").Handler} */
        //const serverProto = this.#abstractHandler.prototype//ServerHandler.prototype;
        return {
            ...superSend,
            state_set: (ack_code, state) => sender({type:serverProto.state_set.name, ack_code, state})
        };
    }
    get receive(){
        /**@type {import("./base-game.js").ClientHandler} */
        const handler = this.handler;
        return (message) => {
            if(super.receive(message) !== false) return true;
            switch(message.type){
                case handler.init_state.name: handler.init_state(message.ack_code, message.state); break;//return true;
                case handler.start.name: handler.start(); break;//return true;
                default: return false;
            }
            return true;
        };
    }
}
export const AbstractClientHandler = (Handler) => class extends Handler{//} 
//export class ClientHandler extends API.ClientHandler{
    /**@type {ClientAPI} */
    api;//get api(){return super.api;}
    /**@type {import("./base-game.js").Game} */
    game;
    //get game(){return this.#game;}
    //set game(game){this.#game = game;}
    init_state(ack_code, state){this.api.send.state_set(ack_code, state)}
    start(){}
}
const clientProto = AbstractClientHandler(class {}).prototype;