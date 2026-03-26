import * as  APIs from "./API.js";
export class MainServerAPI extends APIs.ServerAPI{
    /** @param {ServerHandler} handler */
    constructor(sender, handler, broadcaster){
        super(sender, handler, broadcaster);
    }
    get send(){
        const sender = this.sender;
        const superSend = super.send;
        const clientProto = ClientHandler.prototype;
        const ack_code = this._ack_code;
        return {
            ...superSend,
            client_init: (client) => sender({type: clientProto.client_init.name, client}),
            no_lobby: () => sender({type: clientProto.no_lobby.name}),
            join_lobby: (lobby) => sender({type:clientProto.join_lobby.name, lobby}),
            game_keys: (keys) => sender({type:clientProto.game_keys.name, keys}),
            game_set: (gameName) => sender({type: clientProto.game_set.name, gameName, ack_code: ack_code.getCurrent()}),
            error: (() => {
                /** @param {Object} options @param {string} options.message @param {string} [options.code] */
                const errorFunc = ({message, code = null}) => sender(code==null ? {type:"error", message} : {type:"error", code, message})
                /**@param {UUID} lobbyId */
                errorFunc.LobbyNotFound = (lobbyId) => errorFunc({message:`lobby ${lobbyId} not found`, code: clientProto.lobby_404.name});
                return errorFunc;
            })()
        }
    }
    get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        const clientProto = ClientHandler.prototype;
        const client = this.client;
        return {
            ...superBroadcast,
            client_joined: () => broadcaster({type:clientProto.player_joined.name, client: client}, client),
            client_left: () => broadcaster({type:clientProto.client_left.name, id: client.id}, client),
            update_id: (oldId, newId) => broadcaster({type: clientProto.update_id.name, oldId, newId}, client),
            client_update: (attribute, value = client[attribute]) => broadcaster({type:clientProto.update_client.name, id: client.id, attribute, value:value}, client),
            
        }
    }
    get receive(){
        /**@type {ServerHandler} */
        const handler = this.handler;
        ///**@type {Map<string, {gameName, Receiver}>} */
        //const receivers = this.receivers;
        return (message) => {
            if(super.receive(message) !== false) return true;
            switch(message.type){
                case handler.create_lobby.name:     handler.create_lobby(); break;//return true;
                case handler.join_lobby.name:       handler.join_lobby(message.lobbyId); break;//return true;
                case handler.leave_lobby.name:      handler.leave_lobby(); break;//return true;
                case handler.client_update.name:    handler.client_update({attribute: message.attribute, value: message.value}); break;//return true;
                case handler.game_set_ack.name:     handler.game_set_ack(message.gameName); break;//return true;
                case handler.forward_message.name:  handler.forward_message(message.receiver, message.forward);break;//
                default: 
                    handler.api.send.error(`Unknown message type "${message.type} in ${message}"`);
                    return false;
            }
            return true;
            //const receiverMap = receivers[message.type];
            //if(!receiverMap) {
            //    handler.api.send.error(`Unknown message type "${message.type}" in "${message}"`);
            //    return false;
            //}
            ////if(message.type != "game_message")
            //if(this.lobby.game.NAME !== message.game) {
            //    handler.api.send.error(`Current game is "${this.lobby.game.NAME}" in ${message}"`);
            //    return false;
            //}
            //    
            //const receiver = receiver.get(this.lobby.game.NAME);
            //if(typeof receiver !== "function") {
            //    console.error(`receiver is not a callable function`)
            //    return false;
            //};
            //return receiver(message.forward);
        };
    }
}
export class ServerHandler extends APIs.ServerHandler{
    /**@type {MainServerAPI} */
    api;
    //get api(){return super.api;}
    create_lobby(){}
    join_lobby(lobbyId){}
    leave_lobby(){}
    client_update({attribute, value}){}
    connection_closed(){}
    game_set_ack(){}
    
    //game_selected(){}
}
export class MainLobbyAPI extends APIs.LobbyAPI{
    get broadcast(){
        const broadcaster = this.broadcaster.bind(this);
        const superBroadcast = super.broadcast;
        const clientProto = ClientHandler.prototype;
        //const client = this.client;
        const ack_code = this._ack_code;
        return {
            ...superBroadcast,
            game_set: (gameName) => broadcaster({type: clientProto.game_set.name, gameName, ack_code: ack_code.generate()})
        }
    }
}
export class MainClientAPI extends APIs.ClientAPI{
    constructor(sender, handler){
        super(sender, handler);
    }
    get send(){
        const sender = this.sender;
        const superSend = super.send;
        const serverProto = ServerHandler.prototype;
        return{
            ...superSend,
            create_lobby: () => sender({type: serverProto.create_lobby.name}),
            join_lobby: (lobbyId) => sender({type:serverProto.join_lobby.name, lobbyId}),
            leave_lobby: () => sender({type:serverProto.leave_lobby.name}),
            client_update: ({attribute, value}) => sender({type: serverProto.client_update.name, attribute, value}),
            game_set_ack: (ack_code, gameName) => sender({type:serverProto.game_set_ack.name, ack_code, gameName}),
            //game_selected: (gameName) => sender({type: serverProto.game_selected.name, gameName}),
        }
    }
    get receive(){
        /**@type {ClientHandler} */
        const handler = this.handler;
        return (message) => {
            if(super.receive(message) !== false) return true;
            switch (message.type){
                //single messages
                case handler.client_init.name: handler.client_init?.(message.client);  break;// return true;
                case handler.no_lobby.name: handler.no_lobby?.(); break;//return true;
                case handler.game_keys.name: handler.game_keys?.(message.keys); break; //return true;
                case handler.join_lobby.name: handler.join_lobby?.(message.lobby.id, message.lobby.clients); break;//return true;
                //broadcast messages
                case handler.player_joined.name: handler.player_joined?.(message.client); break;//return true;
                case handler.client_left.name: handler.client_left?.(message.id); break;//return true;
                case handler.update_client.name: handler.update_client?.({id: message.id, attribute: message.attribute, value: message.value}); break;//return true;
                case handler.game_set.name: handler.game_set(message.ack_code, message.gameName); break;//return true;
                case "error":
                    switch(message.code){
                        case null: handler.error(message.message); break;//return true;
                        case handler.lobby_404.name: handler.lobby_404(message.message); break;//return true;
                        default: handler.unknown_error_code(message); break;//return true;
                    }break;
                default: return false;
            }
            return true;
        }
    }
}
export class ClientHandler extends APIs.ClientHandler{
    /**@type {MainClientAPI} */
    api;//get api(){return super.api;}
    client_init({privateId, id}){}
    no_lobby(){}
    game_keys(){}
    join_lobby(){}
    //broadcast messages
    player_joined(){}
    client_left(id){}
    update_client(){}
    update_id(){}
    game_set(ack_code, gameName){this.api.send.game_set_ack(ack_code, gameName)}
    error(){}
    unknown_error_code(){}
    lobby_404(){}
}