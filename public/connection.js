import {ClientAPI as API} from "./shared/userAPI.js";
import {me,  UserHandler } from "./me.js";

const isDev = window.location.hostname === 'localhost';

let customQuery = window.location.search == "" ? "?" :"";
customQuery += localStorage.getItem("privateId") ? `&privateId=${me._privateId}` : "";
customQuery += localStorage.getItem("id") ? `&id=${me.id}` : "";
customQuery += localStorage.getItem("name") ? `&name=${me.name}` : "";
customQuery += `&type=${me.type}`;

if(isDev) console.debug("customQuery:",customQuery);

export function connect(){
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const socket = new WebSocket(`${protocol}://${window.location.host}${window.location.search}${customQuery}`)

    const sender = (message) => {
        if (isDev) console.debug("outgoing:", message)
        socket.send(JSON.stringify(message))
    }
    const handler = new UserHandler(me);
    const api = new API({sender,handler});
    me._api = api;

    socket.addEventListener('message', (event) => {
        if(isDev) console.debug("incoming:", event.data)
        const message = JSON.parse(event.data);
        api.receive(message);
    });
}