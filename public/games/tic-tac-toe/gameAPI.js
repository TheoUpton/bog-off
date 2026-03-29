import * as API from "../../shared/base-gameAPI.js";

export class ServerAPI extends API.ServerAPI{
    /**@param {ServerHandler} handler */
    constructor(sender, handler, broadcaster, ack_code){super(sender, handler, broadcaster, ack_code);}
    get send(){
        const sender = this.sender;
        const superSend = super.send;
        //const clientProto = ClientHandler.prototype;
        return {
            ...superSend,
        };
    }
    get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        //const clientProto = ClientHandler.prototype;
        const client = this.client;
        return {
            ...superBroadcast,
            
        }
    }
    get receive(){
        /**@type {import("../../../games/tic-tac-toe.game.js").ServerHandler} //../../ games/tic-tac-toe.game.js").ServerHandler} */
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
    receive_turn(row, col){}
}
const serverProto = AbstractServerHandler(class{}).prototype;
export class LobbyAPI extends API.LobbyAPI{
    /**@param {import("../../../games/tic-tac-toe.game.js")} handler */
    constructor(lobby, broadcaster, ack_code){super(lobby, broadcaster, ack_code);}
    get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        return {
            ...superBroadcast,
            /** @param {import("../../shared/lobby.js").Client} player  @param {0 | 1 | 2} col  @param {0 | 1 | 2} row  */
            update_state: (currentPlayer, row, col, nextPlayer) => broadcaster({type: clientProto.update_state.name, currentPlayer, move:{row, col}, nextPlayer}),
            result_tie: () => broadcaster({type: clientProto.result_tie.name}),
            result_win: (client, result) => broadcaster({type: clientProto.result_win.name, winner: client, result}),
        } 
    }
}
export class ClientAPI extends API.ClientAPI{
    /**@param {import("./game.js").ClientHandler} handler */
    constructor(sender, handler){super(sender, handler);}
    get send() {
        const sender = this.sender;
        const superSend = super.send;
        //const serverProto = ServerHandler.prototype;
        return {
            ...superSend,
            player_move: (row, col) => sender({type: serverProto.receive_turn.name, move:{row, col}}),
        };
    }
    get receive(){
        /**@type {import("./game.js").ClientHandler} */
        const handler = this.handler;
        return (m) => {
            if(super.receive(m) !== false) return true;
            switch(m.type){
                case handler.update_state.name: handler.update_state(m.currentPlayer, m.move.row, m.move.col, m.nextPlayer); break; 
                case handler.result_tie.name: handler.result_tie(); break;
                case handler.result_win.name: handler.result_win(m.client, m.result); break;
                default: return false;
            }
            return true;
        };
    }
}
export const AbstractClientHandler = (Handler) => class extends Handler{//}
//export class ClientHandler extends BaseClientHandler{
    /**@type {ClientAPI} */
    api;//get api(){return super.api;}
    /**@type {import("./game.js").Game}*/
    game;
    update_state(currentPlayer, row, col, nextPlayer){}
    result_tie(){}
    result_win(client, result){}
    //init_state(ack_code, state){this.api.send.state_set(ack_code, state)}
}
const clientProto = AbstractClientHandler(class {}).prototype;