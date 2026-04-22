/**@typedef {import("./lobby").Lobby} Lobby */
export class User {
    #id; #privateId; #api; #type; 
    static #player = new String("player"); static #spectator = new String("spectator");
    static #staticType = {player: User.#player, spectator: User.#spectator};
    static get type(){return User.#staticType;}

    /**@param {{privateId: UUID, id: UUID, name: string}} user  */
    constructor({privateId, id, name, type}){
        console.log("creating player:\n  privateId:", privateId,"\n  id:", id,"\n  name:", name)
        if(privateId instanceof Promise){
            privateId.then(id => {
                if (this.#privateId != null) return;
                this.#privateId = id;
            });
        } else this.#privateId = privateId;
        this.name = name;
        if(id instanceof Promise){
            id.then(newid => {
                if(this.#id != null) return;
                this.#id = newid;
            });
        } else this.#id = id;
        this.#type = type;
        this._connected = true;
    }

    /**@type {UUID} */
    get _privateId(){return this.#privateId instanceof Promise ? null : this.#privateId;}
    /**@type {UUID} */
    get id(){return this.#id;}

    /**@type {import("./API").ServerAPI | import("./API").ClientAPI} */
    get api(){return this.#api;}
    set _api(api){this.#api = api;}

    get type(){return this.#type;}
    get isPlayer(){return this.type === User.type.player;}

    get proxy(){
        const target = this;
        const proto = Object.getPrototypeOf(target);
        const proxyData = {api: null};
        const proxySetters = {_api: "api"};
        const proxyExtras = {};
        return new Proxy(target, {
            get(target, key){
                if(key in proxyData) return proxyData[key];
                //if(key in proxySetters) return proxyData[proxySetters[key]];
                if(key in proxyExtras) return proxyExtras[key];
                return Reflect.get(target, key);
            },
            set(target, key, value){
                if(`_${key}` in proxySetters) return false;
                if(key in proxySetters) {
                    proxyData[proxySetters[key]] = value; 
                    return true
                }
                //if(key in proxyData) {proxyData[key] = value; return true }
                if(key in proto) return false;
                proxyExtras[key] = value;
                return true
            }
        });
    }

    /** @returns {JSON} JSON of the player suitable for sending to other players*/
    toJSON(){
        const {api, ...publicAttrs} = this;
        return {id: this.id, type: this.type, ...publicAttrs};
    }
}