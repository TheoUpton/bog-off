import {Game as BaseGame, ServerHandler as BaseHandler} from "./game.js";
import {AbstractServerHandler as AbstractHandler} from "../public/games/bog-off/gameAPI.js";
import { dictionaries } from "./resources/dictionary.js";
import { TrieCombiner } from "./resources/trie.js";

import { fileURLToPath } from 'url';
import { basename } from 'path';

const __filename = fileURLToPath(import.meta.url);
const gameName = basename(__filename, '.game.js');

const isDev = process.env.NODE_ENV !== 'production';
/**@typedef {import("../public/shared/lobby.js").Client} Client */
export class Game extends BaseGame{
    static get minPlayers(){return 2};
    static get maxPlayers(){return 2};
    static get gameName(){return gameName};
    static #dice = (() => {
        return Object.freeze({
            _4x4: Object.freeze([
                ['A','E','A','N','E','G'],
                ['A','H','S','P','C','O'],
                ['A','S','P','F','F','K'],
                ['O','B','J','O','A','B'],
                ['I','O','T','M','U','C'],
                ['R','Y','V','D','E','L'],
                ['L','R','E','I','X','D'],
                ['E','I','U','N','E','S'],
                ['W','N','G','E','E','H'],
                ['L','N','H','N','R','Z'],
                ['T','S','T','I','Y','D'],
                ['O','W','T','O','A','T'],
                ['E','R','T','T','Y','L'],
                ['T','O','E','S','S','I'],
                ['T','O','E','S','S','I'],
                ['N','U','I','H','M','Qu']
            ]),
            _5x5: Object.freeze([
                ['A','A','A','F','R','S'],
                ['A','E','E','G','M','U'],
                ['C','E','I','I','L','T'],
                ['D','H','L','N','O','R'],
                ['F','I','P','R','S','Y'],
                ['A','A','E','E','E','E'],
                ['A','E','G','M','N','N'],
                ['C','E','I','L','P','T'],
                ['D','D','L','N','O','R'],
                ['G','O','R','R','V','W'],
                ['A','A','F','I','R','S'],
                ['A','F','I','R','S','Y'],
                ['C','E','I','P','S','T'],
                ['E','I','I','I','T','T'],
                ['H','I','P','R','R','Y'],
                ['A','D','E','N','N','N'],
                ['B','J','K','Qu','X','Z'],
                ['D','H','H','N','O','T'],
                ['E','M','O','T','T','T'],
                ['N','O','O','T','U','W'],
                ['A','E','E','E','E','M'],
                ['C','C','N','S','T','W'],
                ['D','H','H','L','O','R'],
                ['E','N','S','S','S','U'],
                ['O','O','O','T','T','U']
            ]),
            _6x6: Object.freeze([
                ['A','A','A','F','R','S'],
                ['A','A','E','E','E','E'],
                ['A','A','E','E','O','O'],
                ['A','A','F','I','R','S'],
                ['A','B','D','E','I','O'],
                ['A','D','E','N','N','N'],
                ['A','E','E','E','E','M'],
                ['A','E','E','G','M','U'],
                ['A','E','G','M','N','N'],
                ['A','E','I','L','M','N'],
                ['A','E','I','N','O','U'],
                ['A','F','I','R','S','Y'],
                ['An','Er','He','In','Qu','Th'],
                ['B','B','J','K','X','Z'],
                ['C','C','E','N','S','T'],
                ['C','D','D','L','N','N'],
                ['C','E','I','I','T','T'],
                ['C','E','I','P','S','T'],
                ['C','F','G','N','U','Y'],
                ['D','D','H','N','O','T'],
                ['D','H','H','L','O','R'],
                ['D','H','H','N','O','W'],
                ['D','H','L','N','O','R'],
                ['E','H','I','L','R','S'],
                ['E','I','I','L','S','T'],
                ['E','I','L','P','S','T'],
                ['E','I','O',null,null,null],
                ['E','M','T','T','T','O'],
                ['E','N','S','S','S','U'],
                ['G','O','R','R','V','W'],
                ['H','I','R','S','T','V'],
                ['H','O','P','R','S','T'],
                ['I','P','R','S','Y','Y'],
                ['J','K','Q','W','X','Z'],
                ['N','O','O','T','U','W'],
                ['O','O','O','T','T','U']
            ])
        })
    })();
    static get dice(){return this.#dice;}
    /**@type {Omit<import('../lobby.js').ServerLobby, "api"> & {api:import("../public/games/bog-off/gameAPI.js").LobbyAPI}} */
    get lobby(){return super.lobby;}
    /**@type {{global:{board:string[][], answers: Set<string>, settings:{}}, client: Map<Client, undefined>}}*/
    _initial_state = this._initial_state;
    constructor(){
        super();
        this.#set_board_size(4,4);
        this._initial_state.global = {board:[], answers:new Set(), settings:{}};
        this._initial_state.global.answers.toJSON = function(){return [...this];};
    }
    /**@param {number} m @param {number} n  */
    #set_board_size(m,n){
        this.board_size = {m,n}
        if(m ==4 & n==4){
            this.dice = Game.dice._4x4;
            this.dictionary = dictionaries._16;
        } else if (m ==5 & n==5){
            this.dice = Game.dice._5x5;
            this.dictionaries = new TrieCombiner(
                dictionaries._16,
                dictionaries._25
            );
        } else if( m ==6 && n == 6){
            this.dice = Game.dice._6x6;
            this.dictionaries = new TrieCombiner(
                dictionaries._16,
                dictionaries._25,
                dictionaries._36
            );
        }
    }
    game_init(){
        this._initial_state.global.answers.clear();
        this._initial_state.global.board = this.#generate_board();
        this.#generate_answers();
        super.game_init();
    }
    // #region Board Generation
    #generate_board(){
        const rolledDice = this.#select_dice_sides(this.dice);
        const permutedDice = this.#random_permute(rolledDice);
        const board = this.#list_to_mxn(permutedDice, this.board_size);
        return board;
    }
    /**@param {string[][]} dice @returns {string[]} */
    #select_dice_sides(dice){return dice.map(die => die[Math.floor(Math.random()*die.length)]);}
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
     * @param {string[]} list 
     * @param {{n:number, m:number}} dimensions 
     * @returns {string[][]} an n x m array of strings
     */
    #list_to_mxn(list, {m, n}){
        const grid = [];
        for(let i = 0; i < m ; ++i){
            const row = [];
            for(let j = 0; j < n ; ++j){
                row.push(list[i * n + j]);
            }
            grid.push(row);
        }
        return grid;
    }
    // #end-region
    // #region Answer Generation
    /**@type {import("./resources/trie.js").Trie} */
    trie;
    #generate_answers(){
        const board = this._initial_state.global.board;
        const answers = this._initial_state.global.answers;
        const size = this.board_size;
        /**@type {boolean[][]} */
        const used_array = Array.from({length: size.m}, () => Array(size.n).fill(false));
        for(let i = 0; i < size.m ; ++i)
            for(let j = 0; j < size.n ; ++j)
                this.#depth_first_search("", used_array, board, i, j, this.dictionary, answers);
        return answers;
    }
    /**
     * @param {string} current_string 
     * @param {boolean[][]} used_array 
     * @param {string[][]} board 
     * @param {number} row 
     * @param {number} col 
     * @param {{n:number, m:number}} board_size
     * @param {import("./resources/trie.js").Trie} trie 
     * @param {Set<string>} answers 
     * @returns 
     */
    #depth_first_search(current_string, used_array, board, row, col, trie, answers){
        const char = board[row][col].toLowerCase();
        if(char===null) return;
        current_string = current_string + char;
        const current_trie = trie.get(char);
        if(!current_trie) return;
        if(current_trie.isWord()) answers.add(current_string);
        if(!current_trie.hasMore()) return;
        used_array[row][col] = true;
        for(let i = row-1; i<= row+1;++i){
            if(i<0 || i>= this.board_size.m) continue;
            for(let j = col-1; j<=col+1; ++j){
                if(j<0 || j>= this.board_size.n) continue;
                if(i==row && j==col) continue;
                if(board[i][j] === null) continue;
                if(used_array[i][j]) continue;
                this.#depth_first_search(current_string, used_array, board, i, j, current_trie, answers);
            }
        }
        used_array[row][col] = false;
    }
    //#end-region

    /**@typedef {{valid:Set<string>, invalid:Set<string>}} validated_answers*/
    /**@type {Map<Client, validated_answers>} */
    #validated_player_answers = new Map();
    /**@param {Client} client @param {string[]} answers @returns */
    receive_answers(client, answers){
        const validated = this.#validate_client_answers(answers);
        this.#validated_player_answers.add(client, validated);
        if(this.#validated_player_answers.size !== this.lobby.players.size) return;
        this.#calculate_word_scores();
        this.#broadcast_results();
    }
    /**@param {string[]} answers  @return {validated_answers}*/
    #validate_client_answers(answers){
        /**@type {Set<string>} */
        const valid = new Set();
        /**@type {Set<string>} */
        const invalid = new Set();
        for(const answer of answers)
            (this._initial_state.global.answers.has(answer) ? valid : invalid).add(answer);
        return {valid, invalid};
    }

    #calculate_word_scores(){
        this.#word_scores.clear();
        this.#player_scores.clear();
        this.lobby.players.forEach(player => {
            const valid_answers = this.#validated_player_answers.get(player).valid;
            valid_answers.forEach(answer => this.#process_answer(player, answer))
        });
    }
    /**@param {Client} player @param {string} answer */
    #process_answer(player, answer){
        const word_score = this.#word_scores.get(answer) ?? {players: new Set(), score: 0};
        const players  = word_score.players;
        const multiplier = player.size === 0 ? this.#unique_word_multiplier : this.#duplicate_word_multiplier
        word_score.score = this.#score_word(answer.length) * multiplier;
        if(players.size === 0) this.#word_scores.set(answer, word_score);
        else if(players.size === 1) this.#adjust_duplicate_score(answer);
        players.add(player);
        const currentScore = this.#player_scores.get(player) ?? 0;
        this.#player_scores.set(player, currentScore + word_score.score);
    }
    /**@param {string} answer  */
    #adjust_duplicate_score(answer){
        const word_score = this.#word_scores.get(answer);
        const [existing_player] = word_score.players;
        const old_score = this.#player_scores.get(existing_player)
        const score_reduction = (word_score.score * (this.#unique_word_multiplier-this.#duplicate_word_multiplier));
        this.#player_scores.set(existing_player, old_score - score_reduction)
    }
    #unique_word_multiplier = 2;
    #duplicate_word_multiplier = 1;
    /**@type {Map<string, {players:Set<Client>, score:number}>} */
    #word_scores = new Map();
    /**@type {Map<Client, number>} */
    #player_scores = new Map();
    /**@type {function(length: number): number}*/
    #score_word = this.#score_by_length;
    #score_by_length(wordLength){return wordLength <3 ? 0 : (wordLength-2)}
    #score_traditional(wordLength){
        if(wordLength >=8) return 11;
        const scores = {3:1,4:1,5:2,6:3,7:5};
        return scores[wordLength];
    }
    #broadcast_results(){
        const entries = Object.fromEntries(this.#word_scores);
        for(const key in entries){
            const players = [...entries[key].players]
            const ids = players.map(player => player.id);
            entries[key].players = ids;
        }
        this.lobby.api.broadcast.results(entries);
    }
}

//const {ServerHandler: Handler} = await import(`../public/games/${gameName}/gameAPI.js`);
export class ServerHandler extends AbstractHandler(BaseHandler){
    /**@type {Game} */ //game = super.game;
    get game(){return super.game;}
    receive_answers(answers){this.game.receive_answers(this.client, answers);}
    
}