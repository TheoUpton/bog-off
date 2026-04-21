import * as API from "./API.js";

export const receiverKey = API.receiverKey + "game: ";

export class LobbyAPI extends API.LobbyAPI{
    get broadcast(){return this.#broadcast;}
    #broadcast = {
        ...super.broadcast,
        start: () => this._broadcaster({type:clientProto.start.name}),
    };
}

export class ServerAPI extends API.ServerAPI{
    get send(){return this.#send;}
    #send = {
        ...super.send,
        init_state: (state) => this._sender({type: clientProto.init_state.name, ...this.generateAck(), state}),
    }
}
/**@param {API.Handler} Handler*/
export const AbstractServerHandler = (Handler) => class extends Handler{
    /**@type {ServerAPI} */ get api(){super.api;}
    /**@type {import("../../games/game.js").Game} */ get game(){super.target;}
    state_set(){}
}
const serverProto = AbstractServerHandler(class {}).prototype;

export class ClientAPI extends API.ClientAPI{
    get send(){return this.#send;}
    #send = {
        ...super.send,
        state_set: (ack_code, state) => this._sender({type:serverProto.state_set.name, ack_code, state}),
    };
}
/**@param {API.Handler} Handler*/
export const AbstractClientHandler = (Handler) => class extends Handler{
    /**@type {ClientAPI} */ get api(){super.api;}
    /**@type {import("../base-game.js").Game} */ get game(){super.target;}
    init_state({ack_code, state}){this.api.send.state_set(ack_code, state)}
    start(){}
}
const clientProto = AbstractClientHandler(class {}).prototype;