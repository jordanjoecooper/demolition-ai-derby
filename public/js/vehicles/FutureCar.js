class FutureCar extends Vehicle {
  static getStats() {
    return {
      speed: 1.2,
      handling: 1.1,
      acceleration: 1.3,
      durability: 0.8
    };
  }

  static getName() {
    return 'Future Car';
  }

  static getDescription() {
    return 'A minimalistic yet futuristic vehicle with clean lines and simple geometry.';
  }

  static create(color = 0xFFFFFF) {
    const carGroup = new THREE.Group();
    carGroup.originalColor = color;

    // Create materials
    const bodyMaterial = new THREE.MeshLambertMaterial({
      color: color
    });

    const detailMaterial = new THREE.MeshLambertMaterial({
      color: 0x333333
    });

    const glassMaterial = new THREE.MeshLambertMaterial({
      color: 0x111111,
      opacity: 0.5,
      transparent: true
    });

    // Create main body (base)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(12, 4, 20),
      bodyMaterial
    );
    body.position.y = 4;
    body.castShadow = true;
    carGroup.add(body);

    // Create cabin
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(8, 4, 12),
      glassMaterial
    );
    cabin.position.y = 8;
    cabin.position.z = -2;
    carGroup.add(cabin);

    // Create nose
    const nose = new THREE.Mesh(
      new THREE.BoxGeometry(8, 2, 6),
      bodyMaterial
    );
    nose.position.z = 10;
    nose.position.y = 3;
    carGroup.add(nose);

    // Create wheels - smaller size
    const wheelGeometry = new THREE.BoxGeometry(2, 4, 4); // Reduced from (3, 6, 6)
    
    // Front left wheel - adjusted position for smaller wheels
    const wheelFL = new THREE.Mesh(wheelGeometry, detailMaterial);
    wheelFL.position.set(-6.5, 2, 6); // Y position lowered, X moved inward
    carGroup.add(wheelFL);

    // Front right wheel
    const wheelFR = new THREE.Mesh(wheelGeometry, detailMaterial);
    wheelFR.position.set(6.5, 2, 6);
    carGroup.add(wheelFR);

    // Back left wheel
    const wheelBL = new THREE.Mesh(wheelGeometry, detailMaterial);
    wheelBL.position.set(-6.5, 2, -6);
    carGroup.add(wheelBL);

    // Back right wheel
    const wheelBR = new THREE.Mesh(wheelGeometry, detailMaterial);
    wheelBR.position.set(6.5, 2, -6);
    carGroup.add(wheelBR);

    // Add headlights
    const headlightGeometry = new THREE.BoxGeometry(2, 1, 1);
    const headlightMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1
    });

    // Left headlight
    const headlightL = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightL.position.set(-3, 3.5, 13);
    carGroup.add(headlightL);

    // Right headlight
    const headlightR = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlightR.position.set(3, 3.5, 13);
    carGroup.add(headlightR);

    // Add taillights
    const taillightMaterial = new THREE.MeshLambertMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 1
    });

    // Left taillight
    const taillightL = new THREE.Mesh(headlightGeometry, taillightMaterial);
    taillightL.position.set(-3, 3.5, -10);
    carGroup.add(taillightL);

    // Right taillight
    const taillightR = new THREE.Mesh(headlightGeometry, taillightMaterial);
    taillightR.position.set(3, 3.5, -10);
    carGroup.add(taillightR);

    // Add front grille
    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2, 0.5),
      detailMaterial
    );
    grille.position.set(0, 3, 13);
    carGroup.add(grille);

    // Add roof detail
    const roofDetail = new THREE.Mesh(
      new THREE.BoxGeometry(7, 0.5, 10),
      detailMaterial
    );
    roofDetail.position.y = 10;
    roofDetail.position.z = -2;
    carGroup.add(roofDetail);

    return carGroup;
  }
} 