export class ClientAPI{
    #sender; #handler;
    constructor(sender, handler){
        this.#sender = sender;
        this.#handler = handler;
        //Object.defineProperty(this.handler, 'send', {
        //    get: () => this.send
        //});
        this.handler._api = this;
    }
    get sender(){return this.#sender;}
    /**@return {Handler} */
    get handler(){return this.#handler;}
}
export class ServerAPI{
    #sender; #handler; #broadcaster; 
    constructor(sender, handler, broadcaster){
        this.#sender = sender;
        this.#handler = handler;
        //Object.defineProperty(this.handler, 'send', {
        //    get: () => this.send
        //});
        this.#broadcaster = broadcaster;
        //Object.defineProperty(this.handler, 'broadcast', {
        //    get: () => this.broadcast
        //});
        this.handler._api = this;
    }
    get sender(){return this.#sender;}
    /**@return {Handler} */
    get handler(){return this.#handler;}
    get broadcaster(){return this.#broadcaster;}
    get lobby(){return this.handler.lobby;}
    get client(){return this.handler.client;}
}

export class LobbyAPI{
    #lobby; #broadcaster;
    constructor(lobby, broadcaster){
        this.#lobby = lobby;
        this.#broadcaster = broadcaster;
    }
    get lobby(){return this.#lobby;}
    get broadcaster(){return this.#broadcaster;}
}
export class Handler{
    /**@type {ServerAPI} */
    get api(){return this._api;}
}