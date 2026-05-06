const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const app = express();
// 1. We use HTTP here because Render automatically handles the HTTPS/SSL 
// at their load balancer before the traffic reaches this script.
const server = http.createServer(app); 

// !!! IMPORTANT: This must exactly match the key in your PHP backend !!!
const SECRET_KEY = 'YOUR_SUPER_SECRET_KEY_CHANGE_THIS'; 

const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// --- THE BOUNCER: JWT Authentication Middleware ---
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

// --- THE SWITCHBOARD: Connection & Routing Logic ---
io.on("connection", (socket) => {
    console.log(`[+] User connected: ${socket.user.username} (Role: ${socket.user.role}, ID: ${socket.user.userId})`);

    // 1. Join a Vessel Room
    socket.on("join-vessel", (vesselId) => {
        const roomName = `vessel-${vesselId}`;
        socket.join(roomName);
        console.log(`${socket.user.username} joined room: ${roomName}`);
    });

    // 2. Relay WebRTC Offers
    socket.on("webrtc-offer", (data) => {
        socket.to(`vessel-${data.targetVesselId}`).emit("webrtc-offer", {
            senderId: socket.user.userId,
            sdp: data.sdp
        });
    });

    // 3. Relay WebRTC Answers
    socket.on("webrtc-answer", (data) => {
        socket.to(`vessel-${data.targetVesselId}`).emit("webrtc-answer", {
            senderId: socket.user.userId,
            sdp: data.sdp
        });
    });

    // 4. Relay ICE Candidates
    socket.on("ice-candidate", (data) => {
        socket.to(`vessel-${data.targetVesselId}`).emit("ice-candidate", {
            senderId: socket.user.userId,
            candidate: data.candidate
        });
    });

    // 5. Handle Disconnects
    socket.on("disconnect", () => {
        console.log(`[-] User disconnected: ${socket.user.username}`);
    });

    // 6. Relay Camera Disconnects
    socket.on("stream-disconnected", (data) => {
        socket.to(`vessel-${data.targetVesselId}`).emit("stream-disconnected", {
            senderId: socket.user.userId
        });
    });
});

// Render automatically assigns the port via process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Maritime Signaling Server running on Render port ${PORT}`);
});
