# Multiplayer Game Server

A WebSocket-based multiplayer game server built in Node.js, designed to support multiple game types within a shared lobby system.

---

## What is it?

This project started as an exercise in backend development, specifically to get hands-on experience with Node.js, WebSockets, ES modules, and async programming. It has since evolved into a structured game server architecture with a working tic-tac-toe implementation as a proof of concept.

There is no polished UI. This is backend-focused work and the frontend is minimal by design.

---

## Getting started

**Prerequisites**
- Node.js v24 or later

**Install and run**

    npm install
    npm run dev

Then open `http://localhost:3000` in your browser.

---

## Architecture

**Layered API system**
- Communication is centralised into a shared API module rather than scattered socket sends
- The API is structured in layers: base, main lobby, base game, and game-specific, each extending the layer below and adding its own message types
- Method names on the handler are used directly as message types, so renaming a method keeps both sides of the connection in sync automatically
- Each send is a named method call rather than a generic socket send, making the codebase significantly easier to navigate and maintain

**Single socket listener with message forwarding**
- Each client has one socket listener
- Messages are routed to the correct handler via a receiver registry
- When a game API is created it registers a receiver key, and incoming messages are forwarded to the correct game API without the game needing its own socket listener

**Acknowledgement codes**
- Certain messages require the client to acknowledge receipt before the server proceeds
- An acknowledgement code is sent with the message and must be returned by the client
- This prevents the server acting on a stale acknowledgement that corresponds to an earlier message rather than the current one

**Proxy access for games**
- Games receive proxy objects for the lobby and connected clients rather than direct references
- Client proxies use the native JS Proxy API
- Lobby proxies are custom objects that mirror the lobby and listen for updates
- Games can read state and attach their own data to client proxies but cannot modify the underlying lobby directly

---

## Current state

A working tic-tac-toe implementation demonstrates the architecture. Two players connect, take turns, and the winning combination is highlighted. The project is intended to support board and card games and is still in active development.

---

## Built with

- Node.js v24
- Express v5
- ws (WebSockets)
- ES Modules