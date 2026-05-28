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

    console.log(`✅ Connected: ${userData.name || userData.username || socket.id} (Network ID: ${socket.id})`);

    socket.on('join', (role) => {
        socket.join(role); 
    });

    socket.on('signal', (data) => {
        // 🌟 THE FIX: We MUST use the network's socket.id as the return address.
        // If we use the Android userId, the Admin's video reply gets lost in the mail!
        const networkReturnAddress = socket.id; 
        
        const shipName = userData.name || userData.username || "";
        const shipNumber = userData.number || "";

        // 3. Relay the exact Ship Number to the Admin map alongside the safe return address
        socket.to(data.to).emit('signal', {
            from: networkReturnAddress, // <--- This guarantees the video connects
            senderName: shipName || shipNumber || networkReturnAddress, 
            shipName: shipName,
            shipNumber: shipNumber,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        const networkReturnAddress = socket.id;
        const shipName = userData.name || userData.username || "";
        const shipNumber = userData.number || "";
        
        console.log(`❌ Disconnected: Network ID ${networkReturnAddress}`);
        
        socket.to('admin').emit('signal', {
            from: networkReturnAddress,
            senderName: shipName || shipNumber || networkReturnAddress,
            shipName: shipName,
            shipNumber: shipNumber,
            signal: { type: 'disconnect' }
        });
    });
});

const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log(`Signaling server running on port ${port}`));
