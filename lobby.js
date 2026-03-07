/**
 * @typedef {string} UUID
 */
class Lobby {
    /**@type {UUID}*/
    #id; 
    /**@type {Map<UUID, Player>}*/
    #players= new Map(); 
    /**@type {import('./games/game')} */
    #game;
    #readOnly; #listeners;
    #dcCount = 0; #readyCount = 0; #startTimeout = null;

    /** @param {UUID} id  */
    constructor(id){
        this.#id = id;
        this.#readOnly = (() => {
            const self = this;
            return {
                //[self.getPlayer.name]: (playerId) => self.getPlayer(playerId),
                [self.addListener.name]: (method, callback) => self.addListener(method, callback),
                [self.removeListener.name]: (method, callback) => self.removeListener(method, callback),
                [self.addPlayer.name]: () => console.error("addPlayer cannot be called. Object is read only"),
                [self.removePlayer.name]: () => console.error("removePlayer cannot be called. Object is read only"),
                forEachPlayer: (callback) => self.#players.forEach(player => callback(player.readOnly())) 
            }
        })();
    }

    /** @returns {UUID} */
    get id(){return this.#id;}

    /** @param {Player} player */
    addPlayer(player){
        const existing = this.#players.get(player._privateId);
        if(existing === player) return;
        if(existing && !existing.isConnected) {
            this.#dcCount--;
            player.socket.player = existing;
            existing._socket = player.socket;
            return;
        }
        this.#players.set(player._privateId, player);
        player._currentLobby = this;
        console.log("lobby: ", this.toJSON());
        console.log("player: ", player);
    }
    /** @param {Player} player */
    removePlayer(player){
        this.readyPlayer(player, false);
        if(!player.isConnected) this.#dcCount--;
        player._currentLobby = null;
        this.#players.delete(player._privateId);
    }
    /** @param {Player} player */
    disconnectedPlayer(player){
        this.#dcCount++;
        this.readyPlayer(player, false);
    }
    /**
     * @param {Player} player 
     * @param {Boolean} ready 
     */
    readyPlayer(player, ready){
        if(player.ready == ready) return;
        player.ready = ready;
        if(ready) return this.#readyCount++;
        this.#readyCount--;
        if(this.#startTimeout) clearTimeout(this.#startTimeout);
    }
    /** @returns {import('./games/game')} */
    get game(){return this.#game;}
    /**@param {import('./games/game')} game */
    setGame(game){this.#game = game;}

    /** returns true if all active players are set to ready
     * @returns {boolean}
     */
    isReady(){return this.#players.size - this.#dcCount == this.#readyCount;}

    /** returns true if there no active players in the lobby
     * @returns {boolean}
     */
    isEmpty(){return this.#players.size == this.#dcCount;}

    startGame(){
        if(this.#startTimeout) clearTimeout(this.#startTimeout);
        this.#startTimeout = setTimout(() => {
            this.#startTimeout = null;
            if(!this.isReady() || this.isEmpty()) return;
            this.broadcast({type:"start_game"});
            lobby.game.start();
        }, 5000);
    }

    readOnly(){return this.#readOnly;}

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

    /** Broadcasts a message to all players* that have a connected websocket
     * @param {String} message 
     * @param {Player} ignorePlayer this player will not be broadcast to
     */
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
    #socket; #currentLobby; #id; #privateId;#readOnly;
    /**
     * 
     * @param {import('ws')} socket 
     * @param {{privateid: UUID, id: UUID, name: string}} param1 
     */
    constructor(socket, {privateId, id, name}){
        console.log("creating player", privateId, id, name)
        this.#socket = socket;
        this.#privateId = privateId;
        this.#id = id;
        this.ready = false;
        this.name = name;
        this.#readOnly = (() => {
            const self = this;
            return {
                /**@param {JSON} message */
                send: (message) => self.socket.send(JSON.stringify(message)),
                get ready() {return self.ready;},
                get id() {return self.id;},
                get name() {return self.name;},
                get isConnected() {return self.isConnected;},
                get currentLobby() {return self.currentLobby;}
            };
        })();
    }
    readOnly(){return this.#readOnly;}

    /**@returns {import('ws')} */
    get socket(){return this.#socket;} 
    /**@param {import('ws')} socket*/
    set _socket(socket){this.#socket = socket;}

    /**@returns {UUID} */
    get _privateId(){return this.#privateId;}

    /**@returns {UUID} */
    get id(){return this.#id;}

    /**@returns {Boolean} */
    get isConnected(){return this.socket && this.socket.readyState === 1;}

    /**@returns {Lobby} */
    get currentLobby(){return this.#currentLobby;}

    /**@param {Lobby} lobby*/
    set _currentLobby(lobby){
        this.#currentLobby = lobby;
        this.ready = false;
    }
    /** @returns {JSON} JSON of the player suitable for sending to other players*/
    toJSON(){
        return {id: this.id, name: this.name, ready: this.ready};
    }
    /**Extracts parameters from a URL to create an object for Player instantiation
     * @param {URL} url 
     * @returns 
     */
    static paramsFromURL(url){
        return {
            name: url.searchParams.get('name'),
            privateId: url.searchParams.get('privateId'),
            id: url.searchParams.get('id')
        }
    }
}

module.exports = {Lobby, Player}