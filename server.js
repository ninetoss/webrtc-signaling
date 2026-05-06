const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const jwt = require("jsonwebtoken"); // NEW: Import JWT
const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });
const SECRET_KEY = 'YOUR_SUPER_SECRET_KEY_CHANGE_THIS';

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return next(new Error("Authentication error: Forged or expired token"));
        }
        socket.user = decoded.data; 
        next();
    });
});

io.on('connection', (socket) => {

    socket.on('join', (role) => {
        socket.join(role); 
    });

    socket.on('signal', (data) => {
        const senderId = socket.user.userId || socket.id;

        socket.to(data.to).emit('signal', {
            from: senderId,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        const senderId = socket.user.userId || socket.id;
        
        socket.to('admin').emit('signal', {
            from: senderId,
            signal: { type: 'disconnect' }
        });
    });
});

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0');
