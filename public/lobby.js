import { ClientHandler } from "./shared/LobbyAPI.js";
import {generateWrapper} from "./shared/API.js";

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

function requestLeaveLobby(){
    api.send.leave_lobby();
    lobby = null;
    lobbyDOM.clear();
    const homeDOM = document.getElementById("home");
    allPages.hideAll();
    homeDOM.classList.remove("hide");
}
document.getElementById("leave-lobby").addEventListener("click", requestLeaveLobby);

document.getElementById("client-ready").addEventListener("change", (event) => {api.send.client_update({attribute: "ready", value: event.target.checked})})

import { Lobby } from "./shared/lobby.js";
export class ClientLobby extends Lobby{
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

export class Handler extends ClientHandler{
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

}