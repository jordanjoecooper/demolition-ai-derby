class Radar {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('radar');
    
    if (!this.canvas || !this.game) {
      console.error('Radar initialization failed');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas size
    this.canvas.width = 150;
    this.canvas.height = 150;
    
    // Radar settings
    this.scale = 0.1; // Scale factor for converting world coordinates
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.radius = (this.canvas.width / 2) - 5; // Radar radius
  }

  update() {
    if (!this.ctx || !this.canvas) return;

    // Clear the canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw radar background
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(0, 20, 0, 0.9)';
    this.ctx.fill();

    // Draw radar circles
    this.drawRadarCircles();

    // Draw sweep effect
    this.drawSweep();

    // Draw entities
    this.drawEntities();
  }

  drawRadarCircles() {
    // Draw concentric circles
    for (let i = 1; i <= 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, (this.radius * i) / 3, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    // Draw crosshairs
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY - this.radius);
    this.ctx.lineTo(this.centerX, this.centerY + this.radius);
    this.ctx.moveTo(this.centerX - this.radius, this.centerY);
    this.ctx.lineTo(this.centerX + this.radius, this.centerY);
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
    this.ctx.stroke();
  }

  drawSweep() {
    // Calculate sweep angle based on time
    const sweepAngle = (Date.now() / 2000) % (Math.PI * 2);
    
    // Save the current context state
    this.ctx.save();
    
    // Create sweep effect using clipping
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY);
    this.ctx.arc(this.centerX, this.centerY, this.radius, sweepAngle, sweepAngle + Math.PI / 3);
    this.ctx.lineTo(this.centerX, this.centerY);
    this.ctx.clip();

    // Draw the sweep gradient
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.radius
    );
    gradient.addColorStop(0, 'rgba(0, 255, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(
      this.centerX - this.radius,
      this.centerY - this.radius,
      this.radius * 2,
      this.radius * 2
    );
    
    // Restore the context state
    this.ctx.restore();
  }

  drawEntities() {
    // Draw local player
    if (this.game.localPlayer) {
      this.drawEntity(this.game.localPlayer, '#00ff00', 3);
    }

    // Draw other players
    if (this.game.network && this.game.network.players) {
      for (const [playerId, player] of Object.entries(this.game.network.players)) {
        if (playerId !== this.game.network.playerId) {
          this.drawEntity(player, '#ff0000', 2);
        }
      }
    }

    // Draw bot if enabled
    if (this.game.botEnabled && this.game.network.botState) {
      this.drawEntity(this.game.network.botState, '#ffff00', 2);
    }
  }

  drawEntity(entity, color, size = 2) {
    if (!entity || !entity.position) return;

    // Convert world coordinates to radar coordinates
    const x = this.centerX + (entity.position.x * this.scale);
    const y = this.centerY + (entity.position.z * this.scale);

    // Check if point is within radar circle
    const distanceFromCenter = Math.sqrt(
      Math.pow(x - this.centerX, 2) + Math.pow(y - this.centerY, 2)
    );

    if (distanceFromCenter > this.radius) {
      // If outside radar, draw on the edge of the radar circle
      const angle = Math.atan2(y - this.centerY, x - this.centerX);
      const edgeX = this.centerX + Math.cos(angle) * this.radius;
      const edgeY = this.centerY + Math.sin(angle) * this.radius;
      
      // Draw triangle pointer on edge
      this.ctx.beginPath();
      this.ctx.moveTo(
        edgeX + Math.cos(angle) * 4,
        edgeY + Math.sin(angle) * 4
      );
      this.ctx.lineTo(
        edgeX + Math.cos(angle + Math.PI * 0.8) * 6,
        edgeY + Math.sin(angle + Math.PI * 0.8) * 6
      );
      this.ctx.lineTo(
        edgeX + Math.cos(angle - Math.PI * 0.8) * 6,
        edgeY + Math.sin(angle - Math.PI * 0.8) * 6
      );
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      // Draw entity dot
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw direction indicator
      if (entity.rotation !== undefined) {
        const length = size * 2;
        const dirX = x + Math.sin(entity.rotation) * length;
        const dirY = y + Math.cos(entity.rotation) * length;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(dirX, dirY);
        this.ctx.stroke();
      }
    }
  }
} 