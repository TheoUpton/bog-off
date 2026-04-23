import express from "express"; 
import http from "http";
import {WebSocketServer} from "ws";

import { User } from "./user.js";

const isDev = process.env.NODE_ENV !== 'production';

export function createServer(){
    const app = express();
    const server = http.createServer(app);
    const wss = new WebSocketServer({ server });
    app.use(express.static('public'));

    wss.on('connection', (socket, request) => {
        if(isDev) console.log('a player connected');

        const user = new User(socket, request);

        socket.on('message', (data) => {
            const message = data.toString();
            if(isDev) console.debug(`incoming message: ${message}`);
            user.api.receive(JSON.parse(message));
        })

        socket.on('close', () => user.connection_closed());
    });

    return server;
}
if(process.env.NODE_ENV !== "test"){
    createServer().listen(3000, () => {
        console.log('Server running on http://localhost:3000')
    });
}

