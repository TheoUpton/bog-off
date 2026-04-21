import * as API from "./API.js";

export const receiverKey = API.receiverKey + "base-lobby";

export class LobbyAPI extends API.LobbyAPI{
    get broadcast(){return this.#broadcast;}
    #broadcast = {
        ...super.broadcast,
        game_set: (gameName) => this._broadcaster({type: ClientHandler.prototype.game_set.name, gameName, ...this.generateAck()}),
        user_joined: (user) => this._broadcaster({type:ClientHandler.prototype.user_joined.name, user}, user),
        user_left: (user) => this._broadcaster({type:ClientHandler.prototype.user_left.name, id: user.id}, user),
        cllient_reconnected: (user) => this._broadcaster({type: ClientHandler.prototype.user_reconnected.name, user}, user),
        update_id: (oldId, newId, user) => this._broadcaster({type: ClientHandler.prototype.update_id.name, oldId, newId}, user),
        /**@param {User} user @param {string} attribute*/
        user_update: (user, attribute, value = user[attribute]) => this._broadcaster({type:ClientHandler.prototype.update_user.name, id: user.id, attribute, value:value}, user),
    };
}

export class ServerAPI extends API.ServerAPI{}
export class ServerHandler extends API.Handler{
    /**@type {ServerAPI} */ get api(){super.api;}
    /**@type {} */ get lobby(){super.target;}
    leave_lobby(){}
    user_update({attribute, value}){}
    game_set_ack({gameName}){}
}

export class ClientAPI extends API.ClientAPI{
    get send(){return this.#send;}
    #send = {
        ...super.send,
        leave_lobby: () => this._sender({type:ServerHandler.prototype.leave_lobby.name}),
        user_update: ({attribute, value}) => this._sender({type: ServerHandler.prototype.user_update.name, attribute, value}),
        game_set_ack: (ack_code, gameName) => this._sender({type:ServerHandler.prototype.game_set_ack.name, ack_code, gameName}),
    };
    receive(message){
        console.log("lobby message received:",message);
        super.receive(message);
    }
}
export class ClientHandler extends API.Handler{
    /**@type {ClientAPI} */ get api(){super.api;}
    user_joined(){}
    user_left({id}){}
    user_reconnected({user}){}
    update_user({attribute, value}){}
    update_id({oldId, newId}){}
    game_set({ack_code, gameName}){this.api.send.game_set_ack(ack_code, gameName)}
}