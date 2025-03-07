const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Game state
const gameState = {
  players: {},
  arena: {
    width: 1000,
    height: 1000
  },
  currentRound: {
    inProgress: false,
    startTime: null,
    players: []
  }
};

// Create Express app, HTTP server, and Socket.IO instance
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the game page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Add player to the game
  gameState.players[socket.id] = {
    id: socket.id,
    position: {
      x: Math.random() * gameState.arena.width - gameState.arena.width/2,
      y: 0,
      z: Math.random() * gameState.arena.height - gameState.arena.height/2
    },
    rotation: 0,
    health: 100,
    invincible: true,
    lastUpdateTime: Date.now()
  };

  // Set invincibility timer (3 seconds)
  setTimeout(() => {
    if (gameState.players[socket.id]) {
      gameState.players[socket.id].invincible = false;
    }
  }, 3000);

  // Broadcast new player to all other players
  socket.broadcast.emit('playerJoined', gameState.players[socket.id]);

  // Send current game state to the new player
  socket.emit('gameState', gameState);

  // Handle player movement updates
  socket.on('playerUpdate', (data) => {
    if (gameState.players[socket.id]) {
      // Update player position and rotation
      gameState.players[socket.id].position = data.position;
      gameState.players[socket.id].rotation = data.rotation;
      gameState.players[socket.id].lastUpdateTime = Date.now();
    }
  });

  // Handle collisions
  socket.on('collision', (data) => {
    const { targetId, impactForce } = data;

    // Skip if either player is invincible
    if (gameState.players[socket.id]?.invincible || gameState.players[targetId]?.invincible) {
      return;
    }

    // Calculate damage based on impact force
    const damage = Math.min(Math.floor(impactForce * 10), 50);

    // Apply damage to target player
    if (gameState.players[targetId]) {
      gameState.players[targetId].health = Math.max(0, gameState.players[targetId].health - damage);

      // Broadcast the collision to all players
      io.emit('playerDamaged', {
        id: targetId,
        health: gameState.players[targetId].health,
        damage: damage
      });

      // Check if player is eliminated
      if (gameState.players[targetId].health <= 0) {
        io.emit('playerEliminated', { id: targetId });
        delete gameState.players[targetId];

        // Check if round is over (only one player left)
        const remainingPlayers = Object.keys(gameState.players);
        if (remainingPlayers.length === 1) {
          const winnerId = remainingPlayers[0];
          io.emit('roundOver', { winnerId });

          // Start new round after 10 seconds
          setTimeout(() => {
            startNewRound();
          }, 10000);
        }
      }
    }
  });

  // Handle boost activation
  socket.on('boostActivated', () => {
    if (gameState.players[socket.id]) {
      io.emit('playerBoosting', { id: socket.id });
    }
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    if (gameState.players[socket.id]) {
      io.emit('playerLeft', { id: socket.id });
      delete gameState.players[socket.id];
    }
  });
});

// Start a new round
function startNewRound() {
  // Reset all players' positions and health
  Object.keys(gameState.players).forEach(playerId => {
    gameState.players[playerId].position = {
      x: Math.random() * gameState.arena.width - gameState.arena.width/2,
      y: 0,
      z: Math.random() * gameState.arena.height - gameState.arena.height/2
    };
    gameState.players[playerId].health = 100;
    gameState.players[playerId].invincible = true;

    // Set invincibility timer (3 seconds)
    setTimeout(() => {
      if (gameState.players[playerId]) {
        gameState.players[playerId].invincible = false;
      }
    }, 3000);
  });

  // Broadcast new round starting
  io.emit('newRound', gameState);
}

// Game update loop (20 updates per second)
setInterval(() => {
  io.emit('gameUpdate', gameState);
}, 50);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});