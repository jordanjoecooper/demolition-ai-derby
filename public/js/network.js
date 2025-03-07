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
      this.players = {};

      // Event callbacks
      this.onGameState = null;
      this.onPlayerJoined = null;
      this.onPlayerLeft = null;
      this.onGameUpdate = null;
      this.onPlayerDamaged = null;
      this.onPlayerEliminated = null;
      this.onRoundOver = null;
      this.onNewRound = null;

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
      this.players = data.players;

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
      this.players = data.players;

      if (this.onGameUpdate) {
        this.onGameUpdate(data);
      }
    });

    // Player damaged
    this.socket.on('playerDamaged', (data) => {
      if (this.players[data.id]) {
        this.players[data.id].health = data.health;
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

      // Update player count UI
      this.updatePlayerCountUI();
    });

    // Round over
    this.socket.on('roundOver', (data) => {
      if (this.onRoundOver) {
        this.onRoundOver(data);
      }

      // Show round over UI
      this.showRoundOverUI(data.winnerId);
    });

    // New round starting
    this.socket.on('newRound', (data) => {
      this.players = data.players;

      if (this.onNewRound) {
        this.onNewRound(data);
      }

      // Hide round over UI
      this.hideRoundOverUI();

      // Reset health UI
      this.updateHealthUI(100);
    });

    // Player boosting
    this.socket.on('playerBoosting', (data) => {
      if (this.players[data.id]) {
        this.players[data.id].boosting = true;

        // Reset boosting state after a short delay
        setTimeout(() => {
          if (this.players[data.id]) {
            this.players[data.id].boosting = false;
          }
        }, 2000);
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

  // Update player count UI
  updatePlayerCountUI() {
    const playerCount = Object.keys(this.players).length;
    const playerCountElement = document.getElementById('player-count');

    if (playerCountElement) {
      playerCountElement.textContent = `Players: ${playerCount}`;
    }

    // Update round info based on player count
    const roundInfoElement = document.getElementById('round-info');

    if (roundInfoElement) {
      if (playerCount < 2) {
        roundInfoElement.textContent = 'Waiting for more players...';
      } else {
        roundInfoElement.textContent = 'Round in progress';
      }
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

  // Show round over UI
  showRoundOverUI(winnerId) {
    const gameOverElement = document.getElementById('game-over');
    const winnerMessageElement = document.getElementById('winner-message');
    const countdownElement = document.getElementById('countdown');

    if (gameOverElement && winnerMessageElement && countdownElement) {
      // Set winner message
      if (winnerId === this.playerId) {
        winnerMessageElement.textContent = 'You won the round!';
      } else {
        winnerMessageElement.textContent = 'You were eliminated!';
      }

      // Show game over UI
      gameOverElement.classList.remove('hidden');

      // Start countdown
      let countdown = 10;
      countdownElement.textContent = countdown;

      const countdownInterval = setInterval(() => {
        countdown--;
        countdownElement.textContent = countdown;

        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);
    }
  }

  // Hide round over UI
  hideRoundOverUI() {
    const gameOverElement = document.getElementById('game-over');

    if (gameOverElement) {
      gameOverElement.classList.add('hidden');
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
    this.onRoundOver = callbacks.onRoundOver;
    this.onNewRound = callbacks.onNewRound;
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