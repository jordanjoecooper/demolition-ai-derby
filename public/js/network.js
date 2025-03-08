// Handles network communication with Socket.IO
class GameNetwork {
  constructor(username) {
    console.log('GameNetwork constructor called');
    // Initialize Socket.IO connection
    try {
      console.log('Initializing Socket.IO connection');
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
    console.log('Setting up Socket.IO event listeners');

    // Connection established
    this.socket.on('connect', () => {
      console.log('Connected to server with ID:', this.socket.id);
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
      console.log('Received initial game state:', data);
      console.log('Players data type:', typeof data.players);
      console.log('Players data:', data.players);
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
      console.log('Game update received:', data);
      console.log('Players in update:', data.players);
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
      delete this.players[data.id];

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
        this.deathSound.currentTime = 0; // Reset sound to start
        this.deathSound.play().catch(e => console.log('Error playing death sound:', e));
      } else {
        message = data.reason === 'inactivity' ?
          'Player eliminated due to inactivity!' :
          'Player eliminated!';
      }
      this.showEliminationMessage(message);

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
      if (data.id === this.playerId) {
        // Reset health to 100 when local player respawns
        this.updateHealthUI(100);
      }
      if (this.onPlayerRespawned) {
        this.onPlayerRespawned(data);
      }
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
    const playerCount = Object.keys(this.players || {}).length;
    console.log('Updating player count:', playerCount, 'Players:', this.players);
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
      
      // Update health fill transform
      healthFill.style.transform = `scaleX(${health / 100})`;

      // If health is low, add visual feedback
      if (health < 30) {
        const gameContainer = document.getElementById('game-container');
        if (gameContainer) {
          gameContainer.style.animation = 'none';
          setTimeout(() => {
            gameContainer.style.animation = 'damage-flash 0.5s';
          }, 10);
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
    this.updateHealthUI(100);
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