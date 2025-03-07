// Handles all Three.js rendering
class GameRenderer {
  constructor() {
    console.log('GameRenderer constructor called');

    try {
      // Initialize Three.js components
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
      this.renderer = new THREE.WebGLRenderer({ antialias: true });

      // Set up renderer
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setClearColor(0x87CEEB); // Sky blue background
      this.renderer.shadowMap.enabled = true;

      // Append renderer to DOM
      const gameContainer = document.getElementById('game-container');
      if (!gameContainer) {
        throw new Error('Game container element not found');
      }
      gameContainer.appendChild(this.renderer.domElement);

      // Set up camera
      this.camera.position.set(0, 30, 50);
      this.camera.lookAt(0, 0, 0);

      // Player models cache
      this.playerModels = {};

      // Arena size
      this.arenaSize = 1000;

      // Obstacles and ramps collections
      this.obstacles = [];
      this.ramps = [];

      // Power-ups collections
      this.powerUps = {
        health: [],
        shield: []
      };

      // Add lights
      this.addLights();

      // Create arena
      this.createArena();

      // Add power-ups
      this.addPowerUps();

      // Handle window resize
      window.addEventListener('resize', () => this.onWindowResize());

      // Loading callback
      this.loadedCallback = null;

      // Trigger loaded event after a short delay (simulating asset loading)
      console.log('Setting up loading timeout');
      setTimeout(() => {
        console.log('Loading timeout triggered');
        if (this.loadedCallback) {
          console.log('Calling loadedCallback');
          this.loadedCallback();
        } else {
          console.log('No loadedCallback set');
        }
      }, 2000);

      // Render once to initialize
      this.render();

      // Set up power-up respawn timer
      setInterval(() => this.updatePowerUps(), 10000); // Check every 10 seconds

    } catch (error) {
      console.error('Error initializing renderer:', error);
      throw error;
    }
  }

  // Add lights to the scene
  addLights() {
    try {
      // Ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambientLight);

      // Directional light (sun)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(100, 100, 50);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.camera.left = -200;
      directionalLight.shadow.camera.right = 200;
      directionalLight.shadow.camera.top = 200;
      directionalLight.shadow.camera.bottom = -200;
      this.scene.add(directionalLight);
    } catch (error) {
      console.error('Error adding lights:', error);
    }
  }

  // Create the arena
  createArena() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Arena walls
    const wallHeight = 10;
    const wallThickness = 5;
    const halfSize = this.arenaSize / 2;

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.7,
      metalness: 0.3
    });

    // North wall
    const northWallGeometry = new THREE.BoxGeometry(this.arenaSize + wallThickness * 2, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight / 2, -halfSize - wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    this.scene.add(northWall);

    // South wall
    const southWall = northWall.clone();
    southWall.position.z = halfSize + wallThickness / 2;
    this.scene.add(southWall);

    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.arenaSize);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(halfSize + wallThickness / 2, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    this.scene.add(eastWall);

    // West wall
    const westWall = eastWall.clone();
    westWall.position.x = -halfSize - wallThickness / 2;
    this.scene.add(westWall);

    // Add ramps and obstacles
    this.addRamps();
    this.addObstacles();
  }

  // Add ramps to the arena
  addRamps() {
    // Ramp material
    const rampMaterial = new THREE.MeshStandardMaterial({
      color: 0x3366ff,
      roughness: 0.6,
      metalness: 0.4
    });

    // Create 3 ramps at strategic positions
    const rampPositions = [
      { x: -300, z: -200, rotation: Math.PI / 4 },
      { x: 300, z: 200, rotation: -Math.PI / 4 },
      { x: 0, z: -300, rotation: 0 }
    ];

    rampPositions.forEach((pos, index) => {
      // Create ramp geometry
      const rampLength = 80;
      const rampWidth = 40;
      const rampHeight = 20;

      // Create ramp using a custom geometry for better shape
      const rampGeometry = new THREE.BufferGeometry();

      // Define vertices for a proper ramp shape
      const vertices = new Float32Array([
        // Base (bottom face)
        -rampWidth/2, 0, -rampLength/2,
        rampWidth/2, 0, -rampLength/2,
        rampWidth/2, 0, rampLength/2,
        -rampWidth/2, 0, rampLength/2,

        // Top face (sloped)
        -rampWidth/2, 0, -rampLength/2,
        rampWidth/2, 0, -rampLength/2,
        rampWidth/2, rampHeight, rampLength/2,
        -rampWidth/2, rampHeight, rampLength/2
      ]);

      // Define faces using indices
      const indices = [
        // Bottom face
        0, 1, 2,
        0, 2, 3,

        // Front face (high end)
        2, 6, 7,
        2, 7, 3,

        // Back face (low end)
        0, 4, 5,
        0, 5, 1,

        // Left face
        0, 3, 7,
        0, 7, 4,

        // Right face
        1, 5, 6,
        1, 6, 2,

        // Top face (sloped)
        4, 7, 6,
        4, 6, 5
      ];

      // Set geometry attributes
      rampGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      rampGeometry.setIndex(indices);
      rampGeometry.computeVertexNormals();

      // Create mesh
      const ramp = new THREE.Mesh(rampGeometry, rampMaterial);

      // Position and rotate the ramp
      ramp.position.set(pos.x, 0, pos.z);
      ramp.rotation.y = pos.rotation;

      // Add shadows
      ramp.castShadow = true;
      ramp.receiveShadow = true;

      // Add to scene and store in ramps array
      this.scene.add(ramp);

      // Store ramp data for collision detection
      this.ramps.push({
        mesh: ramp,
        position: { x: pos.x, y: rampHeight / 2, z: pos.z },
        size: { width: rampWidth, height: rampHeight, length: rampLength },
        rotation: pos.rotation
      });

      // Add visual indicator for the ramp
      const edgeGeometry = new THREE.EdgesGeometry(rampGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      ramp.add(edges);
    });
  }

  // Add obstacles to the arena
  addObstacles() {
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      roughness: 0.8,
      metalness: 0.5
    });

    // Add some blocks (rocks)
    for (let i = 0; i < 15; i++) {
      // Random size for variety
      const size = 10 + Math.random() * 15;

      // Create a rock-like geometry using a modified box
      const rockGeometry = new THREE.BoxGeometry(size, size, size);

      // Modify vertices to make it look more like a rock
      const positionAttribute = rockGeometry.getAttribute('position');
      const vertices = positionAttribute.array;

      // Randomly adjust vertices to make the rock irregular
      for (let j = 0; j < vertices.length; j += 3) {
        vertices[j] += (Math.random() - 0.5) * 3;
        vertices[j + 1] += (Math.random() - 0.5) * 3;
        vertices[j + 2] += (Math.random() - 0.5) * 3;
      }

      positionAttribute.needsUpdate = true;
      rockGeometry.computeVertexNormals();

      const rock = new THREE.Mesh(rockGeometry, obstacleMaterial);

      // Random position within the arena, avoiding the center and ramps
      let validPosition = false;
      let x, z;

      while (!validPosition) {
        x = (Math.random() - 0.5) * (this.arenaSize - 100);
        z = (Math.random() - 0.5) * (this.arenaSize - 100);

        // Check distance from center
        const distFromCenter = Math.sqrt(x * x + z * z);
        if (distFromCenter < 50) continue; // Too close to center

        // Check distance from ramps
        let tooCloseToRamp = false;
        for (const ramp of this.ramps) {
          const dx = x - ramp.position.x;
          const dz = z - ramp.position.z;
          const distToRamp = Math.sqrt(dx * dx + dz * dz);
          if (distToRamp < 100) {
            tooCloseToRamp = true;
            break;
          }
        }

        if (!tooCloseToRamp) {
          validPosition = true;
        }
      }

      rock.position.set(x, size / 2, z);
      rock.rotation.set(
        Math.random() * Math.PI / 4,
        Math.random() * Math.PI,
        Math.random() * Math.PI / 4
      );

      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);

      // Store obstacle data for collision detection
      this.obstacles.push({
        mesh: rock,
        position: { x, y: size / 2, z },
        size: { width: size, height: size, length: size },
        damage: 5 + Math.floor(Math.random() * 10) // Random damage between 5-15
      });
    }
  }

  // Check if a position is on a ramp and return height
  checkRampCollision(position) {
    for (const ramp of this.ramps) {
      // Transform position to ramp's local space
      const localX = position.x - ramp.position.x;
      const localZ = position.z - ramp.position.z;

      // Rotate point to align with ramp orientation
      const rotatedX = localX * Math.cos(-ramp.rotation) - localZ * Math.sin(-ramp.rotation);
      const rotatedZ = localX * Math.sin(-ramp.rotation) + localZ * Math.cos(-ramp.rotation);

      // Check if point is within ramp bounds
      const halfWidth = ramp.size.width / 2;
      const halfLength = ramp.size.length / 2;

      if (rotatedX >= -halfWidth && rotatedX <= halfWidth &&
          rotatedZ >= -halfLength && rotatedZ <= halfLength) {

        // Calculate height based on position on the ramp
        // Map z from [-halfLength, halfLength] to [0, ramp.size.height]
        const normalizedZ = (rotatedZ + halfLength) / ramp.size.length;
        const height = normalizedZ * ramp.size.height;

        return {
          onRamp: true,
          height: height
        };
      }
    }

    return { onRamp: false, height: 0 };
  }

  // Check if a position collides with any obstacle
  checkObstacleCollision(position, radius) {
    for (const obstacle of this.obstacles) {
      // Simple distance-based collision
      const dx = position.x - obstacle.position.x;
      const dz = position.z - obstacle.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Collision threshold (sum of car radius and obstacle radius)
      const collisionThreshold = radius + obstacle.size.width / 2;

      if (distance < collisionThreshold) {
        return {
          collision: true,
          obstacle: obstacle,
          normal: { x: dx / distance, z: dz / distance }
        };
      }
    }

    return { collision: false };
  }

  // Create a car model
  createCarModel(playerId, color = 0x00ff00) {
    // Car body
    const carGroup = new THREE.Group();

    // Store original color for reference
    carGroup.originalColor = color;

    // Main body
    const bodyGeometry = new THREE.BoxGeometry(10, 3, 20);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 3;
    body.castShadow = true;
    body.receiveShadow = true;
    carGroup.add(body);

    // Cabin
    const cabinGeometry = new THREE.BoxGeometry(8, 3, 10);
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      roughness: 0.5,
      metalness: 0.2
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.set(0, 6, -2);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    carGroup.add(cabin);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(2, 2, 1, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 1,
      metalness: 0
    });

    // Front-left wheel
    const wheelFL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFL.position.set(6, 2, 6);
    wheelFL.rotation.z = Math.PI / 2;
    wheelFL.castShadow = true;
    carGroup.add(wheelFL);

    // Front-right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelFR.position.set(-6, 2, 6);
    wheelFR.rotation.z = Math.PI / 2;
    wheelFR.castShadow = true;
    carGroup.add(wheelFR);

    // Back-left wheel
    const wheelBL = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBL.position.set(6, 2, -6);
    wheelBL.rotation.z = Math.PI / 2;
    wheelBL.castShadow = true;
    carGroup.add(wheelBL);

    // Back-right wheel
    const wheelBR = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheelBR.position.set(-6, 2, -6);
    wheelBR.rotation.z = Math.PI / 2;
    wheelBR.castShadow = true;
    carGroup.add(wheelBR);

    // Add health bar
    const healthBarContainer = new THREE.Group();

    // Background
    const healthBgGeometry = new THREE.PlaneGeometry(12, 1);
    const healthBgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const healthBg = new THREE.Mesh(healthBgGeometry, healthBgMaterial);
    healthBarContainer.add(healthBg);

    // Foreground (health indicator)
    const healthFgGeometry = new THREE.PlaneGeometry(12, 1);
    const healthFgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const healthFg = new THREE.Mesh(healthFgGeometry, healthFgMaterial);
    healthFg.position.z = 0.1;
    healthBarContainer.add(healthFg);

    // Position the health bar above the car
    healthBarContainer.position.set(0, 12, 0);
    healthBarContainer.rotation.x = -Math.PI / 2;
    carGroup.add(healthBarContainer);

    // Store reference to health bar for updates
    carGroup.healthBar = healthFg;

    // Add to scene and store in player models
    this.scene.add(carGroup);
    this.playerModels[playerId] = carGroup;

    return carGroup;
  }

  // Update a player's car position and rotation
  updatePlayer(playerId, position, rotation, health, isInvincible, isBoosting) {
    let playerModel = this.playerModels[playerId];

    // Create model if it doesn't exist
    if (!playerModel) {
      // Use white color for all cars
      playerModel = this.createCarModel(playerId, 0xFFFFFF);
      this.scene.add(playerModel);
      this.playerModels[playerId] = playerModel;
    }

    // Update position and rotation
    playerModel.position.set(position.x, position.y, position.z);
    playerModel.rotation.y = rotation;

    // Update health bar
    if (playerModel.healthBar) {
      playerModel.healthBar.scale.x = health / 100;
    }

    // Handle invincibility effect
    if (isInvincible) {
      playerModel.traverse((child) => {
        if (child.isMesh && child !== playerModel.healthBar) {
          // Change car color to blue for shield
          if (child === playerModel.children[0]) { // Main body
            child.material.color.setHex(0x0088ff); // Blue color
            child.material.emissive.setHex(0x0044aa); // Blue glow
            child.material.emissiveIntensity = 0.5;
          }
          child.material.transparent = true;
          child.material.opacity = 0.5 + 0.5 * Math.sin(Date.now() * 0.01);
        }
      });
    } else {
      playerModel.traverse((child) => {
        if (child.isMesh) {
          if (child === playerModel.children[0]) { // Main body
            child.material.emissiveIntensity = 0;
            // Reset to original color only if not boosting
            if (!isBoosting) {
              child.material.color.setHex(playerModel.originalColor || 0x00ff00);
              child.material.emissive.setHex(0x000000);
            }
          }
          child.material.transparent = false;
          child.material.opacity = 1;
        }
      });
    }

    // Handle boosting effect
    if (isBoosting && !isInvincible) { // Don't override shield color
      playerModel.children[0].material.emissive.set(0xff5500);
      playerModel.children[0].material.emissiveIntensity = 0.5;
    }
  }

  // Remove a player's car
  removePlayer(playerId) {
    const playerModel = this.playerModels[playerId];
    if (playerModel) {
      this.scene.remove(playerModel);
      delete this.playerModels[playerId];
    }
  }

  // Update camera to follow a player
  followPlayer(position, rotation) {
    // Position camera behind and above the player
    const distance = 50;
    const height = 30;
    const lookAheadDistance = 20;

    // Calculate camera position based on player's rotation
    const cameraX = position.x - Math.sin(rotation) * distance;
    const cameraZ = position.z - Math.cos(rotation) * distance;

    // Smoothly move camera to new position
    this.camera.position.x += (cameraX - this.camera.position.x) * 0.1;
    this.camera.position.y += (position.y + height - this.camera.position.y) * 0.1;
    this.camera.position.z += (cameraZ - this.camera.position.z) * 0.1;

    // Look ahead of the player
    const lookAtX = position.x + Math.sin(rotation) * lookAheadDistance;
    const lookAtZ = position.z + Math.cos(rotation) * lookAheadDistance;
    this.camera.lookAt(lookAtX, position.y, lookAtZ);
  }

  // Handle window resize
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Set callback for when assets are loaded
  onLoaded(callback) {
    console.log('onLoaded called, setting callback');
    if (typeof callback === 'function') {
      this.loadedCallback = callback;
    } else {
      console.error('Invalid callback provided to onLoaded');
    }
  }

  // Add power-ups to the arena
  addPowerUps() {
    // Create health power-ups
    this.createPowerUps('health', 3);

    // Create shield power-ups
    this.createPowerUps('shield', 3);
  }

  // Create power-ups of a specific type
  createPowerUps(type, count) {
    const isHealth = type === 'health';

    // Define power-up appearance
    const color = isHealth ? 0x00ff00 : 0x0088ff; // Green for health, blue for shield
    const emissiveColor = isHealth ? 0x00aa00 : 0x0055aa;

    for (let i = 0; i < count; i++) {
      // Create power-up geometry
      const geometry = new THREE.SphereGeometry(5, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: emissiveColor,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2
      });

      const powerUp = new THREE.Mesh(geometry, material);

      // Find a valid position (not on obstacles or ramps)
      let validPosition = false;
      let x, z;

      while (!validPosition) {
        x = (Math.random() - 0.5) * (this.arenaSize - 100);
        z = (Math.random() - 0.5) * (this.arenaSize - 100);

        // Check distance from obstacles
        let tooCloseToObstacle = false;
        for (const obstacle of this.obstacles) {
          const dx = x - obstacle.position.x;
          const dz = z - obstacle.position.z;
          const distToObstacle = Math.sqrt(dx * dx + dz * dz);
          if (distToObstacle < 30) {
            tooCloseToObstacle = true;
            break;
          }
        }

        // Check distance from ramps
        let tooCloseToRamp = false;
        for (const ramp of this.ramps) {
          const dx = x - ramp.position.x;
          const dz = z - ramp.position.z;
          const distToRamp = Math.sqrt(dx * dx + dz * dz);
          if (distToRamp < 50) {
            tooCloseToRamp = true;
            break;
          }
        }

        // Check distance from other power-ups
        let tooCloseToPowerUp = false;
        for (const healthPowerUp of this.powerUps.health) {
          if (healthPowerUp.active) {
            const dx = x - healthPowerUp.position.x;
            const dz = z - healthPowerUp.position.z;
            const distToPowerUp = Math.sqrt(dx * dx + dz * dz);
            if (distToPowerUp < 50) {
              tooCloseToPowerUp = true;
              break;
            }
          }
        }

        for (const shieldPowerUp of this.powerUps.shield) {
          if (shieldPowerUp.active) {
            const dx = x - shieldPowerUp.position.x;
            const dz = z - shieldPowerUp.position.z;
            const distToPowerUp = Math.sqrt(dx * dx + dz * dz);
            if (distToPowerUp < 50) {
              tooCloseToPowerUp = true;
              break;
            }
          }
        }

        if (!tooCloseToObstacle && !tooCloseToRamp && !tooCloseToPowerUp) {
          validPosition = true;
        }
      }

      // Position the power-up
      powerUp.position.set(x, 10, z);

      // Add floating animation
      powerUp.userData.baseY = 10;
      powerUp.userData.animationOffset = Math.random() * Math.PI * 2;

      // Add glow effect
      const glowGeometry = new THREE.SphereGeometry(7, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.3
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      powerUp.add(glow);

      // Add to scene
      this.scene.add(powerUp);

      // Store power-up data
      this.powerUps[type].push({
        mesh: powerUp,
        position: { x, y: 10, z },
        active: true,
        type: type,
        radius: 5,
        respawnTime: 0
      });
    }
  }

  // Update power-ups (animation and respawn)
  updatePowerUps() {
    const now = Date.now();

    // Check for power-ups that need to respawn
    for (const type of ['health', 'shield']) {
      for (const powerUp of this.powerUps[type]) {
        // If inactive and respawn time has passed, respawn at a new location
        if (!powerUp.active && now > powerUp.respawnTime) {
          // Find a new valid position
          let validPosition = false;
          let x, z;

          while (!validPosition) {
            x = (Math.random() - 0.5) * (this.arenaSize - 100);
            z = (Math.random() - 0.5) * (this.arenaSize - 100);

            // Check distance from obstacles
            let tooCloseToObstacle = false;
            for (const obstacle of this.obstacles) {
              const dx = x - obstacle.position.x;
              const dz = z - obstacle.position.z;
              const distToObstacle = Math.sqrt(dx * dx + dz * dz);
              if (distToObstacle < 30) {
                tooCloseToObstacle = true;
                break;
              }
            }

            // Check distance from ramps
            let tooCloseToRamp = false;
            for (const ramp of this.ramps) {
              const dx = x - ramp.position.x;
              const dz = z - ramp.position.z;
              const distToRamp = Math.sqrt(dx * dx + dz * dz);
              if (distToRamp < 50) {
                tooCloseToRamp = true;
                break;
              }
            }

            // Check distance from other power-ups
            let tooCloseToPowerUp = false;
            for (const healthPowerUp of this.powerUps.health) {
              if (healthPowerUp.active && healthPowerUp !== powerUp) {
                const dx = x - healthPowerUp.position.x;
                const dz = z - healthPowerUp.position.z;
                const distToPowerUp = Math.sqrt(dx * dx + dz * dz);
                if (distToPowerUp < 50) {
                  tooCloseToPowerUp = true;
                  break;
                }
              }
            }

            for (const shieldPowerUp of this.powerUps.shield) {
              if (shieldPowerUp.active && shieldPowerUp !== powerUp) {
                const dx = x - shieldPowerUp.position.x;
                const dz = z - shieldPowerUp.position.z;
                const distToPowerUp = Math.sqrt(dx * dx + dz * dz);
                if (distToPowerUp < 50) {
                  tooCloseToPowerUp = true;
                  break;
                }
              }
            }

            if (!tooCloseToObstacle && !tooCloseToRamp && !tooCloseToPowerUp) {
              validPosition = true;
            }
          }

          // Update position
          powerUp.position.x = x;
          powerUp.position.z = z;
          powerUp.mesh.position.set(x, 10, z);

          // Make active again
          powerUp.active = true;
          powerUp.mesh.visible = true;
        }
      }
    }
  }

  // Animate power-ups (floating effect)
  animatePowerUps(time) {
    for (const type of ['health', 'shield']) {
      for (const powerUp of this.powerUps[type]) {
        if (powerUp.active) {
          // Floating animation
          const y = powerUp.mesh.userData.baseY + Math.sin(time * 0.002 + powerUp.mesh.userData.animationOffset) * 2;
          powerUp.mesh.position.y = y;

          // Rotation animation
          powerUp.mesh.rotation.y = time * 0.001;
        }
      }
    }
  }

  // Check if a player collides with any power-up
  checkPowerUpCollision(position, radius) {
    for (const type of ['health', 'shield']) {
      for (const powerUp of this.powerUps[type]) {
        if (powerUp.active) {
          // Simple distance-based collision
          const dx = position.x - powerUp.position.x;
          const dz = position.z - powerUp.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);

          // Collision threshold (sum of player radius and power-up radius)
          const collisionThreshold = radius + powerUp.radius;

          if (distance < collisionThreshold) {
            // Deactivate power-up
            powerUp.active = false;
            powerUp.mesh.visible = false;

            // Set respawn time (20 seconds)
            powerUp.respawnTime = Date.now() + 20000;

            return {
              collision: true,
              type: powerUp.type
            };
          }
        }
      }
    }

    return { collision: false };
  }

  // Get all power-ups
  getPowerUps() {
    const allPowerUps = [];
    for (const type of ['health', 'shield']) {
      this.powerUps[type].forEach((powerUp, index) => {
        if (powerUp.active) {
          allPowerUps.push({
            ...powerUp,
            id: `${type}_${index}`
          });
        }
      });
    }
    return allPowerUps;
  }

  // Deactivate a power-up
  deactivatePowerUp(id) {
    const [type, index] = id.split('_');
    if (this.powerUps[type] && this.powerUps[type][index]) {
      const powerUp = this.powerUps[type][index];
      powerUp.active = false;
      powerUp.mesh.visible = false;
      // Set respawn time to 5 seconds after shield expires (20 seconds total)
      powerUp.respawnTime = Date.now() + 20000;
    }
  }

  // Render the scene
  render(time) {
    try {
      // Animate power-ups
      if (time) {
        this.animatePowerUps(time);
      }

      this.renderer.render(this.scene, this.camera);
    } catch (error) {
      console.error('Error rendering scene:', error);
    }
  }

  addPlayer(playerId) {
    let playerModel = this.playerModels[playerId];

    if (!playerModel) {
      // Use white color (0xFFFFFF) for all cars instead of random color
      playerModel = this.createCarModel(playerId, 0xFFFFFF);
      this.scene.add(playerModel);
      this.playerModels[playerId] = playerModel;
    }

    return playerModel;
  }

  // Get array of all player IDs currently being rendered
  getPlayerIds() {
    return Object.keys(this.playerModels);
  }
}