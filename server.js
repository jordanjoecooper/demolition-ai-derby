const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { LevelsBot, BOT_CONSTANTS } = require('./LevelsBot');

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
  testMode: TEST_MODE,
  bot: null,
  lastBotEliminationTime: 0
};

// Initialize the Levels Bot
function initializeBot() {
  if (!gameState.bot || !gameState.bot.isAlive) {
    gameState.bot = new LevelsBot(gameState.arena);
    io.emit('botSpawned', gameState.bot.getState());
    console.log('Levels Bot spawned');
  }
}

// Check if bot should respawn
function checkBotRespawn() {
  if (!gameState.bot || !gameState.bot.isAlive) {
    const now = Date.now();
    if (now - gameState.lastBotEliminationTime >= BOT_CONSTANTS.RESPAWN_DELAY) {
      initializeBot();
    }
  }
}

// Update bot state
function updateBot(deltaTime) {
  if (gameState.bot && gameState.bot.isAlive) {
    const botUpdate = gameState.bot.update(gameState.players, deltaTime);
    if (botUpdate) {
      io.emit('botUpdate', botUpdate.data);
      
      // Handle machine gun firing
      if (botUpdate.didFire) {
        // Create muzzle flash effect
        io.emit('botFired', {
          position: gameState.bot.position,
          rotation: gameState.bot.rotation
        });
        
        // Check for hits on players
        gameState.players.forEach((player, playerId) => {
          if (player.invincible || player.eliminated) return;
          
          const dx = player.position.x - gameState.bot.position.x;
          const dz = player.position.z - gameState.bot.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance <= BOT_CONSTANTS.MACHINE_GUN_RANGE) {
            // Calculate angle to player relative to bot's rotation
            const angleToPlayer = Math.atan2(dx, dz);
            const angleDiff = Math.abs(gameState.bot.normalizeAngle(angleToPlayer - gameState.bot.rotation));
            
            if (angleDiff <= (BOT_CONSTANTS.MACHINE_GUN_ARC * Math.PI / 180) / 2) {
              // Player hit by machine gun
              player.health -= BOT_CONSTANTS.MACHINE_GUN_DAMAGE;
              
              // Emit damage event
              io.emit('playerDamaged', {
                id: playerId,
                damage: BOT_CONSTANTS.MACHINE_GUN_DAMAGE,
                type: 'machine_gun',
                health: player.health
              });
              
              // Check if player was eliminated
              if (player.health <= 0 && !player.eliminated) {
                player.eliminated = true;
                player.health = 0;
                io.emit('playerEliminated', {
                  id: playerId,
                  reason: 'bot_gun'
                });
              }
            }
          }
        });
      }
    }
  }
}

// Constants
const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

// Create Express app, HTTP server, and Socket.IO instance
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Initialize the bot immediately when server starts
initializeBot();

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the game page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Convert Map to object for sending over socket
function getGameStateForClient() {
  const players = Object.fromEntries(gameState.players);
  return {
    arena: gameState.arena,
    players: players,
    bot: gameState.bot ? gameState.bot.getState() : null
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
    lastUpdateTime: Date.now(),
    velocity: { x: 0, z: 0 }
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
      const player = gameState.players.get(socket.id);
      
      // Update player position and velocity
      player.position = data.position;
      player.rotation = data.rotation;
      player.velocity = data.velocity || { x: 0, z: 0 };
      player.lastUpdateTime = Date.now();
      
      // Check collision with bot
      if (gameState.bot && gameState.bot.isAlive) {
        const dx = player.position.x - gameState.bot.position.x;
        const dz = player.position.z - gameState.bot.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 10) { // Collision threshold
          // Calculate relative velocity
          const relativeVelX = (player.velocity?.x || 0) - (gameState.bot.velocity?.x || 0);
          const relativeVelZ = (player.velocity?.z || 0) - (gameState.bot.velocity?.z || 0);
          const relativeSpeed = Math.sqrt(relativeVelX * relativeVelX + relativeVelZ * relativeVelZ);
          
          // Calculate damage based on relative speed
          const damage = Math.max(5, relativeSpeed * 20);
          
          // Damage both player and bot
          if (!player.invincible) {
            player.health -= Math.floor(damage * 0.3); // Player takes less damage from ramming
            io.emit('playerDamaged', {
              id: socket.id,
              damage: Math.floor(damage * 0.3),
              type: 'collision',
              health: player.health
            });
          }
          
          // Bot takes full damage
          const botEliminated = gameState.bot.takeDamage(damage);
          
          // Handle bot elimination
          if (botEliminated) {
            gameState.lastBotEliminationTime = Date.now();
            io.emit('botEliminated', {
              eliminatedBy: socket.id,
              points: BOT_CONSTANTS.KILL_POINTS
            });
            
            // Award points to the player
            if (!player.score) player.score = 0;
            player.score += BOT_CONSTANTS.KILL_POINTS;
          }
          
          // Apply knockback to bot
          const knockbackForce = 0.5;
          gameState.bot.velocity.x += (relativeVelX * knockbackForce);
          gameState.bot.velocity.z += (relativeVelZ * knockbackForce);
          
          // Check if player was eliminated
          if (player.health <= 0) {
            io.emit('playerEliminated', {
              id: socket.id,
              reason: 'collision'
            });
            gameState.players.delete(socket.id);
          }
        }
      }
      
      // Broadcast updated game state
      io.emit('gameUpdate', getGameStateForClient());
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
    }
  });

  // Handle player respawn request
  socket.on('requestRespawn', () => {
    if (gameState.players.has(socket.id)) {
      const player = gameState.players.get(socket.id);
      
      // Only allow respawn if player is eliminated
      if (player.eliminated) {
        const respawnPosition = {
          x: Math.random() * gameState.arena.width - gameState.arena.width/2,
          y: 0,
          z: Math.random() * gameState.arena.height - gameState.arena.height/2
        };

        player.position = respawnPosition;
        player.health = 100;
        player.eliminated = false;
        player.invincible = true;
        player.velocity = { x: 0, z: 0 };

        // Emit respawn event
        io.emit('playerRespawned', {
          id: socket.id,
          position: respawnPosition,
          health: 100
        });

        // Remove invincibility after 5 seconds
        setTimeout(() => {
          if (gameState.players.has(socket.id)) {
            player.invincible = false;
            io.emit('gameUpdate', getGameStateForClient());
          }
        }, 5000);
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

// Game loop
const TICK_RATE = 60; // Updates per second
let lastUpdateTime = Date.now();

setInterval(() => {
  const now = Date.now();
  const deltaTime = now - lastUpdateTime;
  lastUpdateTime = now;
  
  checkBotRespawn();
  updateBot(deltaTime);
  checkInactivePlayers();
  
  // Broadcast game state to all players
  io.emit('gameUpdate', getGameStateForClient());
}, 1000 / TICK_RATE);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Initializing Levels Bot...');
});