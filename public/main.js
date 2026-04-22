const isDev = window.location.hostname === 'localhost';
import { Handler } from "./lobby.js";
import { ClientAPI } from "./shared/LobbyAPI.js";
import { me } from "./me.js";

let customQuery = window.location.search == "" ? "?" :"";
customQuery += me._privateId ? `&privateId=${me._privateId}` : "";
customQuery += me.id ? `&id=${me.id}` : "";
customQuery += me.name ? `&name=${me.name}` : "";

if(isDev) console.debug(customQuery);
const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const socket = new WebSocket(`${protocol}://${window.location.host}${window.location.search}${customQuery}`)

const allPages = document.getElementsByClassName("page");
allPages.hideAll = () => Array.from(allPages).forEach(page => page.classList.add("hide"));

let GAME_KEYS;

const handler = new Handler();

const api = new ClientAPI(
    (message) => {
        if (isDev) console.debug("outgoing:", message)
        socket.send(JSON.stringify(message))
    },
    handler
);

socket.addEventListener('message', (event) => {
    if(isDev) console.debug("incoming:", event.data)
    const message = JSON.parse(event.data);
    api.receive(message);
});
