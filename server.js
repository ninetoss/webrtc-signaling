const express = require('express');
const http = require('http'); // Must be http, not https
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

// --- YOUR WEBRTC HANDSHAKE LOGIC ---
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (role) => {
        socket.join(role); 
    });

    socket.on('signal', (data) => {
        const target = data.to === 'admin' ? 'admin' : 'mobile';
        socket.to(target).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });
});
// -----------------------------------

// Let Render assign the port automatically, and listen on all network interfaces (0.0.0.0)
const port = process.env.PORT || 3000;
server.listen(port, '0.0.0.0', () => console.log(`Signaling server running on port ${port}`));
