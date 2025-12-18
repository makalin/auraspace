const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // In production, replace with client URL
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// State
const players = {};
const totems = [];

io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  // Initialize player
  players[socket.id] = {
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    color: '#' + Math.floor(Math.random() * 16777215).toString(16)
  };

  // Send current state
  socket.emit('init', { players, totems });

  // Broadcast new player
  socket.broadcast.emit('player-joined', { id: socket.id, data: players[socket.id] });

  socket.on('move', (data) => {
    if (players[socket.id]) {
      players[socket.id].position = data.position;
      players[socket.id].rotation = data.rotation;
      socket.broadcast.emit('player-moved', { id: socket.id, data });
    }
  });

  socket.on('create-totem', (data) => {
    // Limit to 20 totems
    if (totems.length >= 20) {
      const removed = totems.shift();
      io.emit('remove-totem', removed.id);
    }
    const totem = { ...data, id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}` }; // Unique ID
    totems.push(totem);
    io.emit('totem-created', totem);
  });

  socket.on('remove-totem', (id) => {
    const index = totems.findIndex(t => t.id === id);
    if (index !== -1) {
      totems.splice(index, 1);
      io.emit('remove-totem', id);
    }
  });

  socket.on('clear-totems', () => {
    totems.length = 0;
    io.emit('init', { players, totems }); // Re-init with empty
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('player-left', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
