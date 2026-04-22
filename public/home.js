import {me as _me} from "./me.js"
/**@type {Omit<_me, "api"> & {api: import("./shared/userAPI.js").ClientAPI}} */
const me = _me;
class Home{
    static #instance = new Home();
    static get instance(){return Home.#instance;}
    #dom = {
        container: document.getElementById("home"), 
        new_lobby: document.getElementById("new-lobby"),
        lobby_id_input: document.getElementById("input-lobby-id"),
        submit_lobby: document.getElementById("submit-lobby"),
    }
    constructor(){
        this.#dom.new_lobby.addEventListener("click", () => this.#requestNewLobby());
        this.#dom.submit_lobby.addEventListener("click", () => this.#requestJoinLobby());
    }
    #requestNewLobby(){
        me.api.send.create_lobby();
    }
    #requestJoinLobby(){
        const lobbyID = this.#dom.lobby_id_input.value;
        me.api.send.join_lobby(lobbyID);
    }
    show(){this.#dom.container.classList.remove("hide")}
    hide(){}
}
export const home = Home.instance;
