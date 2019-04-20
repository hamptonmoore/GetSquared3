module.exports = {};

module.exports.run = function(game, id) {
    let me = game.clients[id];

    // Select the player to move to

    // Store distance, and closest player object
    let closest = [Number.MAX_VALUE, undefined]

    for (let i in game.clients) {
        if (game.clients[i] != me) {
            let dist = Math.hypot(game.clients[i].x - me.x, game.clients[i].y - me.y);

            if (dist < closest[0]) {
                closest = [dist, game.clients[i]];
            }
        }
    }

    //console.log("Closest = " + closest[1].id);
    if (closest[1] == undefined) {
        return {};
    }

    let other = closest[1];

    let keys = {
        "87": false,
        "83": false,
        "65": false,
        "68": false
    }

    let place = false;

    // We will calculate the X and the Y direction of the closest player
    let relativePos = [me.x - other.x, me.y - other.y];


    // Lets base tolerence on the name, so that each bot has a different tolerence
    let tolerence = (me.username[0] + me.username[1] % 150);

    // The logic for the code below is if its further than tolerence go towards, but if to close go away.

    // Left
    if (relativePos[0] > tolerence) {
        keys["65"] = true;
    }
    else if (relativePos[0] > 0) {
        keys["68"] = true;
    }

    // Right
    if (relativePos[0] < -tolerence) {
        keys["68"] = true;
    }
    else if (relativePos[0] < 0) {
        keys["65"] = true;
    }

    // Up
    if (relativePos[1] > tolerence) {
        keys["87"] = true;
    }
    else if (relativePos[1] > 0) {
        keys["83"] = true;
    }

    // Down
    if (relativePos[1] < -tolerence) {
        keys["83"] = true;
    }
    else if (relativePos[1] < 0) {
        keys["87"] = true;
    }

    if (Math.random() < 0.01) {
        me.spawnMarker();
    }


    for (let a in keys) {
        me.keys[a] = keys[a];
    }
}
