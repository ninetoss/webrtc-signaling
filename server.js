const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

io.on('connection', (socket) => {
    // 1. Setup fallback data
    let userData = { userId: socket.id, name: "", number: "", username: "" };

    // 2. Read the unencrypted data from Android or Admin Dashboard
    if (socket.handshake.auth) {
        userData = { ...userData, ...socket.handshake.auth };
    }

    console.log(`✅ Connected: ${userData.name || userData.username || socket.id}`);

    socket.on('join', (role) => {
        socket.join(role); 
    });

    socket.on('signal', (data) => {
        const senderId = userData.userId || socket.id;
        const shipName = userData.name || userData.username || "";
        const shipNumber = userData.number || "";

        // 3. Relay the exact Ship Number to the Admin map
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
        const shipName = userData.name || userData.username || "";
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
