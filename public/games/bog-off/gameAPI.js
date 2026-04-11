import * as API from "../../shared/base-gameAPI.js";

export class ServerAPI extends API.ServerAPI{
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
                case handler.receive_answers.name: handler.receive_answers(message.answers); break;
                default: return false
            }
            return true;
        }
    }
}
export const AbstractServerHandler = (Handler) => class extends Handler{
    /**@type {ServerAPI} */ api;
    /**@type {import("../../../games/bog-off.game.js").Game} */ get game(){return super.game};
    receive_answers(answers){}
}
const serverProto = AbstractServerHandler(class{}).prototype;
export class LobbyAPI extends API.LobbyAPI{
    constructor(lobby, broadcaster, ack_code){super(lobby, broadcaster, ack_code);}
    get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        return {
            ...superBroadcast,
            results: (results) => broadcaster({type:clientProto.receive_results.name, results}),
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
            answers: (answers) => sender({type: serverProto.receive_answers.name, answers}),
        };
    }
    get receive(){
        /**@type {import("./game.js").ClientHandler} */
        const handler = this.handler;
        return (message) => {
            if(super.receive(message) !== false) return true;
            switch(message.type){
                case handler.receive_results.name: handler.receive_results(message.results); break;
                default: return false;
            }
            return true;
        };
    }
}
export const AbstractClientHandler = (Handler) => class extends Handler{
    /**@type {ClientAPI} */ api;
    /**@type {import("./game.js").Game}*/ game;
    receive_results(results){}
}
const clientProto = AbstractClientHandler(class {}).prototype;