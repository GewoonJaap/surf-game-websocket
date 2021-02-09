const WebSocket = require('ws');
const uuid = require('uuid');
const wss = new WebSocket.Server({
    port: 8080
}, () => {
    console.log(`Server started`);
});
setInterval(() => {
    console.log(`Online clients: ${wss.clients.size}`)
}, 1000)

wss.on('connection', (ws, req) => {
    ws.clientID = uuid.v4();
    console.log(`New connection: ${ws.clientID}, ${wss.clients.size}`);
    ws.send(JSON.stringify({
        type: "UpdateID",
        id: ws.clientID
    }));
    ws.on('message', (data) => {
        data.ID = ws.clientID;
        // console.log(`Data recieved ${data}`);
        wss.clients.forEach(function each(client) {
            if (client != ws && client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });
    ws.on('close', (data) => {
        console.log(`${ws.clientID} left the server`)
        wss.clients.forEach(function each(client) {
            if (client != ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "Disconnect",
                    id: ws.clientID
                }));
            }
        });
    })
});

wss.on('listening', () => {
    console.log("Server online on port 8080")
});