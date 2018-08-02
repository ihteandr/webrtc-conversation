"use strict";
const express = require('express');
const PORT = 3333;
const SOCKET_PORT = 4444;
const server = express();
const https = require('https');
const fs = require('fs');
const uuid = require('uuid');
server.use(express.static(__dirname + '/public'));

const key = fs.readFileSync('./certs/key.pem');
const cert = fs.readFileSync( './certs/cert.pem');
const options = {
    key: key,
    cert: cert,
    passphrase: 'test',
    requestCert: false,
};

const io = require('socket.io').listen(https.createServer(options, server).listen(PORT, () => {
    console.log('server listening to', PORT)
}));
io.on('connection', (socket) => {
    socket.on('join', (event) => {
        const id = uuid.v4();
        socket.userID = id;
        io.in(event).clients((err , clients) => {
            socket.emit('joined', {
                global: event,
                local: id,
                users: clients.map((clientId) => io.sockets.connected[clientId].userID),
            });
            socket.join(id);
            socket.join(event);
        });
    });
    socket.on('offer', (event) => {
        io.to(event.room).emit('offer', event.data);
    });
    socket.on('candidate', (event) => {
        io.to(event.room).emit('candidate', event.data);
    })
    socket.on('answer', (event) => {
        io.to(event.room).emit('answer', event.data);
    });
});
