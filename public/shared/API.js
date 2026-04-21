class AckCode{
    #code = 0;
    nextCode(){return ++this.#code;}
    current(){return this.#code;}
}
/**@typedef {function(*): void} sender */
class BaseAPI{
    #ack_code;
    constructor({ack_code = new AckCode}){
        this.#ack_code = ack_code;
    }
    get ack_code(){return this.#ack_code.current();}
    get _ack_code(){return this.#ack_code;}
}
/**@param {new(options: any) => BaseAPI} Base */
export const Broadcastable = (Base = BaseAPI) => class extends Base {
    /**
     * @param {Object} options
     * @param {function(*, ...import("./client").Client) : void} options.broadcaster 
     */
    constructor({broadcaster, ...rest}){
        super(rest);
        this._broadcaster = broadcaster;
    }
    #broadcast = {};
    get broadcast(){return this.#broadcast;}
    generateAck(){return {ack_code: this._ack_code.nextCode()};}
}
/**@param {new(options: any) => BaseAPI} Base */
export const Sendable = (Base = BaseAPI) => class extends Base{
    /**
     * 
     * @param {Object} options
     * @param {function(*): void} options.sender 
     */
    constructor({sender, ...rest}){
        super(rest);
        this._sender = sender;
    }
    #send = {};
    get send(){return this.#send;}
    /**@param {string} receiverKey  */
    wrapSender(receiverKey){
        /**@param {any} message */
        return (message)=> {this._sender({type:"forward_message", key: receiverKey, forward: message})}
    }
    generateAck(){return {ack_code: this._ack_code.nextCode()};}
}
/**
 * @typedef {Object} IReceivable
 * @property {(message: Object) => boolean} receive
 */
/**@param {new(options: any) => BaseAPI} Base */
export const Receivable = (Base = BaseAPI) => class extends Base{
    #handler;
    /**
     * @param {Object} options
     * @param {Handler} options.handler
     */
    constructor({handler, ...rest}){
        super(rest);
        this.#handler = handler;
        this.#handler._api = this;
    }
    /**@type {Map<string, IReceivable>} */
    #receivers = new Map();
    /**@param {*} message  */
    receive(message){
        //check for receivers to forward to
        if(message?.type === "forward_message")
            return (this.#receivers.get(message?.key))?.receive(message.forward);
        if (message?.ack_code && message?.ack_code !== this.ack_code) return true;
        //check the handler
        // @ts-ignore
        if (typeof this.#handler[message.type] === 'function') {
            // @ts-ignore
            this.#handler[message.type](message);
        }
    }
    /**Adds a receiver for the API to forward the message to
     * @param {string} key 
     * @param {*} receivable 
     */
    registerReceivable(key, receivable){this.#receivers.set(key, receivable);}
    /** Deletes a receiver so the API no longer forwards messages to it
     * @param {string} key 
     */
    deleteReceiver(key){this.#receivers.delete(key);}
}
export const receiverKey = "";
export class LobbyAPI extends Broadcastable(){}
export class ServerAPI extends Sendable(Receivable()){}
export class ClientAPI extends Sendable(Receivable()){}
export class Handler{
    #client;
    #target; 
    /**@type {IReceivable | undefined} */
    #api;
    /** @param {import("./client").Client} client @param {any} target */
    constructor(client, target){
        this.#client = client;
        this.#target = target;
    }
    get api(){return this.#api;}
    /**@param {IReceivable} api*/
    set _api(api){this.#api = api;}
    get target(){return this.#target;}
    get client(){return this.#client;}
}