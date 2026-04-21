import {Game as BaseGame, ClientHandler as BaseHandler} from "../../base-game.js";
export {ClientAPI, receiverKey} from "./gameAPI.js";

export class Game extends BaseGame{
    static get name(){return "tic-tac-toe"};
    /**@returns {InstanceType<typeof BaseGame>["_dom"] & {board: HTMLElement}} */
    get _dom(){return super._dom;}
    async _init(){
        await super._init();
        /**@type {HTMLElement} */
        this._dom.board = this._dom.container.querySelector("#board");
        this.xSVG = this._dom.base.querySelector("#x-icon");
        this.oSVG = this._dom.base.querySelector("#o-icon");
        this._dom.cellsNodeList = this._dom.board.querySelectorAll(".cell");
        this._dom.cells = [[null,null, null],[null,null, null],[null,null, null]];
        this._dom.cellsNodeList.forEach(cell => {
            const row = cell.getAttribute("data-row");
            const col = cell.getAttribute("data-col");
            this._dom.cells[row][col] = cell;
        })
        const cell_clicked = this.#cell_clicked.bind(this);
        this._dom.board.addEventListener("click", (event) => {
            const cell = event.target.closest(".cell");
            if(cell) cell_clicked(cell);
        });
        this._dom.win_line = {};
        this._dom.win_line.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this._dom.win_line.svg.classList.add('win-line');
        this._dom.win_line.line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        this._dom.win_line.svg.appendChild(this._dom.win_line.line);
    }
    players = new Map();
    init_state(nextPlayer, x, o){
        this._dom.cells.forEach(cell => this.#reset(cell));
        for (const key in this._dom.screen)
            this.#hideElem(this._dom.screen[key]);
        this.currentPlayer = this.lobby.clients.get(nextPlayer);
        this.players.set(x, "x");
        this.players.set(o, "o");
        this._dom.win_line.svg.remove()
    }
    /**@param {HTMLElement} cell  */
    #cell_clicked(cell){
        if(!this.isActive) return;
        if(this.currentPlayer !== this.me) return;
        if(!!this.#getValue(cell)) return;
        this.currentPlayer = null;
        this.#assign(cell, this.players.get(this.me.id));
        const row = cell.getAttribute("data-row");
        const col = cell.getAttribute("data-col");
        this.api.send.player_move(row,col);
        console.log("test");
    }
    /**@param {HTMLElement} cell  */
    #assign(cell, value){
        const template = this[value + "SVG"];
        if(template) cell.replaceChildren(template.content.cloneNode(true))
    }
    /**@param {HTMLElement} cell  */
    #getValue(cell){
        return cell.firstChild?.getAttribute("data-value");
    }
    #reset(cell){cell.innerHTML = "";}
    #showElem(elem){}
    #hideElem(elem){}
    update_state(currentPlayer, row, col, nextPlayer){
        const cell = this._dom.cells[row][col];
        if(!cell) this.me.api.send.error();
        this.#assign(cell, this.players.get(currentPlayer));
        this.currentPlayer = this.lobby.clients.get(nextPlayer);
    }
    _start(){
        super._start();

    }
    result_tie(){

    }
    result_win(){

    }
    result_loss(){

    }
    //Claude generated code
    drawLine({from, to}){
        const board = this._dom.board;
        const {svg, line} = this._dom.win_line;

        const fromCell = this._dom.cells[from.r][from.c];
        const toCell   = this._dom.cells[to.r][to.c];

        const boardRect = board.getBoundingClientRect();
        const fromRect  = fromCell.getBoundingClientRect();
        const toRect    = toCell.getBoundingClientRect();

        const x1 = fromRect.left + fromRect.width  / 2 - boardRect.left;
        const y1 = fromRect.top  + fromRect.height / 2 - boardRect.top;
        const x2 = toRect.left   + toRect.width    / 2 - boardRect.left;
        const y2 = toRect.top    + toRect.height   / 2 - boardRect.top;

        for( const [key, val] of Object.entries({x1, y1, x2, y2}))
            line.setAttribute(key, val); 

        const length = Math.hypot(x2 - x1, y2 - y1);
        line.style.setProperty('--line-length', length);

        svg.remove();
        board.appendChild(svg);
    }
}
import {AbstractClientHandler} from "./gameAPI.js";
export class ClientHandler extends AbstractClientHandler(BaseHandler){
    update_state(currentplayer, row, col, nextPlayer){
        this.game.update_state(currentplayer, row, col, nextPlayer)
    }
    result_tie(){this.game.result_tie();}
    result_win(client, line){
        //if(this.client.id == client) this.game.result_win();
        //else this.game.result_loss();
        this.game.drawLine(line);
    }
    init_state(ack_code, state){
        this.game.init_state(state.global.nextPlayer, state.global.x, state.global.o);
        super.init_state(ack_code, state);
    }
}
