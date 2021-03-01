require('dotenv').config()
const WebSocket = require('ws');
const uuid = require('uuid');
const fs = require('fs');
const https = require('https');

const PORT = 8080;

// const server = https.createServer({
//     cert: fs.readFileSync(process.env.CERT),
//     key: fs.readFileSync(process.env.PRIVATEKEY),
//     ca: fs.readFileSync(process.env.CA)
//   });

let Lobbies = [];


const wss = new WebSocket.Server({
    port: PORT
    //server
}, () => {
    console.log(`Matchmaking Server started`);
});



//server.listen(8080);


setInterval(() => {
    console.log(`Online clients: ${wss.clients.size}`);
    console.log(Lobbies)
}, 1000 * 10)

setInterval(AutomaticClean, 1000 * 10);

wss.on('connection', (ws, req) => {
    ws.clientID = uuid.v4();
    ws.LobbyID = uuid.NIL;
    ws.map = "none";
    ws.useBuffer = false;
    console.log(`New connection: ${ws.clientID}, ${wss.clients.size}`);
    ws.send(JSON.stringify({
        type: "UpdateID",
        id: ws.clientID
    }));

    ws.send(Buffer.from(JSON.stringify({
        type: "UpdateID",
        id: ws.clientID
    })));

    ws.on('message', (data) => {
        ws.useBuffer = Buffer.isBuffer(data);
        data = data.toString('utf8');

        data = JSON.parse(data);
        data.ID = ws.clientID;
        if (data.type == "travelMap") {
            console.log("Travelmap!", data)
            ws.map = data.map;
            ws.LobbyID = addToLobby(ws, data.map).UUID;
        } else {
            const lobby = getLobby(ws.LobbyID);
            if (lobby == undefined) {
                //console.log(`No lobby found for: ${ws.LobbyID}`);
                //ws.LobbyID = addToLobby(ws, ws.map).UUID;
                let message = JSON.stringify({
                    type: "requestMap"
                });
                if (ws.useBuffer) {
                    message = Buffer.from(message);
                }
                ws.send(message);
                return;
            }
            // console.log(`Data recieved ${data}`);
            lobby.clients.forEach(function each(client) {
                if (client != ws && client.readyState === WebSocket.OPEN) {
                    let message = JSON.stringify(data);
                    if (client.useBuffer) {
                        message = Buffer.from(message);
                    }
                    client.send(message);
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

                let message = JSON.stringify({
                    type: "Disconnect",
                    id: ws.clientID
                });
                if (client.useBuffer) {
                    message = Buffer.from(message);
                }
                client.send(message);
                removeFromLobby(ws);
            }
        });
    })
});

wss.on('listening', () => {
    console.log(`Server online on port ${PORT}`)
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
            user.lobbyID = Lobbies[i].UUID;
            let message = JSON.stringify({
                type: "UpdateLobbyID",
                id: Lobbies[i].UUID
            });
            if (user.useBuffer) {
                message = Buffer.from(message);
            }
            user.send(message);
            Lobbies[i].clients.forEach(function each(client) {
                if (client != user && client.readyState === WebSocket.OPEN) {
                    
                    message = JSON.stringify({
                        type: "ForceSendData"
                    });
                    if (client.useBuffer) {
                        message = Buffer.from(message);
                    }
                    client.send(message);
                }
            });
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