// Handles network communication with Socket.IO
class GameNetwork {
  // Static flag to control console logging
  static disableLogging = true;

  // Helper method for conditional logging
  static log(...args) {
    if (!this.disableLogging) {
      console.log(...args);
    }
  }

  constructor(username) {
    GameNetwork.log('GameNetwork constructor called');
    // Initialize Socket.IO connection
    try {
      this.socket = io();
      this.playerId = null;
      this.username = username;
      this.players = {};  // Change back to object since server sends object format

      // Initialize death sound
      this.deathSound = new Audio('sounds/death.mp3');
      this.deathSound.volume = 0.5; // Set volume to 50%

      // Event callbacks
      this.onGameState = null;
      this.onPlayerJoined = null;
      this.onPlayerLeft = null;
      this.onGameUpdate = null;
      this.onPlayerDamaged = null;
      this.onPlayerEliminated = null;
      this.onPlayerBoosting = null;
      this.onPlayerRespawned = null;
      this.onTestModeStatus = null;

      // Set up event listeners
      this.setupEventListeners();
    } catch (error) {
      console.error('Error initializing Socket.IO:', error);
    }
  }

  // Set up Socket.IO event listeners
  setupEventListeners() {
    GameNetwork.log('Setting up Socket.IO event listeners');

    // Connection established
    this.socket.on('connect', () => {
      GameNetwork.log('Connected to server with ID:', this.socket.id);
      this.playerId = this.socket.id;

      // Send username to server (could be extended in the future)
      // this.socket.emit('setUsername', { username: this.username });
    });

    // Test mode status
    this.socket.on('testModeStatus', (data) => {
      if (this.onTestModeStatus) {
        this.onTestModeStatus(data);
      }
    });

    // Connection error
    this.socket.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    // Receive initial game state
    this.socket.on('gameState', (data) => {
      GameNetwork.log('Received initial game state:', data);
      GameNetwork.log('Players data type:', typeof data.players);
      GameNetwork.log('Players data:', data.players);
      this.players = data.players || {};

      if (this.onGameState) {
        this.onGameState(data);
      }

      // Update player count UI
      this.updatePlayerCountUI();
    });

    // New player joined
    this.socket.on('playerJoined', (data) => {
      // Ensure player spawns in center
      const centerPosition = { x: 0, y: 0, z: 0 };
      this.players[data.id] = {
        ...data,
        position: centerPosition,
        rotation: 0,
        health: 100,
        invincible: true
      };

      if (this.onPlayerJoined) {
        this.onPlayerJoined({
          ...data,
          position: centerPosition,
          rotation: 0,
          health: 100,
          invincible: true
        });
      }

      // Update player count UI
      this.updatePlayerCountUI();
    });

    // Player left
    this.socket.on('playerLeft', (data) => {
      delete this.players[data.id];

      if (this.onPlayerLeft) {
        this.onPlayerLeft(data);
      }

      // Update player count UI
      this.updatePlayerCountUI();
    });

    // Game state update
    this.socket.on('gameUpdate', (data) => {
      GameNetwork.log('Game update received:', data);
      GameNetwork.log('Players in update:', data.players);
      this.players = data.players || {};

      if (this.onGameUpdate) {
        this.onGameUpdate(data);
      }

      // Update player count UI after each game update
      this.updatePlayerCountUI();
    });

    // Player damaged
    this.socket.on('playerDamaged', (data) => {
      if (this.players.hasOwnProperty(data.id)) {
        const player = this.players[data.id];
        player.health = data.health;
        this.players[data.id] = player;
      }

      if (this.onPlayerDamaged) {
        this.onPlayerDamaged(data);
      }

      // Update health bar if it's the local player
      if (data.id === this.playerId) {
        this.updateHealthUI(data.health);
      }
    });

    // Player eliminated
    this.socket.on('playerEliminated', (data) => {
      GameNetwork.log('Player eliminated:', data.id, 'Local player:', this.playerId);
      
      if (data.id === this.playerId) {
        // Stop background music immediately
        const backgroundMusic = document.querySelector('audio');
        if (backgroundMusic) {
          backgroundMusic.pause();
          backgroundMusic.currentTime = 0;
        }

        // Set health to 0
        const healthFill = document.getElementById('health-fill');
        if (healthFill) {
          healthFill.style.transition = 'transform 0.3s ease';
          healthFill.style.transform = 'scaleX(0)';
        }
        this.updateHealthUI(0);
      }
      
      // Mark player as eliminated instead of deleting
      if (this.players[data.id]) {
        this.players[data.id].eliminated = true;
        this.players[data.id].health = 0;
      }

      if (this.onPlayerEliminated) {
        this.onPlayerEliminated(data);
      }

      // Show elimination message with reason
      const isLocalPlayer = data.id === this.playerId;
      let message;
      if (isLocalPlayer) {
        message = data.reason === 'inactivity' ?
          'You were eliminated due to inactivity!' :
          'You were eliminated! Respawning...';
        // Play death sound when local player is eliminated
        this.deathSound.currentTime = 0;
        this.deathSound.play().catch(e => console.log('Error playing death sound:', e));
      } else {
        message = data.reason === 'inactivity' ?
          'Player eliminated due to inactivity!' :
          'Player eliminated!';
      }
      this.showEliminationMessage(message);

      // Log the current state
      GameNetwork.log('Players after elimination:', this.players);
      
      // Update player count UI
      this.updatePlayerCountUI();
    });

    // Player boosting
    this.socket.on('playerBoosting', (data) => {
      if (this.players.hasOwnProperty(data.id)) {
        const player = this.players[data.id];
        player.boosting = true;
        this.players[data.id] = player;

        // Reset boosting state after a short delay
        setTimeout(() => {
          if (this.players.hasOwnProperty(data.id)) {
            const player = this.players[data.id];
            player.boosting = false;
            this.players[data.id] = player;
          }
        }, 2000);
      }
    });

    this.socket.on('playerRespawned', (data) => {
      GameNetwork.log('Player respawned:', data.id, 'Local player:', this.playerId);
      
      // Update or add the player with respawn state
      this.players[data.id] = {
        ...this.players[data.id] || {},
        ...data,
        position: { x: 0, y: 0, z: 0 },
        rotation: 0,
        health: 100,
        invincible: true,
        eliminated: false  // Make sure to set eliminated to false
      };

      // If it's the local player, reset the health bar
      if (data.id === this.playerId) {
        GameNetwork.log('Resetting local player health bar');
        const healthFill = document.getElementById('health-fill');
        if (healthFill) {
          // Disable transition and set to full width
          healthFill.style.transition = 'none';
          healthFill.style.transform = 'scaleX(1)';
          
          // Force reflow
          void healthFill.offsetWidth;
          
          // Re-enable transition for future updates
          healthFill.style.transition = 'transform 0.3s ease';

          // Restart background music
          const backgroundMusic = document.querySelector('audio');
          if (backgroundMusic) {
            backgroundMusic.currentTime = 0;
            backgroundMusic.play().catch(e => console.log('Error playing background music:', e));
          }
        }

        // Update health through the normal health update function with no transition
        const healthBar = document.getElementById('health-bar');
        if (healthBar) {
          healthBar.style.transition = 'none';
          void healthBar.offsetWidth;
          this.updateHealthUI(100);
          // Re-enable transitions after a short delay
          setTimeout(() => {
            healthBar.style.transition = 'transform 0.3s ease';
          }, 50);
        }
      }
      
      // Log current players state
      GameNetwork.log('Current players after respawn:', this.players);
      
      // Update callbacks
      if (this.onPlayerRespawned) {
        this.onPlayerRespawned(data);
      }

      // Force player count update
      this.updatePlayerCountUI();
    });

    // Handle score updates
    this.socket.on('scoreUpdate', (data) => {
      const players = this.getPlayers();
      if (players[data.id]) {
        if (data.trickScore !== undefined) {
          players[data.id].trickScore = data.trickScore;
        }
        if (data.kills !== undefined) {
          players[data.id].kills = data.kills;
        }
      }
    });
  }

  // Send player position update to server
  sendPlayerUpdate(position, rotation) {
    if (!position || typeof position.x === 'undefined') {
      console.warn('Invalid position data:', position);
      return;
    }

    // Ensure we're only sending the necessary data
    const updateData = {
      position: {
        x: position.x,
        y: position.y,
        z: position.z
      },
      rotation: rotation || 0
    };

    this.socket.emit('playerUpdate', updateData);
  }

  // Send collision event to server
  sendCollision(targetId, impactForce) {
    this.socket.emit('collision', {
      targetId: targetId,
      impactForce: impactForce
    });
  }

  // Send boost activation to server
  sendBoostActivated() {
    this.socket.emit('boostActivated');
  }

  // Send power-up collection to server
  sendPowerUpCollection(powerUpId, type) {
    this.socket.emit('powerUpCollected', {
      id: powerUpId,
      type: type,
      playerId: this.playerId
    });
  }

  // Update player count UI
  updatePlayerCountUI() {
    // Filter out eliminated players
    const activePlayers = Object.values(this.players || {}).filter(player => !player.eliminated);
    const playerCount = activePlayers.length;
    GameNetwork.log('Player count update - Active players:', playerCount);
    GameNetwork.log('Current players:', activePlayers.map(p => p.id));
    
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
        const text = playerCount === 1 ? 'player' : 'players';
        playerCountElement.textContent = `${playerCount} ${text}`;
    }
  }

  // Update health UI
  updateHealthUI(health) {
    const healthBar = document.getElementById('health-bar');
    const healthFill = document.getElementById('health-fill');

    if (healthBar && healthFill) {
      // Ensure health is between 0 and 100
      health = Math.max(0, Math.min(100, health));
      
      // Simple transform update
      healthFill.style.transition = 'transform 0.3s ease';
      healthFill.style.transform = `scaleX(${health / 100})`;

      // If health is low, add visual feedback
      if (health < 30) {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
          gameContainer.style.animation = 'none';
          void gameContainer.offsetWidth;
          gameContainer.style.animation = 'damage-flash 0.5s';
        }
      }
    }
  }

  // Show elimination message
  showEliminationMessage(message) {
    const messageElement = document.getElementById('elimination-message');
    if (messageElement) {
      messageElement.textContent = message;
      messageElement.style.display = 'block';
      setTimeout(() => {
        messageElement.style.display = 'none';
      }, 3000);
    }
  }

  // Set event callbacks
  setCallbacks(callbacks) {
    this.onGameState = callbacks.onGameState;
    this.onPlayerJoined = callbacks.onPlayerJoined;
    this.onPlayerLeft = callbacks.onPlayerLeft;
    this.onGameUpdate = callbacks.onGameUpdate;
    this.onPlayerDamaged = callbacks.onPlayerDamaged;
    this.onPlayerEliminated = callbacks.onPlayerEliminated;
    this.onPlayerBoosting = callbacks.onPlayerBoosting;
    this.onPlayerRespawned = callbacks.onPlayerRespawned;
    this.onTestModeStatus = callbacks.onTestModeStatus;

    // Initialize health to 100 when callbacks are set (game starts)
    // Force immediate update without transition
    const healthFill = document.getElementById('health-fill');
    if (healthFill) {
      healthFill.style.transition = 'none';
      void healthFill.offsetWidth;
      healthFill.style.transform = 'scaleX(1)';
      requestAnimationFrame(() => {
        healthFill.style.transition = 'transform 0.3s ease';
      });
    }
  }

  // Get player ID
  getPlayerId() {
    return this.playerId;
  }

  // Get all players
  getPlayers() {
    return this.players;
  }

  // Add method to send score updates
  sendScoreUpdate(scoreData) {
    this.socket.emit('updateScore', scoreData);
  }
}