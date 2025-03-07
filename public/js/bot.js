class LevelsBotRenderer {
    constructor(scene, assets) {
        this.scene = scene;
        this.assets = assets;
        this.bot = null;
        this.healthBar = null;
        this.muzzleFlash = null;
        this.setupBot();
    }

    setupBot() {
        // Create a more visible bot mesh
        const geometry = new THREE.BoxGeometry(8, 4, 12); // Larger size
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xff0000,
            emissive: 0x330000, // Add some self-illumination
            specular: 0x666666,
            shininess: 30
        });
        this.bot = new THREE.Mesh(geometry, material);
        this.bot.castShadow = true;
        this.bot.receiveShadow = true;
        this.bot.visible = false;
        
        // Add details to make the bot more distinctive
        const turretGeometry = new THREE.BoxGeometry(4, 2, 4);
        const turretMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x333333,
            emissive: 0x111111
        });
        const turret = new THREE.Mesh(turretGeometry, turretMaterial);
        turret.position.y = 2;
        this.bot.add(turret);

        // Create gun barrel
        const barrelGeometry = new THREE.CylinderGeometry(0.3, 0.3, 6);
        const barrelMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.rotation.z = Math.PI / 2;
        barrel.position.z = 3;
        turret.add(barrel);

        this.scene.add(this.bot);

        // Create health bar
        const healthBarGeometry = new THREE.PlaneGeometry(6, 0.5);
        const healthBarMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8
        });
        this.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
        this.healthBar.position.y = 5; // Position above the bot
        this.healthBar.rotation.x = -Math.PI / 2; // Make it face upward
        this.bot.add(this.healthBar);

        // Create muzzle flash
        const flashGeometry = new THREE.PlaneGeometry(2, 2);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            transparent: true,
            opacity: 0,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        this.muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
        this.muzzleFlash.position.z = 6;
        this.muzzleFlash.position.y = 2;
        this.bot.add(this.muzzleFlash);

        // Add point light to make bot more visible
        const light = new THREE.PointLight(0xff0000, 1, 20);
        light.position.y = 5;
        this.bot.add(light);
    }

    updateBot(botState) {
        if (!botState || !botState.isAlive) {
            if (this.bot) this.bot.visible = false;
            return;
        }

        // Make sure bot is visible
        this.bot.visible = true;

        // Update position and rotation
        this.bot.position.set(
            botState.position.x,
            botState.position.y + 2, // Lift slightly off ground
            botState.position.z
        );
        this.bot.rotation.y = botState.rotation;

        // Update health bar
        const healthPercent = botState.health / 2000; // 2000 is max health
        this.healthBar.scale.x = Math.max(0.1, healthPercent);
        this.healthBar.material.color.setHSL(healthPercent / 3, 1, 0.5);

        // Handle attack state effects
        if (botState.state === 'attack') {
            this.showMuzzleFlash();
        }

        // Add visual effect based on state
        switch (botState.state) {
            case 'attack':
                this.bot.material.emissive.setHex(0xff0000);
                break;
            case 'pursue':
                this.bot.material.emissive.setHex(0xff3300);
                break;
            case 'idle':
                this.bot.material.emissive.setHex(0x330000);
                break;
        }
    }

    showMuzzleFlash() {
        this.muzzleFlash.material.opacity = 1;
        setTimeout(() => {
            this.muzzleFlash.material.opacity = 0;
        }, 50);
    }

    playEliminationEffect() {
        if (!this.bot.visible) return;

        // Create explosion effect
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color = new THREE.Color();
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = this.bot.position.x;
            positions[i * 3 + 1] = this.bot.position.y;
            positions[i * 3 + 2] = this.bot.position.z;

            color.setHSL(0.1, 1, 0.5 + Math.random() * 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;

            sizes[i] = 2.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            sizeAttenuation: true
        });

        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);

        // Hide the bot
        this.bot.visible = false;

        // Animate particles
        const velocities = Array(particleCount).fill().map(() => ({
            x: (Math.random() - 0.5) * 2,
            y: Math.random() * 2,
            z: (Math.random() - 0.5) * 2
        }));

        let opacity = 1;
        const animate = () => {
            const positions = particles.geometry.attributes.position.array;
            const sizes = particles.geometry.attributes.size.array;

            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] += velocities[i].x;
                positions[i * 3 + 1] += velocities[i].y;
                positions[i * 3 + 2] += velocities[i].z;
                velocities[i].y -= 0.1; // Gravity
                sizes[i] *= 0.96; // Shrink particles
            }

            particles.geometry.attributes.position.needsUpdate = true;
            particles.geometry.attributes.size.needsUpdate = true;
            opacity -= 0.02;
            particles.material.opacity = opacity;

            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(particles);
            }
        };

        animate();
    }
}

// Export for use in main game file
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelsBotRenderer };
} else {
    window.LevelsBotRenderer = LevelsBotRenderer;
} 