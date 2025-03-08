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
    
    // Define vertices for the sports car body with improved rear design
    const vertices = new Float32Array([
      // Left side
      -7, 2, 20,     // 0: front bottom left
      -6, 4, 20,     // 1: hood start left
      -5, 5, 15,     // 2: hood middle left
      -4.5, 5.5, 10, // 3: windshield bottom left
      -4, 8, 5,      // 4: windshield top left
      -4, 8, 0,      // 5: roof left middle
      -4, 7.5, -5,   // 6: roof rear left
      -4.5, 6, -10,  // 7: rear window left
      -5, 4.5, -15,  // 8: trunk left
      -6, 3.5, -18,  // 9: rear bumper top left
      -7, 2, -20,    // 10: rear ground left

      // Right side
      7, 2, 20,      // 11: front bottom right
      6, 4, 20,      // 12: hood start right
      5, 5, 15,      // 13: hood middle right
      4.5, 5.5, 10,  // 14: windshield bottom right
      4, 8, 5,       // 15: windshield top right
      4, 8, 0,       // 16: roof right middle
      4, 7.5, -5,    // 17: roof rear right
      4.5, 6, -10,   // 18: rear window right
      5, 4.5, -15,   // 19: trunk right
      6, 3.5, -18,   // 20: rear bumper top right
      7, 2, -20,     // 21: rear ground right
    ]);

    // Define faces (triangles) - connecting all body panels
    const indices = [
      // Front nose and hood
      0, 1, 12, 0, 12, 11,    // Front bumper
      1, 2, 13, 1, 13, 12,    // Hood front
      2, 3, 14, 2, 14, 13,    // Hood rear
      
      // Windshield and roof
      3, 4, 15, 3, 15, 14,    // Windshield
      4, 5, 16, 4, 16, 15,    // Roof front
      5, 6, 17, 5, 17, 16,    // Roof middle
      6, 7, 18, 6, 18, 17,    // Roof rear
      
      // Rear window and trunk
      7, 8, 19, 7, 19, 18,    // Rear window
      8, 9, 20, 8, 20, 19,    // Trunk
      9, 10, 21, 9, 21, 20,   // Rear bumper
      
      // Left side panels
      0, 10, 9, 0, 9, 8, 0, 8, 7, 0, 7, 6, 0, 6, 5, 0, 5, 4, 0, 4, 3, 0, 3, 2, 0, 2, 1,
      
      // Right side panels
      11, 21, 20, 11, 20, 19, 11, 19, 18, 11, 18, 17, 11, 17, 16, 11, 16, 15, 11, 15, 14, 11, 14, 13, 11, 13, 12,
      
      // Bottom
      0, 11, 21, 0, 21, 10
    ];

    bodyGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    bodyGeometry.setIndex(indices);
    bodyGeometry.computeVertexNormals();

    const mainBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    mainBody.position.y = 2;
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    carGroup.add(mainBody);

    // Add headlights (modern LED design)
    const addHeadlight = (isRear = false, side = 1) => {
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
        color: isRear ? 0xff0000 : 0xffffff,
        emissive: isRear ? 0xff0000 : 0xffffff,
        emissiveIntensity: 1.5
      });
      const strip = new THREE.Mesh(stripGeometry, stripMaterial);
      strip.position.z = 0.2;
      
      group.add(housing);
      group.add(strip);
      group.position.set(side * 5.5, 4, isRear ? -19.5 : 19.5);
      return group;
    };

    // Add trunk lid detail
    const trunkLidGeometry = new THREE.BoxGeometry(9, 0.1, 4);
    const trunkLid = new THREE.Mesh(trunkLidGeometry, bodyMaterial);
    trunkLid.position.set(0, 4.5, -15);
    carGroup.add(trunkLid);

    // Add rear bumper detail
    const rearBumperGeometry = new THREE.BoxGeometry(14, 2, 1);
    const rearBumper = new THREE.Mesh(rearBumperGeometry, bodyMaterial);
    rearBumper.position.set(0, 3, -19.5);
    carGroup.add(rearBumper);

    // Add taillights (modern LED design)
    const addTaillight = (side = 1) => {
      const group = new THREE.Group();
      
      // Main light housing
      const housingGeometry = new THREE.BoxGeometry(2.5, 1, 0.5);
      const housingMaterial = new THREE.MeshStandardMaterial({
        color: 0x330000,
        metalness: 0.9,
        roughness: 0.2
      });
      const housing = new THREE.Mesh(housingGeometry, housingMaterial);
      
      // LED strip
      const stripGeometry = new THREE.BoxGeometry(2.2, 0.4, 0.1);
      const stripMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 1.5
      });
      const strip = new THREE.Mesh(stripGeometry, stripMaterial);
      strip.position.z = 0.2;
      
      group.add(housing);
      group.add(strip);
      group.position.set(side * 5, 4, -19.5);
      return group;
    };

    // Add headlights and taillights
    carGroup.add(addHeadlight(false, 1));  // Right headlight
    carGroup.add(addHeadlight(false, -1)); // Left headlight
    carGroup.add(addTaillight(1));         // Right taillight
    carGroup.add(addTaillight(-1));        // Left taillight

    // Add windows with better angles
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
      -4.5, 5.5, 10,  // bottom left
      4.5, 5.5, 10,   // bottom right
      4, 8, 5,        // top right
      -4, 8, 5        // top left
    ]);
    carGroup.add(addWindow(windshieldVertices, new THREE.Vector3(0, 2, 0)));

    // Side windows (left and right)
    const sideWindowVertices = new Float32Array([
      0, 7.5, 5,    // front top
      0, 7.5, -5,   // rear top
      0, 5.5, -5,   // rear bottom
      0, 5.5, 5     // front bottom
    ]);
    
    const leftWindow = addWindow(sideWindowVertices, new THREE.Vector3(-4.1, 2, 0));
    const rightWindow = addWindow(sideWindowVertices, new THREE.Vector3(4.1, 2, 0));
    carGroup.add(leftWindow);
    carGroup.add(rightWindow);

    // Rear window
    const rearWindowVertices = new Float32Array([
      -4, 7.5, -5,   // top left
      4, 7.5, -5,    // top right
      4.5, 6, -10,   // bottom right
      -4.5, 6, -10   // bottom left
    ]);
    carGroup.add(addWindow(rearWindowVertices, new THREE.Vector3(0, 2, 0)));

    // Enhanced wheel design
    const wheelGeometry = new THREE.CylinderGeometry(3, 3, 2, 24);
    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.3
    });

    const wheelPositions = [
      { x: 7, y: 3, z: 13 },    // Front Right
      { x: -7, y: 3, z: 13 },   // Front Left
      { x: 7, y: 3, z: -13 },   // Rear Right
      { x: -7, y: 3, z: -13 }   // Rear Left
    ];

    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.rotation.z = Math.PI / 2;
      
      // Add sporty rim design
      const rimGeometry = new THREE.TorusGeometry(2.2, 0.3, 8, 16);
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

      // Add spokes
      for (let i = 0; i < 5; i++) {
        const spoke = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 1.8, 0.1),
          rimMaterial
        );
        spoke.position.x = 0.2;
        spoke.rotation.z = (i * Math.PI * 2) / 5;
        rim.add(spoke);
      }
      
      wheel.castShadow = true;
      carGroup.add(wheel);
    });

    // Add sporty details
    const addDetail = (width, height, depth, x, y, z, color = 0x00ffff) => {
      const geometry = new THREE.BoxGeometry(width, height, depth);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.9,
        roughness: 0.2,
        emissive: color,
        emissiveIntensity: 0.3
      });
      const detail = new THREE.Mesh(geometry, material);
      detail.position.set(x, y, z);
      return detail;
    };

    // Add side skirts and other details
    carGroup.add(addDetail(0.2, 0.5, 20, 7, 3, 0));    // Right side skirt
    carGroup.add(addDetail(0.2, 0.5, 20, -7, 3, 0));   // Left side skirt
    carGroup.add(addDetail(14, 0.2, 1, 0, 4, -19.5));  // Rear diffuser
    carGroup.add(addDetail(14, 0.2, 1, 0, 4, 19.5));   // Front splitter

    return carGroup;
  }
} 