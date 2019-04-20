const WebSocket = require('ws');
const botAi = require('./bot.js');

const wss = new WebSocket.Server({
    port: 8082
});

let id = 0;

let sockets = [];

let game = {
    clients: [],
    width: 3000,
    height: 3000
}

class marker {
    constructor(x, y, ownerid) {
        this.x = x;
        this.y = y;
        this.ownerid = ownerid;
        this.spawnTime = Math.floor(new Date().getTime() / 1000);
    }

}

class player {
    constructor(id, x, y, color, type) {
        this.x = x;
        this.y = y;
        this.xm = 0;
        this.ym = 0;
        this.height = 50;
        this.width = 50;
        this.id = id;
        this.color = color;
        this.keys = [];
        this.speed = 0.2;
        this.friction = 0.95;
        this.markers = [];
        this.username = [randomInt(0, 174), randomInt(0, 174)]
        this.points = 0;
        this.type = type;
    }

    initTransportify() {
        let transport = [this.id, Math.floor(this.x), Math.floor(this.y), Math.round(this.xm * 100), Math.round(this.ym * 100), this.color.r, this.color.g, this.color.b, this.points, this.username[0], this.username[1]];
        return transport;
    }

    quickTransportify() {
        try {
            var transport = [this.id, Math.floor(this.x), Math.floor(this.y), Math.round(this.xm * 100), Math.round(this.ym * 100)];
        }
        catch (err) {
            var transport = [];
        }
        return transport;
    }

    transportMarker() {
        let transport = [this.id];
        for (var i in this.markers) {
            transport.push(1, this.markers[i].x, this.markers[i].y);
        }
        if (transport.length == 1) {
            transport.push(0, 0, 0);
        }
        if (transport.length == 4) {
            transport.push(0, 0, 0);
        }

        return transport;

    }

    spawnMarker() {
        if (this.markers.length > 1) {
            this.markers.shift();
        }
        this.markers.push(new marker(this.x + this.width / 2, this.y + this.width / 2, this.id));
    }

    colCheck(shapeA) {
        if (shapeA.x < this.x + this.width &&
            shapeA.x + shapeA.width > this.x &&
            shapeA.y < this.y + this.height &&
            shapeA.height + shapeA.y > this.y) {
            return true;
        }
        else {
            return false;
        }
    }

    updatePhysics(ws) {
        if (this.keys[87]) {
            this.ym -= this.speed;
        }
        if (this.keys[83]) {
            this.ym += this.speed;
        }

        if (this.keys[65]) {
            this.xm -= this.speed;
        }
        if (this.keys[68]) {
            this.xm += this.speed;
        }

        this.x += this.xm;
        this.xm *= this.friction;
        this.y += this.ym;
        this.ym *= this.friction;

        this.x = clamp(this.x, 0, game.width);
        this.y = clamp(this.y, 0, game.height);

        var boxCol = false;

        if (this.markers[0] && this.markers[1]) {
            boxCol = true;
        }

        if (boxCol) {
            for (var i in game.clients) {
                if (game.clients[i] == this) {
                    continue;
                }
                var bounds = [Math.min(this.markers[0].x, this.markers[1].x), Math.min(this.markers[0].y, this.markers[1].y)]
                var col = game.clients[i].colCheck({ x: bounds[0], y: bounds[1], width: Math.max(this.markers[0].x, this.markers[1].x) - bounds[0], height: Math.max(this.markers[0].y, this.markers[1].y) - bounds[1] });

                if (col) {
                    game.clients[i].kill();
                    this.points++;

                    wss.broadcast(new Int16Array([106, this.id, this.points]));
                }
            }
        }
        if (this.markers[0]) {
            if (Math.floor(new Date().getTime() / 1000) - this.markers[0].spawnTime > 10) {
                this.markers.shift();
            }
        }

    }

    kill() {
        this.x = randomInt(0, game.width);
        this.y = randomInt(0, game.height);
        this.points = 0;
        this.markers.length = 0;
        wss.broadcast(new Int16Array([106, this.id, this.points]));
    }
}

function clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

wss.on('connection', (ws) => {
    let cid = id++;
    let client = new player(cid, randomInt(0, game.width), randomInt(0, game.height), { r: randomInt(0, 255), g: randomInt(0, 255), b: randomInt(0, 255) }, "player");
    sockets[cid] = ws;

    game.clients[cid] = client;

    var players = [101];
    for (var i in game.clients) {
        players = players.concat(game.clients[i].initTransportify());
    }

    // Tell player about world
    ws.send(new Int16Array([100, cid, client.speed * 100, client.friction * 100, game.width, game.height]));
    // Tell player about other players
    ws.send(new Int16Array(players));

    // Send new player to other clients
    wss.clients.forEach(function each(socket) {
        if (socket !== ws && socket.readyState === WebSocket.OPEN) {
            socket.send(new Int16Array([101].concat(client.initTransportify())));
        }
    });

    // Websocket from client
    ws.on('message', function incoming(message) {
        let data = new Int16Array(message);
        switch (data[0]) {
            case 1:
                ws.send(new Int16Array([1]));
                break;
            case 200:
                game.clients[cid].keys[data[2]] = data[4];
                break;
            case 201:
                switch (data[2]) {
                    case 32:
                        client.spawnMarker()
                        break;
                }
                break;
        }

    });

    ws.on('close', function close() {
        delete game.clients[cid];
        delete sockets[cid];
        //console.log("Deleted ", cid)
        wss.broadcast(new Int16Array([104, cid]));
    });

});

setInterval(function() {
    // Run the bots AI
    for (let i in game.clients) {
        if (game.clients[i].type == "bot") {
            botAi.run(game, i);
        }

        game.clients[i].updatePhysics();
    }
}, 1000 / 60)

// Send out updates to players
setInterval(function() {
    var players = [102];

    var markers = [105]

    // Package data
    for (let i in game.clients) {
        players = players.concat(game.clients[i].quickTransportify());
        markers = markers.concat(game.clients[i].transportMarker());
    }
    wss.broadcast(new Int16Array(players));
    wss.broadcast(new Int16Array(markers));
}, 1000 / 15)


// Setup bots
let botCount = 20;

for (let i = 0; i < botCount; i++) {
    let bid = id++;
    game.clients.push(new player(bid, randomInt(0, game.width), randomInt(0, game.height), { r: randomInt(0, 255), g: randomInt(0, 255), b: randomInt(0, 255) }, "bot"))
}
