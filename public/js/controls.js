// Handles player input controls
class GameControls {
  constructor() {
    this.keys = {};
    this.mousePosition = { x: 0, y: 0 };
    this.boost = false;

    // Bind event listeners
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));

    // Camera control callbacks
    this.onCameraRotate = null;
    this.onCameraToggle = null;

    // Control states
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      boost: false
    };

    // Boost cooldown
    this.boostAvailable = true;
    this.boostCooldown = 10000; // 10 seconds
    this.boostDuration = 2000; // 2 seconds
    this.boostTimer = null;
    this.boostCooldownTimer = null;

    // Boost event callback
    this.onBoostActivated = null;

    // Set up event listeners
    this.setupEventListeners();
  }

  // Set up keyboard event listeners
  setupEventListeners() {
    // Key down event
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });

    // Key up event
    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event);
    });

    // Mouse move event
    document.addEventListener('mousemove', (event) => {
      this.handleMouseMove(event);
    });
  }

  // Handle key down events
  handleKeyDown(event) {
    // Prevent default behavior for game controls
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', ' '].includes(event.key)) {
      event.preventDefault();
    }

    this.keys[event.key.toLowerCase()] = true;

    // Camera controls
    if (event.key.toLowerCase() === 'c') {
      if (this.onCameraToggle) {
        this.onCameraToggle();
      }
    }

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
        this.keys.forward = true;
        break;
      case 'ArrowDown':
      case 's':
        this.keys.backward = true;
        break;
      case 'ArrowLeft':
      case 'a':
        this.keys.left = true;
        break;
      case 'ArrowRight':
      case 'd':
        this.keys.right = true;
        break;
      case ' ': // Space bar
        this.activateBoost();
        break;
    }
  }

  // Handle key up events
  handleKeyUp(event) {
    this.keys[event.key.toLowerCase()] = false;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
        this.keys.forward = false;
        break;
      case 'ArrowDown':
      case 's':
        this.keys.backward = false;
        break;
      case 'ArrowLeft':
      case 'a':
        this.keys.left = false;
        break;
      case 'ArrowRight':
      case 'd':
        this.keys.right = false;
        break;
    }
  }

  // Handle mouse move events
  handleMouseMove(event) {
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  // Activate boost if available
  activateBoost() {
    if (this.boostAvailable) {
      this.keys.boost = true;
      this.boostAvailable = false;

      // Update UI
      this.updateBoostUI(0);

      // Trigger boost event
      if (this.onBoostActivated) {
        this.onBoostActivated();
      }

      // Set boost duration timer
      this.boostTimer = setTimeout(() => {
        this.keys.boost = false;

        // Start cooldown
        this.startBoostCooldown();
      }, this.boostDuration);
    }
  }

  // Start boost cooldown
  startBoostCooldown() {
    // Clear any existing cooldown timer
    if (this.boostCooldownTimer) {
      clearInterval(this.boostCooldownTimer);
    }

    const startTime = Date.now();
    const updateInterval = 100; // Update every 100ms

    // Update UI periodically during cooldown
    this.boostCooldownTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / this.boostCooldown, 1);

      // Update UI
      this.updateBoostUI(progress);

      // End cooldown when complete
      if (progress >= 1) {
        clearInterval(this.boostCooldownTimer);
        this.boostAvailable = true;
      }
    }, updateInterval);
  }

  // Update boost UI
  updateBoostUI(progress) {
    const boostBar = document.getElementById('boost-bar');
    if (boostBar) {
      boostBar.style.width = `${progress * 100}%`;

      // Change color based on availability
      if (this.keys.boost) {
        boostBar.style.backgroundColor = '#ff5500'; // Orange during boost
      } else if (this.boostAvailable) {
        boostBar.style.backgroundColor = '#0af'; // Blue when available
      } else {
        boostBar.style.backgroundColor = '#666'; // Gray during cooldown
      }
    }
  }

  // Set boost activated callback
  setBoostCallback(callback) {
    this.onBoostActivated = callback;
  }

  // Get current input state
  getInputs() {
    return {
      forward: this.keys.forward,
      backward: this.keys.backward,
      left: this.keys.left,
      right: this.keys.right,
      boost: this.keys.boost,
      mouseX: this.mousePosition.x,
      mouseY: this.mousePosition.y
    };
  }

  // Update camera rotation
  updateCameraRotation(direction) {
    if (this.onCameraRotate) {
      this.onCameraRotate(direction);
    }
  }

  // Set camera control callbacks
  setCallbacks(callbacks) {
    if (callbacks.onCameraRotate) {
      this.onCameraRotate = callbacks.onCameraRotate;
    }
    if (callbacks.onCameraToggle) {
      this.onCameraToggle = callbacks.onCameraToggle;
    }
  }
}