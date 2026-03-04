const express = require('express')
const http = require('http')
const { WebSocketServer } = require('ws')

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })
const { randomUUID } = require('crypto');
const {Lobby, Player} = require("./lobby");
const Lobbies = new Map();

app.use(express.static('public'))

function joinLobby(player, lobbyId){
    if(player.currentLobby) {
        player.socket.send(JSON.stringify({type: "error", message: "Cannot join a lobby while in a lobby"}));
        return false;
    }
    const lobby = Lobbies.get(lobbyId);
    if(!lobby) {
        player.socket.send(JSON.stringify({type: "error", message: "Lobby not found"}));
        return false;
    }
    lobby.addPlayer(player);
    lobby.broadcast({type: "player_joined", player: player}, player);
    player.socket.send(JSON.stringify({type: 'joined', lobby: lobby }))
}

function startGame(){}

wss.on('connection', (socket, request) => {
    console.log('a player connected')
    
    const url = new URL(request.url, 'http://localhost');
    const playerParams = Player.paramsFromURL(url);
    if(playerParams.privateId === null){
        playerParams.privateId = randomUUID();
        playerParams.id = randomUUID();
        socket.send(JSON.stringify({type:"player_init", privateId: playerParams.privateId, id: playerParams.id}));
    }
    const player = new Player(socket, playerParams);
    socket.player = player;
    const lobbyId = url.searchParams.get("lobbyId");
    if(lobbyId != null) joinLobby(player, lobbyId);

    socket.on('message', (data) => {
        const message = JSON.parse(data.toString());
        const player = socket.player;
        var lobby = player.currentLobby;

        switch (message.type) {
            case 'create':
                message.lobbyId = randomUUID();
                lobby = new Lobby(message.lobbyId);
                Lobbies.set(message.lobbyId, lobby);
                //intentional fall-through to join
            case 'join':
                joinLobby(player, message.lobbyId)
                break;
            case 'leave':
                lobby.broadcast({type:"player_left", player: player.id});
                lobby.removePlayer(player);
                if(lobby.isEmpty()) Lobbies.delete(lobby.id);
                break;
            case 'ready':
                lobby.readyPlayer(player, message.ready);
                lobby.broadcast({type:"player_readied", player:player.id, ready: message.ready}, player);
                if(lobby.isReady() && !lobby.isEmpty()) startGame();
                break;
            default:
                player.socket.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }))
        }
    })

    socket.on('close', () => {
        const player = socket.player;
        if(!player) return;
        const lobby = player.currentLobby;
        if(!lobby) return;
        lobby.disconnectedPlayer(player);
        lobby.broadcast({type: "player_disconnected", player: player.id});
        if(lobby.isEmpty()) Lobbies.delete(lobby.id);
        console.log(player.id + ' disconnected')
    })
})

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000')
})