import { describe, it, expect, beforeEach, vi } from 'vitest';
import { _Handler } from "../../../server/user.js";
import { Lobbies } from '../../../server/lobby.js';
import { ServerAPI, ClientHandler } from '../../../public/shared/userAPI.js';
import { LobbyAPI } from '../../../public/shared/LobbyAPI.js';
import { ClientHandler as LobbyClientHandler } from '../../../public/shared/LobbyAPI.js';

const createMockSender = () => {
    const sent = [];
    function send(data){sent.push(data)};
    send.methods = ClientHandler.prototype;
    send.sent = sent;
    return send;
};
const createMockBroadcaster = () => {
    const broadcasts = [];
    function broadcast(data){broadcasts.push(data)};
    broadcast.methods = LobbyClientHandler.prototype;
    broadcast.broadcasts = broadcasts;
    return broadcast;
};

describe("User Handler", () => {
    /**@type {_Handler}*/ let handler;
    let user, api;
    /** @type {ReturnType<typeof createMockSender>} */
    let sender;
    
    beforeEach(()=> {
        user = {id: "id" ,api: null, _api:this.api, proxy:this}
        sender = createMockSender();
        handler = new _Handler(user);
        api = new ServerAPI({sender, handler});
        user.api = api;
        Lobbies.clear();
    });
    it("creates a lobby and adds the user", () => {
        handler.create_lobby();
        const lobbies = [...Lobbies.values()]
        expect(lobbies.length).toBe(1);
        const lobby = lobbies[0];
        expect(handler.lobby).toBe(lobby);
        expect(sender.sent.length).toBe(1);
        expect(sender.sent[0].type).toBe(sender.methods.join_lobby.name);
    });
    it("only joins one lobby at a time", () => {
        const id = "0";
        const lobby = {id};
        Lobbies.set(lobby, id)
        handler.lobby = lobby;
        handler.join_lobby({lobyid: id});
        expect(sender.sent.length).toBe(1);
        expect(sender.sent[0].type).toBe(sender.methods.error.name);
        expect(handler.lobby).toBe(lobby);
    });
    it("doesn't join lobbies that don't exists", () => {
        handler.join_lobby({lobbyId: "fake id"});
        expect(sender.sent.length).toBe(1);
        expect(sender.sent[0].type).toBe(sender.methods.lobby_404.name)
    });
    it("fresh users join lobby normally", () => {
        const broadcaster = createMockBroadcaster();
        const lobbyAPI = new LobbyAPI({broadcaster});
        /**@type {import("../../../public/shared/lobby.js").Lobby} */
        const lobby = {
            api: lobbyAPI,
            addUser: vi.fn(user => user),
            getUser: () => {}
        };
        const id = "0"
        Lobbies.set(id, lobby)
        handler.join_lobby({lobbyId:id});
        expect(lobby.addUser).toHaveBeenCalled();
        expect(lobby.addUser).toHaveBeenCalledWith(user);
        expect(sender.sent.length).toBe(1);
        expect(sender.sent[0].type).toBe(sender.methods.join_lobby.name);
        expect(broadcaster.broadcasts.length).toBe(1);
        expect(broadcaster.broadcasts[0].type).toBe(broadcaster.methods.user_joined.name);
        expect(handler.lobby).toBe(lobby);
    });
    it("reconnected users join lobby via reconnect method", () => {
        const broadcaster = createMockBroadcaster();
        const lobbyAPI = new LobbyAPI({broadcaster});
        /**@type {import("../../../public/shared/lobby.js").Lobby} */
        const lobby = {
            api: lobbyAPI,
            reconnectUser: vi.fn(user => user),
            getUser: () => {return {id: "id"}},
        };
        const id = "0"
        Lobbies.set(id, lobby)
        handler.join_lobby({lobbyId: id});
        expect(lobby.reconnectUser).toHaveBeenCalled();
        expect(lobby.reconnectUser).toHaveBeenCalledWith(user);
        expect(sender.sent.length).toBe(1);
        expect(sender.sent[0].type).toBe(sender.methods.join_lobby.name);
        expect(broadcaster.broadcasts.length).toBe(1);
        expect(broadcaster.broadcasts[0].type).toBe(broadcaster.methods.user_reconnected.name);
        expect(handler.lobby).toBe(lobby);
    });
});