const isDev = window.location.hostname === 'localhost';
import {MainClientAPI as API, ClientHandler} from "./shared/MainAPI.js";
import {generateWrapper} from "./shared/API.js";

export class Player{
    onUpdate = {};
    constructor(json){for (const key in json) this[key]=json[key];}
    get proxy(){return this;}
    update(attribute, value){
        this[attribute] = value;
        this.onUpdate[attribute]?.(value);
    }
}
const me = new Player();

me.privateId = localStorage.getItem("privateId");
me.id = localStorage.getItem("id");
me.name = localStorage.getItem("name")
if(me.name) document.getElementById("player-name").value = me.name;
if(isDev) console.log(me);

let customQuery = window.location.search == "" ? "?" :"";
customQuery += me.privateId ? `&privateId=${me.privateId}` : "";
customQuery += me.id ? `&id=${me.id}` : "";
customQuery += me.name ? `&name=${me.name}` : "";

if(isDev) console.debug(customQuery);
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const socket = new WebSocket(`${protocol}://${window.location.host}${window.location.search}${customQuery}`)

const allPages = document.getElementsByClassName("page");
allPages.hideAll = () => Array.from(allPages).forEach(page => page.classList.add("hide"));

let GAME_KEYS;

class Handler extends ClientHandler{
    client_init(client){
        for (var key in client) me.update(key, client[key]); 
        if(me.privateId) localStorage.setItem("privateId", me.privateId);
        if(me.id) localStorage.setItem("id", me.id);
    }
    join_lobby(lobbyId, clients){
        lobby = new ClientLobby(lobbyId, clients);
        lobby.forEach(client => lobbyDOM.addPlayer(client));
        lobby.addListener(lobby.addClient, lobbyDOM.addPlayer);
        lobby.addListener(lobby.removeClient, lobbyDOM.removePlayer);
        allPages.hideAll();
        lobbyDOM.classList.remove("hide");
        history.pushState({},'',`/?&lobbyId=${lobby.id}`);
    }
    player_joined(client){lobby.addClient(new Player(client))}
    client_left(id){lobby.removeClient({id})}
    update_client({id, attribute, value}){lobby.updateClient(id, attribute, value)}
    game_keys(keys){GAME_KEYS = Object.freeze(new Set(keys))}
    #currentAbort = null
    async game_set(ack_code, gameName){
        //if(lobby && gameName == lobby.game?.name) return false;
        if(!lobby) return console.error(`Client not in a lobby, game cannot be set`)
        if(!GAME_KEYS.has(gameName)) 
            return console.error(`game "${gameName} is not a valid game.\nValid games are:\n${GAME_KEYS}"`);
        lobbyDOM.game_select_animation();
        if(this.#currentAbort) this.#currentAbort.abort();
        if(!lobby.games.has(gameName)){
            const controller = new AbortController();
            this.#currentAbort = controller;
            //lobby.game=null;
            const lobbyProxy = lobby.createProxy();
            /**@type {import("./base-game.js")}*/
            const {GameAPI, Game, ClientHandler} = await import(`./games/${gameName}/game.js`);
            const game = await Game.create();
            game.lobby = lobbyProxy;
            const handler = new ClientHandler();
            handler.game = game;
            const receiverKey = JSON.stringify({type: "game", name:game.name});
            const sender = generateWrapper(api.sender, receiverKey);
            //const sender = (message) => api.sender({type:"game_message", forward: message});
            const gameAPI = new GameAPI(sender, handler);
            game.me = me;
            game.api = gameAPI;
            this.api.receivers.set(receiverKey, gameAPI.receive);
            if(controller.signal.aborted) return false;
            lobby.games.set(gameName, game);
        }
        lobby.game = lobby.games.get(gameName);
        api.send.game_set_ack(ack_code, gameName);
        
    }
    update_id(){}
    error(message){console.error(message)}
    unknown_error_code(error){
        
    }
    lobby_404(message){
        history.pushState({},'','');
        console.warn(message)
    }
}
const handler = new Handler();

const api = new API(
    (message) => {
        if (isDev) console.debug("outgoing:", message)
        socket.send(JSON.stringify(message))
    },
    handler
);

/**@type {import("./shared/lobby.js").Lobby} */
let lobby;
const lobbyDOM  =  (() => {
    const self = document.getElementById("lobby");
    const players = self.querySelector("#lobby-players");
    const _playerDom = document.createElement("li");
    const _playerReady = document.createElement("input");
    _playerReady.setAttribute("type", "checkbox");
    _playerReady.setAttribute("disabled", "true");
    /**@type {Map<UUID, HTMLLIElement} */
    const playerMap = new Map();

    self.addPlayer = (player) => {
        if(player === me) return;
        const clonePlayer = _playerDom.cloneNode(true);
        playerMap.set(player.id, clonePlayer);
        const cloneReady = _playerReady.cloneNode(true);
        cloneReady.value = player.ready;
        player.onUpdate.ready = (value) => cloneReady.checked = value;
        clonePlayer.appendChild(cloneReady);
        const name = document.createTextNode(player.name);
        player.onUpdate.name = (value) => name.nodeValue = value;
        clonePlayer.appendChild(name);
        player.onUpdate.connected = (value) => value ? clonePlayer.removeAttribute("data-connected") : clonePlayer.setAttribute("data-connected","false");
        players.appendChild(clonePlayer);
    }
    self.removePlayer = (playerid) => {
        const playerEl = playerMap.get(playerid);
        playerEl.remove();
        playerMap.delete(playerid);
    }
    self.clear = () => players.replaceChildren();
    self.game_select_animation = function(){
        self.classList.add("hide");
    }
    return self;
})();

function requestNewLobby(){
    if(lobby) return console.error(`Currently in lobby ${lobby.id}`);
    if(isDev) console.debug("new lobby");
    api.send.create_lobby();
}
document.getElementById("new-lobby").addEventListener("click", requestNewLobby);

function requestJoinLobby(){
    if(lobby) return console.error(`Currently in lobby ${lobby.id}`);
    const lobbyID = document.getElementById("input-lobby-id").value;
    api.send.join_lobby(lobbyID);
}
document.getElementById("submit-lobby").addEventListener("click", requestJoinLobby);

function requestLeaveLobby(){
    api.send.leave_lobby();
    lobby = null;
    lobbyDOM.clear();
    const homeDOM = document.getElementById("home");
    allPages.hideAll();
    homeDOM.classList.remove("hide");
}
document.getElementById("leave-lobby").addEventListener("click", requestLeaveLobby);

function updateMeName(value){
    if(value == me.name) return;
    me.name = value;
    api.send.client_update({attribute: "name", value});
    localStorage.setItem("name", value)
}
document.getElementById("player-name").addEventListener("blur", (event) => updateMeName(event.target.value));
document.getElementById("player-name").addEventListener("keydown", (event) => {if(event.key === 'Enter') event.target.blur()});

document.getElementById("client-ready").addEventListener("change", (event) => {api.send.client_update({attribute: "ready", value: event.target.checked})})

socket.addEventListener('message', (event) => {
    if(isDev) console.debug("incoming:", event.data)
    const message = JSON.parse(event.data);
    api.receive(message);
});

/*let currentAbort = null;
async function gameSelected(gameName){
    if(lobby && gameName == lobby.game?.name) return false;
    if(!GAME_KEYS.has(gameName)) 
        return console.error(`game "${gameName} is not a valid game.\nValid games are:\n${GAME_KEYS}"`);
    if(currentAbort) currentAbort.abort();
    if(!lobby.games.has(gameName)){
        const controller = new AbortController();
        currentAbort = controller;
        //lobby.game=null;
        const lobbyProxy = lobby.createProxy();
        const {GameAPI, Game, Handler} = await import(`./games/${gameName}/game.js`);
        const game = await Game.create();
        game._lobby = lobbyProxy;
        const handler = new Handler();
        handler.game = game;
        const sender = (message) => api.sender({type:"game_message", forward: message});
        const gameAPI = new GameAPI(sender, handler);
        game._api = gameAPI;
        if(controller.signal.aborted) return false;
        lobby.games.set(gameName, game);
    }
    lobby.game = lobby.games.get(gameName);
    api.send.game_set(ack_code, selectedGame.name);
    //return true;
}
function initGame(game){
    if(!lobby || !lobby.game) return;
    if(game.name != lobby.game.name) return; 
    lobby.game.receiveMessage(game);
}*/

import { Lobby } from "./shared/lobby.js";
class ClientLobby extends Lobby{
    /**@type {Game} */
    game;
    games = new Map();

    constructor(id, players){
        super(id)
        players?.forEach?.(player => this.addClient(player.id == me.id ? me : new Player(player)));
    }

    updateClient(clientId, attribute, value){
        const client = this.getClient(clientId);
        client.update(attribute, value);
        if(attribute != "id") return;
        this.removeClient(clientId);
        this.addClient(client.id, client);
    }
    _generateClientProxy(client){
        const clientProxy = client.proxy;
        return clientProxy;
    }
}

