const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });
io.on('connection', (socket) => {
    let userData = { userId: socket.id, name: "", number: "", username: "" };
    if (socket.handshake.auth) {
        userData = { ...userData, ...socket.handshake.auth };
    }
    console.log(`✅ Connected: ${userData.name || userData.username || socket.id} (Network ID: ${socket.id})`);
    socket.on('join', (role) => {
        socket.join(role);
        socket.role = role;
        console.log(`[+] User joined as ${role}: ${socket.id}`);
        if (role === 'admin') {
            socket.to('mobile').emit('admin-joined', { adminId: socket.id });
        } else if (role === 'mobile') {
            io.in('admin').fetchSockets().then(adminSockets => {
                const adminIds = adminSockets.map(s => s.id);
                socket.emit('current-admins', { adminIds });
            });
        }
    });
    socket.on('signal', (data) => {
        const networkReturnAddress = socket.id; 
        const shipName = userData.name || userData.username || "";
        const shipNumber = userData.number || "";
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
