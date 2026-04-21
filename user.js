import {randomUUID} from "crypto";

import { User as BaseUser} from "./public/shared/user.js";
import { ServerAPI as API , ServerHandler} from "./public/shared/userAPI.js";
import { Lobbies} from "./lobby.js";
import { default as config} from "./devconfig.js"

const isDev = process.env.NODE_ENV !== 'production';

export class User extends BaseUser{
    /**@param {WebSocket} socket @param {http.IncomingMessage} request  */
    constructor(socket, request){
        const url = new URL(request.url, 'http://localhost');
        const clientParams = User.paramsFromURL(url); 
        if(isDev) {
            console.debug(clientParams);
            clientParams.game_selected = config.autoGame;
        }
        if(clientParams.privateId === null){
            clientParams.privateId = randomUUID();
            clientParams.id = randomUUID();
        }
        super(clientParams);
        const sender = User.#generateSender(socket);
        const handler = new Handler(this);
        const api = new API({sender, handler});
        api.send.client_init(clientParams);
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
class Handler extends ServerHandler{
    /**@type {import("./lobby.js").MainLobby} */ lobby;
    /**@type {User} */ get client(){return super.client;}

    create_lobby(){
        const lobby = Lobbies.create();
        this.join_lobby({lobbyId: lobby.id});
    }

    join_lobby({lobbyId}){
        if(this.lobby && this.lobby?.id != lobbyId) {
            return this.client.api.send.error("Cannot join a lobby while in a lobby");
             
        }
        this.lobby = Lobbies.get(lobbyId);
        if(!this.lobby) {
            return this.client.api.send.error.LobbyNotFound(lobbyId);
        }
        const existingClient = this.lobby.getClient(this.client)
        let proxy;
        if(existingClient){
            if(existingClient.id !== this.client.id) 
                this.lobby.api.broadcast.update_id(existingClient.id, this.client.id, existingClient);
            proxy = this.lobby.reconnectClient(this.client);
            this.lobby.api.broadcast.cllient_reconnected(proxy);
        }
        else {
            proxy = this.lobby.addClient(this.client);
            this.lobby.api.broadcast.client_joined(proxy);
        }
        this.client.api.send.join_lobby(this.lobby)
        return true;
    }
    connection_closed(){
        if(!this.lobby) return;
        if(isDev) console.debug(this.client.id, 'disconnected');
        if(!this.client.isPlayer){
            this.lobby.removeClient(this.client);
            this.lobby.api.broadcast.client_left(this.client);
        } else {
            this.client._connected = false;
            this.lobby.disconnectedClient(this.client);
            this.lobby.api.broadcast.client_update(this.client, "connected", false);
        }
        if(this.lobby.isEmpty()) Lobbies.delete(this.lobby.id);
    }
    client_update({attribute, value}){

    }
}