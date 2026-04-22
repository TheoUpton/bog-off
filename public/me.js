import { MainLobby } from "./lobby.js";
import { User } from "./shared/user.js";
import { Handler } from "./shared/API.js";

const isDev = window.location.hostname === 'localhost';

let privateResolver;
let idResolver;
const privateId = localStorage.getItem("privateId") ?? new Promise(r => privateResolver = r);
const id = localStorage.getItem("id") ?? new Promise(r => idResolver = r);
const name = localStorage.getItem("name");
if(name) document.getElementById("player-name").value = name;
const typeStr = new URLSearchParams(window.location.search).get("type");
const type = typeStr == User.type.spectator ?  User.type.spectator : User.type.player;

export const me = new User({privateId, id, name, type});

if(isDev) console.log(me);

export class UserHandler extends Handler{
    client_init({client}){
        //for (var key in client) me.update(key, client[key]); 
        if(privateResolver) {
            privateResolver(client.privateId);
            localStorage.setItem("privateId", client.privateId);
        }
        if(idResolver) {
            idResolver(client.id);
            localStorage.setItem("id", client.id);
        }
    }
    join_lobby({lobby:{id, clients}}){
        const lobby = new MainLobby(me, id, clients);
        me.onJoinLobby();
        history.pushState({},'',`/?&lobbyId=${lobby.id}`);
    }
    lobby_404({message}){
        history.replaceState({},'','/');
        console.warn(message)
    }
}
class ProfileDom{
    static #instance = new ProfileDom;
    static get instance(){return this.#instance;}
    #dom = {name: document.getElementById("player-name")}
    #updateMeName = (value) => {
        if(value == me.name) return;
        me.name = value;
        me.api.send.client_update({attribute: "name", value});
        localStorage.setItem("name", value)
    }
    #onNameBlur = (event) => this.#updateMeName(event.target.value);
    #blurOnEnter = (event) => {
        if(event.key === 'Enter') event.target.blur()
    }
    unlock(){
        this.#dom.name.addEventListener("blur", this.#onNameBlur);
        this.#dom.name.addEventListener("keydown", this.#blurOnEnter);
    }
    lock(){
        this.#dom.name.removeEventListener("blur", this.#onNameBlur);
        this.#dom.name.removeEventListener("keydown", this.#blurOnEnter);
    }
}
export const profileDOM = ProfileDom.instance;