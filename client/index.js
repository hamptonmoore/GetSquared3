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

    // Send ping to server
    setInterval(function() {
        game.lastPing = Date.now();
        conn.send(new Int16Array([1]));
    }, 2500)

    // Render the game every 1/60th of a second
    setInterval(drawGame, 1000 / 60)

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
    constructor(id, x, y, xm, ym, r, g, b, points, u1, u2) {
        this.x = x;
        this.y = y;
        this.xm = 0;
        this.ym = 0;
        this.height = 50;
        this.width = 50;
        this.id = id;
        this.color = rgbToHex(r, g, b);
        this.speed = game.speed;
        this.friction = game.friction;
        this.keys = [];
        this.me = id == game.myID;
        this.markers = [];
        this.show = true;
        this.points = points;
        this.username = nameList[u1] + nameList[u2];
    }

    render(playerX, playerY) {

        if (!this.show) {
            return;
        }

        ctx.fillStyle = this.color;
        ctx.lineWidth = 5;
        ctx.textAlign = "center";
        ctx.font = "20px Menlo, Monaco, Consolas, Courier New, monospace";

        if (this.me) {
            ctx.fillText(this.username, (c.width / 2) - (this.width / 2) + this.width / 2, (c.height / 2) - (this.height / 2) - 10);
            //ctx.strokeText(this.username, (c.width / 2) - (this.width / 2) + this.width / 2, (c.height / 2) - (this.height / 2) - 10)
            ctx.roundRect((c.width / 2) - (this.width / 2), (c.height / 2) - (this.height / 2), this.width, this.height, 15).fill();
            ctx.roundRect((c.width / 2) - (this.width / 2), (c.height / 2) - (this.height / 2), this.width, this.height, 15).stroke();

        }
        else {
            ctx.fillText(this.username, this.x + playerX + this.width / 2, this.y + playerY - 10);
            //ctx.strokeText(this.username, this.x + playerX + this.width / 2, this.y + playerY - 10);
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

        // Interpolate movement to provide fluid movement
        this.y += this.ym;
        this.x += this.xm;

        this.x = clamp(this.x, 0, game.width);
        this.y = clamp(this.y, 0, game.height);

        this.ym *= this.friction;
        this.xm *= this.friction;

    }
}

// Data sent from server, all according to api.md
conn.onmessage = function(e) {
    let data = new Int16Array(e.data);

    switch (data[0]) {
        case 1:
            game.ping = Date.now() - game.lastPing
            app._data.ping = game.ping
            createScoreboard();
            break;
        case 100:
            game.myID = data[1]
            game.speed = data[2] / 100;
            game.friction = data[3] / 100;
            game.width = data[4];
            game.height = data[5];
            break;

        case 101:
            for (let i = 1; i < data.length; i += 11) {
                game.clients[data[i]] = new player(data[i], data[i + 1], data[i + 2], data[i + 3] / 100, data[i + 4] / 100, data[i + 5], data[i + 6], data[i + 7], data[i + 8], data[i + 9], data[i + 10]);
                game.clients[data[i]].markers.push(new marker(data[i], 0, 0));
                game.clients[data[i]].markers.push(new marker(data[i], 0, 0));
            }
            createScoreboard();
            break;

        case 102:
            for (let i = 1; i < data.length; i += 6) {
                game.clients[data[i]].x = data[i + 1];
                game.clients[data[i]].y = data[i + 2];
                game.clients[data[i]].xm = (data[i + 3]) / 100;
                game.clients[data[i]].ym = (data[i + 4]) / 100;
                game.clients[data[i]].show = data[i + 5];
            }
            break;

        case 104:
            delete game.clients[data[1]];

        case 105:
            for (let i = 1; i < data.length; i += 7) {
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
            game.clients[data[1]].points = data[2]
            createScoreboard();
            break;

    }
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

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
}

function createScoreboard() {
    let scoreboard = [];

    for (let i in game.clients) {
        scoreboard.push([game.clients[i].username, game.clients[i].points]);
    }

    scoreboard.sort((a, b) => (a[1] > b[1]) ? -1 : 1)

    scoreboard = scoreboard.slice(0, 5);

    app._data.scoreboard = scoreboard;
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

let app = new Vue({
    el: '#app',
    data: {
        ping: null,
        scoreboard: [

        ]
    }
})


// nameList taken from https://codepen.io/jamesrbdev/pen/WxyKyr
let nameList = [
    'Time', 'Past', 'Future', 'Dev',
    'Fly', 'Flying', 'Soar', 'Soaring', 'Power', 'Falling',
    'Fall', 'Jump', 'Cliff', 'Mountain', 'Rend', 'Red', 'Blue',
    'Green', 'Yellow', 'Gold', 'Demon', 'Demonic', 'Panda', 'Cat',
    'Kitty', 'Kitten', 'Zero', 'Memory', 'Trooper', 'XX', 'Bandit',
    'Fear', 'Light', 'Glow', 'Tread', 'Deep', 'Deeper', 'Deepest',
    'Mine', 'Your', 'Worst', 'Enemy', 'Hostile', 'Force', 'Video',
    'Game', 'Donkey', 'Mule', 'Colt', 'Cult', 'Cultist', 'Magnum',
    'Gun', 'Assault', 'Recon', 'Trap', 'Trapper', 'Redeem', 'Code',
    'Script', 'Writer', 'Near', 'Close', 'Open', 'Cube', 'Circle',
    'Geo', 'Genome', 'Germ', 'Spaz', 'Shot', 'Echo', 'Beta', 'Alpha',
    'Gamma', 'Omega', 'Seal', 'Squid', 'Money', 'Cash', 'Lord', 'King',
    'Duke', 'Rest', 'Fire', 'Flame', 'Morrow', 'Break', 'Breaker', 'Numb',
    'Ice', 'Cold', 'Rotten', 'Sick', 'Sickly', 'Janitor', 'Camel', 'Rooster',
    'Sand', 'Desert', 'Dessert', 'Hurdle', 'Racer', 'Eraser', 'Erase', 'Big',
    'Small', 'Short', 'Tall', 'Sith', 'Bounty', 'Hunter', 'Cracked', 'Broken',
    'Sad', 'Happy', 'Joy', 'Joyful', 'Crimson', 'Destiny', 'Deceit', 'Lies',
    'Lie', 'Honest', 'Destined', 'Bloxxer', 'Hawk', 'Eagle', 'Hawker', 'Walker',
    'Zombie', 'Sarge', 'Capt', 'Captain', 'Punch', 'One', 'Two', 'Uno', 'Slice',
    'Slash', 'Melt', 'Melted', 'Melting', 'Fell', 'Wolf', 'Hound',
    'Legacy', 'Sharp', 'Dead', 'Mew', 'Chuckle', 'Bubba', 'Bubble', 'Sandwich', 'Smasher', 'Extreme', 'Multi', 'Universe', 'Ultimate', 'Death', 'Ready', 'Monkey', 'Elevator', 'Wrench', 'Grease', 'Head', 'Theme', 'Grand', 'Cool', 'Kid', 'Boy', 'Girl', 'Vortex', 'Paradox'
];

function drawGame() {
    ctx.clearRect(0, 0, c.width, c.height);

    let playerX = (-game.clients[game.myID].x + (c.width / 2) - (25));
    let playerY = (-game.clients[game.myID].y + (c.height / 2) - (25));

    document.getElementById("canvas").style.backgroundPosition = playerX % 50 + "px " + playerY % 50 + "px";



    ctx.lineWidth = 2.5;
    ctx.roundRect(-1 + playerX, -1 + playerY, game.width + 52, game.height + 52, 10).stroke();

    for (let i in game.clients) {
        game.clients[i].updatePhysics();
        game.clients[i].render(playerX, playerY);

        if (game.clients[i].markers[1].render && game.clients[i].markers[0].render) {
            let bounds = [Math.min(game.clients[i].markers[0].x, game.clients[i].markers[1].x), Math.min(game.clients[i].markers[0].y, game.clients[i].markers[1].y)]
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
}

document.getElementById("start").onclick = function() {
    conn.send(new Int16Array([202]));
    document.getElementById("login").style.display = "none";
    document.getElementById("scoreboard").style.display = "block";
}
