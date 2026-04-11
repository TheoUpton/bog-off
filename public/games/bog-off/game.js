import {Game as BaseGame, ClientHandler as BaseHandler} from "../../base-game.js";
export {ClientAPI as GameAPI} from "./gameAPI.js";

export class Game extends BaseGame{
    /**@type {import("./gameAPI.js").ClientAPI} */ api;
    static get name(){return "bog-off"};
    /**@type {{base: Document, container: HTMLElement, board: HTMLElement, current_word:HTMLElement, timer:HTMLElement, start_countdown: HTMLElement, svg:HTMLOrSVGElement}}*/
    get _dom(){return super._dom;}
    async _init(){
        await super._init();
        const base = this._dom.base
        const dom = this._dom;
        dom.start_countdown = base.querySelector("#start-countdown");
        dom.timer = base.querySelector("#timer");
        dom.board = base.querySelector("#board");
        dom.board.addEventListener("pointerdown", () => this.#onPointerDown);
        dom.board.addEventListener("pointermove", () => this.#onPointerMove, {passive: false});
        dom.board.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        dom.current_word = base.querySelector("#current-word");
        dom.svg = base.querySelector("#lines");
        this.#hideGame();
    }
    #start_game_countdown(duration){
        let remaining = duration;
        const timerEl = this._dom.start_countdown;
        timerEl.textContent = duration;
        const interval = setInterval(() => {
            timerEl.textContent = --remaining;
            if(remaining>0) return;
            clearInterval(interval);
            this.#trueStart();
        }, 1000);
    }
    /**@param {number} duration */
    #start_timer(duration){
        let remaining = duration;
        const format = (time) => (time) > 60 ? Math.floor(time/60) +":"+String(time%60).padStart(2, "0"): time+"s" ;
        const timerEl = this._dom.timer;
        timerEl.textContent = format(duration);
        const interval = setInterval(() => {
            const text = format(--remaining);
            timerEl.textContent = text;
            if(remaining>0) return;
            clearInterval(interval);
            this.#finish();
        }, 1000);
    }
    #activePointerId = null;
    /**@type {Tile[]}*/ //{row:number, col:number}[]} */
    #tilePath = [];
    /**@type {SVGLineElement[]} */
    #lines = []
    /**@param {PointerEvent} event*/
    #onPointerDown(event){
        if(this.#activePointerId !== null) return;
        /**@type {HTMLElement} */
        const tile = event.target.closest(".tile");
        if(!tile) return;
        this.#activePointerId = event.pointerId;
        this.#selectTile(tile);
    }
    /**@param {HTMLElement} tile */
    #selectTile(tile){
        this.#tilePath.push(tile);
        tile.classList.add("used");
        const word = this._dom.current_word;
        word.textContent += tile.textContent.toLowerCase();
        if(this.#tilePath.length <2) return;
        const line = this.#drawLine(this.#tilePath[this.#tilePath.length-2], tile, this._dom.svg);
        this.#lines.push(line);
    }
    #cellCenter(cell) {
        const cellRect = cell.getBoundingClientRect();
        return {
            x: cellRect.left + cellRect.width / 2,
            y: cellRect.top + cellRect.height / 2,
        };
    }

    #drawLine(from, to, svg) {
        const a = this.#cellCenter(from);
        const b = this.#cellCenter(to);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', a.x);
        line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x);
        line.setAttribute('y2', b.y);
        svg.appendChild(line);
        return line;
    }
    #popTile(){
        const tile = this.#tilePath.pop();
        if(!tile) return;
        tile.classList.remove("used");
        const word = this._dom.current_word;
        const suffix = tile.textContent.toLowerCase();
        word.textContent = word.textContent.slice(0, -suffix.length);
        const line = this.#lines.pop();
        line.remove();
    }
    /**@param {PointerEvent} event*/
    #onPointerMove(event) {
        event.preventDefault();
        if(this.#activePointerId !== event.pointerId) return;
        const elem = document.elementFromPoint(event.clientX, event.clientY);
        /**@type {Tile} */
        const tile = elem?.closest(".tile");
        if(!tile) return;
        const tilePath = this.#tilePath;
        const previousTile = tilePath.length > 1 ? tilePath[tilePath.length-2] : undefined;
        if(previousTile === tile) return this.#popTile();
        const lastTile = tilePath[tilePath.length-1];
        if(lastTile === tile) return;
        if(tile.classList.contains("used")) return;
        if(Math.abs(lastTile.col - tile.col) > 1 || Math.abs(lastTile.row - tile.row) > 1) return;
        this.#selectTile(tile);
    }
    /**@param {PointerEvent} event*/
    #onPointerUp = (event) => {
        if(event.pointerId !== this.#activePointerId) return;
        this.#activePointerId = null;
        this.#submitWord(this._dom.current_word);
        this._dom.current_word.textContent = "";
        this.#tilePath.forEach(tile => tile.classList.remove("used"));
        this.#tilePath.length = 0;
        this._dom.svg.replaceChildren();
        this.#lines.length = 0;
    }
    /**@type {Set<string>} */
    #foundWords = new Set();
    /**@param {string} word */
    #submitWord(word){
        if(typeof word !== "string") return;
        if(this.answers.has(word)){
            this.#foundWords.add(word);
        } else {
            
        }
    }
    /**@param {{global: {board:string[][], answers:string[], settings:{duration:number}}}} state */
    init_state(state){
        this.#populate_board(state.global.board);
        this.answers = new Set(state.global.answers);
        this.duration = state.global.settings.duration ?? 90;
    }
    /**@typedef {HTMLElement &{row: number, col: number}} Tile */
    /**@param {string[][]} board  */
    #populate_board(board){
        const dom = this._dom;
        dom.board.replaceChildren();
        const board_size = {m:board.length, n: board[0].length}
        for(let i = 0; i< board_size.m; ++i){
            for(let j = 0; j<board_size.n; ++j){
                const tile = document.createElement("div");
                dom.board.appendChild(tile);
                if(board[i][j]===null) continue;
                tile.textContent = board[i][j];
                tile.classList.add("tile");
                tile.setAttribute("data-col", i);
                tile.setAttribute("data-row", j);
                tile.col = i;
                tile.row = j;
            }
        }
        dom.board.style.setProperty("--cols", board_size.m);
        dom.board.style.setProperty("--rows", board_size.n);
    }
    _start(){
        this._dom.container.appendChild(this._dom.start_countdown);
        this.#start_game_countdown(3);
        document.addEventListener("pointerup", this.#onPointerUp);
    }
    #trueStart(){
        this._dom.container.removeChild(this._dom.start_countdown);
        super._start();
        this.#start_timer(this.duration);
        this.#showGame();
    }
    #showGame(){
        const dom = this._dom;
        dom.container.appendChild(dom.timer);
        dom.container.appendChild(dom.current_word);
        dom.container.appendChild(dom.board);
    }
    #hideGame(){
        document.removeEventListener("pointerup", this.#onPointerUp);
        const dom = this._dom;
        dom.container.removeChild(dom.timer);
        dom.container.removeChild(dom.current_word);
        dom.container.removeChild(dom.board);
    }
    #finish(){
        this.#hideGame();
        this.api.send.answers([...this.#foundWords]);
        this.#resetState();
    }
    #resetState(){
        this.#activePointerId = null;
        this.#foundWords.clear();
        this.#tilePath.length = 0;
    }
    /**@param {Object<string, {players:UUID[], score:number}>} results */
    receive_results(results){

    }
    #show_results(){

    }
}
import {AbstractClientHandler} from "./gameAPI.js";
export class ClientHandler extends AbstractClientHandler(BaseHandler){
    init_state(ack_code, state){
        this.game.init_state(state);
        super.init_state(ack_code, state);
    }
    /**@param {Object<string, {players:UUID[], score:number}>} results */
    receive_results(results){
        this.game.receive_results(results);
    }
}
