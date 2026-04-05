import * as API from "../../shared/base-gameAPI.js";

export class ServerAPI extends API.ServerAPI{
    constructor(sender, handler, broadcaster){super(sender, handler, broadcaster);}
    get send(){
        const sender = this.sender;
        const superSend = super.send;
        return {
            ...superSend,
            
        };
    }
    get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        const client = this.client;
        return {
            ...superBroadcast,
            
        }
    }
    get receive(){
        /**@type {import("../../../games/bog-off.game.js").ServerHandler} */
        const handler = this.handler;
        return (message) => {
            if(super.receive(message) !== false) return true;
            switch(message.type){
                case handler.receive_turn.name: handler.receive_turn(message.move.row, message.move.col); break;
                default: return false
            }
            return true;
        }
    }
}
export const AbstractServerHandler = (Handler) => class extends Handler{
    /**@type {ServerAPI} */ api;
    /**@type {import("../../../games/bog-off.game.js").Game} */ game;
}
const serverProto = AbstractServerHandler(class{}).prototype;
export class LobbyAPI extends API.LobbyAPI{
    constructor(lobby, broadcaster, ack_code){super(lobby, broadcaster, ack_code);}
    get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        return {
            ...superBroadcast,
            results: () => broadcaster({type:clientProto.receive_results.name}),
        } 
    }
}
export class ClientAPI extends API.ClientAPI{
    constructor(sender, handler){super(sender, handler);}
    get send() {
        const sender = this.sender;
        const superSend = super.send;
        return {
            ...superSend,
            
        };
    }
    get receive(){
        /**@type {import("./game.js").ClientHandler} */
        const handler = this.handler;
        return (message) => {
            if(super.receive(message) !== false) return true;
            switch(message.type){
                default: return false;
            }
            return true;
        };
    }
}
export const AbstractClientHandler = (Handler) => class extends Handler{
    /**@type {ClientAPI} */ api;
    /**@type {import("./game.js").Game}*/ game;
    receive_results(){}
}
const clientProto = AbstractClientHandler(class {}).prototype;