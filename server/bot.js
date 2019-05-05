module.exports = {};

module.exports.run = function(game, id) {
    let me = game.clients[id];
    // All bot data is held in me.bot
    let target = me.bot.target;

    if (target == undefined) {
        target = module.exports.selectRandomTarget(game, id, me);
    }
    else if (game.clients[target] == undefined) {
        target = module.exports.selectRandomTarget(game, id, me);
    }
    if (Math.random() < 0.0005) {
        target = module.exports.selectRandomTarget(game, id, me);
    }

    if (target == undefined) {
        return;
    }

    me.bot.target = target;
    let other = game.clients[target];

    let keys = {
        "87": false,
        "83": false,
        "65": false,
        "68": false
    }

    // We will calculate the X and the Y direction of the closest player
    let relativePos = [me.x - other.x, me.y - other.y];


    // Lets base tolerence on the name, so that each bot has a different tolerence
    let tolerence = (me.username[0] + me.username[1] % 250) * (2);

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

    // Randomly place a marker
    if (Math.random() < 0.01) {
        me.spawnMarker();
    }

    for (let a in keys) {
        me.keys[a] = keys[a];
    }
}

module.exports.selectRandomTarget = function(game, id, me) {
    // Turn all keys in clients object into an array to randomly grab from
    let possible = Object.keys(game.clients);

    // Remove self from client list
    possible.splice(possible.indexOf(id), 1);

    let selected = possible[Math.floor(Math.random() * possible.length)];

    return selected;
}