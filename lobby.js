class Lobby {
    #id; #players; #dcCount = 0; #readyCount = 0; #game;
    constructor(id){
        this.#id = id;
        this.#players = new Map();
    }
    get id(){return this.#id;}

    addPlayer(player){
        const existing = this.#players.get(player._privateId);
        if(existing === player) return;
        if(existing && !existing.isConnected) this.#dcCount--;
        this.#players.set(player._privateId, player);
        player._currentLobby = this;
    }
    removePlayer(player){
        this.readyPlayer(player, false);
        if(!player.isConnected) this.#dcCount--;
        player._currentLobby = null;
        this.#players.delete(player._privateId);
    }
    disconnectedPlayer(player){
        this.#dcCount++;
        this.readyPlayer(player, false);
    }
    readyPlayer(player, ready){
        if(player.ready == ready) return;
        player.ready = ready;
        if(ready) this.#readyCount++;
        else this.#readyCount--;
    }

    get game(){return this.#game;}
    setGame(game){this.#game = game;}

    isReady(){return this.#players.size - this.#dcCount == this.#readyCount;}

    isEmpty(){return this.#players.size == this.#dcCount;}

    broadcast(message, ignorePlayer = null){
        this.#players.forEach(player => {
            if(player === ignorePlayer) return;
            if(player.isConnected) player.socket.send(JSON.stringify(message));
        });
    }

    toJSON(){
        return {
            id: this.id,
            players: [...this.#players.values()]
        };
    }
}

class Player {
    #socket; #currentLobby; #id; #privateId
    constructor(socket, {privateid, id, name}){
        this.#socket = socket;
        this.#privateId = privateid;
        this.#id = id;
        this.ready = false;
        this.name = name;
    }
    get socket(){return this.#socket;}

    get _privateId(){return this.#privateId;}

    get id(){return this.#id;}

    get isConnected(){return this.socket && this.socket.readyState === 1;}

    get currentLobby(){return this.#currentLobby;}

    set _currentLobby(lobby){
        this.#currentLobby = lobby;
        this.ready = false;
    }

    toJSON(){
        return {id: this.id, name: this.name, ready: this.ready};
    }

    static paramsFromURL(url){
        return {
            name: url.searchParams.get('name'),
            privateId: url.searchParams.get('privateId'),
            id: url.searchParams.get('id')
        }
    }
}

module.exports = {Lobby, Player}