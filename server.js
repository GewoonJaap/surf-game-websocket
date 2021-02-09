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
    console.log(JSON.stringify(Lobbies))
}, 1000 * 10)

setInterval(AutomaticClean, 1000 * 10);

wss.on('connection', (ws, req) => {
    ws.clientID = uuid.v4();
    ws.LobbyID = uuid.NIL;
    console.log(`New connection: ${ws.clientID}, ${wss.clients.size}`);
    ws.send(JSON.stringify({
        type: "UpdateID",
        id: ws.clientID
    }));
    ws.on('message', (data) => {
        data = JSON.parse(data);
        data.ID = ws.clientID;
        if (data.type == "travelMap") {
            ws.LobbyID = addToLobby(ws, data.map).UUID;
        } else {
            const lobby = getLobby(ws.LobbyID);
            if (lobby == undefined) {
                console.log(`No lobby found for: ${ws.LobbyID}`);
                ws.LobbyID = addToLobby(ws, data.map).UUID;
                return;
            }
            // console.log(`Data recieved ${data}`);
            lobby.clients.forEach(function each(client) {
                if (client != ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    });
    ws.on('close', (data) => {
        console.log(`${ws.clientID} left the server`);
        const lobby = getLobby(ws.LobbyID);
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
            Lobbies[i].clients = Lobbies[i].clients.filter(function (el) {
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
            user.send(JSON.stringify({
                type: "UpdateLobbyID",
                id: ws.LobbyID
            }));
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

function AutomaticClean() {
    console.log(`Cleaning`)
    for (let i = 0; i < Lobbies.length; i++) {
        if (Lobbies[i].clients.length == 0) {
            console.log(`Removing lobby: ${Lobbies[i].UUID}`)
            Lobbies.splice(i, 1);
            return AutomaticClean();
        } else {
            Lobbies[i].clients = Lobbies[i].clients.filter(function (client) {
                return client.readyState === WebSocket.OPEN;
            });
        }
    }
}