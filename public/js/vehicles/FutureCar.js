class FutureCar extends Vehicle {
  static getStats() {
    return {
      speed: 1.2,      // Faster due to aerodynamic design
      handling: 1.1,    // Better handling due to low center of gravity
      acceleration: 1.3, // Great acceleration due to lightweight design
      durability: 0.8   // Less durable due to lighter construction
    };
  }

  static getName() {
    return 'Future Car';
  }

  static getDescription() {
    return 'A sleek, aerodynamic sports car with advanced technology and exceptional performance.';
  }

  static create(color = 0xFFFFFF) {
    const carGroup = new THREE.Group();
    carGroup.originalColor = color;

    // Create glossy material with metallic finish
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.9,
      roughness: 0.2,
      envMapIntensity: 1.5
    });

    // Create glass material
    const glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.1,
      opacity: 0.7,
      transparent: true
    });

    // Main body shape (sports car profile)
    const bodyGeometry = new THREE.BufferGeometry();
    
    // Define vertices for the sports car body
    const vertices = new Float32Array([
      // Left side
      -6, 0, 15,     // 0: front bottom left
      -6, 3, 15,     // 1: hood start left
      -5, 4, 12,     // 2: hood middle left
      -4, 4, 8,      // 3: windshield bottom left
      -4, 6, 4,      // 4: windshield top left
      -4, 6, 0,      // 5: roof left middle
      -4, 6, -4,     // 6: roof rear left
      -4, 4, -8,     // 7: rear window left
      -5, 3, -12,    // 8: trunk left
      -6, 2, -15,    // 9: rear bottom left

      // Right side
      6, 0, 15,      // 10: front bottom right
      6, 3, 15,      // 11: hood start right
      5, 4, 12,      // 12: hood middle right
      4, 4, 8,       // 13: windshield bottom right
      4, 6, 4,       // 14: windshield top right
      4, 6, 0,       // 15: roof right middle
      4, 6, -4,      // 16: roof rear right
      4, 4, -8,      // 17: rear window right
      5, 3, -12,     // 18: trunk right
      6, 2, -15,     // 19: rear bottom right
    ]);

    // Define faces (triangles)
    const indices = [
      // Front hood
      0, 1, 11, 0, 11, 10,     // Front face
      1, 2, 12, 1, 12, 11,     // Hood front
      2, 3, 13, 2, 13, 12,     // Hood rear
      
      // Windshield and roof
      3, 4, 14, 3, 14, 13,     // Windshield
      4, 5, 15, 4, 15, 14,     // Roof front
      5, 6, 16, 5, 16, 15,     // Roof middle
      
      // Rear section
      6, 7, 17, 6, 17, 16,     // Rear window
      7, 8, 18, 7, 18, 17,     // Trunk
      8, 9, 19, 8, 19, 18,     // Rear face
      
      // Left side panels
      0, 9, 8, 0, 8, 7, 0, 7, 6, 0, 6, 5, 0, 5, 4, 0, 4, 3, 0, 3, 2, 0, 2, 1,
      
      // Right side panels
      10, 19, 18, 10, 18, 17, 10, 17, 16, 10, 16, 15, 10, 15, 14, 10, 14, 13, 10, 13, 12, 10, 12, 11,
      
      // Bottom (optional)
      0, 10, 19, 0, 19, 9
    ];

    bodyGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    bodyGeometry.setIndex(indices);
    bodyGeometry.computeVertexNormals();

    const mainBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    mainBody.position.y = 2;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    carGroup.add(mainBody);

    // Add front bumper
    const frontBumperGeometry = new THREE.BoxGeometry(12, 2, 2);
    const frontBumper = new THREE.Mesh(frontBumperGeometry, bodyMaterial);
    frontBumper.position.set(0, 1, 15);
    carGroup.add(frontBumper);

    // Add rear bumper
    const rearBumperGeometry = new THREE.BoxGeometry(12, 2, 2);
    const rearBumper = new THREE.Mesh(rearBumperGeometry, bodyMaterial);
    rearBumper.position.set(0, 1, -15);
    carGroup.add(rearBumper);

    // Add headlights
    const addHeadlight = (side = 1) => {
      const group = new THREE.Group();
      
      // Main light housing
      const housingGeometry = new THREE.BoxGeometry(2, 1, 0.5);
      const housingMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.2
      });
      const housing = new THREE.Mesh(housingGeometry, housingMaterial);
      
      // LED strip
      const stripGeometry = new THREE.BoxGeometry(1.8, 0.3, 0.1);
      const stripMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 1.5
      });
      const strip = new THREE.Mesh(stripGeometry, stripMaterial);
      strip.position.z = 0.2;
      
      group.add(housing);
      group.add(strip);
      group.position.set(side * 4, 2, 15.5);
      return group;
    };

    // Add taillights
    const addTaillight = (side = 1) => {
      const group = new THREE.Group();
      
      // Main light housing
      const housingGeometry = new THREE.BoxGeometry(2, 1, 0.5);
      const housingMaterial = new THREE.MeshStandardMaterial({
        color: 0x330000,
        metalness: 0.9,
        roughness: 0.2
      });
      const housing = new THREE.Mesh(housingGeometry, housingMaterial);
      
      // LED strip
      const stripGeometry = new THREE.BoxGeometry(1.8, 0.3, 0.1);
      const stripMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1.5
      });
      const strip = new THREE.Mesh(stripGeometry, stripMaterial);
      strip.position.z = 0.2;
      
      group.add(housing);
      group.add(strip);
      group.position.set(side * 4, 2, -15.5);
      return group;
    };

    // Add lights
    carGroup.add(addHeadlight(1));   // Right headlight
    carGroup.add(addHeadlight(-1));  // Left headlight
    carGroup.add(addTaillight(1));   // Right taillight
    carGroup.add(addTaillight(-1));  // Left taillight

    // Add windows
    const addWindow = (vertices, position) => {
      const windowGeometry = new THREE.BufferGeometry();
      windowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      windowGeometry.computeVertexNormals();
      const window = new THREE.Mesh(windowGeometry, glassMaterial);
      window.position.copy(position);
      return window;
    };

    // Windshield
    const windshieldVertices = new Float32Array([
      -4, 4, 8,   // bottom left
      4, 4, 8,    // bottom right
      4, 6, 4,    // top right
      -4, 6, 4    // top left
    ]);
    carGroup.add(addWindow(windshieldVertices, new THREE.Vector3(0, 2, 0)));

    // Side windows
    const sideWindowVertices = new Float32Array([
      0, 6, 4,    // front top
      0, 6, -4,   // rear top
      0, 4, -4,   // rear bottom
      0, 4, 4     // front bottom
    ]);
    
    const leftWindow = addWindow(sideWindowVertices, new THREE.Vector3(-4.1, 2, 0));
    const rightWindow = addWindow(sideWindowVertices, new THREE.Vector3(4.1, 2, 0));
    carGroup.add(leftWindow);
    carGroup.add(rightWindow);

    // Rear window
    const rearWindowVertices = new Float32Array([
      -4, 6, -4,   // top left
      4, 6, -4,    // top right
      4, 4, -8,    // bottom right
      -4, 4, -8    // bottom left
    ]);
    carGroup.add(addWindow(rearWindowVertices, new THREE.Vector3(0, 2, 0)));

    // Add wheels
    const wheelGeometry = new THREE.CylinderGeometry(2, 2, 1.5, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.3
    });

    const wheelPositions = [
      { x: 6, y: 2, z: 10 },     // Front Right
      { x: -6, y: 2, z: 10 },    // Front Left
      { x: 6, y: 2, z: -10 },    // Rear Right
      { x: -6, y: 2, z: -10 }    // Rear Left
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.rotation.z = Math.PI / 2;
      
      // Add rim
      const rimGeometry = new THREE.TorusGeometry(1.5, 0.2, 8, 16);
      const rimMaterial = new THREE.MeshStandardMaterial({
        color: 0xC0C0C0,
        metalness: 0.95,
        roughness: 0.1
      });

      const rim = new THREE.Mesh(rimGeometry, rimMaterial);
      rim.rotation.y = Math.PI / 2;
      wheel.add(rim);

      // Add spokes
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.2, 1.2, 0.1),
          rimMaterial
        );
        spoke.position.x = 0.2;
        spoke.rotation.z = (i * Math.PI * 2) / 5;
        rim.add(spoke);
      }
      
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    // Add ground effects (optional)
    const addGroundEffect = (width, height, depth, x, y, z) => {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color: 0x000000,
        metalness: 0.9,
        roughness: 0.2
      });
      const effect = new THREE.Mesh(geometry, material);
      effect.position.set(x, y, z);
      return effect;
    };

    // Add side skirts
    carGroup.add(addGroundEffect(0.5, 1, 16, 6, 1, 0));    // Right side skirt
    carGroup.add(addGroundEffect(0.5, 1, 16, -6, 1, 0));   // Left side skirt

    return carGroup;
  }
} 