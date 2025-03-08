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
    // Floor with grid pattern
    const floorGeometry = new THREE.PlaneGeometry(this.arenaSize, this.arenaSize, 50, 50);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      roughness: 0.7,
      metalness: 0.3
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Add grid lines
    const gridHelper = new THREE.GridHelper(this.arenaSize, 50, 0x00ffff, 0x00ffff);
    gridHelper.position.y = 0.1;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);

    // Arena walls with neon effect
    const wallHeight = 40;
    const wallThickness = 5;
    const halfSize = this.arenaSize / 2;

    // Create wall material with emissive glow
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.8
    });

    // Create buildings around the arena
    this.createBuildings();

    // Add neon trim to walls
    const createNeonTrim = (wall, color) => {
      const trimGeometry = new THREE.BoxGeometry(wall.geometry.parameters.width, 2, 2);
      const trimMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: color,
        emissiveIntensity: 1,
        roughness: 0.3,
        metalness: 0.8
      });
      const trim = new THREE.Mesh(trimGeometry, trimMaterial);
      trim.position.y = wallHeight / 2;
      wall.add(trim);
    };

    // North wall
    const northWallGeometry = new THREE.BoxGeometry(this.arenaSize + wallThickness * 2, wallHeight, wallThickness);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, wallHeight / 2, -halfSize - wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    createNeonTrim(northWall, 0x00ffff);
    this.scene.add(northWall);

    // South wall
    const southWall = northWall.clone();
    southWall.position.z = halfSize + wallThickness / 2;
    createNeonTrim(southWall, 0x00ffff);
    this.scene.add(southWall);

    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, this.arenaSize);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(halfSize + wallThickness / 2, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    createNeonTrim(eastWall, 0xff00ff);
    this.scene.add(eastWall);

    // West wall
    const westWall = eastWall.clone();
    westWall.position.x = -halfSize - wallThickness / 2;
    createNeonTrim(westWall, 0xff00ff);
    this.scene.add(westWall);

    // Add ramps and obstacles
    this.addCyberpunkRamps();
    this.addCyberpunkObstacles();

    // Add ambient fog
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0015);

    // Add volumetric lights
    this.addVolumentricLights();
  }

  // Create cyberpunk buildings
  createBuildings() {
    const buildingCount = 20;
    const maxSize = this.arenaSize * 0.8;

    for (let i = 0; i < buildingCount; i++) {
      // Random building dimensions
      const width = 30 + Math.random() * 50;
      const height = 100 + Math.random() * 200;
      const depth = 30 + Math.random() * 50;

      // Create building geometry
      const buildingGeometry = new THREE.BoxGeometry(width, height, depth);
      const buildingMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x000000,
        roughness: 0.7,
        metalness: 0.8
      });
      const building = new THREE.Mesh(buildingGeometry, buildingMaterial);

      // Position building outside arena
      const angle = (i / buildingCount) * Math.PI * 2;
      const radius = this.arenaSize * 0.6 + Math.random() * 200;
      building.position.x = Math.cos(angle) * radius;
      building.position.y = height / 2;
      building.position.z = Math.sin(angle) * radius;

      // Add window lights
      this.addBuildingWindows(building);

      this.scene.add(building);
    }
  }

  // Add windows to buildings
  addBuildingWindows(building) {
    const windowGeometry = new THREE.PlaneGeometry(2, 2);
    const windowColors = [0x00ffff, 0xff00ff, 0xffff00];
    
    const width = building.geometry.parameters.width;
    const height = building.geometry.parameters.height;
    const depth = building.geometry.parameters.depth;

    // Create windows on each face
    for (let y = 5; y < height - 5; y += 10) {
      for (let x = -width/2 + 5; x < width/2 - 5; x += 10) {
        if (Math.random() > 0.3) { // 70% chance of window
          const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: windowColors[Math.floor(Math.random() * windowColors.length)],
            emissiveIntensity: Math.random() * 0.5 + 0.5
          });

          // Front windows
          const windowFront = new THREE.Mesh(windowGeometry, windowMaterial);
          windowFront.position.set(x, y - height/2, depth/2 + 0.1);
          building.add(windowFront);

          // Back windows
          const windowBack = new THREE.Mesh(windowGeometry, windowMaterial.clone());
          windowBack.position.set(x, y - height/2, -depth/2 - 0.1);
          windowBack.rotation.y = Math.PI;
          building.add(windowBack);
        }
      }
    }
  }

  // Add cyberpunk-styled ramps
  addCyberpunkRamps() {
    const rampMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0xff00ff,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.8
    });

    const rampPositions = [
      { x: -300, z: -200, rotation: Math.PI / 4 },
      { x: 300, z: 200, rotation: -Math.PI / 4 },
      { x: 0, z: -300, rotation: 0 }
    ];

    rampPositions.forEach((pos) => {
      const rampLength = 80;
      const rampWidth = 40;
      const rampHeight = 20;

      const rampGeometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -rampWidth/2, 0, -rampLength/2,
        rampWidth/2, 0, -rampLength/2,
        rampWidth/2, 0, rampLength/2,
        -rampWidth/2, 0, rampLength/2,
        -rampWidth/2, 0, -rampLength/2,
        rampWidth/2, 0, -rampLength/2,
        rampWidth/2, rampHeight, rampLength/2,
        -rampWidth/2, rampHeight, rampLength/2
      ]);

      const indices = [
        0, 1, 2, 0, 2, 3,
        2, 6, 7, 2, 7, 3,
        0, 4, 5, 0, 5, 1,
        0, 3, 7, 0, 7, 4,
        1, 5, 6, 1, 6, 2,
        4, 7, 6, 4, 6, 5
      ];

      rampGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      rampGeometry.setIndex(indices);
      rampGeometry.computeVertexNormals();

      const ramp = new THREE.Mesh(rampGeometry, rampMaterial);
      ramp.position.set(pos.x, 0, pos.z);
      ramp.rotation.y = pos.rotation;
      ramp.castShadow = true;
      ramp.receiveShadow = true;

      // Add neon trim
      const edgeGeometry = new THREE.EdgesGeometry(rampGeometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff00ff,
        linewidth: 2
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      ramp.add(edges);

      this.scene.add(ramp);

      this.ramps.push({
        mesh: ramp,
        position: { x: pos.x, y: rampHeight / 2, z: pos.z },
        size: { width: rampWidth, height: rampHeight, length: rampLength },
        rotation: pos.rotation
      });
    });
  }

  // Add cyberpunk-styled obstacles
  addCyberpunkObstacles() {
    const obstacleCount = 15;
    const baseGeometry = new THREE.BoxGeometry(1, 1, 1);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: 0x00ffff,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.8
    });

    for (let i = 0; i < obstacleCount; i++) {
      const size = 10 + Math.random() * 15;
      const geometry = baseGeometry.clone();
      
      // Modify vertices for irregular shape
      const positionAttribute = geometry.getAttribute('position');
      const vertices = positionAttribute.array;
      
      for (let j = 0; j < vertices.length; j += 3) {
        vertices[j] = vertices[j] * size + (Math.random() - 0.5) * 3;
        vertices[j + 1] = vertices[j + 1] * size + (Math.random() - 0.5) * 3;
        vertices[j + 2] = vertices[j + 2] * size + (Math.random() - 0.5) * 3;
      }

      positionAttribute.needsUpdate = true;
      geometry.computeVertexNormals();

      const obstacle = new THREE.Mesh(geometry, baseMaterial.clone());
      
      // Find valid position
      let validPosition = false;
      let x, z;

      while (!validPosition) {
        x = (Math.random() - 0.5) * (this.arenaSize - 100);
        z = (Math.random() - 0.5) * (this.arenaSize - 100);

        const distFromCenter = Math.sqrt(x * x + z * z);
        if (distFromCenter < 50) continue;

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

      obstacle.position.set(x, size / 2, z);
      obstacle.rotation.set(
        Math.random() * Math.PI / 4,
        Math.random() * Math.PI,
        Math.random() * Math.PI / 4
      );

      // Add neon edges
      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ffff,
        linewidth: 2
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      obstacle.add(edges);

      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      this.scene.add(obstacle);

      this.obstacles.push({
        mesh: obstacle,
        position: { x, y: size / 2, z },
        size: { width: size, height: size, length: size },
        damage: 5 + Math.floor(Math.random() * 10)
      });
    }
  }

  // Add volumetric lights
  addVolumentricLights() {
    // Add spotlights at corners
    const corners = [
      { x: -this.arenaSize/2, z: -this.arenaSize/2 },
      { x: this.arenaSize/2, z: -this.arenaSize/2 },
      { x: -this.arenaSize/2, z: this.arenaSize/2 },
      { x: this.arenaSize/2, z: this.arenaSize/2 }
    ];

    corners.forEach((corner, index) => {
      const spotlight = new THREE.SpotLight(
        [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00][index],
        1
      );
      spotlight.position.set(corner.x, 100, corner.z);
      spotlight.angle = Math.PI / 6;
      spotlight.penumbra = 0.3;
      spotlight.decay = 1;
      spotlight.distance = 500;
      spotlight.castShadow = true;
      
      this.scene.add(spotlight);
      this.scene.add(spotlight.target);
      
      // Point each spotlight toward the center
      spotlight.target.position.set(0, 0, 0);
    });
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
    // Use VehicleFactory to create a Cybertruck (or other vehicle in the future)
    const carGroup = VehicleFactory.createVehicle('cybertruck', color);
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
    // Position camera further back and higher for better view
    const distance = 80; // Increased from 50
    const height = 40;   // Increased from 30
    const lookAheadDistance = 30; // Increased from 20

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
    this.camera.lookAt(lookAtX, position.y + 5, lookAtZ); // Added slight upward look
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