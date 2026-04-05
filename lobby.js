import {gameKeys} from "./games/gameRegistry.js";
const gameAPIs = new Map();
for (const key of gameKeys()){
    const {ServerAPI , LobbyAPI} = await import(`./public/games/${key}/gameAPI.js`);
    const {ServerHandler} = await import(`./games/${key}.game.js`);
    gameAPIs.set(key, {APIClass: ServerAPI, LobbyAPI, HandlerClass: ServerHandler});
};
import {Game} from "./games/game.js";
import {Lobby} from "./public/shared/lobby.js";
import { generateWrapper } from "./public/shared/API.js";
export class ServerLobby extends Lobby {
    /**@type {import('./games/game.js')} */
    #game;
    //#readyCount = 0; #startTimeout = null;

    /** @param {UUID} id  */
    constructor(id){super(id);}
    /**@type {import("./public/shared/MainAPI.js").MainLobbyAPI} */
    get api(){return super.api;}
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
        client.ready = false;
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
        //this.readyPlayer(client, false);
        client.ready = false;
        super.disconnectedClient(client);
    }
    /**
     * @param {ServersideClient} client 
     * @param {Boolean} ready 
     */
    //readyPlayer(client, ready){
        //if(client.type !== Client.type.player) return;
        //if(client.ready == ready) return false;
        //if(!client._game_selected) return false;
        //client.ready = ready;
        //if(ready) return this.#readyCount++;
        //this.#readyCount += ready ? 1 : -1 ;
        //if(this.#startTimeout) {
        //    clearTimeout(this.#startTimeout);
        //    this.#startTimeout = null;
        //}
        //if(!this.isReady()) return;
        //this._setGame();
    //}
    /** @returns {import('./games/game.js').Game} */
    get game(){return this.#game;}
    
    /** returns true if all active players are set to ready
     * @returns {boolean}
     */
    isReady(){
        //if(this.size - this.dcCount != this.#readyCount) return false;
        const clients = [...this.clients.values()]
        const players = clients.filter((client) => client.isPlayer && client.isConnected);
        if(players.size == 0) return false;
        return !players.some((player) => !player.ready || !player.game_selected);
    }

    /** returns true if there no active players in the lobby
     * @returns {boolean}
     */
    isEmpty(){return this.size == this.dcCount;}
    //gameSelected(client, game){
        //client._game_selected = game;
        //if(!this.isReady()) return;
        //this._setGame();
    //}
    /*#setGame(){
        const lobby = this;
        this.#setGame();
        //if(this.#startTimeout) clearTimeout(this.#startTimeout);
        this.#startTimeout = setTimeout(() => {
            lobby.#startTimeout = null;
            if(!lobby.isReady() || lobby.isEmpty()) return;
            lobby.game.start();
        }, 5000);
    }*/
    /** */
    _setGame(){
        let player = this.randomPlayer;
        while(player.game_selected == null) player = this.randomPlayer;
        const gameClass = player.game_selected;
        this.#setGameInstance(gameClass);
        //this.api.broadcast.game_set(this.game.NAME);
    }
    /**@type {Map<(typeof import("./games/game.js")), import("./games/game.js")>} */
    #gameInstances = new Map();
    game_set_ack(client, gameName){
        if(gameName != this.game.NAME) return console.error(`Ack mismatch received`);
        this.informListener(this.game_set_ack.name, client)
    }
    /** @param {typeof import("./games/game.js").Game} gameClass */
    #setGameInstance(gameClass){
        //this.#game_set_acks = new set();
        this.api.broadcast.game_set(gameClass.gameName)
        if(this.#gameInstances.has(gameClass)) {
            this.#game = this.#gameInstances.get(gameClass);
            this.game.game_init();
            return
        }  
        const game = new gameClass();
        this.#game = game;
        const ack_code = (() => {
            let code = 0;
            return {
                generate: () => ++code,
                getCurrent: () => code
            }
        })();
        
        /** @type {import("./public/shared/base-gameAPI.js")}*/
        const APIs = gameAPIs.get(game.NAME);
        const broadcaster = this.api.broadcaster;
        const receiverKey = JSON.stringify({type: "game", name: game.NAME});
        this.receiverKey = receiverKey;
        const apiFactory = new (ServerLobby.#APIFactory)({...APIs, broadcaster, receiverKey, ack_code, game: game});
        const lobbyProxy = this.createProxy(apiFactory);
        lobbyProxy._api = new (APIs.LobbyAPI)(lobbyProxy, broadcaster, ack_code);
        game._lobby = lobbyProxy;
        this.#gameInstances.set(gameClass, game);
        game.game_init();
        return game;
    }
    static #APIFactory = class {
        /** @type {typeof import("./public/shared/API.js").ServerAPI} */ APIClass;
        /** @type {typeof import("./public/shared/API.js").ClientHandler} */ HandlerClass;
        
        constructor({APIClass, HandlerClass, game, receiverKey, ack_code}){
            this.APIClass = APIClass;
            this.HandlerClass = HandlerClass;
            //this.senderWrapper = senderWrapper;
            this.ack_code = ack_code;
            this.game = game
            this.receiverKey = receiverKey;
        }
        create(){
            const handler = new this.HandlerClass(this.game);
            handler.client = this.client;
            handler.lobby = this.lobby;
            const sender = generateWrapper(this.sender, this.receiverKey)
            const api = new this.APIClass(sender, handler, this.broadcaster, this.ack_code);
            return api;
        }
    } 
    createProxy(APIFactory){
        /**@type {Lobby & {game: import("./games/game.js").Game}}*/
        const proxy = super.createProxy(APIFactory);
        const original = this;
        const clearListeners = proxy.clearListeners;

        //proxy.game_set_ack = original.game_set_ack;

        const boundGameSetAck = (client) => proxy.game.game_set_ack(proxy.getClient(client._privateId));
        original.addListener(original.game_set_ack, boundGameSetAck);

        proxy.clearListeners = () => {
            clearListeners();
            original.removeListener(original.game_set_ack, boundGameSetAck);
        }
        return proxy;
    }
    _generateClientProxy(client){
        const clientProxy = client.proxy;
        const oldAPI = client.api;
        this._serverAPIFactory.client = clientProxy;
        this._serverAPIFactory.sender = oldAPI.sender;
        const newAPI = this._serverAPIFactory.create();
        oldAPI.receivers.set(this.receiverKey, newAPI.receive);
        clientProxy._api = newAPI;
        newAPI.game = this.game;
        return clientProxy;
    }
}
import { Client } from "./public/shared/lobby.js";
export class ServersideClient extends Client{    
    constructor({privateId, id, name, game_selected = null, type}){
        super({privateId, id, name, type});
        this.ready = false;
        this.name = name;
        this._game_selected = game_selected
    }

    get game_selected(){return this._game_selected;}
    get isConnected(){return !(this.api == null)}
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
        let type = url.searchParams.get("type");
        if(type) type = Client.type[type];
        else type = Client.type.player;
        return {
            name: url.searchParams.get('name'),
            privateId: url.searchParams.get('privateId'),
            id: url.searchParams.get('id'),
            type:  type,
        }
    }
}