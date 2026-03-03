const express = require('express')
const http = require('http')
const { WebSocketServer } = require('ws')

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

app.use(express.static('public'))

wss.on('connection', (socket) => {
  console.log('a player connected')

  socket.on('message', (data) => {
    const message = JSON.parse(data.toString())
  })

  socket.on('close', () => {
    console.log('a player disconnected')
  })
})

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000')
})