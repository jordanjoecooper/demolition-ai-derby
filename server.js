const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Test mode flag (can be set via environment variable)
const TEST_MODE = process.env.TEST_MODE === 'true';
console.log('Test mode:', TEST_MODE ? 'enabled' : 'disabled');

// Game state
const gameState = {
  players: new Map(),
  arena: {
    width: 1000,
    height: 1000
  },
  testMode: TEST_MODE
};

// Constants
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

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
  const players = Object.fromEntries(gameState.players);
  // console.log('Converting game state for client. Player count:', gameState.players.size);
  // console.log('Converted players:', players);
  return {
    arena: gameState.arena,
    players: players
  };
}

// Check for inactive players
function checkInactivePlayers() {
  const now = Date.now();
  gameState.players.forEach((player, id) => {
    const timeSinceLastUpdate = now - player.lastUpdateTime;
    if (timeSinceLastUpdate > INACTIVITY_TIMEOUT) {
      // Player has been inactive for too long
      io.emit('playerEliminated', {
        id: id,
        reason: 'inactivity'
      });
      gameState.players.delete(id);
      console.log(`Player ${id} eliminated due to inactivity`);
    }
  });
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

  // Send test mode status to client
  socket.emit('testModeStatus', { enabled: TEST_MODE });

  console.log('Player added. Total players:', gameState.players.size);

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
        (gameState.players.get(socket.id).invincible || gameState.players.get(targetId).invincible)) {
      return;
    }

    // Get both players
    const attacker = gameState.players.get(socket.id);
    const target = gameState.players.get(targetId);

    if (!attacker || !target) return;

    // Calculate speeds (if velocity data is available)
    const attackerSpeed = attacker.velocity ?
      Math.sqrt(attacker.velocity.x * attacker.velocity.x + attacker.velocity.z * attacker.velocity.z) : 0;
    const targetSpeed = target.velocity ?
      Math.sqrt(target.velocity.x * target.velocity.x + target.velocity.z * target.velocity.z) : 0;

    // Calculate base damage
    const baseDamage = Math.min(Math.floor(impactForce * 20), 50);

    // Apply damage to both players based on their relative speeds
    const applyDamageToPlayer = (player, isSlower) => {
      if (gameState.players.has(player.id)) {
        // Calculate damage modifier based on speed difference
        const damageMultiplier = isSlower ? 1.2 : 0.3;
        const damage = Math.floor(baseDamage * damageMultiplier);

        player.health = Math.max(0, player.health - damage);

        // Broadcast the damage to all players
        io.emit('playerDamaged', {
          id: player.id,
          health: player.health,
          damage: damage
        });

        // Check if player is eliminated
        if (player.health <= 0 && !player.eliminated) {
          player.eliminated = true;
          player.health = 0;
          io.emit('playerEliminated', { id: player.id });
        }
      }
    };

    // Apply damage based on relative speeds
    applyDamageToPlayer(attacker, attackerSpeed <= targetSpeed);
    applyDamageToPlayer(target, targetSpeed <= attackerSpeed);
  });

  // Handle player death
  socket.on('playerDied', (data) => {
    if (gameState.players.has(data.id)) {
      const player = gameState.players.get(data.id);
      player.eliminated = true;
      player.health = 0;

      // Broadcast elimination
      io.emit('playerEliminated', { id: data.id });

      // Respawn player after 3 seconds
      setTimeout(() => {
        if (gameState.players.has(data.id)) {
          const respawnPosition = {
            x: Math.random() * gameState.arena.width - gameState.arena.width/2,
            y: 0,
            z: Math.random() * gameState.arena.height - gameState.arena.height/2
          };

          player.position = respawnPosition;
          player.health = 100;
          player.eliminated = false;
          player.invincible = true;

          // Emit respawn event
          io.emit('playerRespawned', {
            id: data.id,
            position: respawnPosition,
            health: 100
          });

          // Remove invincibility after 5 seconds
          setTimeout(() => {
            if (gameState.players.has(data.id)) {
              player.invincible = false;
              io.emit('gameUpdate', getGameStateForClient());
            }
          }, 5000);
        }
      }, 3000);
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
  checkInactivePlayers();  // Check for inactive players
  io.emit('gameUpdate', getGameStateForClient());
}, 50);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});