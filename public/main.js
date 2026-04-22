import { connect } from "./connection.js";
import { me, profileDOM } from "./me.js";
import { home } from "./home.js";
import { lobbyDOM } from "./lobby.js";
import { Game } from "./base-game.js";

const allPages = document.getElementsByClassName("page");
const hideAll = () => Array.from(allPages).forEach(page => page.classList.add("hide"));

connect();
showHome();

function showHome(){
    profileDOM.unlock();
    hideAll();
    home.show();
    me.onJoinLobby = showLobby;
}
function showLobby(){
    const lobby = lobbyDOM.lobby;
    hideAll();
    profileDOM.unlock();
    lobbyDOM.show();
    lobbyDOM.onLeave = showHome;
    lobby.onGameSelected = animateSelection;
    lobby.onGameLoad = showGame;
}

function animateSelection(gameStr){
    profileDOM.lock();
    lobbyDOM.game_select_animation();
}

/**@param {Game} game */
function showGame(game){
    hideAll();
    game.show();
    game.onEnd = showLobby;
}