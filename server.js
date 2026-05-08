const express = require('express');
const http = require('http'); 
const { Server } = require('socket.io');
const jwt = require("jsonwebtoken"); // NEW: Import JWT

const app = express();
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*" } });

// !!! IMPORTANT: This MUST match the key used in your PHP login script !!!
const SECRET_KEY = 'YOUR_SUPER_SECRET_KEY_CHANGE_THIS';

// --- NEW: JWT Authentication Middleware ---
io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication error: No token provided"));
    }

    // 🌟 THE FIX: Allow the Web Administrator Dashboard to bypass the Android JWT
    if (token === 'ADMIN_WEB_DASHBOARD_PASSKEY_12345') {
        socket.user = { userId: 'admin', username: 'Administrator', role: 'admin' };
        return next();
    }

    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) {
            return next(new Error("Authentication error: Forged or expired token"));
        }
        // Attach the decrypted database info to the connection
        socket.user = decoded.data; 
        next();
    });
});

io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.username} (ID: ${socket.user.userId})`);

    socket.on('join', (role) => {
        socket.join(role); 
    });

    socket.on('signal', (data) => {
        const senderId = socket.user.userId || socket.id;
        const shipName = socket.user.name || socket.user.username;
        const shipNumber = socket.user.number || "";

        // 🌟 Send ALL identifiers so the Admin dashboard can link them properly
        socket.to(data.to).emit('signal', {
            from: senderId,
            senderName: shipName || shipNumber || senderId, 
            shipName: shipName,
            shipNumber: shipNumber,
            signal: data.signal
        });
    });

    socket.on('disconnect', () => {
        const senderId = socket.user.userId || socket.id;
        const shipName = socket.user.name || socket.user.username;
        const shipNumber = socket.user.number || "";
        
        console.log(`❌ User disconnected: ID ${senderId}`);
        
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
server.listen(port, '0.0.0.0', () => console.log(`🚀 Secure Signaling Server running on port ${port}`));
