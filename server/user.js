import {randomUUID} from "crypto";

import { User as BaseUser} from "../public/shared/user.js";
import { ServerAPI as API , ServerHandler} from "../public/shared/userAPI.js";
import { Lobbies} from "./lobby.js";
import { default as config} from "../devconfig.js"

const isDev = process.env.NODE_ENV !== 'production';

export class User extends BaseUser{
    /**@param {WebSocket} socket @param {http.IncomingMessage} request  */
    constructor(socket, request){
        const url = new URL(request.url, 'http://localhost');
        const userParams = User.paramsFromURL(url); 
        if(isDev) {
            console.debug(userParams);
            userParams.game_selected = config.autoGame;
        }
        if(userParams.privateId === null){
            userParams.privateId = randomUUID();
            userParams.id = randomUUID();
        }
        super(userParams);
        const sender = User.#generateSender(socket);
        const handler = new _Handler(this);
        const api = new API({sender, handler});
        api.send.user_init(userParams);
        this._api = api;
        this.connection_closed = () => handler.connection_closed;
        const lobbyId = url.searchParams.get("lobbyId");
        if(lobbyId) handler.join_lobby(lobbyId);
    }
    /**@type {API} */
    get api(){return super.api;}
    connection_closed(){}
    
    static #generateSender(socket){
        return isDev
            ? (message) => {
                try{console.debug(`outgoing message: ${JSON.stringify(message)}`)
                    socket.send(JSON.stringify(message))}
                catch(e){console.error(`cannot send message on a closed socket`)} } 
            : (message) => {
                try{socket.send(JSON.stringify(message))}
                catch(e){console.error(`cannot send message on a closed socket`)}
            };
    }
    static paramsFromURL(url){
        let typeString = url.searchParams.get("type");
        const type = User.type[typeString];
        return {
            name: url.searchParams.get('name'),
            privateId: url.searchParams.get('privateId'),
            id: url.searchParams.get('id'),
            type: type,
        }
    }
}
export class _Handler extends ServerHandler{
    /**@type {import("./lobby.js").MainLobby} */ lobby;
    /**@type {User} */ get user(){return super.user;}

    create_lobby(){
        const lobby = Lobbies.create();
        this.join_lobby({lobbyId: lobby.id});
    }

    join_lobby({lobbyId}){
        if(this.lobby && this.lobby?.id != lobbyId) {
            return this.user.api.send.error("Cannot join a lobby while in a lobby");
             
        }
        this.lobby = Lobbies.get(lobbyId);
        if(!this.lobby) {
            return this.user.api.send.error.LobbyNotFound(lobbyId);
        }
        const existingClient = this.lobby.getUser(this.user)
        let proxy;
        if(existingClient){
            if(existingClient.id !== this.user.id) 
                this.lobby.api.broadcast.update_id(existingClient.id, this.user.id, existingClient);
            proxy = this.lobby.reconnectUser(this.user);
            this.lobby.api.broadcast.cllient_reconnected(proxy);
        }
        else {
            proxy = this.lobby.addUser(this.user);
            this.lobby.api.broadcast.user_joined(proxy);
        }
        this.user.api.send.join_lobby(this.lobby)
        return true;
    }
    connection_closed(){
        if(!this.lobby) return;
        if(isDev) console.debug(this.user.id, 'disconnected');
        if(!this.user.isPlayer){
            this.lobby.removeUser(this.user);
            this.lobby.api.broadcast.user_left(this.user);
        } else {
            this.user._connected = false;
            this.lobby.disconnectedUser(this.user);
            this.lobby.api.broadcast.user_update(this.user, "connected", false);
        }
        if(this.lobby.isEmpty()) Lobbies.delete(this.lobby.id);
    }
    user_update({attribute, value}){

    }
}