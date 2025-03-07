// Main game logic
class Game {
  constructor(renderer, network, controls) {
    this.renderer = renderer;
    this.network = network;
    this.controls = controls;

    // Game state
    this.localPlayer = {
      position: { x: 0, y: 0, z: 0 },
      rotation: 0,
      velocity: { x: 0, y: 0, z: 0 },
      health: 100,
      invincible: true,
      isInAir: false,
      airTimeStart: 0,
      lastObstacleCollision: 0,
      obstacleCooldown: 500, // ms
      hasShield: false,
      shieldEndTime: 0
    };

    // Test mode state
    this.testMode = false;
    this.lastKeyPresses = [];
    this.keyPressTimeout = 300; // Time window for key sequence (ms)
    this.lastKeyPressTime = 0;

    // Create death screen
    this.createDeathScreen();

    // Physics constants
    this.maxSpeed = 1.0;
    this.acceleration = 0.01;
    this.deceleration = 0.005;
    this.rotationSpeed = 0.05;
    this.boostMultiplier = 2.0;
    this.gravity = 0.01;
    this.groundLevel = 0;
    this.carRadius = 10; // For collision detection
    this.spawnInvincibilityDuration = 5000; // 5 seconds of invincibility on spawn

    // Collision detection
    this.lastCollisionTime = {};
    this.collisionCooldown = 500; // ms

    // FPS counter
    this.fpsCounter = document.getElementById('fps-counter');
    this.frameCount = 0;
    this.lastFpsUpdate = 0;
    this.fps = 0;

    // Air time indicator
    this.airTimeIndicator = document.getElementById('air-time-indicator');
    this.airTimeIndicatorTimeout = null;

    // Set up network callbacks
    this.setupNetworkCallbacks();

    // Set up boost callback
    this.controls.setBoostCallback(() => {
      this.network.sendBoostActivated();
    });

    // Animation frame ID
    this.animationFrameId = null;

    // Set invincibility timer (5 seconds)
    setTimeout(() => {
      this.localPlayer.invincible = false;
    }, this.spawnInvincibilityDuration);
  }

  createDeathScreen() {
    // Create death screen container
    const deathScreen = document.createElement('div');
    deathScreen.id = 'death-screen';
    deathScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      color: #ff0000;
      font-family: monospace;
    `;

    // Add wasted text
    const wastedText = document.createElement('h1');
    wastedText.textContent = 'WASTED';
    wastedText.style.cssText = `
      font-size: 72px;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px #000;
    `;

    // Add ASCII skull
    const skullArt = document.createElement('pre');
    skullArt.textContent = `
      .-'---\`-.
      /-'     '-\\
     |           |
     |  X     X  |
     |     ^     |
     |   '-|-'   |
     \\     =     /
      \`-..___.-'
    `;
    skullArt.style.cssText = `
      font-size: 24px;
      margin: 20px 0;
      color: #fff;
    `;

    // Add respawn button
    const respawnButton = document.createElement('button');
    respawnButton.textContent = 'RESPAWN';
    respawnButton.style.cssText = `
      padding: 15px 30px;
      font-size: 24px;
      background-color: #ff0000;
      color: #fff;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 20px;
      font-family: monospace;
      transition: background-color 0.3s;
    `;
    respawnButton.onmouseover = () => respawnButton.style.backgroundColor = '#cc0000';
    respawnButton.onmouseout = () => respawnButton.style.backgroundColor = '#ff0000';
    respawnButton.onclick = () => this.handleRespawnClick();

    // Add elements to death screen
    deathScreen.appendChild(wastedText);
    deathScreen.appendChild(skullArt);
    deathScreen.appendChild(respawnButton);

    // Add death screen to document
    document.body.appendChild(deathScreen);
  }

  showDeathScreen() {
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
      deathScreen.style.display = 'flex';
    }
  }

  hideDeathScreen() {
    const deathScreen = document.getElementById('death-screen');
    if (deathScreen) {
      deathScreen.style.display = 'none';
    }
  }

  handleRespawnClick() {
    // Hide death screen
    this.hideDeathScreen();

    // Reset position and health
    this.localPlayer.position = {
      x: (Math.random() - 0.5) * (this.renderer.arenaSize - 100),
      y: 0,
      z: (Math.random() - 0.5) * (this.renderer.arenaSize - 100)
    };
    this.localPlayer.health = 100;
    this.localPlayer.eliminated = false;
    this.localPlayer.invincible = true;
    this.localPlayer.velocity = { x: 0, y: 0, z: 0 };

    // Remove invincibility after 5 seconds
    setTimeout(() => {
      this.localPlayer.invincible = false;
    }, 5000);

    // Notify server of respawn
    this.network.socket.emit('playerRespawned', {
      id: this.network.getPlayerId(),
      position: this.localPlayer.position
    });
  }

  // Set up network callbacks
  setupNetworkCallbacks() {
    this.network.setCallbacks({
      onGameState: (data) => {
        // Initialize local player position from server data
        const playerId = this.network.getPlayerId();
        const player = data.players[playerId];
        if (player) {
          this.localPlayer.position = { ...player.position };
          this.localPlayer.rotation = player.rotation;
          this.localPlayer.health = player.health;
          this.localPlayer.invincible = player.invincible;
        }
      },
      onPlayerJoined: (data) => this.handlePlayerJoined(data),
      onPlayerLeft: (data) => this.handlePlayerLeft(data),
      onGameUpdate: (data) => this.handleGameUpdate(data),
      onPlayerDamaged: (data) => this.handlePlayerDamaged(data),
      onPlayerEliminated: (data) => this.handlePlayerEliminated(data),
      onPlayerBoosting: (data) => this.handlePlayerBoosting(data),
      onPlayerRespawned: (data) => this.handlePlayerRespawned(data),
      onTestModeStatus: (data) => {
        this.testMode = data.enabled;
        console.log('Test mode:', this.testMode ? 'enabled' : 'disabled');
        // Add test mode key listener when enabled
        if (this.testMode) {
          console.log('Adding test mode key listener');
          // Remove any existing listener first to prevent duplicates
          document.removeEventListener('keydown', this.handleTestModeKeys.bind(this));
          document.addEventListener('keydown', this.handleTestModeKeys.bind(this));
        }
      }
    });
  }

  handleTestModeKeys(event) {
    if (!this.testMode) return;

    const now = Date.now();

    // Clear old key presses that are outside the time window
    while (this.lastKeyPresses.length > 0 &&
           now - this.lastKeyPresses[0].time > this.keyPressTimeout) {
      this.lastKeyPresses.shift();
    }

    // Add new key press
    this.lastKeyPresses.push({
      key: event.key.toLowerCase(),
      time: now
    });

    // Check for 'dd' sequence
    if (this.lastKeyPresses.length >= 2) {
      const lastTwo = this.lastKeyPresses.slice(-2);
      if (lastTwo[0].key === 'd' && lastTwo[1].key === 'd' &&
          lastTwo[1].time - lastTwo[0].time <= this.keyPressTimeout) {
        console.log('Test mode: "dd" sequence detected - triggering death');
        this.localPlayer.health = 0;
        this.network.updateHealthUI(0);
        this.localPlayer.eliminated = true;
        this.network.socket.emit('playerDied', { id: this.network.getPlayerId() });
        this.showDeathScreen();
        // Clear the sequence after triggering
        this.lastKeyPresses = [];
      }
    }
  }

  // Start the game loop
  start() {
    // Start the game loop
    this.lastFpsUpdate = performance.now();
    this.gameLoop();
  }

  // Update FPS counter
  updateFpsCounter(now) {
    this.frameCount++;

    // Update FPS display every 500ms
    if (now - this.lastFpsUpdate >= 500) {
      // Calculate FPS: frames / seconds
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));

      // Update counter display
      if (this.fpsCounter) {
        this.fpsCounter.textContent = `FPS: ${this.fps}`;

        // Color-code based on performance
        if (this.fps >= 50) {
          this.fpsCounter.style.color = '#0f0'; // Green for good performance
        } else if (this.fps >= 30) {
          this.fpsCounter.style.color = '#ff0'; // Yellow for acceptable performance
        } else {
          this.fpsCounter.style.color = '#f00'; // Red for poor performance
        }
      }

      // Reset counters
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
  }

  // Main game loop
  gameLoop() {
    const now = performance.now();

    // Update FPS counter
    this.updateFpsCounter(now);

    // Update local player
    this.updateLocalPlayer();

    // Check for collisions with other players
    this.checkPlayerCollisions();

    // Check for collisions with obstacles
    this.checkObstacleCollisions();

    // Update renderer with local player position
    this.renderer.updatePlayer(
      this.network.getPlayerId(),
      this.localPlayer.position,
      this.localPlayer.rotation,
      this.localPlayer.health,
      this.localPlayer.invincible,
      this.controls.getInputs().boost
    );

    // Update camera to follow player
    this.renderer.followPlayer(this.localPlayer.position, this.localPlayer.rotation);

    // Render the scene
    this.renderer.render();

    // Continue the game loop
    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  // Update local player based on controls
  updateLocalPlayer() {
    const inputs = this.controls.getInputs();

    // Apply rotation (only when on ground)
    if (!this.localPlayer.isInAir) {
      if (inputs.left) {
        this.localPlayer.rotation += this.rotationSpeed;
      }
      if (inputs.right) {
        this.localPlayer.rotation -= this.rotationSpeed;
      }
    }

    // Calculate acceleration direction based on rotation
    const dirX = Math.sin(this.localPlayer.rotation);
    const dirZ = Math.cos(this.localPlayer.rotation);

    // Apply acceleration (reduced control in air)
    const airControlFactor = this.localPlayer.isInAir ? 0.3 : 1.0;

    if (inputs.forward) {
      this.localPlayer.velocity.x += dirX * this.acceleration * airControlFactor;
      this.localPlayer.velocity.z += dirZ * this.acceleration * airControlFactor;
    }
    if (inputs.backward) {
      this.localPlayer.velocity.x -= dirX * this.acceleration * 0.5 * airControlFactor; // Slower in reverse
      this.localPlayer.velocity.z -= dirZ * this.acceleration * 0.5 * airControlFactor;
    }

    // Apply boost
    const speedMultiplier = inputs.boost ? this.boostMultiplier : 1.0;

    // Apply deceleration (friction) - less friction in air
    const frictionFactor = this.localPlayer.isInAir ? 0.5 : 1.0;
    this.localPlayer.velocity.x *= (1 - this.deceleration * frictionFactor);
    this.localPlayer.velocity.z *= (1 - this.deceleration * frictionFactor);

    // Check if on a ramp
    const rampCheck = this.renderer.checkRampCollision(this.localPlayer.position);

    if (rampCheck.onRamp) {
      // On a ramp - adjust height and add upward velocity when reaching the end
      const targetHeight = rampCheck.height;

      // If near the top of the ramp and moving forward, launch into the air
      if (targetHeight > this.localPlayer.position.y && targetHeight > 10) {
        // Calculate speed
        const speed = Math.sqrt(
          this.localPlayer.velocity.x * this.localPlayer.velocity.x +
          this.localPlayer.velocity.z * this.localPlayer.velocity.z
        );

        // Add upward velocity based on speed
        this.localPlayer.velocity.y = Math.min(speed * 0.5, 0.5);

        // Start air time tracking
        if (!this.localPlayer.isInAir) {
          this.localPlayer.isInAir = true;
          this.localPlayer.airTimeStart = Date.now();
          this.showAirTimeIndicator();
        }
      }

      // Set position to ramp height
      this.localPlayer.position.y = Math.max(this.localPlayer.position.y, targetHeight);
    } else {
      // Apply gravity if above ground
      if (this.localPlayer.position.y > this.groundLevel) {
        this.localPlayer.velocity.y -= this.gravity;

        // Start air time tracking if not already in air
        if (!this.localPlayer.isInAir) {
          this.localPlayer.isInAir = true;
          this.localPlayer.airTimeStart = Date.now();
          this.showAirTimeIndicator();
        }
      } else {
        // On ground, reset y position and velocity
        this.localPlayer.position.y = this.groundLevel;
        this.localPlayer.velocity.y = 0;

        // If was in air, calculate air time duration
        if (this.localPlayer.isInAir) {
          const airTimeDuration = (Date.now() - this.localPlayer.airTimeStart) / 1000;
          if (airTimeDuration > 0.5) { // Only count air time longer than 0.5 seconds
            console.log(`Air time: ${airTimeDuration.toFixed(2)} seconds`);
          }
          this.localPlayer.isInAir = false;
        }
      }
    }

    // Limit horizontal speed
    const currentSpeed = Math.sqrt(
      this.localPlayer.velocity.x * this.localPlayer.velocity.x +
      this.localPlayer.velocity.z * this.localPlayer.velocity.z
    );

    if (currentSpeed > this.maxSpeed * speedMultiplier) {
      const scaleFactor = (this.maxSpeed * speedMultiplier) / currentSpeed;
      this.localPlayer.velocity.x *= scaleFactor;
      this.localPlayer.velocity.z *= scaleFactor;
    }

    // Update position
    this.localPlayer.position.x += this.localPlayer.velocity.x;
    this.localPlayer.position.y += this.localPlayer.velocity.y;
    this.localPlayer.position.z += this.localPlayer.velocity.z;

    // Check for power-up collection
    this.checkPowerUpCollections();

    // Update shield status
    if (this.localPlayer.hasShield && Date.now() > this.localPlayer.shieldEndTime) {
      this.localPlayer.hasShield = false;
      this.localPlayer.invincible = false;
    }

    // Arena boundaries (half of arena size)
    const arenaHalfSize = this.renderer.arenaSize / 2;

    // Bounce off walls
    if (Math.abs(this.localPlayer.position.x) > arenaHalfSize) {
      this.localPlayer.position.x = Math.sign(this.localPlayer.position.x) * arenaHalfSize;
      this.localPlayer.velocity.x *= -0.5; // Bounce with reduced velocity
    }

    if (Math.abs(this.localPlayer.position.z) > arenaHalfSize) {
      this.localPlayer.position.z = Math.sign(this.localPlayer.position.z) * arenaHalfSize;
      this.localPlayer.velocity.z *= -0.5; // Bounce with reduced velocity
    }

    // Send position update to server
    this.network.sendPlayerUpdate(this.localPlayer.position, this.localPlayer.rotation);
  }

  // Show air time indicator
  showAirTimeIndicator() {
    if (this.airTimeIndicator) {
      // Clear any existing timeout
      if (this.airTimeIndicatorTimeout) {
        clearTimeout(this.airTimeIndicatorTimeout);
      }

      // Show the indicator
      this.airTimeIndicator.classList.add('visible');

      // Hide after animation completes
      this.airTimeIndicatorTimeout = setTimeout(() => {
        this.airTimeIndicator.classList.remove('visible');
      }, 2000);
    }
  }

  // Check for collisions with obstacles
  checkObstacleCollisions() {
    // Skip if invincible or on cooldown
    if (this.localPlayer.invincible ||
        Date.now() - this.localPlayer.lastObstacleCollision < this.localPlayer.obstacleCooldown) {
      return;
    }

    // Check for obstacle collisions
    const collision = this.renderer.checkObstacleCollision(
      this.localPlayer.position,
      this.carRadius
    );

    if (collision.collision) {
      // Apply damage
      const damage = collision.obstacle.damage;

      // Apply damage to local player
      this.localPlayer.health = Math.max(0, this.localPlayer.health - damage);

      // Update health UI
      this.network.updateHealthUI(this.localPlayer.health);

      // Set cooldown
      this.localPlayer.lastObstacleCollision = Date.now();

      // Apply physics response (bounce)
      const bounceForce = 0.7;
      this.localPlayer.velocity.x = collision.normal.x * bounceForce * Math.abs(this.localPlayer.velocity.x);
      this.localPlayer.velocity.z = collision.normal.z * bounceForce * Math.abs(this.localPlayer.velocity.z);

      // Check if player is eliminated
      if (this.localPlayer.health <= 0) {
        // Player is eliminated
        console.log('You were eliminated by an obstacle!');

        // Reset health for next round
        this.localPlayer.health = 100;
        this.localPlayer.invincible = true;

        // Reset position
        this.localPlayer.position = {
          x: (Math.random() - 0.5) * (this.renderer.arenaSize - 100),
          y: 0,
          z: (Math.random() - 0.5) * (this.renderer.arenaSize - 100)
        };

        // Reset velocity
        this.localPlayer.velocity = { x: 0, y: 0, z: 0 };

        // Set invincibility timer (5 seconds)
        setTimeout(() => {
          this.localPlayer.invincible = false;
        }, this.spawnInvincibilityDuration);
      }
    }
  }

  // Check for collisions with other players
  checkPlayerCollisions() {
    const playerId = this.network.getPlayerId();
    const players = this.network.getPlayers();

    // Skip if local player is invincible
    if (this.localPlayer.invincible) {
      return;
    }

    // Check collision with each other player
    Object.entries(players).forEach(([id, otherPlayer]) => {
      // Skip self
      if (id === playerId) {
        return;
      }

      // Skip if on cooldown with this player
      if (this.lastCollisionTime[id] && Date.now() - this.lastCollisionTime[id] < this.collisionCooldown) {
        return;
      }

      // Skip if other player is invincible
      if (otherPlayer.invincible) {
        return;
      }

      // Simple distance-based collision detection
      const dx = this.localPlayer.position.x - otherPlayer.position.x;
      const dz = this.localPlayer.position.z - otherPlayer.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Collision threshold (sum of car radii)
      const collisionThreshold = this.carRadius * 2; // Adjust based on car size

      if (distance < collisionThreshold) {
        // Calculate impact force based on relative velocity
        const relativeVelocityX = this.localPlayer.velocity.x - (otherPlayer.velocity?.x || 0);
        const relativeVelocityZ = this.localPlayer.velocity.z - (otherPlayer.velocity?.z || 0);
        const impactForce = Math.sqrt(relativeVelocityX * relativeVelocityX + relativeVelocityZ * relativeVelocityZ);

        // Minimum force required for damage
        if (impactForce > 0.1) {
          // Send collision to server
          this.network.sendCollision(id, impactForce);

          // Set collision cooldown
          this.lastCollisionTime[id] = Date.now();

          // Calculate normalized collision vector
          const normalX = dx / distance;
          const normalZ = dz / distance;

          // Apply stronger bounce force
          const bounceForce = Math.min(1.2, 0.8 + impactForce);
          this.localPlayer.velocity.x = normalX * bounceForce * Math.abs(this.localPlayer.velocity.x);
          this.localPlayer.velocity.z = normalZ * bounceForce * Math.abs(this.localPlayer.velocity.z);

          // Add upward velocity for more dramatic collisions
          if (impactForce > 0.5 && !this.localPlayer.isInAir) {
            this.localPlayer.velocity.y = Math.min(0.3, impactForce * 0.2);
            this.localPlayer.isInAir = true;
          }

          // Separate the cars to prevent overlap
          const overlap = collisionThreshold - distance;
          if (overlap > 0) {
            this.localPlayer.position.x += normalX * overlap * 0.5;
            this.localPlayer.position.z += normalZ * overlap * 0.5;
          }

          // Calculate speeds
          const localSpeed = Math.sqrt(
            this.localPlayer.velocity.x * this.localPlayer.velocity.x +
            this.localPlayer.velocity.z * this.localPlayer.velocity.z
          );
          const otherSpeed = Math.sqrt(
            (otherPlayer.velocity?.x || 0) * (otherPlayer.velocity?.x || 0) +
            (otherPlayer.velocity?.z || 0) * (otherPlayer.velocity?.z || 0)
          );

          // Calculate damage based on relative speed
          const baseDamage = Math.min(Math.floor(impactForce * 20), 50);
          let damage;

          if (localSpeed > otherSpeed) {
            // Local player is faster, take less damage
            damage = Math.floor(baseDamage * 0.3);
          } else {
            // Local player is slower, take more damage
            damage = Math.floor(baseDamage * 1.2);
          }

          this.localPlayer.health = Math.max(0, this.localPlayer.health - damage);

          // Update health UI
          this.network.updateHealthUI(this.localPlayer.health);

          // Check for death
          if (this.localPlayer.health <= 0 && !this.localPlayer.eliminated) {
            this.localPlayer.eliminated = true;
            this.network.socket.emit('playerDied', { id: playerId });

            // Show death screen
            this.showDeathScreen();
          }
        }
      }
    });
  }

  // Check for power-up collections
  checkPowerUpCollections() {
    const powerUps = this.renderer.getPowerUps();
    const collectionRadius = 15; // Adjust based on power-up size

    powerUps.forEach(powerUp => {
      // Skip if power-up is not active
      if (!powerUp.active) return;

      // Calculate distance to power-up
      const dx = this.localPlayer.position.x - powerUp.position.x;
      const dz = this.localPlayer.position.z - powerUp.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < collectionRadius) {
        // Collect the power-up
        if (powerUp.type === 'health') {
          // Health power-up
          this.localPlayer.health = 100;
          this.network.updateHealthUI(this.localPlayer.health);
          console.log('Health restored to 100%');
        } else if (powerUp.type === 'shield') {
          // Shield power-up
          this.localPlayer.hasShield = true;
          this.localPlayer.invincible = true;
          this.localPlayer.shieldEndTime = Date.now() + 15000; // 15 seconds
          console.log('Shield activated for 15 seconds');
        }

        // Deactivate the power-up
        this.renderer.deactivatePowerUp(powerUp.id);

        // Send power-up collection to server
        this.network.sendPowerUpCollection(powerUp.id, powerUp.type);
      }
    });
  }

  // Stop the game loop
  stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  handlePlayerEliminated(data) {
    if (data.id === this.localPlayer.id) {
      // Local player eliminated
      this.localPlayer.eliminated = true;
      // Wait for respawn
    } else {
      // Remove eliminated player's model
      this.removePlayer(data.id);
    }
  }

  handlePlayerRespawned(data) {
    if (data.id === this.localPlayer.id) {
      // Reset local player
      this.localPlayer.position = data.position;
      this.localPlayer.health = data.health;
      this.localPlayer.eliminated = false;
    } else {
      // Add or update respawned player
      this.addOrUpdatePlayer(data);
    }
  }

  // Handle player damage events
  handlePlayerDamaged(data) {
    if (data.id === this.network.getPlayerId()) {
      // Update local player health
      this.localPlayer.health = data.health;
      // Update health UI
      this.network.updateHealthUI(data.health);
    }
    // Update the renderer for the damaged player
    const players = this.network.getPlayers();
    const player = players[data.id];
    if (player) {
      this.renderer.updatePlayer(
        data.id,
        player.position,
        player.rotation,
        data.health,
        player.invincible,
        player.boosting
      );
    }
  }

  // Handle game state updates
  handleGameUpdate(data) {
    // Update other players
    Object.entries(data.players).forEach(([id, player]) => {
      // Skip local player as we handle their position locally
      if (id !== this.network.getPlayerId()) {
        this.renderer.updatePlayer(
          id,
          player.position,
          player.rotation,
          player.health,
          player.invincible,
          player.boosting
        );
      }
    });
  }
}