export class Lobby {
    #id; 
    /**@type {Map<UUID, Client>}*/
    #clients= new Map(); 
    /**@type {Map<string, Set<function>>} */
    #listeners = new Map();

    /** @param {UUID} id  */
    constructor(id){
        this.#id = id;
    }
    
    /** @returns {UUID} */
    get id(){return this.#id;}
    get size(){return this.#clients.size;}
    get playerCount(){

    }
    getClient(id){
        //const id = client._privateId ? client._privateId : client.id;
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
        const id = client._privateId ? client._privateId : (client.id ? client.id : client);
        this.#clients.delete(id);
        this.#listeners.get(this.removeClient.name).forEach?.(callback => callback(client));
    }
    /** @param {Client} client */
    disconnectedClient(client){
        this.#listeners.get(this.disconnectedClient.name).forEach?.(callback => callback(client));
    }

    reconnectClient(client){
        this.#listeners.get(this.reconnectClient.name).forEach?.(callback => callback(client));
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

    get proxy(){
        const original = this;
        const proxy = new Lobby(this.id);
        original.#clients.forEach((key, value) => proxy.#clients.set(key, value.proxy));
        proxy.addClient = (client) => proxy.addClient(client.proxy);
        //proxy.removeClient = (client) => proxy.removeClient(client);
        //proxy.disconnectedPlayer = (client) => proxy.disconnectedClient();
        const boundAddClient = proxy.addClient.bind(proxy);
        original.addListener(original.addClient.name, boundAddClient);
        const boundRemoveClient = proxy.removeClient.bind(proxy);
        original.addListener(original.removeClient.name, boundRemoveClient);
        const boundDisconnectedClient = proxy.disconnectedClient.bind(proxy);
        original.addListener(original.disconnectedClient.name, boundDisconnectedClient);
        const boundReconnectClient = proxy.reconnectClient.bind(proxy);
        original.addListener(original.reconnectClient.name, boundReconnectClient);
        proxy.clearListeners = () => {
            original.removeListener(original.addClient.name, boundAddClient);
            original.removeListener(original.removeClient.name, proxy.removeClient);
            original.removeListener(original.disconnectedClient.name, proxy.disconnectedClient);
            original.removeListener(original.reconnectClient.name, boundReconnectClient);
        };
        proxy.addClient = () => console.error(`${proxy.addClient.name} cannot be called. Lobby proxy is read only`);
        proxy.removeClient = () => console.error(`${proxy.removeClient.name} cannot be called. Lobby proxy is read only`);
        proxy.disconnectedClient = () => console.error(`${proxy.disconnectedClient.name} cannot be called. Lobby proxy is read only`);
        proxy.reconnectClient = () => console.error(`${proxy.reconnectClient.name} cannot be called. Lobby proxy is read only`);
        return proxy;
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
    constructor({privateId, id, name}){
        console.log("creating player", privateId, id, name)
        this.#privateId = privateId;
        this.#id = id;
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

    get proxy(){
        const target = this;
        const proxyData = {api: null};
        return new Proxy(target, {
            get(target, key){
                if(key in proxyData) return proxyData[key];
                if(key == "_privateId") return null;
                return Reflect.get(target, key);
            },
            set(target, key, value){
                if(key in proxyData) return proxyData[key] = value;
            }
        });
    }

    get gameSet(){return this._gameSet;}
    /** @returns {JSON} JSON of the player suitable for sending to other players*/
    toJSON(){
        return {id: this.id};
    }
}

//module.exports = {Lobby, Player: Client}