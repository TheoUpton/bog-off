import * as API from "../../shared/base-gameAPI.js";

export const receiverKey = API.receiverKey + "tic-tac-toe";

export class LobbyAPI extends API.LobbyAPI{
    get broadcast(){return this.#broadcast;}
    #broadcast = {
        update_state: (currentPlayer, row, col, nextPlayer) => this._broadcaster({type: clientProto.update_state.name, currentPlayer, move:{row, col}, nextPlayer}),
        result_tie: () => this._broadcaster({type: clientProto.result_tie.name}),
        result_win: (client, result) => this._broadcaster({type: clientProto.result_win.name, winner: client, result}),
    };
} 

export class ServerAPI extends API.ServerAPI{
    get send(){return this.#send;}
    #send = {
        ...super.send,
    };
}
export const AbstractServerHandler = (Handler) => class extends Handler{
    /**@type {ServerAPI} */ get api(){super.api;}
    /**@type {import("../../games/tic-tac-toe").Game} */ get game(){super.target;}
    receive_turn({move:{row,col}}){}
}
const serverProto = AbstractServerHandler(class{}).prototype;

export class ClientAPI extends API.ClientAPI{
    get send(){return this.#send;}
    #send = {
        ...super.send,
        player_move: (row, col) => sender({type: serverProto.receive_turn.name, move:{row, col}}),
    };
}
export const AbstractClientHandler = (Handler) => class extends Handler{
    /**@type {ClientAPI} */ get api(){super.api;}
    /**@type {import("./game.js").Game} */ get game(){super.target;}
    update_state({currentPlayer, move:{row, col}, nextPlayer}){}
    result_tie(){}
    result_win({client, result}){}
}
const clientProto = AbstractClientHandler(class{}).prototype;