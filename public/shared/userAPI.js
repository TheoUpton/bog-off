import * as  APIs from "./API.js";

export class ServerAPI extends APIs.ServerAPI{
    get send(){return this.#send;}
    #send = {
        ...super.send,
        client_init: (client) => this._sender({type: ClientHandler.prototype.client_init.name, client}),
        no_lobby: () => this._sender({type: ClientHandler.prototype.no_lobby.name}),
        join_lobby: (lobby) => this._sender({type: ClientHandler.prototype.join_lobby.name, lobby}),
        game_keys: (keys) => this._sender({type: ClientHandler.prototype.game_keys.name, keys}),
        error: (() => {
            /** @param {Object} options @param {string} options.message @param {string} [options.code] */
            const errorFunc = (message, type = ClientHandler.prototype.error.name) => this._sender({type, message});
            /**@param {UUID} lobbyId */
            errorFunc.LobbyNotFound = (lobbyId) => errorFunc(`lobby ${lobbyId} not found`, ClientHandler.prototype.lobby_404.name);
            return errorFunc;
        })()
    };
}

export class ServerHandler extends APIs.Handler{
    /**@type {ServerAPI} */ get api(){super.api;}
    create_lobby(){}
    join_lobby({lobbyId}){}
    client_update({attribute, value}){}
}

export class ClientAPI extends APIs.ClientAPI{
    get send(){return this.#send;}
    #send = {
        ...super.send,
        create_lobby: () => this._sender({type: ServerHandler.prototype.create_lobby.name}),
        join_lobby: (lobbyId) => this._sender({type:ServerHandler.prototype.join_lobby.name, lobbyId}),
        client_update: ({attribute, value}) => this._sender({type: ServerHandler.prototype.client_update.name, attribute, value}),
    };
}

export class ClientHandler extends APIs.Handler{
    /**@type {ClientAPI} */ get api(){return super.api;}
    client_init({privateId, id}){}
    no_lobby(){}
    game_keys(){}
    join_lobby(){}
    //broadcast messages
    error(){}
    unknown_error_code(){}
    lobby_404(){}
}