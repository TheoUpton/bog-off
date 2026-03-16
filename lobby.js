/**
 * @typedef {string} UUID
 */
import {Lobby} from "./public/lobby.js";
export class ServerLobby extends Lobby {
    /**@type {import('./games/game')} */
    #game;
    #dcCount = 0; #readyCount = 0; #startTimeout = null;

    /** @param {UUID} id  */
    constructor(id){super(id);}

    /** @param {ServersideClient} client */
    addClient(client){
        const existing = this.getClient(client._privateId);
        if(existing === client) return;
        super.addClient(client);
        client._lobby = this;
        return client;
    }
    /** @param {ServersideClient} client */
    removeClient(client){
        this.readyPlayer(client, false);
        if(!client.api) this.#dcCount--;
        client._lobby = null;
        super.removeClient(client);
    }
    reconnectClient(client){
        const existingClient = this.getClient(client._privateId);
        if(existingClient.api) 
            return console.error(`Client ${existingClient._privateId} cannot reconnect as it has an active api`);
        if(!client.api)
            return console.error(`Client ${client._privateId} cannot reconnect as it does not have an api`);
        if(existingClient === client)
            return console.error(`Client ${existingClient._privateId} cannot reconnect as it is not a new connection`);
        super.reconnectClient(client);
        existingClient._id = client.id;
        existingClient._api = client.api;
        const {_privateId, _id, _api, ...remainingAttrs} = client;
        Object.assign(existingClient, remainingAttrs);
    }

    /** @param {ServersideClient} client */
    disconnectedClient(client){
        this.#dcCount++;
        this.readyPlayer(client, false);
        super.disconnectedClient(client);
    }
    /**
     * @param {ServersideClient} client 
     * @param {Boolean} ready 
     */
    readyPlayer(client, ready){
        //if(client.type !== Client.type.player) return;
        if(client.ready == ready) return;
        client.ready = ready;
        if(ready) return this.#readyCount++;
        this.#readyCount--;
        if(this.#startTimeout) clearTimeout(this.#startTimeout);
    }
    /** @returns {import('./games/game')} */
    get game(){return this.#game;}
    /**@param {import('./games/game')} game */
    setGame(game){
        if(this.#game == game) return;
        this.#game = game;
        //this.#players.forEach(player => player._gameSet=null);
    }

    /** returns true if all active players are set to ready
     * @returns {boolean}
     */
    isReady(){return this.size - this.#dcCount == this.#readyCount;}

    /** returns true if there no active players in the lobby
     * @returns {boolean}
     */
    isEmpty(){return this.size == this.#dcCount;}

    startGame(){
        if(this.#startTimeout) clearTimeout(this.#startTimeout);
        const lobby = this;
        this.#startTimeout = setTimout(() => {
            this.#startTimeout = null;
            if(!this.isReady() || this.isEmpty()) return;
            this.broadcast({type:"start_game"});
            lobby.game.start();
        }, 5000);
    }
}
import { Client } from "./public/lobby.js";
export class ServersideClient extends Client{    
    /** @param {{privateid: UUID, id: UUID, name: string}} client */
    constructor({privateId, id, name}){
        super({privateId, id, name});
        this.ready = false;
        this.name = name;
    }

    get gameSet(){return this._gameSet;}

    /** @returns {JSON} JSON of the player suitable for sending to other players*/
    toJSON(){
        //prepend attribute keys before ...publicAttrs to exclude the attribute
        const {...publicAttrs} = this;
        return {id: this.id, type: this.type, ...publicAttrs};
    }
    /**Extracts parameters from a URL to create an object for Player instantiation
     * @param {URL} url 
     * @returns 
     */
    static paramsFromURL(url){
        return {
            name: url.searchParams.get('name'),
            privateId: url.searchParams.get('privateId'),
            id: url.searchParams.get('id')
        }
    }
}