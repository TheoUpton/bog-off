class Player{
    onUpdate = {};
    constructor(json){for (const key in json) this[key]=json[key];}
    update(attribute, value){
        this[attribute] = value;
        this.onUpdate[attribute](value);
    }
}
const me = new Player();

me.privateId = localStorage.getItem("privateId");
me.id = localStorage.getItem("id");
me.name = localStorage.getItem("name")
if(me.name) document.getElementById("player-name").value = me.name;
console.log(me);

var customQuery = window.location.search == "" ? "?" :"";
customQuery += me.privateId ? `&privateId=${me.privateId}` : "";
customQuery += me.id ? `&id=${me.id}` : "";
customQuery += me.name ? `&name=${me.name}` : "";

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const socket = new WebSocket(`${protocol}://${window.location.host}${window.location.search}${customQuery}`)

const allPages = document.getElementsByClassName("page");
allPages.hideAll = () => Array.from(allPages).forEach(page => page.classList.add("hide"));

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
    socket.send(JSON.stringify({type:"create_lobby"}));
}

function requestJoinLobby(){
    if(lobby) return console.error(`Currently in lobby ${lobby.id}`);
    const lobbyID = document.getElementById("input-lobby-id").value;
    socket.send(JSON.stringify({type:"join_lobby", lobbyId: lobbyID}));
}

function receiveLobbyJoined(lobbyJSON){
    lobby = new Lobby(lobbyJSON.id, lobbyJSON.players);
    lobby.forEachPlayer(player => lobbyDOM.addPlayer(player));
    lobby.addListener(lobby.addPlayer, lobbyDOM.addPlayer);
    lobby.addListener(lobby.removePlayer, lobbyDOM.removePlayer);
    allPages.hideAll();
    lobbyDOM.classList.remove("hide");
    history.pushState({},'',`/?&lobbyId=${lobbyJSON.id}`);
}
function requestLeaveLobby(){
    socket.send(JSON.stringify({type:"leave_lobby"}))
    lobby = null;
    lobbyDOM.clear();
    const homeDOM = document.getElementById("home");
    allPages.hideAll();
    homeDOM.classList.remove("hide");
}

function updateMeName(value){
    if(value == me.name) return;
    me.name = value;
    socket.send(JSON.stringify({type:"player_update", attr:"name", value:value}));
    localStorage.setItem("name", value)
}


socket.addEventListener('open', () => {
    console.log('connected to server')
    //socket.send(JSON.stringify({ type: 'join', name: 'Alice' }))
})

socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    console.log(message);
    handleMessage(event.data);
});

function handleMessage(message){
    switch (message.type){
        case "player_init": 
            console.log(message.player);
            for (key in message.player) me.update(key, message.player[key]); 
            localStorage.setItem("privateId", me.privateId);
            localStorage.setItem("id", me.id);
            break;
        case "joined": receiveLobbyJoined(message.lobby); break;
        case "player_joined": lobby.addPlayer(new Player(message.player)); break;
        case "player_left": lobby.removePlayer(message.player); break;
        case "player_update": lobby.updatePlayer(message.player.id, message.attr, message.value); break;
        case "game_selected":break;
        case "error": 
            if(message.errorCode = "lobby-404") history.pushState({},'','');
            console.error(message.message); 
            break;
        default: break;
    }
}

class Lobby{
    #id; #players = new Map(); 
    /**@type {Map<string, Set<function>>} */
    #listeners = new Map();

    constructor(id, players){
        this.#id = id;
        players.forEach(player => {if(player.id != me.id) this.addPlayer(new Player(player))});
    }

    get id(){return this.#id;}

    addPlayer(player){
        this.#players.set(player.id, player);
        const listeners = this.#listeners.get(this.addPlayer.name);
        if(listeners) listeners.forEach(listener => listener(player));
    }

    removePlayer(playerid){
        this.#players.delete(playerid);
        const listeners = this.#listeners.get(this.removePlayer.name);
        if(listeners) listeners.forEach(listener => listener(playerid));
    }

    updatePlayer(playerid, attribute, value){
        const player = this.#players.get(playerid);
        player.update(attribute, value);
        if(attribute != "id") return;
        this.#players.set(value, player);
        this.#players.delete(playerid);
    }
    addListener(method, callback){
        var listeners = this.#listeners.get(method.name);
        if(!listeners) {
            this.#listeners.set(method.name, new Set());
            listeners = this.#listeners.get(method.name);
        }
        listeners.add(callback);
    }
    removeListener(method, callback){
        var listeners = this.#listeners.get(method.name);
        if(!listeners) return;
        listeners.delete(callback);
        if(listeners.size==0) this.#listeners.delete(method.name);
    }
    forEachPlayer(callback){this.#players.forEach(callback);}
}

