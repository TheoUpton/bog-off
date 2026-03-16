import * as  APIs from "./API.js";
export class MainServerAPI extends APIs.ServerAPI{
    /** @param {ServerHandler} handler */
    constructor(sender, handler, broadcaster){
        super(sender, handler, broadcaster);
    }
    get send(){
        const sender = this.sender;
        const clientProto = ClientHandler.prototype;
        return {
            client_init: ({privateId, id}) => sender({type: clientProto.client_init.name, player:{privateId, id}}),
            no_lobby: () => sender({type: clientProto.no_lobby.name}),
            join_lobby: (lobby) => sender({type:clientProto.join_lobby.name, lobby}),
            game_keys: (keys) => sender({type:clientProto.game_keys.name, keys}),
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
        const clientProto = ClientHandler.prototype;
        const client = this.client;
        return {
            client_joined: () => broadcaster({type:clientProto.player_joined.name, client: client}, client),
            client_left: () => broadcaster({type:clientProto.client_left.name, id: client.id}, client),
            update_id: (oldId, newId) => broadcaster({type: clientProto.update_id.name, oldId, newId}, client),
            client_update: (attribute, value = client[attribute]) => broadcaster({type:clientProto.update_client.name, id: client.id, attribute, value:value}, client),
            
        }
    }
    get receive(){
        /**@type {ServerHandler} */
        const handler = this.handler;
        return (message) => {
            switch(message.type){
                case handler.create_lobby.name: return handler.create_lobby?.();
                case handler.join_lobby.name: return handler.join_lobby?.(message.lobbyId);
                case handler.leave_lobby.name: return handler.leave_lobby?.();
                case handler.client_update.name: return handler.client_update?.({attribute: message.attribute, value: message.value});
                default: handler.api.send.error(`Unknown message type "${message.type} in ${message}"`);
            }
        };
    }
}
export class ServerHandler extends APIs.Handler{
    /**@type {MainServerAPI} */
    get api(){return this._api;}
    create_lobby(){}
    join_lobby(lobbyId){}
    leave_lobby(){}
    client_update({attribute, value}){}
    connection_closed(){}
    game_set(){}
}

export class MainClientAPI extends APIs.ClientAPI{
    constructor(sender, handler){
        super(sender, handler);
    }
    get send(){
        const sender = this.sender;
        const serverProto = ServerHandler.prototype;
        return{
            create_lobby: () => sender({type: serverProto.create_lobby.name}),
            join_lobby: (lobbyId) => sender({type:serverProto.join_lobby.name, lobbyId}),
            leave_lobby: () => sender({type:serverProto.leave_lobby.name}),
            client_update: ({attribute, value}) => sender({type: serverProto.client_update.name, attribute, value}),
            game_set: (gameName) => sender({type:serverProto.game_set.name, name:gameName}),
        }
    }
    get receive(){
        /**@type {ClientHandler} */
        const handler = this.handler;
        return (message) => {
            switch (message.type){
                //single messages
                case handler.client_init.name: return handler.client_init?.({privateId: message.player.privateId, id: message.player.id}); 
                case handler.no_lobby.name: return handler.no_lobby?.();
                case handler.game_keys.name: return handler.game_keys?.();
                case handler.join_lobby.name: return handler.join_lobby?.(message.lobby.id, message.lobby.clients);
                //broadcast messages
                case handler.player_joined.name: return handler.player_joined?.(message.client);
                case handler.client_left.name: return handler.client_left?.(message.id);
                case handler.update_client.name: return handler.update_client?.({id: message.id, attribute: message.attribute, value: message.value});
                case "error":
                    switch(message.code){
                        case null: return handler.error(message.message);
                        case handler.lobby_404.name: return handler.lobby_404(message.message);
                        default: return handler.unknown_error_code(message);
                    }

            }
        }
    }
}
export class ClientHandler extends APIs.Handler{
    /**@type {MainClientAPI} */
    get api(){return this._api;}
    client_init({privateId, id}){}
    no_lobby(){}
    game_keys(){}
    join_lobby(){}
    //broadcast messages
    player_joined(){}
    client_left(id){}
    update_client(){}
    update_id(){}
    error(){}
    unknown_error_code(){}
    lobby_404(){}
}