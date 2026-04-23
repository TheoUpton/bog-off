import {Game as BaseGame, ServerHandler as BaseHandler} from "./game.js";
import {AbstractServerHandler as AbstractHandler} from "../../public/games/tic-tac-toe/gameAPI.js";

import { fileURLToPath } from 'url';
import { basename } from 'path';
const __filename = fileURLToPath(import.meta.url);
const gameName = basename(__filename, '.game.js');

const isDev = process.env.NODE_ENV !== 'production';

export class Game extends BaseGame{
    static get minPlayers(){return 2};
    static get maxPlayers(){return 2};
    static get gameName(){return gameName};
    /**@type {Omit<import('../lobby.js').ServerLobby, "api"> & {api:import("../public/games/tic-tac-toe/gameAPI.js").LobbyAPI}} */
    get lobby(){return super.lobby;}
    #turnOrder; #turn = 0; #board = [[null, null, null],[null, null, null],[null, null, null]]
    game_init(){
        this.#generate_turn_order();
        this._initial_state.global = {nextPlayer: this.#turnOrder[0].id,x: this.#turnOrder[0].id, o: this.#turnOrder[1].id};
        super.game_init();
    }
    #generate_turn_order(){
        const players = [...this.lobby.users.values()].filter(user => user.isPlayer);
        const probability = isDev ? 1 : 0.5;
        this.#turnOrder = Math.random() <= probability ? players : [players[1], players[0]] ;
    }
    receive_turn(user, row, col){
        if(!this.phase === Game.phases.active) return;
        if(!this.#validate_turn(user, row, col)) return;
        this.#board[row][col] = user;
        const result = this.#isGameOver(row, col);
        if(result === false) {
            this.lobby.api.broadcast.update_state(this.#turnOrder[this.#turn %2].id, row, col, this.#turnOrder[(this.#turn+1) %2].id)
            this.#turn++;
            return;
        }
        this.lobby.api.broadcast.update_state(this.#turnOrder[this.#turn %2].id, row, col, null)
        if(result === null) this.lobby.api.broadcast.result_tie();
        else this.lobby.api.broadcast.result_win(user, result);
        this._gameOver();
    }
    #validate_turn(user, row, col){
        if(user !== this.#turnOrder[this.#turn %2]) return false;
        if(this.#board[row][col] !== null) return false;
        return true;
    }
    #isGameOver(row, col){
        const board = this.#board;
        if(board[row][col] === board[row][(col+1)%3] && board[row][col] == board[row][(col+2)%3]) return {from:{r:row, c:0}, to:{r:row, c:2}};
        if(board[row][col] === board[(row+1)%3][col] && board[row][col] == board[(row+2)%3][col]) return {from:{r:0, c:col}, to:{r:2, c:col}};
        if(row == col)
            if(board[row][col] === board[(row+1)%3][(col+1)%3] && board[row][col] == board[(row+2)%3][(col+2)%3]) return {from:{r:0, c:0}, to:{r:2, c:2}};
        if(row+col == 2)
            if(board[row][col] === board[(row+1)%3][(col-1)%3] && board[row][col] == board[(row-1)%3][(col+1)%3]) return {from:{r:2, c:0}, to:{r:0, c:2}};
        if(this.#turn == 8) return null;
        return false;
    }
}

//const {ServerHandler: Handler} = await import(`../public/games/${gameName}/gameAPI.js`);

export class ServerHandler extends AbstractHandler(BaseHandler){
    /**@type {Game} */ get game(){return super.game;};
    receive_turn(row, col){this.game.receive_turn(this.user, row, col)}
}