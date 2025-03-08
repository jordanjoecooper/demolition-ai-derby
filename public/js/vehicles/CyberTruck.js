// Helper function to create panel lines
function addPanelLine(width, height, depth, x, y, z) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color: 0x333333,
    metalness: 0.8,
    roughness: 0.5,
    emissive: 0x222222,
    emissiveIntensity: 0.2
  });
  const line = new THREE.Mesh(geometry, material);
  line.position.set(x, y, z);
  return line;
}

class CyberTruck extends Vehicle {
  static getStats() {
    return {
      speed: 0.9,      // Slightly slower due to weight
      handling: 0.8,   // Less maneuverable
      acceleration: 1.1, // Good acceleration due to electric motors
      durability: 1.4  // Very durable due to stainless steel construction
    };
  }

  static getName() {
    return 'Cybertruck';
  }

  static getDescription() {
    return 'A futuristic electric vehicle with exceptional durability and unique angular design.';
  }

  static create(color = 0xFFFFFF) {
    const carGroup = new THREE.Group();
    carGroup.originalColor = color;

    // Create metallic material with brushed steel look
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xE0E0E0, // Slightly lighter silver
      metalness: 0.8,
      roughness: 0.4,
      envMapIntensity: 1.2
    });

    // Create the base shape (flat platform)
    const baseGeometry = new THREE.BoxGeometry(24, 2, 40); // Wider and longer base
    const base = new THREE.Mesh(baseGeometry, bodyMaterial);
    base.position.y = 3;
    base.castShadow = true;
    base.receiveShadow = true;
    carGroup.add(base);

    // Create the main body using custom geometry for the distinctive angular shape
    const bodyGeometry = new THREE.BufferGeometry();
    
    // Define vertices for the angular body (following the exact Cybertruck angles)
    const vertices = new Float32Array([
      // Left side
      -12, 2, 20,    // 0: front bottom left
      -11, 12, 20,   // 1: front top left
      -10, 16, 10,   // 2: windshield top left
      -10, 16, -10,  // 3: roof left front
      -10, 16, -20,  // 4: roof left back
      -11, 12, -20,  // 5: back top left
      -12, 2, -20,   // 6: back bottom left

      // Right side
      12, 2, 20,     // 7: front bottom right
      11, 12, 20,    // 8: front top right
      10, 16, 10,    // 9: windshield top right
      10, 16, -10,   // 10: roof right front
      10, 16, -20,   // 11: roof right back
      11, 12, -20,   // 12: back top right
      12, 2, -20,    // 13: back bottom right
    ]);

    // Define faces (triangles)
    const indices = [
      // Front face
      0, 1, 8,
      0, 8, 7,
      
      // Windshield
      1, 2, 9,
      1, 9, 8,
      
      // Roof front
      2, 3, 10,
      2, 10, 9,
      
      // Roof back
      3, 4, 11,
      3, 11, 10,
      
      // Back window
      4, 5, 12,
      4, 12, 11,
      
      // Back face
      5, 6, 13,
      5, 13, 12,
      
      // Left side
      0, 6, 5,
      0, 5, 4,
      0, 4, 3,
      0, 3, 2,
      0, 2, 1,
      
      // Right side
      7, 13, 12,
      7, 12, 11,
      7, 11, 10,
      7, 10, 9,
      7, 9, 8,
      
      // Bottom (optional)
      0, 7, 13,
      0, 13, 6
    ];

    bodyGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    bodyGeometry.setIndex(indices);
    bodyGeometry.computeVertexNormals();

    const mainBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    mainBody.position.y = 3;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    carGroup.add(mainBody);

    // Update light bars to be thinner and wider
    const addLightBar = (isRear = false) => {
      const barGeometry = new THREE.BoxGeometry(23, 0.3, 0.2);
      const barMaterial = new THREE.MeshStandardMaterial({
        color: isRear ? 0xff0000 : 0xffffff,
        emissive: isRear ? 0xff0000 : 0xffffff,
        emissiveIntensity: 1.2
      });
      const bar = new THREE.Mesh(barGeometry, barMaterial);
      bar.position.y = 8;
      bar.position.z = isRear ? -19.9 : 19.9;
      return bar;
    };

    carGroup.add(addLightBar(false));
    carGroup.add(addLightBar(true));

    // Update window material
    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
      opacity: 0.8,
      transparent: true
    });

    // Update windshield geometry
    const windshieldGeometry = new THREE.BufferGeometry();
    const windshieldVertices = new Float32Array([
      -10, 12, 10,    // bottom left
      10, 12, 10,     // bottom right
      8, 16, 5,       // top right
      -8, 16, 5       // top left
    ]);
    const windshieldIndices = [0, 1, 2, 0, 2, 3];
    
    windshieldGeometry.setAttribute('position', new THREE.BufferAttribute(windshieldVertices, 3));
    windshieldGeometry.setIndex(windshieldIndices);
    windshieldGeometry.computeVertexNormals();
    
    const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
    windshield.position.y = 3;
    carGroup.add(windshield);

    // Update wheel positions and size
    const wheelGeometry = new THREE.CylinderGeometry(5, 5, 4, 8);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.3
    });

    const wheelPositions = [
      { x: 12, y: 5, z: 12 },    // Front Right
      { x: -12, y: 5, z: 12 },   // Front Left
      { x: 12, y: 5, z: -12 },   // Rear Right
      { x: -12, y: 5, z: -12 }   // Rear Left
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.rotation.z = Math.PI / 2;
      
      // Add cyber-styled rim with turbine design
      const rimGeometry = new THREE.TorusGeometry(3.5, 0.3, 8, 8);
      const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        metalness: 0.95,
        roughness: 0.1,
        emissive: 0x666666,
        emissiveIntensity: 0.3
      });

      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.rotation.y = Math.PI / 2;
      wheel.add(rim);

      // Add turbine-style spokes
      for (let i = 0; i < 8; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 3, 0.8),
          rimMaterial
        );
        spoke.rotation.z = (i * Math.PI) / 4;
        spoke.position.x = 0.2;
        rim.add(spoke);
      }
      
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    // Update panel lines
    carGroup.add(addPanelLine(24, 0.1, 0.1, 0, 10, 10));
    carGroup.add(addPanelLine(24, 0.1, 0.1, 0, 10, -10));
    carGroup.add(addPanelLine(0.1, 8, 40, 11.5, 8, 0));
    carGroup.add(addPanelLine(0.1, 8, 40, -11.5, 8, 0));

    // Add health bar
    const healthBarContainer = new THREE.Group();
    const healthBgGeometry = new THREE.PlaneGeometry(24, 1);
    const healthBgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const healthBg = new THREE.Mesh(healthBgGeometry, healthBgMaterial);
    healthBarContainer.add(healthBg);

    const healthFgGeometry = new THREE.PlaneGeometry(24, 1);
    const healthFgMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const healthFg = new THREE.Mesh(healthFgGeometry, healthFgMaterial);
    healthFg.position.z = 0.1;
    healthBarContainer.add(healthFg);

    healthBarContainer.position.set(0, 20, 0);
    healthBarContainer.rotation.x = -Math.PI / 2;
    carGroup.add(healthBarContainer);
    carGroup.healthBar = healthFg;

    return carGroup;
  }
} 