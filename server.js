const WebSocket = require('ws');
const wss = new WebSocket.Server({
    port: 8080
}, () => {
    console.log(`Server started`);
});

wss.on('connection', (ws) => {
    ws.on('message', (data) => {
        console.log(`Data recieved ${data}`);
        ws.send(data);
    });
});

wss.on('listening', () => {
    console.log("Server online on port 8080")
});