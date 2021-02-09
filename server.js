const WebSocket = require('ws');
const uuid = require('uuid');

let Lobbies = [];


const wss = new WebSocket.Server({
    port: 8080
}, () => {
    console.log(`Server started`);
});
setInterval(() => {
    console.log(`Online clients: ${wss.clients.size}`);
   // console.log(Lobbies)
}, 1000)

wss.on('connection', (ws, req) => {
    ws.clientID = uuid.v4();
    console.log(`New connection: ${ws.clientID}, ${wss.clients.size}`);
    ws.send(JSON.stringify({
        type: "UpdateID",
        id: ws.clientID
    }));
    ws.on('message', (data) => {
        data = JSON.parse(data);
        data.ID = ws.clientID;
        data.LobbyID = uuid.NIL;
        if (data.type != "PlayerInfo") {
            console.log(data)
        }
        if (data.type == "travelMap") {
            data.LobbyID = addToLobby(ws, data.map).UUID;
        } else {
            const lobby = getLobby(data.LobbyID);
            if (lobby == undefined) return;

            // console.log(`Data recieved ${data}`);
            lobby.clients.forEach(function each(client) {
                if (client != ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    });
    ws.on('close', (data) => {
        data = JSON.parse(data);
        console.log(`${ws.clientID} left the server`);
        const lobby = getLobby(data.LobbyID);
        if (lobby == undefined) return;
        lobby.clients.forEach(function each(client) {
            if (client != ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                    type: "Disconnect",
                    id: ws.clientID
                }));
                removeFromLobby(ws);
            }
        });
    })
});

wss.on('listening', () => {
    console.log("Server online on port 8080")
});

function getLobby(UUID) {
    const lobby = Lobbies.filter(function (lobby) {
        return lobby.UUID == UUID;
    });
    if (!lobby || lobby.length == 0) return undefined;
    return lobby[0];
}

function removeFromLobby(user) {
    for (let i = 0; i < Lobbies.length; i++) {
        if (Lobbies[i].UUID == user.LobbyID) {
            Lobbies[i].users = Lobbies[i].users.filter(function (el) {
                return el.clientID != user.clientID;
            });
            return;
        }
    }
}

function addToLobby(user, mapName) {
    for (let i = 0; i < Lobbies.length; i++) {
        if (Lobbies[i].mapName.toLowerCase() == mapName.toLowerCase()) {
            Lobbies[i].clients.push(user);
            console.log(`${user.clientID} added to lobby: ${Lobbies[i].UUID}`);
            return Lobbies[i];
        }
    }
    CreateNewLobby(mapName);
    return addToLobby(user, mapName);
}

function CreateNewLobby(mapName) {
    const newLobby = {
        UUID: uuid.v4(),
        mapName: mapName,
        startTime: Date.now(),
        clients: []
    }
    Lobbies.push(newLobby);
    console.log(`Lobby created: ${JSON.stringify(newLobby)}`)
    return newLobby;
}