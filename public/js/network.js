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

      // Event callbacks
      this.onGameState = null;
      this.onPlayerJoined = null;
      this.onPlayerLeft = null;
      this.onGameUpdate = null;
      this.onPlayerDamaged = null;
      this.onPlayerEliminated = null;
      this.onPlayerBoosting = null;
      this.onPlayerRespawned = null;

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
      this.players[data.id] = data;

      if (this.onPlayerJoined) {
        this.onPlayerJoined(data);
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
      if (this.onPlayerRespawned) {
        this.onPlayerRespawned(data);
      }
    });
  }

  // Send player update to server
  sendPlayerUpdate(position, rotation) {
    this.socket.emit('playerUpdate', {
      position: position,
      rotation: rotation
    });
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
      playerCountElement.textContent = `${playerCount} players`;
    }
  }

  // Update health UI
  updateHealthUI(health) {
    const healthBar = document.getElementById('health-bar');

    if (healthBar) {
      healthBar.style.width = `${health}%`;

      // Change color based on health level
      if (health > 60) {
        healthBar.style.backgroundColor = '#f00'; // Red
      } else if (health > 30) {
        healthBar.style.backgroundColor = '#ff7700'; // Orange
      } else {
        healthBar.style.backgroundColor = '#ff0000'; // Bright red
      }
    }

    // If health is low, add visual feedback
    if (health < 30) {
      // Add screen flash effect
      const gameContainer = document.getElementById('game-container');
      if (gameContainer) {
        gameContainer.style.animation = 'none';
        setTimeout(() => {
          gameContainer.style.animation = 'damage-flash 0.5s';
        }, 10);
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
  }

  // Get player ID
  getPlayerId() {
    return this.playerId;
  }

  // Get all players
  getPlayers() {
    return this.players;
  }
}