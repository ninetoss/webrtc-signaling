const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const jwt = require("jsonwebtoken"); // Kept only to read the Android data, not for security

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

// 🌟 THE FIX: The io.use() authentication block has been completely removed.
// The server will no longer reject any connections.

io.on('connection', (socket) => {
    // 1. Extract user data without verifying any encryption keys
    let userData = { userId: socket.id, name: "Unknown", number: "" };

    if (socket.handshake.auth.token) {
        // Blindly decode the Android token just to read the ship's name
        const decoded = jwt.decode(socket.handshake.auth.token);
        if (decoded && decoded.data) {
            userData = decoded.data;
        }
    } else if (socket.handshake.auth.userId) {
        // Accept unencrypted plain text from the Admin dashboard
        userData = socket.handshake.auth;
    }

    console.log(`✅ Connected: ${userData.name || userData.username} (ID: ${userData.userId || socket.id})`);

    socket.on('join', (role) => {
        socket.join(role); 
    });

    socket.on('signal', (data) => {
        const senderId = userData.userId || socket.id;
        const shipName = userData.name || userData.username;
        const shipNumber = userData.number || "";

        socket.to(data.to).emit('signal', {
            from: senderId,
            senderName: shipName || shipNumber || senderId, 
            shipName: shipName,
            shipNumber: shipNumber,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        const senderId = userData.userId || socket.id;
        const shipName = userData.name || userData.username;
        const shipNumber = userData.number || "";
        
        console.log(`❌ Disconnected: ID ${senderId}`);
        
        socket.to('admin').emit('signal', {
            from: senderId,
            senderName: shipName || shipNumber || senderId,
            shipName: shipName,
            shipNumber: shipNumber,
            signal: { type: 'disconnect' }
        });
    });
});

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log(`Signaling server running on port ${port}`));
