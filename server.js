const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { LevelsBot, BOT_CONSTANTS } = require('./LevelsBot');

// Game configuration
const CONFIG = {
    BOT_ENABLED: process.env.BOT_ENABLED !== 'false', // Bot is enabled by default unless explicitly disabled
    TEST_MODE: process.env.TEST_MODE === 'true'
};

// Test mode flag (can be set via environment variable)
console.log('Test mode:', CONFIG.TEST_MODE ? 'enabled' : 'disabled');
console.log('Bot:', CONFIG.BOT_ENABLED ? 'enabled' : 'disabled');

// Game state
const gameState = {
    players: new Map(),
    arena: {
        width: 1000,
        height: 1000
    },
    obstacles: [
        { position: { x: 200, z: 200 }, radius: 30 },
        { position: { x: -200, z: -200 }, radius: 30 },
        { position: { x: 200, z: -200 }, radius: 30 },
        { position: { x: -200, z: 200 }, radius: 30 },
        { position: { x: 0, z: 0 }, radius: 40 }
    ],
    testMode: CONFIG.TEST_MODE,
    bot: null,
    lastBotEliminationTime: 0,
    botEnabled: CONFIG.BOT_ENABLED
};

// Initialize the Levels Bot
function initializeBot() {
    // Only initialize bot if enabled
    if (!gameState.botEnabled) {
        return;
    }

    if (!gameState.bot || !gameState.bot.isAlive) {
        gameState.bot = new LevelsBot(gameState.arena);
        io.emit('botSpawned', gameState.bot.getState());
        console.log('Levels Bot spawned');
    }
}

// Check if bot should respawn
function checkBotRespawn() {
    // Skip if bot is disabled
    if (!gameState.botEnabled) {
        return;
    }

    if (!gameState.bot || !gameState.bot.isAlive) {
        const now = Date.now();
        if (now - gameState.lastBotEliminationTime >= BOT_CONSTANTS.RESPAWN_DELAY) {
            initializeBot();
        }
    }
}

// Update bot state
function updateBot(deltaTime) {
    // Skip if bot is disabled
    if (!gameState.botEnabled) {
        return;
    }

    if (gameState.bot && gameState.bot.isAlive) {
        const botUpdate = gameState.bot.update(gameState.players, deltaTime, gameState.obstacles);
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
                    
                    // Only apply damage if player is within range and bot has line of sight
                    if (distance <= BOT_CONSTANTS.MACHINE_GUN_RANGE && gameState.bot.hasLineOfSightToTarget(gameState.obstacles)) {
                        // Calculate angle to player relative to bot's rotation
                        const angleToPlayer = Math.atan2(dx, dz);
                        const angleDiff = Math.abs(gameState.bot.normalizeAngle(angleToPlayer - gameState.bot.rotation));
                        
                        // Only hit players within the firing arc
                        if (angleDiff <= (BOT_CONSTANTS.MACHINE_GUN_ARC * Math.PI / 180) / 2) {
                            // Calculate damage based on distance (more damage at closer range)
                            const damageMultiplier = 1 - (distance / BOT_CONSTANTS.MACHINE_GUN_RANGE);
                            const damage = Math.ceil(BOT_CONSTANTS.MACHINE_GUN_DAMAGE * (0.5 + damageMultiplier));
                            
                            // Apply damage to player
                            player.health -= damage;
                            
                            // Emit damage event
                            io.emit('playerDamaged', {
                                id: playerId,
                                damage: damage,
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

// Get game state for client
function getGameStateForClient() {
    // Convert players Map to an object
    const playersObj = {};
    gameState.players.forEach((player, id) => {
        playersObj[id] = {
            ...player,
            // Only include necessary properties
            id: id,
            position: player.position,
            rotation: player.rotation,
            health: player.health,
            invincible: player.invincible,
            eliminated: player.eliminated,
            username: player.username,
            kills: player.kills,
            trickScore: player.trickScore,
            joinTime: player.joinTime
        };
    });

    return {
        players: playersObj,
        bot: gameState.bot ? gameState.bot.getState() : null,
        botEnabled: gameState.botEnabled,
        activePlayerCount: Array.from(gameState.players.values()).filter(p => !p.eliminated).length
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
    socket.emit('testModeStatus', { enabled: CONFIG.TEST_MODE });

    // Send game configuration to client
    socket.emit('gameConfig', {
        testMode: CONFIG.TEST_MODE,
        botEnabled: CONFIG.BOT_ENABLED
    });

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
                
                const COLLISION_RADIUS = 25; // Increased from 15 to 25 for more noticeable collisions
                if (distance < COLLISION_RADIUS) {
                    // Calculate relative velocity
                    const relativeVelX = (player.velocity?.x || 0) - (gameState.bot.velocity?.x || 0);
                    const relativeVelZ = (player.velocity?.z || 0) - (gameState.bot.velocity?.z || 0);
                    const relativeSpeed = Math.sqrt(relativeVelX * relativeVelX + relativeVelZ * relativeVelZ);
                    
                    // Calculate normalized collision vector
                    const normalX = dx / distance;
                    const normalZ = dz / distance;
                    
                    // Immediately separate the objects to prevent overlap
                    const overlap = COLLISION_RADIUS - distance;
                    const separationX = normalX * overlap * 0.5;
                    const separationZ = normalZ * overlap * 0.5;
                    
                    // Move player away from bot
                    player.position.x += separationX;
                    player.position.z += separationZ;
                    
                    // Move bot in opposite direction
                    gameState.bot.position.x -= separationX;
                    gameState.bot.position.z -= separationZ;
                    
                    // Calculate damage based on relative speed (with reasonable limits)
                    const damage = Math.min(Math.max(5, relativeSpeed * 10), 30);
                    
                    // Apply stronger bounce effect
                    const BOUNCE_FACTOR = 1.2; // Increased from 0.8 for more bounce
                    const FRICTION = 0.8;
                    
                    // Calculate bounce velocities
                    const dotProduct = (relativeVelX * normalX + relativeVelZ * normalZ);
                    
                    // Apply bounce to player with stronger effect
                    player.velocity.x = (player.velocity.x - dotProduct * normalX * BOUNCE_FACTOR) * FRICTION;
                    player.velocity.z = (player.velocity.z - dotProduct * normalZ * BOUNCE_FACTOR) * FRICTION;
                    
                    // Apply opposite bounce to bot
                    gameState.bot.velocity.x = (dotProduct * normalX * BOUNCE_FACTOR) * FRICTION;
                    gameState.bot.velocity.z = (dotProduct * normalZ * BOUNCE_FACTOR) * FRICTION;
                    
                    // Apply damage to player if not invincible
                    if (!player.invincible) {
                        const playerDamage = Math.floor(damage * 0.5); // Player takes half damage
                        player.health -= playerDamage;
                        io.emit('playerDamaged', {
                            id: socket.id,
                            damage: playerDamage,
                            type: 'collision',
                            health: player.health
                        });
                    }
                    
                    // Apply damage to bot
                    const botDamage = Math.floor(damage * 1.5); // Bot takes more damage from collisions
                    const botEliminated = gameState.bot.takeDamage(botDamage);
                    
                    // Handle bot elimination
                    if (botEliminated) {
                        gameState.lastBotEliminationTime = Date.now();
                        io.emit('botEliminated', {
                            eliminatedBy: socket.id,
                            points: BOT_CONSTANTS.KILL_POINTS
                        });
                    }
                    
                    // Check if player was eliminated
                    if (player.health <= 0) {
                        io.emit('playerEliminated', {
                            id: socket.id,
                            reason: 'collision'
                        });
                        gameState.players.delete(socket.id);
                    }
                    
                    // Immediately broadcast the updated state after collision
                    io.emit('gameUpdate', getGameStateForClient());
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

                // Emit respawn event with updated player count
                io.emit('playerRespawned', {
                    id: socket.id,
                    position: respawnPosition,
                    health: 100,
                    activePlayerCount: Array.from(gameState.players.values()).filter(p => !p.eliminated).length
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