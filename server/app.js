const WebSocket = require('ws');

const wss = new WebSocket.Server({
    port: 8082
});

let id = 0;

let game = {
    clients: [],
    width: 1000,
    height: 1000
}

class player {
    constructor(id, x, y, color) {
        this.x = x;
        this.y = y;
        this.xm = 0;
        this.ym = 0;
        this.height = 50;
        this.width = 50;
        this.id = id;
        this.color = hexToRgb(color);
        this.keys = [];
        this.speed = 0.15;
        this.friction = 0.95;
    }

    initTransportify() {
        let transport = [this.id, Math.floor(this.x), Math.floor(this.y), this.xm, this.ym, this.color.r, this.color.g, this.color.b];
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

    colCheck(shapeA) {
        // get the vectors to check against
        var vX = (shapeA.x + (shapeA.width / 2)) - (this.x + (this.width / 2)),
            vY = (shapeA.y + (shapeA.height / 2)) - (this.y + (this.height / 2)),
            // add the half widths and half heights of the objects
            hWidths = (shapeA.width / 2) + (this.width / 2),
            hHeights = (shapeA.height / 2) + (this.height / 2),
            colDir = null;

        // if the x and y vector are less than the half width or half height, they we must be inside the object, causing a collision
        if (Math.abs(vX) < hWidths && Math.abs(vY) < hHeights) {
            // figures out on which side we are colliding (top, bottom, left, or right)
            var oX = hWidths - Math.abs(vX),
                oY = hHeights - Math.abs(vY);
            if (oX >= oY) {
                if (vY > 0) {
                    colDir = "t";
                    shapeA.y += oY;
                }
                else {
                    colDir = "b";
                    shapeA.y -= oY;
                }
            }
            else {
                if (vX > 0) {
                    colDir = "l";
                    shapeA.x += oX;
                }
                else {
                    colDir = "r";
                    shapeA.x -= oX;
                }
            }
        }
        return colDir;
    }

    updatePhysics() {
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

        for (var i in game.clients) {
            if (game.clients[i] == this) {
                continue;
            }

            this.colCheck(game.clients[i]);
        }
    }
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}

function clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
}

function randomB(min, max) {
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
    let client = new player(cid, game.width / 2, game.height / 2, Math.floor(Math.random() * 16777215).toString(16));

    game.clients[cid] = client;

    var players = [101];
    for (var i in game.clients) {
        players = players.concat(game.clients[i].initTransportify());
    }

    ws.send(new Int16Array([100, cid, client.speed * 100, client.friction * 100, game.width, game.height]));
    ws.send(new Int16Array(players));

    wss.clients.forEach(function each(socket) {
        if (socket !== ws && socket.readyState === WebSocket.OPEN) {
            socket.send(new Int16Array([101].concat(client.initTransportify())));
        }
    });

    ws.on('message', function incoming(message) {
        let data = new Int16Array(message);

        switch (data[0]) {
            case 200:
                game.clients[cid].keys[data[2]] = data[4];
                break;
        }

    });

    ws.on('close', function close() {
        delete game.clients[cid];
        //console.log("Deleted ", cid)
        wss.broadcast(new Int16Array([104, cid]));
    });

});

setInterval(function() {
    for (var i in game.clients) {
        game.clients[i].updatePhysics();
    }
}, 1000 / 60)

setInterval(function() {
    var players = [102];
    for (var i in game.clients) {
        players = players.concat(game.clients[i].quickTransportify());
    }
    wss.broadcast(new Int16Array(players));
}, 1000 / 30)
