export {ClientAPI as GameAPI} from "./shared/base-gameAPI.js";

export class Game{
    //must match folder name
    static get name(){return ""};
    static #empty_container = document.getElementById("game");
    _active = false; 
    /**@type {{headElems: HTMLCollection, container: HTMLElement}}*/
    #dom = {headElems: undefined, container: undefined};
    
    get isActive(){return this._active;}
    get _dom(){return this.#dom;}
    get name(){return this.constructor.name;}
    #me;
    /**@type {import("./shared/lobby.js").Client} */
    get me(){return this.#me;}
    set me(client){this.#me = client;}

    _start(){
        //this.show();
        this._active = true;
    }
    static async create(){
        const game = new this();
        await game._init();
        return game;
    }
    async _init(){
        const html = await fetch(`./games/${this.name}/game.html`).then(r => r.text());
        const base = new DOMParser().parseFromString(html, "text/html");
        this._dom.base = base;
        this._dom.headElems = [...base.head.children];
        await Promise.all(this._dom.headElems.map(el => new Promise(resolve => {
            el.onload = resolve;
            document.head.appendChild(el);
        })));
        this._dom.headElems.forEach(el => el.disabled = true);
        this._dom.container = base.querySelector("#game");
    }
    load(){
        this._dom.headElems.forEach(elem => elem.disabled = false);
        Game.#empty_container.replaceWith(this._dom.container);
    }
    unload(){
        this._dom.container.replaceWith(Game.#empty_container);
        this._dom.headElems.forEach(elem => elem.disabled = true);
    }
}
import {AbstractClientHandler} from "./shared/base-gameAPI.js";
import {ClientHandler as BaseHandler} from "./shared/API.js";
export class ClientHandler extends AbstractClientHandler(BaseHandler){
    get client(){return super.client;}
    set client(client){
        this.game.me = client;
        super.client = client;
    }
    init_state(ack_code, state){this.api.send.state_set(ack_code, state)}
    start(){this.game._start();}
}