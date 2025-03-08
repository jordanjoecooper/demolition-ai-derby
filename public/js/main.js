// Main entry point for the game
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  // Initialize background music
  const backgroundMusic = new Audio('sounds/cyber.mp3');
  backgroundMusic.loop = true; // Make the music loop
  backgroundMusic.volume = 0.3; // Set to 30% volume

  // Initialize game components
  const usernameInput = document.getElementById('username-input');
  const usernameModal = document.getElementById('username-modal');
  const loadingScreen = document.getElementById('loading-screen');
  const gameUI = document.getElementById('game-ui');
  const loadingProgress = document.getElementById('loading-progress');
  const usernameForm = document.getElementById('username-form');
  const usernameError = document.getElementById('username-error');
  const radar = document.getElementById('radar');

  // Initially hide loading screen, radar, and show username modal
  loadingScreen.classList.add('hidden');
  usernameModal.classList.remove('hidden');

  // Game state
  let gameInitialized = false;
  const loadingSteps = [
    { message: 'Initializing Combat Systems', progress: 15 },
    { message: 'Calibrating Weapons', progress: 30 },
    { message: 'Loading Arena Assets', progress: 50 },
    { message: 'Establishing Neural Link', progress: 70 },
    { message: 'Activating Defense Matrix', progress: 85 },
    { message: 'Synchronizing Battle Grid', progress: 100 }
  ];

  function updateLoadingProgress(step, substep = 0) {
    const currentStep = loadingSteps[step];
    const previousStep = step > 0 ? loadingSteps[step - 1] : { progress: 0 };
    const progressRange = currentStep.progress - previousStep.progress;
    const currentProgress = previousStep.progress + (progressRange * substep);
    
    loadingProgress.textContent = Math.floor(currentProgress) + '%';
    
    const loadingMessage = document.querySelector('#loading-screen p:not(.loading-status)');
    if (loadingMessage) {
      loadingMessage.textContent = currentStep.message + '...';
    }
    
    return currentProgress;
  }

  function showLoadingScreen() {
    usernameModal.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    loadingScreen.style.opacity = '1';
    updateLoadingProgress(0);
  }

  // Handle username submission
  usernameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    
    if (username.length === 0) {
      usernameError.classList.remove('hidden');
      usernameInput.classList.add('error');
      return;
    }
    
    // Hide error if previously shown
    usernameError.classList.add('hidden');
    usernameInput.classList.remove('error');
    
    // Show loading screen and initialize game
    showLoadingScreen();

    // Start playing background music
    backgroundMusic.play().catch(e => console.log('Error playing background music:', e));

    // Initialize game if not already done
    if (!gameInitialized) {
      console.log('Initializing game with username:', username);
      initGame(username);
      gameInitialized = true;
    }
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
      updateLoadingProgress(0, 1);
      const renderer = new GameRenderer();

      // Initialize network
      console.log('Creating network');
      updateLoadingProgress(1, 1);
      const network = new GameNetwork(username);

      // Initialize controls
      console.log('Creating controls');
      updateLoadingProgress(2, 0.5);
      const controls = new GameControls();

      // Initialize game logic
      console.log('Creating game');
      updateLoadingProgress(3, 1);
      const game = new Game(renderer, network, controls);

      // Start the game loop
      console.log('Starting game loop');
      updateLoadingProgress(4, 1);
      game.start();

      // Set up onLoaded callback for final initialization
      renderer.onLoaded(() => {
        console.log('Renderer loaded callback triggered');
        updateLoadingProgress(5, 1);
        setTimeout(() => {
          document.getElementById('loading-screen').classList.add('hidden');
          document.getElementById('game-ui').classList.remove('hidden');
          
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
        }, 500);
      });

    } catch (error) {
      console.error('Error initializing game:', error);
      const loadingText = document.querySelector('#loading-screen p');
      if (loadingText) {
        loadingText.textContent = 'Error loading game: ' + error.message;
        loadingText.style.color = 'red';
      }
    }
  }
});