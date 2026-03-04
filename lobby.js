class Lobby {
    #id; #players; #dcCount = 0; #readyCount = 0;
    constructor(id){
        this.#id = id;
        this.#players = new Map();
    }
    get id(){return this.#id;}

    addPlayer(player){
        const existing = this.#players.get(player.id);
        if(existing === player) return;
        if(existing && !existing.isConnected) this.#dcCount--;
        this.#players.set(player.id, player);
        player._currentLobby = this;
    }
    removePlayer(player){
        this.readyPlayer(player, false);
        if(!player.isConnected) this.#dcCount--;
        player._currentLobby = null;
        this.#players.delete(player.id);
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

    isReady(){return this.#players.size - this.#dcCount == this.#readyCount;}

    isEmpty(){return this.#players.size == this.#dcCount;}

    broadcast(message){
        this.#players.forEach(player => {
            if(player.isConnected) player.socket.send(JSON.stringify(message));
        });
    }
}

class Player {
    #socket; #currentLobby; #id;
    constructor(socket, id, name = ""){
        this.#socket = socket;
        this.#id = id;
        this.ready = false;
        this.name = name;
    }
    get socket(){return this.#socket;}

    get id(){return this.#id;}

    get isConnected(){return this.socket && this.socket.readyState === 1;}

    get currentLobby(){return this.#currentLobby;}

    set _currentLobby(lobby){
        this.#currentLobby = lobby;
        this.ready = false;
    }
}

module.exports = {Lobby, Player}