import { User } from "./shared/user.js";

const isDev = window.location.hostname === 'localhost';

const privateId = localStorage.getItem("privateId");
const id = localStorage.getItem("id");
const name = localStorage.getItem("name")
if(name) document.getElementById("player-name").value = name;

export const me = new User({privateId, id, name, type});

if(isDev) console.log(me);

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