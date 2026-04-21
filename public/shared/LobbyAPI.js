import * as API from "./API.js";

export const receiverKey = API.receiverKey + "base-lobby";

export class LobbyAPI extends API.LobbyAPI{
    get broadcast(){return this.#broadcast;}
    #broadcast = {
        ...super.broadcast,
        game_set: (gameName) => this._broadcaster({type: ClientHandler.prototype.game_set.name, gameName, ...this.generateAck()}),
        client_joined: (client) => this._broadcaster({type:ClientHandler.prototype.client_joined.name, client: client}, client),
        client_left: (client) => this._broadcaster({type:ClientHandler.prototype.client_left.name, id: client.id}, client),
        cllient_reconnected: (client) => this._broadcaster({type: ClientHandler.prototype.client_reconnected.name, client}, client),
        update_id: (oldId, newId, client) => this._broadcaster({type: ClientHandler.prototype.update_id.name, oldId, newId}, client),
        /**@param {Client} client @param {string} attribute*/
        client_update: (client, attribute, value = client[attribute]) => this._broadcaster({type:ClientHandler.prototype.update_client.name, id: client.id, attribute, value:value}, client),
    };
}

export class ServerAPI extends API.ServerAPI{}
export class ServerHandler extends API.Handler{
    /**@type {ServerAPI} */ get api(){super.api;}
    /**@type {} */ get lobby(){super.target;}
    leave_lobby(){}
    client_update({attribute, value}){}
    game_set_ack({gameName}){}
}

export class ClientAPI extends API.ClientAPI{
    get send(){return this.#send;}
    #send = {
        ...super.send,
        leave_lobby: () => this._sender({type:ServerHandler.prototype.leave_lobby.name}),
        client_update: ({attribute, value}) => this._sender({type: ServerHandler.prototype.client_update.name, attribute, value}),
        game_set_ack: (ack_code, gameName) => this._sender({type:ServerHandler.prototype.game_set_ack.name, ack_code, gameName}),
    };
    receive(message){
        console.log("lobby message received:",message);
        super.receive(message);
    }
}
export class ClientHandler extends API.Handler{
    /**@type {ClientAPI} */ get api(){super.api;}
    client_joined(){}
    client_left({id}){}
    client_reconnected({client}){}
    update_client({attribute, value}){}
    update_id({oldId, newId}){}
    game_set({ack_code, gameName}){this.api.send.game_set_ack(ack_code, gameName)}
}