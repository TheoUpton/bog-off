const express = require('express')
const http = require('http')
const { WebSocketServer } = require('ws')

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })
const { randomUUID } = require('crypto');
const {Lobby, Player} = require("./lobby");

const isDev = process.env.NODE_ENV !== 'production';


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
        const id = this.generateId();
        lobbies.set(id, new Lobby(id));
        return lobbies.get(id);
    }
    return lobbies;
})();

app.use(express.static('public'))

function joinLobby(player, lobbyId){
    if(player.currentLobby) {
        player.socket.send(JSON.stringify({type: "error", message: "Cannot join a lobby while in a lobby"}));
        return false;
    }
    const lobby = Lobbies.get(lobbyId);
    if(!lobby) {
        console.log("lobbyId", lobbyId,"\nLobbies",Lobbies);
        player.socket.send(JSON.stringify({type: "error", errorCode:"lobby-404", message: "Lobby not found"}));
        return false;
    }
    lobby.addPlayer(player);
    //does the player's socket point to a different player (different player becomes current player)
    if(player !== (player=player.socket.player))
        lobby.broadcast({type: "player_update", player: player, attr:"connected", value: true}, player);
    else
        lobby.broadcast({type: "player_joined", player: player}, player);
    player.socket.send(JSON.stringify({type: 'joined', lobby: lobby }))
}

const selectGame = require("./games/gameRegistry.js");

wss.on('connection', (socket, request) => {
    console.log('a player connected')
    
    const url = new URL(request.url, 'http://localhost');
    const playerParams = Player.paramsFromURL(url);
    //console.log("url",url);
    if(playerParams.privateId === null){
        playerParams.privateId = randomUUID();
        playerParams.id = randomUUID();
        socket.send(JSON.stringify({type:"player_init", player:{privateId: playerParams.privateId, id: playerParams.id}}));
    }
    const player = new Player(socket, playerParams);
    console.log("added player",player._privateId); 
    socket.player = player;
    const lobbyId = url.searchParams.get("lobbyId");
    if(lobbyId == null || !joinLobby(player, lobbyId)) 
        socket.send(JSON.stringify({type:"no_lobby"}));

    socket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        const player = socket.player;
        var lobby = player.currentLobby;
        console.log("player.currentLobby:",player.currentLobby)

        switch (message.type) {
            case 'create_lobby':
                lobby = Lobbies.create();
                message.lobbyId = lobby.id;
                //intentional fall-through to join
            case 'join_lobby':
                joinLobby(player, message.lobbyId)
                break;
            case 'leave_lobby':
                lobby.broadcast({type:"player_left", player: player.id}, player);
                lobby.removePlayer(player);
                if(lobby.isEmpty()) Lobbies.delete(lobby.id);
                if(lobby.isReady() && !lobby.isEmpty()) startGame(lobby);
                break;
            case 'player_update':
                switch (message.attr){
                    case "name": player.name = message.value; break;
                    case "ready": lobby.readyPlayer(player, message.value); break;
                }
                if(lobby) lobby.broadcast({player,...message}, player);
                if(lobby.isReady() && !lobby.isEmpty()) lobby.startGame();
                break;
            default:
                player.socket.send(JSON.stringify({ type: 'error', message: `Unknown message type "${message.type}"` }))
        }
    })

    socket.on('close', () => {
        console.log("hey it died")
        const player = socket.player;
        if(!player) return;
        const lobby = player.currentLobby;
        if(!lobby) return;
        lobby.disconnectedPlayer(player);
        lobby.broadcast({type: "player_update", player: player, attr:"connected", value:false});
        if(lobby.isEmpty()) Lobbies.delete(lobby.id);
        console.log(player.id + ' disconnected')
    })
})

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000')
})