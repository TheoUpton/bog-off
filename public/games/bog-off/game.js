import {Game as BaseGame, ClientHandler as BaseHandler} from "../../base-game.js";
export {ClientAPI as GameAPI} from "./gameAPI.js";

export class Game extends BaseGame{
    static get name(){return "bog-off"};
    
    init_state(state){
        
    }
}
import {AbstractClientHandler} from "./gameAPI.js";
export class ClientHandler extends AbstractClientHandler(BaseHandler){
    update_state(row, col){
        
    }
    init_state(ack_code, state){

        super.init_state(ack_code, state);
    }
}
