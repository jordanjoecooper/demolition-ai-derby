const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Game state
const gameState = {
  players: new Map(),
  arena: {
    width: 1000,
    height: 1000
  },
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

// Convert Map to object for sending over socket
function getGameStateForClient() {
  return {
    ...gameState,
    players: Object.fromEntries(gameState.players)
  };
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Add player to the game
  gameState.players.set(socket.id, {
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
  });

  // Set initial invincibility
  setTimeout(() => {
    if (gameState.players.has(socket.id)) {
      gameState.players.get(socket.id).invincible = false;
      io.emit('gameUpdate', getGameStateForClient());
    }
  }, 5000); // 5 seconds of invincibility

  // Broadcast new player to all other players
  socket.broadcast.emit('playerJoined', gameState.players.get(socket.id));

  // Send current game state to the new player
  socket.emit('gameState', getGameStateForClient());

  // Handle player movement updates
  socket.on('playerUpdate', (data) => {
    if (gameState.players.has(socket.id)) {
      // Update player position and rotation
      const player = gameState.players.get(socket.id);
      player.position = data.position;
      player.rotation = data.rotation;
      player.lastUpdateTime = Date.now();
    }
  });

  // Handle collisions
  socket.on('collision', (data) => {
    const { targetId, impactForce } = data;

    // Skip if either player is invincible
    if (gameState.players.has(socket.id) && gameState.players.has(targetId) &&
        gameState.players.get(socket.id).invincible || gameState.players.get(targetId).invincible) {
      return;
    }

    // Calculate damage based on impact force
    const damage = Math.min(Math.floor(impactForce * 10), 50);

    // Apply damage to target player
    if (gameState.players.has(targetId)) {
      const player = gameState.players.get(targetId);
      player.health = Math.max(0, player.health - damage);

      // Broadcast the collision to all players
      io.emit('playerDamaged', {
        id: targetId,
        health: player.health,
        damage: damage
      });

      // Check if player is eliminated
      if (player.health <= 0) {
        io.emit('playerEliminated', { id: targetId });
        gameState.players.delete(targetId);
      }
    }
  });

  // Handle boost activation
  socket.on('boostActivated', () => {
    if (gameState.players.has(socket.id)) {
      io.emit('playerBoosting', { id: socket.id });
    }
  });

  // Handle player disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    if (gameState.players.has(socket.id)) {
      io.emit('playerLeft', { id: socket.id });
      gameState.players.delete(socket.id);
    }
  });
});

// Remove round checking logic
function handlePlayerDeath(playerId) {
  const player = gameState.players.get(playerId);
  if (player) {
    // Instead of ending round, just respawn the player
    setTimeout(() => {
      if (gameState.players.has(playerId)) {  // Check if player still connected
        const newPosition = getRandomSpawnPosition();
        player.position = newPosition;
        player.health = 100;
        io.emit('playerRespawned', {
          id: playerId,
          position: newPosition,
          health: 100
        });
      }
    }, 3000);  // 3 second respawn timer
  }
}

// Game update loop (20 updates per second)
setInterval(() => {
  io.emit('gameUpdate', getGameStateForClient());
}, 50);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});