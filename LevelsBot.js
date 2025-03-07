const BOT_CONSTANTS = {
    HEALTH: 2000,
    MACHINE_GUN_RANGE: 50,
    MACHINE_GUN_DAMAGE: 5,
    MACHINE_GUN_FIRE_RATE: 500, // 2 shots per second (in ms)
    MACHINE_GUN_ARC: 45, // degrees
    DETECTION_RANGE: 150, // Reduced from 200 to give players more space
    MINIMUM_ATTACK_RANGE: 30,
    OPTIMAL_ATTACK_RANGE: 40,
    TARGET_MEMORY_TIME: 3000,
    LINE_OF_SIGHT_CHECK_INTERVAL: 100,
    RESPAWN_DELAY: 60000,
    KILL_POINTS: 100,
    MOVEMENT_SPEED: 3, // Further reduced from 5
    ROTATION_SPEED: 0.03, // Reduced from 0.05 to make turning slower
    MAX_VELOCITY: 0.07, // Further reduced from 0.1
    BOUNDARY_MARGIN: 100,
    FRICTION: 0.94, // Increased from 0.92 to make it slow down faster
    CORNER_DETECTION_MARGIN: 150
};

class LevelsBot {
    constructor(arena) {
        this.id = 'levels-bot';
        this.arena = arena;
        this.reset();
        this.state = 'idle';
        this.lastFireTime = 0;
        this.targetPlayer = null;
        this.lastTargetSightTime = 0;
        this.lastLineOfSightCheck = 0;
        this.hasLineOfSight = false;
        this.idleWanderDirection = Math.random() * Math.PI * 2;
        this.lastDirectionChange = Date.now();
        this.velocity = { x: 0, z: 0 };
        this.nextWaypoint = this.getRandomWaypoint();
    }

    reset() {
        this.position = {
            x: Math.random() * (this.arena.width - 2 * BOT_CONSTANTS.BOUNDARY_MARGIN) - (this.arena.width/2 - BOT_CONSTANTS.BOUNDARY_MARGIN),
            y: 0,
            z: Math.random() * (this.arena.height - 2 * BOT_CONSTANTS.BOUNDARY_MARGIN) - (this.arena.height/2 - BOT_CONSTANTS.BOUNDARY_MARGIN)
        };
        this.rotation = 0;
        this.health = BOT_CONSTANTS.HEALTH;
        this.isAlive = true;
        this.lastUpdateTime = Date.now();
        this.velocity = { x: 0, z: 0 };
        this.nextWaypoint = this.getRandomWaypoint();
    }

    getRandomWaypoint() {
        // Get a random point well within the arena bounds
        return {
            x: Math.random() * (this.arena.width - 2 * BOT_CONSTANTS.BOUNDARY_MARGIN) - (this.arena.width/2 - BOT_CONSTANTS.BOUNDARY_MARGIN),
            z: Math.random() * (this.arena.height - 2 * BOT_CONSTANTS.BOUNDARY_MARGIN) - (this.arena.height/2 - BOT_CONSTANTS.BOUNDARY_MARGIN)
        };
    }

    handleIdleState(deltaTime) {
        // Check if we're in a corner
        const distToEdgeX = (this.arena.width/2) - Math.abs(this.position.x);
        const distToEdgeZ = (this.arena.height/2) - Math.abs(this.position.z);
        const inCorner = distToEdgeX < BOT_CONSTANTS.CORNER_DETECTION_MARGIN && 
                        distToEdgeZ < BOT_CONSTANTS.CORNER_DETECTION_MARGIN;

        if (inCorner) {
            // If in corner, head towards arena center with slightly increased speed
            const angleToCenter = Math.atan2(-this.position.x, -this.position.z);
            const centerAngleDiff = this.normalizeAngle(angleToCenter - this.rotation);
            this.rotation += Math.sign(centerAngleDiff) * Math.min(Math.abs(centerAngleDiff), BOT_CONSTANTS.ROTATION_SPEED * 1.5);
            this.moveForward(deltaTime, 0.8); // Reduced from 1.5
            return;
        }

        // Normal waypoint behavior
        const distToWaypoint = Math.sqrt(
            Math.pow(this.nextWaypoint.x - this.position.x, 2) +
            Math.pow(this.nextWaypoint.z - this.position.z, 2)
        );

        // Get new waypoint if too close or stuck
        if (distToWaypoint < 20 || Date.now() - this.lastDirectionChange > 10000) {
            this.nextWaypoint = this.getRandomWaypoint();
            this.lastDirectionChange = Date.now();
        }

        // Calculate angle to waypoint
        const dx = this.nextWaypoint.x - this.position.x;
        const dz = this.nextWaypoint.z - this.position.z;
        const targetAngle = Math.atan2(dx, dz);

        // Rotate towards waypoint more slowly
        const angleDiff = this.normalizeAngle(targetAngle - this.rotation);
        this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), BOT_CONSTANTS.ROTATION_SPEED);

        // Check if near arena bounds
        if (distToEdgeX < BOT_CONSTANTS.BOUNDARY_MARGIN || distToEdgeZ < BOT_CONSTANTS.BOUNDARY_MARGIN) {
            // If near edge, turn towards center more aggressively
            const angleToCenter = Math.atan2(-this.position.x, -this.position.z);
            const centerAngleDiff = this.normalizeAngle(angleToCenter - this.rotation);
            this.rotation += Math.sign(centerAngleDiff) * Math.min(Math.abs(centerAngleDiff), BOT_CONSTANTS.ROTATION_SPEED * 1.5);
            this.moveForward(deltaTime, 0.6); // Reduced from 1.0
        } else {
            // Normal movement at very slow speed
            this.moveForward(deltaTime, 0.3); // Reduced from 0.5
        }
    }

    handlePursueState(deltaTime) {
        if (this.targetPlayer) {
            // Calculate angle to target
            const dx = this.targetPlayer.position.x - this.position.x;
            const dz = this.targetPlayer.position.z - this.position.z;
            const targetAngle = Math.atan2(dx, dz);
            
            // Rotate towards target more slowly
            const angleDiff = this.normalizeAngle(targetAngle - this.rotation);
            this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), BOT_CONSTANTS.ROTATION_SPEED);
            
            // Move forward at reduced speed when pursuing
            this.moveForward(deltaTime, 0.7); // Reduced from 1.0
        }
    }

    handleAttackState(deltaTime) {
        if (!this.targetPlayer) return false;

        // Calculate angle and distance to target
        const dx = this.targetPlayer.position.x - this.position.x;
        const dz = this.targetPlayer.position.z - this.position.z;
        const targetAngle = Math.atan2(dx, dz);
        const distance = this.getDistanceTo(this.targetPlayer.position);
        
        // Rotate towards target more slowly
        const angleDiff = this.normalizeAngle(targetAngle - this.rotation);
        this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), BOT_CONSTANTS.ROTATION_SPEED * 1.5);
        
        // Manage distance to target with reduced speeds
        if (distance < BOT_CONSTANTS.MINIMUM_ATTACK_RANGE) {
            // Too close, back up slowly
            this.moveForward(deltaTime, -0.3); // Reduced from -0.5
        } else if (distance > BOT_CONSTANTS.OPTIMAL_ATTACK_RANGE) {
            // Too far, move closer slowly
            this.moveForward(deltaTime, 0.5); // Reduced from 0.7
        }
        
        // Only fire if within range and properly aimed
        const now = Date.now();
        if (distance <= BOT_CONSTANTS.MACHINE_GUN_RANGE && 
            Math.abs(angleDiff) < Math.PI / 6 && 
            now - this.lastFireTime >= BOT_CONSTANTS.MACHINE_GUN_FIRE_RATE) {
            this.lastFireTime = now;
            return true;
        }
        return false;
    }

    moveForward(deltaTime, speedMultiplier = 1.0) {
        // Calculate desired velocity
        const speed = BOT_CONSTANTS.MOVEMENT_SPEED * speedMultiplier * Math.min(deltaTime / 1000, 0.1);
        const dirX = Math.sin(this.rotation);
        const dirZ = Math.cos(this.rotation);
        
        // Set velocity directly instead of adding
        this.velocity.x = dirX * speed;
        this.velocity.z = dirZ * speed;
    }

    takeDamage(amount) {
        const actualDamage = amount * 1.5;
        this.health -= actualDamage;
        if (this.health <= 0 && this.isAlive) {
            this.isAlive = false;
            return true;
        }
        return false;
    }

    getDistanceTo(targetPosition) {
        const dx = targetPosition.x - this.position.x;
        const dz = targetPosition.z - this.position.z;
        return Math.sqrt(dx * dx + dz * dz);
    }

    normalizeAngle(angle) {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }

    getState() {
        return {
            id: this.id,
            position: this.position,
            rotation: this.rotation,
            health: this.health,
            state: this.state,
            isAlive: this.isAlive,
            velocity: this.velocity
        };
    }

    hasLineOfSightToTarget(obstacles) {
        if (!this.targetPlayer) return false;
        
        const now = Date.now();
        // Only check line of sight periodically to save performance
        if (now - this.lastLineOfSightCheck < BOT_CONSTANTS.LINE_OF_SIGHT_CHECK_INTERVAL) {
            return this.hasLineOfSight;
        }
        
        this.lastLineOfSightCheck = now;

        // Simple line of sight check
        const dx = this.targetPlayer.position.x - this.position.x;
        const dz = this.targetPlayer.position.z - this.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        // Check if any obstacles are between bot and target
        if (obstacles) {
            for (const obstacle of obstacles) {
                // Simple obstacle check - treat obstacles as circles
                const tox = obstacle.position.x - this.position.x;
                const toz = obstacle.position.z - this.position.z;
                const obstacleDistance = Math.sqrt(tox * tox + toz * toz);
                
                // If obstacle is farther than target, skip it
                if (obstacleDistance > distance) continue;
                
                // Project obstacle onto line between bot and target
                const dot = (dx * tox + dz * toz) / distance;
                const projx = (dot / distance) * dx;
                const projz = (dot / distance) * dz;
                
                // Calculate distance from obstacle to line
                const perpx = tox - projx;
                const perpz = toz - projz;
                const perpDistance = Math.sqrt(perpx * perpx + perpz * perpz);
                
                // If obstacle is close enough to line and between bot and target
                if (perpDistance < obstacle.radius && dot > 0 && dot < distance) {
                    this.hasLineOfSight = false;
                    return false;
                }
            }
        }
        
        this.hasLineOfSight = true;
        this.lastTargetSightTime = now;
        return true;
    }

    update(players, deltaTime, obstacles) {
        if (!this.isAlive) return null;

        // Find closest non-invincible player
        let closestPlayer = null;
        let closestDistance = Infinity;
        
        for (const [playerId, player] of players.entries()) {
            if (player.invincible || player.eliminated) continue;
            const distance = this.getDistanceTo(player.position);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPlayer = player;
            }
        }

        const now = Date.now();
        const hasLineOfSight = this.hasLineOfSightToTarget(obstacles);
        const targetMemoryExpired = now - this.lastTargetSightTime > BOT_CONSTANTS.TARGET_MEMORY_TIME;

        // Update state based on closest player and line of sight
        if (!closestPlayer || targetMemoryExpired) {
            this.state = 'idle';
            this.targetPlayer = null;
        } else if (closestDistance <= BOT_CONSTANTS.MACHINE_GUN_RANGE * 0.8 && hasLineOfSight) {
            this.state = 'attack';
            this.targetPlayer = closestPlayer;
        } else if (closestDistance <= BOT_CONSTANTS.DETECTION_RANGE) {
            if (hasLineOfSight || !targetMemoryExpired) {
                this.state = 'pursue';
                this.targetPlayer = closestPlayer;
            } else {
                this.state = 'idle';
                this.targetPlayer = null;
            }
        } else {
            this.state = 'idle';
            this.targetPlayer = null;
        }

        // Handle state behaviors
        let didFire = false;
        switch (this.state) {
            case 'idle':
                this.handleIdleState(deltaTime);
                break;
            case 'pursue':
                this.handlePursueState(deltaTime);
                break;
            case 'attack':
                didFire = hasLineOfSight && this.handleAttackState(deltaTime);
                break;
        }

        // Clamp deltaTime to prevent large jumps
        const clampedDeltaTime = Math.min(deltaTime, 50);

        // Apply velocity with strict speed limiting
        const currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (currentSpeed > BOT_CONSTANTS.MAX_VELOCITY) {
            const scale = BOT_CONSTANTS.MAX_VELOCITY / currentSpeed;
            this.velocity.x *= scale;
            this.velocity.z *= scale;
        }

        // Update position
        this.position.x += this.velocity.x * clampedDeltaTime;
        this.position.z += this.velocity.z * clampedDeltaTime;

        // Apply friction
        this.velocity.x *= BOT_CONSTANTS.FRICTION;
        this.velocity.z *= BOT_CONSTANTS.FRICTION;

        // Improved boundary handling
        const margin = 10;
        if (Math.abs(this.position.x) > this.arena.width/2 - margin) {
            this.position.x = Math.sign(this.position.x) * (this.arena.width/2 - margin);
            this.velocity.x = 0; // Stop instead of bounce
            this.nextWaypoint = this.getRandomWaypoint();
        }
        if (Math.abs(this.position.z) > this.arena.height/2 - margin) {
            this.position.z = Math.sign(this.position.z) * (this.arena.height/2 - margin);
            this.velocity.z = 0; // Stop instead of bounce
            this.nextWaypoint = this.getRandomWaypoint();
        }

        return {
            type: 'bot-update',
            data: this.getState(),
            didFire: didFire
        };
    }
}

module.exports = {
    LevelsBot,
    BOT_CONSTANTS
}; 