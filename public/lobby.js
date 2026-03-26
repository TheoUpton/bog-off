export class Lobby {
    #id; 
    /**@type {Map<UUID, Client>}*/
    #clients= new Map(); 
    /**@type {Map<string, Set<function>>} */
    #listeners = new Map();
    /**@type {import("./API.js").LobbyAPI} */
    #api;
    #dcCount = 0;
    get dcCount(){return this.#dcCount;}
    /** @param {UUID} id  */
    constructor(id){
        this.#id = id;
    }
    
    /** @returns {UUID} */
    get id(){return this.#id;}
    get size(){return this.#clients.size;}
    get playerCount(){

    }
    get api(){return this.#api;}
    set _api(api){this.#api = api;}
    get _randomPlayer(){
        const players = [...this.#clients.values()].filter(client => client.type === Client.type.player);
        return players.length <1 ? null : players[Math.floor(Math.random() * players.length)];
    }
    get clients() {
        const clients = this.#clients;
        return {
            get: (key) => clients.get(key),
            has: (key) => clients.has(key),
            forEach: (fn) => clients.forEach(fn),
            values: () => clients.values(),
            keys: () => clients.keys(),
            entries: () => clients.entries(),
            get size() { return clients.size; }
        }
    }

    getClient(client){
        const id = client._privateId ? client._privateId : (client.id ? client.id : client);
        return this.#clients.get(id);
    }
    /** @param {Client} client */
    addClient(client){
        const id = client._privateId ? client._privateId :client.id;
        this.#clients.set(id, client);
        this.#listeners.get(this.addClient.name)?.forEach?.(callback => callback(client));
    }
    
    /** @param {Client} client */
    removeClient(client){
        if(!client.api) this.#dcCount--;
        const id = client._privateId ? client._privateId : (client.id ? client.id : client);
        this.#clients.delete(id);
        this.#listeners.get(this.removeClient.name)?.forEach?.(callback => callback(client));
    }
    /** @param {Client} client */
    disconnectedClient(client){
        this.#dcCount++;
        client._api = null;
        this.#listeners.get(this.disconnectedClient.name)?.forEach?.(callback => callback(client));
    }

    reconnectClient(client){
        this.#dcCount--;
        this.#listeners.get(this.reconnectClient.name)?.forEach?.(callback => callback(client));
    }
    forEach(callback){return this.#clients.forEach(callback);}


    startGame(){
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
        const listeners = this.#listeners.get(method.name);
        if(!listeners) return;
        listeners.delete(callback);
        if(listeners.size==0) this.#listeners.delete(method.name);
    }
    informListener(methodName, ...params){
        this.#listeners.get(methodName).forEach?.(callback => callback(...params));
    }
    toJSON(){
        return {
            id: this.id,
            clients: [...this.#clients.values()]
        };
    }

    createProxy(APIFactory = undefined){
        const original = this;
        
        const lobbyProxy = new Lobby(original.id);
        lobbyProxy._generateClientProxy = original._generateClientProxy;
        lobbyProxy.game = this.game;
        lobbyProxy.receiverKey = this.receiverKey;
        if (APIFactory) lobbyProxy._serverAPIFactory = APIFactory;
        //lobbyProxy._api = lobbyAPI;
        //serverAPIFactory.lobby = lobbyProxy;

        /*function generateClientProxy(client){
            const clientProxy = client.proxy;
            clientProxy[consumerType] = consumer;
            serverAPIFactory.client = clientProxy;
            const oldAPI = client.api;
            const newAPI = serverAPIFactory.create();
            clientProxy._api = newAPI;
            return clientProxy;
        }*/

        original.#clients.forEach((client, id) => lobbyProxy.#clients.set(id, lobbyProxy._generateClientProxy(client)));
        
        const proxyAddClient = lobbyProxy.addClient;
        const onClientAdded = (client) => {
            const proxyClient = lobbyProxy._generateClientProxy(client);
            proxyAddClient.call(lobbyProxy, proxyClient);
        };
        //const boundAddClient = lobbyProxy.addClient.bind(lobbyProxy);
        original.addListener(original.addClient.name, onClientAdded);
        
        //proxy.removeClient = (client) => proxy.removeClient(client);
        const boundRemoveClient = lobbyProxy.removeClient.bind(lobbyProxy);
        original.addListener(original.removeClient.name, boundRemoveClient);
        
        //proxy.disconnectedClient = (client) => proxy.disconnectedClient();
        const boundDisconnectedClient = lobbyProxy.disconnectedClient.bind(lobbyProxy);
        original.addListener(original.disconnectedClient.name, boundDisconnectedClient);

        const proxyReconnectClient = lobbyProxy.reconnectClient;
        const onReconnectClient = (client) => {
            const clientProxy = lobbyProxy._generateClientProxy(client);
            const oldClient = lobbyProxy.getClient(client);
            oldClient._api = clientProxy.api;
            clientProxy.api.client = oldClient;
            proxyReconnectClient.call(lobbyProxy, clientProxy)
            //lobbyProxy.reconnectClient(clientProxy);
        };
        //const boundReconnectClient = lobbyProxy.reconnectClient.bind(lobbyProxy);
        original.addListener(original.reconnectClient.name, onReconnectClient);

        lobbyProxy.clearListeners = () => {
            original.removeListener(original.addClient.name, onClientAdded);
            original.removeListener(original.removeClient.name, lobbyProxy.removeClient);
            original.removeListener(original.disconnectedClient.name, lobbyProxy.disconnectedClient);
            original.removeListener(original.reconnectClient.name, onReconnectClient);
        };
        lobbyProxy.addClient = () => console.error(`${lobbyProxy.addClient.name} cannot be called. Lobby proxy is read only`);
        lobbyProxy.removeClient = () => console.error(`${lobbyProxy.removeClient.name} cannot be called. Lobby proxy is read only`);
        lobbyProxy.disconnectedClient = () => console.error(`${lobbyProxy.disconnectedClient.name} cannot be called. Lobby proxy is read only`);
        lobbyProxy.reconnectClient = () => console.error(`${lobbyProxy.reconnectClient.name} cannot be called. Lobby proxy is read only`);
        return lobbyProxy;
    }
}

export class Client {
    #lobby; #id; #privateId; #api; #type;
    static #player = new String("player"); static #spectator = new String("spectator");
    static get type(){
        return {
            player:     Client.#player,
            spectator:  Client.#spectator
        }
    }
    /**@param {{privateid: UUID, id: UUID, name: string}} client  */
    constructor({privateId, id, name, type}){
        console.log("creating player", privateId, id, name)
        this.#privateId = privateId;
        this.#id = id;
        this.#type = type;
    }

    /**@returns {UUID} */
    get _privateId(){return this.#privateId;}

    /**@returns {UUID} */
    get id(){return this.#id;}

    get api(){return this.#api;}
    set _api(api){this.#api = api;}

    /**@returns {Lobby} */
    get lobby(){return this.#lobby;}

    /**@param {Lobby} lobby*/
    set _lobby(lobby){
        this.#lobby = lobby;
        this.ready = false;
    }

    get type(){return this.#type;}
    set _type(type){this.#type = type;}
    get isPlayer(){return this.type === Client.type.player;}
    get proxy(){
        const target = this;
        const proxyData = {api: null};
        const proxySetters = {_api: "api"};
        const proxyExtras = {};
        return new Proxy(target, {
            get(target, key){
                if(key in proxyData) return proxyData[key];
                if(key in proxySetters) return proxyData[proxySetters[key]];
                if(key in proxyExtras) return proxyExtras[key];
                return Reflect.get(target, key);
            },
            set(target, key, value){
                if(key == "_privateId") return false;
                if(`_${key}` in proxySetters) return false;
                if(key in proxySetters) {proxyData[proxySetters[key]] = value; return true}
                if(key in proxyData) {proxyData[key] = value; return true }
                if(key in target) return false;
                proxyExtras[key] = value;
                return true
            }
        });
    }

    get game_selected(){return this._gameSelected;}
    /** @returns {JSON} JSON of the player suitable for sending to other players*/
    toJSON(){
        return {id: this.id};
    }
}