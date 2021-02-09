const WebSocket = require('ws');
const wss = new WebSocket.Server({
    port: 8080
}, () => {
    console.log(`Server started`);
});

wss.on('connection', (ws) => {
    console.log(`New connection ${ws.listenerCount()}`)
    ws.on('message', (data) => {
     //  console.log(`Data recieved ${data}`);
        wss.clients.forEach(function each(client) {
            if (client == ws && client.readyState === WebSocket.OPEN) {
              client.send(data);
            }
          });
    });
});

wss.on('listening', () => {
    console.log("Server online on port 8080")
});