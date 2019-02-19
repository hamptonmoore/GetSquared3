All messages are Int16Array

--- PING ---

ID 1 - Ping and Pongs between server and client


--- SERVER MESSAGES ---

ID 100 - Hello User

[userID, speed, friction, width, height]
    speed is multiplied by 100
    friction is multiplied by 100

ID 101 - Init all users

[id, x, y, xm, y, colorr, colorg, colorb] - this repeats for all users in a single array

ID 102 - update user data

[id, x, y, xm, ym] - this repeats for all users
    ym is multiplied by 100
    xm is multiplied by 100
    

ID 104 - delete user

[id]

--- Client Messages ---

ID 200 - Key Press

[keyid, status]