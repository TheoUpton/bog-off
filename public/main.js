const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
const socket = new WebSocket(`${protocol}://${window.location.host}`)

socket.addEventListener('open', () => {
    console.log('connected to server')
    socket.send(JSON.stringify({ type: 'join', name: 'Alice' }))
})