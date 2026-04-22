import { Lobby as BaseLobby } from "./shared/lobby.js";
import { ClientAPI, ClientHandler, receiverKey} from "./shared/LobbyAPI.js";
import { User } from "./shared/user.js";
import {GAME_KEYS} from "./game-keys.js"


class LobbyDom{
    static #key = Symbol();
    static #instance = new LobbyDom(LobbyDom.#key);
    static get instance(){return LobbyDom.#instance;}
    #self;
    #playersContainer;
    static #playerDom = {
        container: document.createElement("li"),
        ready: document.createElement("input"),
    }
    static {
        this.#playerDom.ready.setAttribute("type", "checkbox");
        this.#playerDom.ready.setAttribute("disabled", "true");
    }
    constructor(key){
        if(key !== LobbyDom.#key) throw new Error("LobbyDom is singleton");
        this.#self = document.getElementById("lobby");
        this.#playersContainer = this.#self.querySelector("#lobby-players");
    }
    #lobby;
    /**@param {MainLobby} lobby*/
    set lobby(lobby){
        this.clear();
        this.#lobby = lobby;
        lobby.addListener(lobby.addUser, this.#addPlayer);
        lobby.addListener(lobby.setReady, this.#updatePlayerReady);
        lobby.addListener(lobby.setName, this.#updatePlayerName);
        lobby.addListener(lobby.removeUser, this.#removePlayer);
        lobby.addListener(lobby.disconnectedUser, this.#disconnectPlayer);
        lobby.addListener(lobby.reconnectUser, this.#reconnectPlayer);
        const clientReady = document.getElementById("client-ready");
        clientReady.addEventListener("change", (event) => {this.#clientReady(event.target.checked)});
        const leaveLobby = document.getElementById("leave-lobby")
        leaveLobby.addEventListener("click", () => this.#leaveLobby);
    }
    /**@type {MainLobby} */
    get lobby(){return this.#lobby;}
    #playermap = new Map();
    /**@param {import("./shared/user.js").User} player */
    #addPlayer = (player) => {
        if(!player.isPlayer) return;
        if(player === this.lobby.me) return;
        const containerClone = LobbyDom.#playerDom.container.cloneNode(true);
        this.#playermap.set(player.id, containerClone);
        const readyClone = LobbyDom.#playerDom.ready.cloneNode(true);
        readyClone.value = player.ready;
        containerClone.appendChild(readyClone);
        const name = document.createTextNode(player.name);
        containerClone.appendChild(name);
        this.#playersContainer.appendChild(containerClone);
        const dom = {container: containerClone, ready: readyClone, name};
        this.#playermap.set(player.id, dom);
    };
    #updatePlayerReady = (player, ready) => {
        const dom = this.#playermap.get(player.id);
        dom.ready.checked = ready;
    }
    #updatePlayerName = (player, name) => {
        const dom = this.#playermap.get(player.id);
        dom.name.nodeValue = name;
    }
    #removePlayer = (player) => {
        if(!player.isPlayer) return;
        const dom = this.#playermap.get(player.id);
        dom.container.remove();
        this.#playermap.delete(player.id);
    };
    #disconnectPlayer = (player) => {
        if(!player.isPlayer) return;
        const dom = this.#playermap.get(player.id);
        dom.container.setAttribute("data-connected", false);
    };
    #reconnectPlayer = (player) => {
        if(!player.isPlayer) return;
        const dom = this.#playermap.get(player.id);
        dom.container.removeAttribute("data-connected");
        this.#updatePlayerName(player, player.name);
        this.#updatePlayerReady(player, player.ready);
    };
    clear(){
        const lobby = this.#lobby;
        if(!lobby) return;
        lobby.removeListener(lobby.addClient, this.#addPlayer);
        lobby.removeListener(lobby.setReady, this.#updatePlayerReady);
        lobby.removeListener(lobby.setName, this.#updatePlayerName);
        lobby.removeListener(lobby.removeClient, this.#removePlayer);
        lobby.removeListener(lobby.disconnectedClient, this.#disconnectPlayer);
        lobby.removeListener(lobby.reconnectClient, this.#reconnectPlayer);
        this.#playersContainer.replaceChildren();
    }
    show(){
        this.#self.classList.remove("hide");
    }
    game_select_animation(){
        this.#self.classList.add("hide");
    }
    #clientReady(value){
        const api = this.lobby.api;
        api.send.user_update({attribute: "ready", value: value});
    }
    #leaveLobby(){
        this.onLeave();
        this.clear();
    }
}
export const lobbyDOM = LobbyDom.instance;

export class Lobby extends BaseLobby{
    #me
    constructor(me){
        super();
        this.#me = me;
    }
    get me(){return this.#me;}
    setName(client, name){
        this._informListener(this.setName, client, name);
    }
    #target;
    _generateLobbyCopy(APIdata){
        const copy = new Lobby();
        const {ClientAPI, ClientHandler, target, receiverKey, oldAPI} = APIdata;
        const sender = oldAPI.wrapSender(receiverKey);
        const handler = new ClientHandler(null, target);
        const api = new ClientAPI(sender, handler);
        oldAPI.addReceiver(receiverKey, api.receive);
        target.api = api;
        this.#target = target;
        return copy;
    }
    _populateLobbyCopy(original, copy){
        original.clients.forEach(client => {
            const proxy = copy.addClient(client)
            if(client.id !== this.me.id) return;
            this.#me = proxy;
            this.#target.me = proxy;
        });
    }
}
export class MainLobby extends Lobby{
    #id;
    #originalMe;
    /**@param {UUID} id @param {import("./shared/user.js").User[]} clients  */
    constructor(me, id, clients){
        super(me.proxy);
        this.#originalMe = me;
        this.#id = id;
        lobbyDOM.lobby = this;
        clients?.forEach(client => this.addUser(client));
        this.#generateAPI();
        lobbyDOM.show();
    }
    setName(client, name){
        client.name = name;
        super.setName(client,name);
    }
    _generateUserProxy(client){
        if(client.id === this.me.id) return this.me;
        client.type = User.type[client.type]
        const proxy = new User(client);
        return proxy;
    }
    #api;
    /**@type {ClientAPI} */
    get api(){return this.#api;}
    #generateAPI(){
        /**@type {import("./shared/LobbyAPI.js").ClientAPI} */
        const origAPI = this.#originalMe.api;
        const sender = origAPI.wrapSender(receiverKey);
        const handler = new Handler(this.me, this);
        this.#api = new ClientAPI({sender, handler});
        origAPI.registerReceivable(receiverKey, this.api);
    }
    get id(){return this.#id;}
    leaveLobby(){
        const origAPI = this.#originalMe.api;
        origAPI.deleteReceiver(receiverKey);
        this.api.send.leave_lobby();
    }
    updateClient(id, attribute, value){
        const client = this.getUser(id);
    }
    setReady(client, ready){
        client.ready = ready;
        this._informListener(this.setReady, client, ready);
    }
}

export class Handler extends ClientHandler{
    /**@type {MainLobby} */ get lobby(){return this.target;}
    user_joined({client}){this.lobby.addUser(client);}
    user_left({id}){this.lobby.removeUser(id);}
    user_reconnected({client}){this.lobby.reconnectUser(client);}
    update_user({id, attribute, value}){this.lobby.updateClient(id, attribute, value)}
    //game_keys(keys){GAME_KEYS = Object.freeze(new Set(keys))}
    #currentAbort = null
    async game_set(ack_code, gameName){
        //if(lobby && gameName == lobby.game?.name) return false;
        const lobby = this.lobby;
        if(!GAME_KEYS.has(gameName)) 
            return console.error(`game "${gameName} is not a valid game.\nValid games are:\n${GAME_KEYS}"`);
        lobby.onGameSelected(gameName);
        if(this.#currentAbort) this.#currentAbort.abort();
        if(!lobby.games.has(gameName)){
            const controller = new AbortController();
            this.#currentAbort = controller;
            /**@type {import("./base-game.js")}*/
            const {ClientAPI, Game, ClientHandler, receiverKey} = await import(`./games/${gameName}/game.js`);
            const game = await Game.create();
            game.lobby = lobby.createProxy({ClientHandler, receiverKey, target: game, ClientAPI, oldAPI: this.api});
            if(controller.signal.aborted) return false;
            lobby.games.set(gameName, game);
        }
        lobby.game = lobby.games.get(gameName);
        lobby.api.send.game_set_ack(ack_code, gameName);
    }
    update_id(){}
    error(message){console.error(message)}
    unknown_error_code(error){
        
    }
    
}