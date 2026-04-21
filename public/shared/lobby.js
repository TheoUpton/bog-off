export class Lobby {
    /**@type {Map<UUID, User>}*/
    #players = new Map();
    /**@type {Map<UUID, User>}*/
    #spectators = new Map();
    /**@type {Map<string, Set<function>>} */
    #listeners = new Map();
    get users() {
        const players = this.#players;
        const spectators = this.#spectators;
        return {
            get: (key) => players.get(key) ?? spectators.get(key),
            has: (key) => players.has(key) || spectators.has(key),
            forEach: (fn) => {players.forEach(fn); spectators.forEach(fn);},
            values: function*(){yield* players.values(); yield* spectators.values();},
            keys: function*(){yield* players.keys(); yield* spectators.keys();},
            entries: function*(){yield* players.entries(); yield* spectators.entries();},
            get size() {return players.size + spectators.size;},
        }
    }
    get players(){return this.#getImmutableMap(this.#players)}
    get spectators(){return this.#getImmutableMap(this.#spectators);}
    #getImmutableMap(map){
        return {
            get: (key) => map.get(key),
            has: (key) => map.has(key),
            forEach: (fn) => map.forEach(fn),
            values: () => map.values(),
            keys: () => map.keys(),
            entries: () => map.entries(),
            get size() { return map.size; }
        }
    }
    #getId(user){return user._privateId ?? (user.id ?? user);}
    #getMap(user){return user.isPlayer ? this.#players : this.#spectators;}
    getUser(user){
        const id = this.#getId(user);
        const map = this.#getMap(user);
        return map.get(id);
    }
    /** @param {User} user */
    addUser(user){
        const proxy = this.#addUser(user);
        this._informListener(this.addUser, proxy);
        return proxy;
    }
    #addUser(user){
        const proxy = this._generateUserProxy(user);
        const id = this.#getId(user);
        const map = this.#getMap(user)
        map.set(id, proxy);
        return proxy;
    }
    /** @param {User} user */
    removeUser(user){
        const id = this.#getId(user);
        const map = this.#getMap(user)
        const proxy = map.get(id);
        map.delete(id);
        this._informListener(this.removeUser, proxy);
    }
    /** @param {User} user */
    disconnectedUser(user){
        const proxy = this.getUser(user);
        this._informListener(this.disconnectedUser, proxy);
    }
    /** @param {User} user */
    reconnectUser(user){
        const oldProxy = this.getUser(user);
        const proxy = this.#addUser(user);
        Object.assign(proxy, oldProxy);
        this._informListener(this.reconnectUser, proxy);
        return proxy;
    }
    /**@param {function(...*):void} method * @param {function(...*):void} callback */
    addListener(method, callback){
        let listeners = this.#listeners.get(method.name);
        if(!listeners) {
            this.#listeners.set(method.name, new Set());
            listeners = this.#listeners.get(method.name);
        }
        listeners.add(callback);
    }
    /**@param {function(...*):void} method * @param {function(...*):void} callback */
    removeListener(method, callback){
        const listeners = this.#listeners.get(method.name);
        if(!listeners) return;
        listeners.delete(callback);
        if(listeners.size==0) this.#listeners.delete(method.name);
    }
    /**@param {function(...*):void} method */
    _informListener(method, ...params){
        this.#listeners.get(method.name)?.forEach(callback => callback(...params));
    }
    toJSON(){
        return {
            users: [...this.users.values()],
        };
    }
    static #originalReflectKeys = new Set([Lobby.prototype.createProxy.name]);
    static #duplicateReflectKeys = new Set([
        "users", "players", "spectators", "_randomPlayer", "api",
        Lobby.prototype.createProxy.name, Lobby.prototype.addListener.name, Lobby.prototype.removeListener.name,
    ]);
    createProxy(){
        const original = this;
        const copy = this._generateLobbyCopy(arguments[0]);
        this._linkLobbies(original, copy);
        this._populateLobbyCopy(original, copy);
        const proxyHandler = this._generateProxyHandler(original, copy);
        const proxy = new Proxy(copy, proxyHandler);
        return proxy;
    }
    _generateLobbyCopy(){
        return new Lobby();
    }
    /**@param {Lobby} original @param {Lobby} copy */
    _linkLobbies(original, copy){
        original.addListener(original.addUser, copy.addUser.bind(copy));
        original.addListener(original.removeUser, copy.removeUser.bind(copy));
        original.addListener(original.disconnectedUser, copy.disconnectedUser.bind(copy));
        original.addListener(original.reconnectUser, copy.reconnectUser.bind(copy));
    }
    /**@param {Lobby} original @param {Lobby} copy */
    _populateLobbyCopy(original, copy){
        original.users.forEach(user => copy.addUser(user));
    }
    _generateProxyHandler(original, copy){
        return {
            get(target, key){
                if(Lobby.#duplicateReflectKeys.has(key)) 
                    return Reflect.get(copy, key);
                if(Lobby.#originalReflectKeys.has(key))
                    return Reflect.get(original, key);
                const val = Reflect.get(original, key);
                if(typeof val === "function")
                    return {[val.name]() {}}[val.name];
                Reflect.get(copy, key);
            }
        };
    }
    
    _generateUserProxy(user){return user.proxy;}
}