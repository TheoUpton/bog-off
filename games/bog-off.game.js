import {Game as BaseGame, ServerHandler as BaseHandler} from "./game.js";
import {AbstractServerHandler as AbstractHandler} from "../public/games/bog-off/gameAPI.js";

import { fileURLToPath } from 'url';
import { basename } from 'path';
import { workerData } from "worker_threads";
const __filename = fileURLToPath(import.meta.url);
const gameName = basename(__filename, '.game.js');

const isDev = process.env.NODE_ENV !== 'production';

export class Game extends BaseGame{
    static get minPlayers(){return 2};
    static get maxPlayers(){return 2};
    static get gameName(){return gameName};
    /**@type {Omit<import('../lobby.js').ServerLobby, "api"> & {api:import("../public/games/bog-off/gameAPI.js").LobbyAPI}} */
    lobby;
    game_init(){
        this._initial_state.global = {board:[], answers:new Set(), settings:{}};
        this._initial_state.global.answers.toJSON = this.#set_toJSON;
        this.#generate_board();
        this.#generate_answers();
        super.game_init();
    }
    #set_toJSON(){return [...this];}
    #generate_board(){
        const rolledDice = this.#select_dice_sides(this.dice);
        const permutedDice = this.#random_permute(rolledDice);
        const board = this.#list_to_nxm(permutedDice, this.board_size);
        this._initial_state.global.board = board;
    }
    dice = dice_4x4;
    board_size = {n:4,m:4};
    dice_4x4 = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];
    dice_5x5 = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];
    dice_6x6 = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];
    /**@param {string[][]} dice @returns {string[]} */
    #select_dice_sides(dice){
        return dice.map(die => die[Math.floor(Math.random()*die.size)]);
    }
    /**@template T @param {T[]} array @returns {T[]}*/
    #random_permute(array){
        const copy = [...array];
        for (let i = copy.length - 1; i > 0; --i) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }
    /**
     * 
     * @param {string[]} list 
     * @param {{n:number, m:number}} param1 
     * @returns {string[][]} an n x m array of strings
     */
    #list_to_nxm(list, {n,m}){
        const grid = [];
        for(const i = 0; i < n ; ++i){
            const row = [];
            for(const j = 0; j < m ; ++j){
                row.push(list[i * m + j]);
            }
            grid.push(row);
        }
        return grid;
    }
    #generate_answers(){
        const answers = this._initial_state.global.answers;
        const board = this._initial_state.global.board;

        
    }
    /**@typedef {{valid:Set<string>, invalid:Set<string>}} validated_answers*/
    /**@type {Map<Client, validated_answers>} */
    #validated_player_answers = new Map();
    receive_answers(client, answers){
        const validated = this.#validate_answers(answers);
        this.#validated_player_answers.add(client, validated);
        if(this.#validated_player_answers.size !== this.lobby.players.size) return;
        this.#calculate_word_scores();
    }
    /**@param {string[]} answers  @return {validated_answers}*/
    #validate_answers(answers){
        /**@type {Set<string>} */
        const valid = new Set();
        /**@type {Set<string>} */
        const invalid = new Set();
        for(const answer of answers)
            (this._initial_state.global.answers.has(answer) ? valid : invalid).add(answer);
        return {valid, invalid};
    }
    #unique_word_multiplier = 2;
    #duplicate_word_multiplier=1;
    /**@type {Map<string, {players:Set<import("../public/shared/lobby.js").Client>, score:number}>} */
    #word_scores = new Map();
    /**@type {Map<import("../public/shared/lobby.js").Client, number>} */
    #player_scores = new Map()
    #score_word = this.#score_by_length;
    #score_by_length(wordLength){return wordLength <3 ? 0 : (wordLength-2)}
    #score_traditional(wordLength){
        if(wordLength >=8) return 11;
        const scores = {3:1,4:1,5:2,6:3,7:5};
        return scores[wordLength];
    }
    #calculate_word_scores(){
        this.#word_scores.clear();
        this.#player_scores.clear();
        this.lobby.players.forEach(player => {
            const answers = this.#validated_player_answers.get(player).valid;
            [...answers].forEach(answer => {
                /**@type  {{players:Set<import("../public/shared/lobby.js").Client>, score:number}}*/
                const obj = this.#word_scores.has(answer) ? this.#word_scores.get(answer) : {players: new Set(), score: 0};
                const players  = obj.players;
                if(players.size === 0){
                    this.obj.score = this.#score_word * this.#unique_word_multiplier;
                    this.#word_scores.set(answer, obj);
                } else if(players.size === 1){
                    const wordScore = this.#score_word(answer.length)
                    obj.score =  wordScore * this.#duplicate_word_multiplier;
                    const oldPlayer = players.values().next().value;
                    const oldPlayerScore = this.#player_scores.get(oldPlayer)
                    const adjustedScore = oldPlayerScore - (wordScore*(this.#unique_word_multiplier-this.#duplicate_word_multiplier))
                    this.#player_scores.set(oldPlayer, adjustedScore)
                }
                players.add(player);
                const currentScore = this.#player_scores.get(player);
                this.#player_scores.set(player, currentScore + obj.score);
            })
        });
    }
}

//const {ServerHandler: Handler} = await import(`../public/games/${gameName}/gameAPI.js`);
export class ServerHandler extends AbstractHandler(BaseHandler){
    /**@type {Game} */ game;
    receive_answers(answers){this.game.receive_answers(this.client, answers);}
    
}