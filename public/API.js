/**
 * @typedef {Object} AckCode
 * @property {function(): int} generate 
 * @property {function(): int} getCurrent
 */
class Handler{
    #api;
    get api(){return this.#api;}
    set _api(api){this.#api = api;}
    #client;
    /**@type {import("./lobby").Client} */
    get client(){return this.#client;}
    set client(client){this.#client = client;}
}
/**@param {string} receiverKey  */
export function generateWrapper(sender, receiverKey){
    return (message)=> {sender({type:"forward_message", key: receiverKey, forward: message})}
}
function forward_message(receiverKey, message){
    const receivers = this.api.receivers;
    const receiver = receivers.get(receiverKey);
    if(!!receiver && typeof receiver === "function") return receiver(message);
    if(!receiver) console.error(`receiver ${receiverKey} notfound`);
    else console.error(`receiver ${receiverKey} is not a callable function`)
    return false;
}
export class ClientAPI{
    #sender; #handler;
    constructor(sender, handler){
        this.#sender = sender;
        this.#handler = handler;
        this.handler.api = this;
    }
    generateSenderWrapper = generateWrapper;
    get sender(){return this.#sender;}
    get send(){return {};}
    receivers = new Map();
    //get receive(){return () => false;}
    get receive(){
        const handler = this.handler;
        return (message) => {
            switch (message.type){
                case handler.forward_message.name: handler.forward_message(message.key, message.forward); break;
                default: return false;
            }
            return true;
        }
    }
    /**@return {ClientHandler} */
    get handler(){return this.#handler;}
}
export class ClientHandler extends Handler{
    /**@type {ClientAPI} */
    api;//get api(){return super.api;}
    forward_message = forward_message;
}
export class ServerAPI{
    #sender; #handler; #broadcaster; #ack_code; 
    receivers = new Map();
    constructor(sender, handler, broadcaster, ack_code = null){
        this.#sender = sender;
        this.#handler = handler;
        this.#broadcaster = broadcaster;
        this.handler.api = this;
        this.#ack_code = ack_code;
    }
    generateSenderWrapper = generateWrapper;
    get sender(){return this.#sender;}
    get send(){return {};}
    /**@return {ServerHandler} */
    get handler(){return this.#handler;}
    get broadcaster(){return this.#broadcaster;}
    get broadcast(){return {};}
    get lobby(){return this.handler.lobby;}
    get client(){return this.handler.client;}
    set client(client){this.handler.client = client;}
    /**@return {AckCode} */
    get _ack_code(){return this.#ack_code;}
    set _ack_code(ack_code){this.#ack_code = ack_code;}
    get receive(){
        const ack_code = this._ack_code;
        const handler = this.handler;
        return (message) => {
            if (!!message.ack_code && message.ack_code !== ack_code?.getCurrent()) return true;
            switch (message.type){
                case handler.forward_message.name: handler.forward_message(message.key, message.forward); break;
                default: return false;
            }
            return true;
        }
    }
}

export class ServerHandler extends Handler{
    /**@returns {ServerAPI} */
    api;//get api(){return super.api;}
    forward_message = forward_message;
}

export class LobbyAPI{
    #lobby; #broadcaster; #ack_code;
    constructor(lobby, broadcaster, ack_code = null){
        this.#lobby = lobby;
        this.#broadcaster = broadcaster;
        this.#ack_code = ack_code;
    }
    get lobby(){return this.#lobby;}
    get broadcaster(){return this.#broadcaster;}
    get broadcast(){return {};}
    /**@type {AckCode} */
    get _ack_code(){return this.#ack_code;}
}
