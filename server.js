import express from "express"; 
import http from "http";
import {WebSocketServer} from "ws";
import {randomUUID} from "crypto";

import {ServerLobby as Lobby, ServersideClient as Client} from "./lobby.js";
import {gameKeys} from "./games/gameRegistry.js";
import { MainServerAPI as API, ServerHandler } from "./public/MainAPI.js";
import {LobbyAPI} from "./public/API.js";

const isDev = process.env.NODE_ENV !== 'production';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
app.use(express.static('public'));

wss.on('connection', (socket, request) => {
    console.log('a player connected')
    
    const url = new URL(request.url, 'http://localhost');
    const clientParams = Client.paramsFromURL(url);    
    
    const sender = isDev
        ? (message) => {
            try{console.debug(`outgoing message: ${JSON.stringify(message)}`)
                socket.send(JSON.stringify(message))}
            catch(e){console.error(`cannot send message on a closed socket`)} } 
        : (message) => {
            try{socket.send(JSON.stringify(message))}
            catch(e){console.error(`cannot send message on a closed socket`)}
    };
    const broadcaster = function(message, excludedClient) {
        this.lobby.forEach(client => client === excludedClient ? null :  client.api.sender?.(message));
    }
    const handler = new Handler();
    const api = new API(sender, handler, broadcaster);
    if(clientParams.privateId === null){
        clientParams.privateId = randomUUID();
        clientParams.id = randomUUID();
        api.send.client_init(clientParams);
    }
    const client = new Client(clientParams);
    client._api = api;
    handler.client = client; 
    
    const lobbyId = url.searchParams.get("lobbyId");
    if(lobbyId == null || !handler.join_lobby({lobbyId})) 
        api.send.no_lobby();
    api.send.game_keys(gameKeys()); 

    socket.on('message', (data) => {
        const message = data.toString();
        if(isDev) console.debug(`incoming message: ${message}`);
        api.receive(JSON.parse(message));
    })

    socket.on('close', () => handler.connection_closed());
})

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000')
})

const Lobbies = (() => {
    /**@type {Map<UUID, import('./lobby.js').Lobby>} */
    const lobbies = new Map();
    let lobbyCount = 0;
    lobbies.generateId = () => {
        if (isDev) return String(++lobbyCount);
        /**@type {UUID} */
        let id;
        do {id = randomUUID();} while (lobbies.has(id));
        return id;
    };
    lobbies.create = () => {
        const id = lobbies.generateId();
        lobbies.set(id, new Lobby(id));
        return lobbies.get(id);
    }
    return lobbies;
})();

class Handler extends ServerHandler{
    /**@type {import("./lobby").ServerLobby} */ lobby;
    /**@type {import("./lobby").ServersideClient} */ client;
    connection_closed(){
        if(!this.client || !this.lobby) return;
        this.lobby.disconnectedClient(this.client);
        this.api.broadcast.player_update("connected");
        this.client._api = null;
        if(this.lobby.isEmpty()) Lobbies.delete(this.lobby.id);
        console.log(player.id + ' disconnected')
    }
    create_lobby(){
        this.lobby = Lobbies.create();
        this.lobby._api = new LobbyAPI(this.lobby, this.api.broadcaster);
        this.join_lobby(this.lobby.id);
    }

    join_lobby(lobbyId){
        if(this.lobby && this.lobby?.id != lobbyId) {
            this.api.send.error("Cannot join a lobby while in a lobby");
            return false;
        }
        this.lobby = Lobbies.get(lobbyId);
        if(!this.lobby) {
            this.api.send.error.LobbyNotFound(lobbyId);
            return false;
        }
        const existingClient = this.lobby.getClient(this.client._privateId)
        if(existingClient){
            if(existingClient === this.client) return console.error();
            if(existingClient.id !== this.client.id) 
                this.api.broadcast.update_id(existingClient.id, this.client.id);
            this.lobby.reconnectClient(this.client);
            this.client = existingClient;
        }
        else this.lobby.addClient(this.client);

        this.api.broadcast.client_joined();
        this.api.send.join_lobby(this.lobby)
        return true;
    }

    leave_lobby(){
        this.api.broadcast.player_left();
        this.lobby.removePlayer(this.client);
        if(this.lobby.isEmpty()) Lobbies.delete(this.lobby.id);
        if(this.lobby.isReady() && !this.lobby.isEmpty()) startGame(this.lobby);
        this.lobby = null;
    }
    client_update({attribute, value}){
        switch (attribute){
            case "id": break;
            case "name": this.client.name = value; break;
            case "ready": this.lobby.readyPlayer(this.client, value); break;
            default: return;
        }
        if(this.lobby) this.api.broadcast.client_update(attribute, value);
    }
    game_set(){}
}