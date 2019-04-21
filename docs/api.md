This file details communication between the server and client. All communication are done using Int16Array arrays.

--- PING ---

ID 1 - Ping and Pongs between server and client


--- SERVER MESSAGES ---

ID 100 - Hello User

[userID, speed, friction, width, height]
    - speed is multiplied by 100
    - friction is multiplied by 100

ID 101 - Init all users

[id, x, y, xm, y, colorr, colorg, colorb, points, nameID1, nameID2] - this repeats for all users in a single array
    - ym is multiplied by 100
    - xm is multiplied by 100

ID 102 - update user data

[id, x, y, xm, ym, render] 
    - this repeats for all users
    - ym is multiplied by 100
    - xm is multiplied by 100

ID 104 - delete user

[id]

ID 105 - update marker

[id, x1, y1, x2, y2]

ID 106 - set points

[id, points]

--- Client Messages ---

ID 200 - Key Down/Up

[keyid, status]

ID 201 - Key Press

[keyid]

ID 202 - Start