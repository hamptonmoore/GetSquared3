let c = document.getElementById("canvas");
c.width = document.body.clientWidth;
c.height = document.body.clientHeight;
let ctx = c.getContext("2d");
let debug;
let conn = new WebSocket("wss://getsquaredv3-herohamp.c9users.io:8082/");
conn.binaryType = "arraybuffer";

conn.onopen = function(event) {

    document.body.addEventListener("keydown", function(e) {
        handleKey(e.keyCode, true)
    });

    document.body.addEventListener("keyup", function(e) {
        handleKey(e.keyCode, false)
    });

    document.onkeypress = function(e) {
        e = e || window.event;
        // use e.keyCode

        let keys = [32]

        if (keys.indexOf(e.keyCode) != -1) {
            conn.send(new Int16Array([201, e.keyCode]));
        }


    };

    game.lastPing = Date.now()
    conn.send(new Int16Array([1]))

    setInterval(function() {
        game.lastPing = Date.now();
        conn.send(new Int16Array([1]));
    }, 2500)

    setInterval(function() {
        ctx.clearRect(0, 0, c.width, c.height);

        var playerX = (-game.clients[game.myID].x + (c.width / 2) - (25));
        var playerY = (-game.clients[game.myID].y + (c.height / 2) - (25));

        document.getElementById("canvas").style.backgroundPosition = playerX % 50 + "px " + playerY % 50 + "px";

        ctx.lineWidth = 2.5;
        ctx.roundRect(-1 + playerX, -1 + playerY, game.width + 52, game.height + 52, 10).stroke();

        for (var i in game.clients) {
            game.clients[i].updatePhysics();
            game.clients[i].render(playerX, playerY);

            if (game.clients[i].markers[1].render && game.clients[i].markers[0].render) {
                var bounds = [Math.min(game.clients[i].markers[0].x, game.clients[i].markers[1].x), Math.min(game.clients[i].markers[0].y, game.clients[i].markers[1].y)]
                ctx.roundRect(bounds[0] + playerX, bounds[1] + playerY, Math.max(game.clients[i].markers[0].x, game.clients[i].markers[1].x) - bounds[0] + 25, Math.max(game.clients[i].markers[0].y, game.clients[i].markers[1].y) - bounds[1] + 25, 15).fill()
                ctx.roundRect(bounds[0] + playerX, bounds[1] + playerY, Math.max(game.clients[i].markers[0].x, game.clients[i].markers[1].x) - bounds[0] + 25, Math.max(game.clients[i].markers[0].y, game.clients[i].markers[1].y) - bounds[1] + 25, 15).stroke()

            }

            if (game.clients[i].markers[0].render) {
                game.clients[i].markers[0].draw(playerX, playerY)
            }
            if (game.clients[i].markers[1].render) {
                game.clients[i].markers[1].draw(playerX, playerY)
            }
        }
    }, 1000 / 60)

};

let game = {
    myID: null,
    clients: [],
    speed: null,
    friction: null,
    width: null,
    height: null,
    markerTime: 20,
    ping: 0,
    lastPing: 0
}

class marker {
    constructor(x, y, ownerid) {
        this.x = x;
        this.y = y;
        this.ownerid = ownerid;
        this.render = false;
        this.width = 25;
        this.height = 25;
    }

    draw(playerX, playerY) {
        ctx.roundRect(this.x + playerX, this.y + playerY, this.width, this.height, 15).fill();
        ctx.roundRect(this.x + playerX, this.y + playerY, this.width, this.height, 15).stroke();
    }

}


class player {
    constructor(id, x, y, xm, ym, color, points) {
        this.x = x;
        this.y = y;
        this.xm = 0;
        this.ym = 0;
        this.height = 50;
        this.width = 50;
        this.id = id;
        this.color = color;
        this.speed = game.speed;
        this.friction = game.friction;
        this.keys = [];
        this.me = id == game.myID;
        this.markers = [];
        this.points = points;
    }

    render(playerX, playerY) {

        ctx.fillStyle = this.color;
        ctx.lineWidth = 5;

        if (this.me) {
            ctx.roundRect((c.width / 2) - (this.width / 2), (c.height / 2) - (this.height / 2), this.width, this.height, 15).fill();
            ctx.roundRect((c.width / 2) - (this.width / 2), (c.height / 2) - (this.height / 2), this.width, this.height, 15).stroke();

        }
        else {
            ctx.roundRect(this.x + playerX, this.y + playerY, this.width, this.height, 15).fill();
            ctx.roundRect(this.x + playerX, this.y + playerY, this.width, this.height, 15).stroke();
        }
    }

    updatePhysics() {

        if (this.me) {

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

        }

        this.y += this.ym;
        this.x += this.xm;

        this.x = clamp(this.x, 0, game.width);
        this.y = clamp(this.y, 0, game.height);

        if (true) {
            this.ym *= this.friction;
            this.xm *= this.friction;
        }

        for (var i in game.clients) {
            if (game.clients[i] == this) {
                continue;
            }

            //this.colCheck(game.clients[i]);
        }

        //console.log(this.x, this.y, this.xm, this.ym)
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

}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
}

CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
    return this;
}

conn.onmessage = function(e) {
    let data = new Int16Array(e.data);

    //console.log(data)

    switch (data[0]) {
        case 1:
            game.ping = Date.now() - game.lastPing
            document.getElementById('ping').innerHTML = game.ping
            break;
        case 100:
            game.myID = data[1]
            game.speed = data[2] / 100;
            game.friction = data[3] / 100;
            game.width = data[4];
            game.height = data[5];
            break;

        case 101:
            for (var i = 1; i < data.length; i += 8) {
                game.clients[data[i]] = new player(data[i], data[i + 1], data[i + 2], data[i + 3], data[i + 4], rgbToHex(data[i + 5], data[i + 6], data[i + 7]), data[i + 8]);
                game.clients[data[i]].markers.push(new marker(data[i], 0, 0));
                game.clients[data[i]].markers.push(new marker(data[i], 0, 0));
            }
            break;

        case 102:
            for (var i = 1; i < data.length; i += 5) {
                game.clients[data[i]].x = data[i + 1];
                game.clients[data[i]].y = data[i + 2];
                game.clients[data[i]].xm = (data[i + 3]) / 100;
                game.clients[data[i]].ym = (data[i + 4]) / 100;
            }
            break;

        case 104:
            delete game.clients[data[1]];
            break;

        case 105:
            for (var i = 1; i < data.length; i += 7) {
                //id, render, x, y, render2, x2, y2
                game.clients[data[i]].markers[0].render = data[i + 1];
                game.clients[data[i]].markers[0].x = data[i + 2];
                game.clients[data[i]].markers[0].y = data[i + 3];

                game.clients[data[i]].markers[1].render = data[i + 4];
                game.clients[data[i]].markers[1].x = data[i + 5];
                game.clients[data[i]].markers[1].y = data[i + 6];
            }
            break;

        case 106:
            console.log(data[1], data[2]);
            break;

    }
}



function handleKey(keyCode, state) {
    let keys = [87, 68, 65, 83];

    if (keys.indexOf(keyCode) != -1) {
        conn.send(new Int16Array([200, keyCode, state]));
    }

    if (game.ping < 100) {
        game.clients[game.myID].keys[keyCode] = state;
    }
    else {
        setTimeout(function() {
                game.clients[game.myID].keys[keyCode] = state;
            },
            game.ping);
    }
}
