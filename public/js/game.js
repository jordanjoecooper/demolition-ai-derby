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
      obstacleCooldown: 500 // ms
    };

    // Physics constants
    this.maxSpeed = 1.0;
    this.acceleration = 0.01;
    this.deceleration = 0.005;
    this.rotationSpeed = 0.05;
    this.boostMultiplier = 2.0;
    this.gravity = 0.01;
    this.groundLevel = 0;
    this.carRadius = 10; // For collision detection

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

    // Set invincibility timer (3 seconds)
    setTimeout(() => {
      this.localPlayer.invincible = false;
    }, 3000);
  }

  // Set up network callbacks
  setupNetworkCallbacks() {
    this.network.setCallbacks({
      onGameState: (data) => {
        // Initialize local player position from server data
        const playerId = this.network.getPlayerId();
        if (data.players[playerId]) {
          this.localPlayer.position = { ...data.players[playerId].position };
          this.localPlayer.rotation = data.players[playerId].rotation;
          this.localPlayer.health = data.players[playerId].health;
          this.localPlayer.invincible = data.players[playerId].invincible;
        }
      },
      onPlayerJoined: (data) => {
        // Nothing specific needed here, renderer will handle it
      },
      onPlayerLeft: (data) => {
        // Remove player from renderer
        this.renderer.removePlayer(data.id);
      },
      onGameUpdate: (data) => {
        // Update all players except local player
        const playerId = this.network.getPlayerId();
        Object.keys(data.players).forEach(id => {
          if (id !== playerId) {
            const player = data.players[id];
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
      },
      onPlayerDamaged: (data) => {
        // Play damage sound or effect
        // For now, just log it
        console.log(`Player ${data.id} took ${data.damage} damage, health: ${data.health}`);
      },
      onPlayerEliminated: (data) => {
        // Play elimination effect
        // For now, just log it
        console.log(`Player ${data.id} was eliminated!`);

        // Remove player from renderer
        this.renderer.removePlayer(data.id);
      },
      onRoundOver: (data) => {
        // Play round over effect
        console.log(`Round over! Winner: ${data.winnerId}`);
      },
      onNewRound: (data) => {
        // Reset local player
        const playerId = this.network.getPlayerId();
        if (data.players[playerId]) {
          this.localPlayer.position = { ...data.players[playerId].position };
          this.localPlayer.rotation = data.players[playerId].rotation;
          this.localPlayer.health = data.players[playerId].health;
          this.localPlayer.invincible = data.players[playerId].invincible;
          this.localPlayer.velocity = { x: 0, y: 0, z: 0 };
        }
      }
    });
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

        // Set invincibility timer
        setTimeout(() => {
          this.localPlayer.invincible = false;
        }, 3000);
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
    Object.keys(players).forEach(id => {
      // Skip self
      if (id === playerId) {
        return;
      }

      // Skip if on cooldown with this player
      if (this.lastCollisionTime[id] && Date.now() - this.lastCollisionTime[id] < this.collisionCooldown) {
        return;
      }

      const otherPlayer = players[id];

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
        // Calculate impact force based on velocity
        const relativeVelocityX = this.localPlayer.velocity.x - (otherPlayer.velocity?.x || 0);
        const relativeVelocityZ = this.localPlayer.velocity.z - (otherPlayer.velocity?.z || 0);
        const impactForce = Math.sqrt(relativeVelocityX * relativeVelocityX + relativeVelocityZ * relativeVelocityZ);

        // Minimum force required for damage
        if (impactForce > 0.1) {
          // Send collision to server
          this.network.sendCollision(id, impactForce);

          // Set collision cooldown
          this.lastCollisionTime[id] = Date.now();

          // Apply physics response (bounce)
          const bounceForce = 0.8;
          this.localPlayer.velocity.x -= dx * bounceForce;
          this.localPlayer.velocity.z -= dz * bounceForce;

          // Add a small upward velocity for more dramatic collisions
          if (impactForce > 0.5 && !this.localPlayer.isInAir) {
            this.localPlayer.velocity.y = 0.2;
            this.localPlayer.isInAir = true;
          }
        }
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
}