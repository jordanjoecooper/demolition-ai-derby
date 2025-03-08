// Main entry point for the game
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  // Initialize background music
  const backgroundMusic = document.getElementById('background-music');
  backgroundMusic.volume = 0.3; // Set to 30% volume

  // Initialize game components
  const usernameInput = document.getElementById('username-input');
  const usernameModal = document.getElementById('username-modal');
  const gameUI = document.getElementById('game-ui');
  const usernameForm = document.getElementById('username-form');
  const usernameError = document.getElementById('username-error');
  const radar = document.getElementById('radar');

  // Initially hide radar and show username modal
  usernameModal.classList.remove('hidden');

  // Game state
  let gameInitialized = false;
  let transitionInProgress = false;

  function startGameTransition() {
    if (transitionInProgress) return;
    transitionInProgress = true;

    // Add fade out class to username modal
    usernameModal.classList.add('fade-out');
    
    // Trigger travel effect
    const travelEffect = document.querySelector('.travel-effect');
    travelEffect.classList.add('active');
    
    // After travel effect, show game UI
    setTimeout(() => {
      usernameModal.classList.add('hidden');
      gameUI.classList.remove('hidden');
      
      // Initialize game immediately
      if (!gameInitialized) {
        initGame(usernameInput.value.trim());
        gameInitialized = true;
      }

      // Remove travel effect
      setTimeout(() => {
        travelEffect.classList.remove('active');
        transitionInProgress = false;
      }, 1000);
    }, 2000);
  }

  // Handle username submission
  usernameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (transitionInProgress) return;
    
    const username = usernameInput.value.trim();
    
    if (username.length === 0) {
      usernameError.classList.remove('hidden');
      usernameInput.classList.add('error');
      return;
    }
    
    // Hide error if previously shown
    usernameError.classList.add('hidden');
    usernameInput.classList.remove('error');
    
    // Start game transition
    startGameTransition();

    // Start playing background music
    backgroundMusic.play().catch(e => console.log('Error playing background music:', e));
  });

  // Handle input changes
  usernameInput.addEventListener('input', () => {
    if (usernameInput.value.trim().length > 0) {
      usernameError.classList.add('hidden');
      usernameInput.classList.remove('error');
    }
  });

  // Initialize the game
  function initGame(username) {
    console.log('initGame called');

    try {
      // Initialize renderer
      console.log('Creating renderer');
      const renderer = new GameRenderer();

      // Initialize network
      console.log('Creating network');
      const network = new GameNetwork(username);

      // Initialize controls
      console.log('Creating controls');
      const controls = new GameControls();

      // Initialize game logic
      console.log('Creating game');
      const game = new Game(renderer, network, controls);

      // Start the game loop
      console.log('Starting game loop');
      game.start();

      // Set up onLoaded callback for final initialization
      renderer.onLoaded(() => {
        console.log('Renderer loaded callback triggered');
        
        // Show radar with a slight delay to ensure proper initialization
        setTimeout(() => {
          console.log('Showing radar');
          const radar = document.getElementById('radar');
          if (radar) {
            radar.classList.add('visible');
          } else {
            console.error('Radar element not found');
          }
        }, 100);
      });

    } catch (error) {
      console.error('Error initializing game:', error);
      transitionInProgress = false;
    }
  }
});