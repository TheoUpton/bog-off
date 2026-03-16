const isDev = window.location.hostname === 'localhost';

class Player{
    onUpdate = {};
    constructor(json){for (const key in json) this[key]=json[key];}
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

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const socket = new WebSocket(`${protocol}://${window.location.host}${window.location.search}${customQuery}`)

const allPages = document.getElementsByClassName("page");
allPages.hideAll = () => Array.from(allPages).forEach(page => page.classList.add("hide"));

let GAMES;
import {MainClientAPI as API, ClientHandler} from "./MainAPI.js";
class Handler extends ClientHandler{
    client_init(client){
        for (var key in client) me.update(key, client[key]); 
        localStorage.setItem("privateId", me.privateId);
        localStorage.setItem("id", me.id);
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
    game_keys(keys){GAMES = Object.freeze(keys)}
    game_selected(game){gameSelected(game)}
    update_id(){}
    error(message){console.error(message)}
    unknown_error_code(error){
        
    }
    lobby_404(message){
        history.pushState({},'','');
        console.error(message)
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

/**@type {ClientLobby} */
var lobby;
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
    return self;
})();

function requestNewLobby(){
    if(lobby) return console.error(`Currently in lobby ${lobby.id}`);
    console.log("new lobby");
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
let currentAbort = null;
async function gameSelected(game){
    if(lobby && game.name == lobby.game.name) return;
    if(!(game.name in GAMES)) return console.error(`game "${game.name} is not a valid game.\nValid games are:\n${GAMES}"`);
    //abort previous game selections
    if(currentAbort) currentAbort.abort();
    const controller = new AbortController();
    currentAbort = controller;
    //remove all old game elements
    document.getElementById("game").replaceChildren();
    const oldGameElems = document.getElementsByClassName("game");
    Array.from(oldGameElems).forEach(elem => elem.remove());
    //fetch new game elements
    const html = await fetch(`/games/${game.name}.html`, {signal: controller.signal}).then(r => r.text());
    const doc = new DOMParser().parseFromString(html, 'text/html');
    //null the game as state from here on could be corrupted
    lobby.game=null;
    //swap old game html with new game html
    const gameElem = doc.getElementById("game");
    const oldGameElem = document.getElementById("game");
    oldGameElem.replaceWith(gameElem);
    //append all head elements
    const headGameElems = doc.head.getElementsByClassName("game");
    await Promise.all([...headGameElems].map(el => new Promise(resolve => {
        el.onload = resolve;
        document.head.appendChild(el);
    })));
    if(controller.signal.aborted) return;

    lobby.game = new gameClass(socket, lobby, me);
    initGame(game);
    api.send.game_set(game.name);
}
function initGame(game){
    if(!lobby || !lobby.game) return;
    if(game.name != lobby.game.name) return; 
    lobby.game.receiveMessage(game);
}

import { Lobby } from "./lobby.js";
class ClientLobby extends Lobby{
    /**@type {Game} */
    game;

    constructor(id, players){
        super(id)
        players?.forEach?.(player => {if(player.id != me.id) this.addClient(new Player(player))});
    }

    updateClient(clientId, attribute, value){
        const client = this.getClient(clientId);
        client.update(attribute, value);
        if(attribute != "id") return;
        this.removeClient(clientId);
        this.addClient(client.id, client);
    }
}

