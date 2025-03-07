// Main entry point for the game
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  // Initialize game components
  const startGameBtn = document.getElementById('start-game-btn');
  const usernameInput = document.getElementById('username-input');
  const usernameModal = document.getElementById('username-modal');
  const loadingScreen = document.getElementById('loading-screen');
  const gameUI = document.getElementById('game-ui');
  const loadingProgress = document.getElementById('loading-progress');
  const usernameForm = document.getElementById('username-form');
  const usernameError = document.getElementById('username-error');

  // Initially hide loading screen and show username modal
  loadingScreen.classList.add('hidden');
  usernameModal.classList.remove('hidden');

  // Game state
  let gameInitialized = false;
  let username = '';
  let progress = 0;
  const loadingMessages = [
    'Initializing Combat Systems',
    'Calibrating Weapons',
    'Loading Arena Assets',
    'Establishing Neural Link',
    'Activating Defense Matrix',
    'Synchronizing Battle Grid'
  ];

  // Simulate loading progress
  const loadingInterval = setInterval(() => {
    progress += Math.random() * 15;
    if (progress >= 100) {
      progress = 100;
      clearInterval(loadingInterval);
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.style.display = 'none';
          showUsernameModal();
        }, 1000);
      }, 500);
    }
    loadingProgress.textContent = Math.floor(progress) + '%';
    
    // Update loading message
    const messageIndex = Math.floor((progress / 100) * loadingMessages.length);
    const loadingMessage = document.querySelector('#loading-screen p:not(.loading-status)');
    if (loadingMessage && messageIndex < loadingMessages.length) {
      loadingMessage.textContent = loadingMessages[messageIndex] + '...';
    }
  }, 100);

  function showUsernameModal() {
    usernameModal.classList.remove('hidden');
    usernameInput.focus();
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
    
    // Initialize game with username
    initializeGame(username);
  });

  // Handle input changes
  usernameInput.addEventListener('input', () => {
    if (usernameInput.value.trim().length > 0) {
      usernameError.classList.add('hidden');
      usernameInput.classList.remove('error');
    }
  });

  // Start game when button is clicked
  startGameBtn.addEventListener('click', () => {
    console.log('Start game button clicked');
    username = usernameInput.value.trim() || `Guest_${Math.floor(Math.random() * 10000)}`;
    usernameModal.classList.add('hidden');
    loadingScreen.classList.remove('hidden');

    // Initialize game if not already done
    if (!gameInitialized) {
      console.log('Initializing game with username:', username);
      setTimeout(() => {
        initGame(username);
        gameInitialized = true;
      }, 100); // Small delay to ensure UI updates first
    }
  });

  // Allow pressing Enter to start game
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      startGameBtn.click();
    }
  });
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

    // Hide loading screen and show game UI after everything is loaded
    console.log('Setting up onLoaded callback');

    // Force transition to game UI after a reasonable timeout (5 seconds)
    // This ensures the game starts even if there's an issue with the callback
    setTimeout(() => {
      console.log('Forcing transition to game UI');
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('game-ui').classList.remove('hidden');
    }, 5000);

    renderer.onLoaded(() => {
      console.log('Renderer loaded callback triggered');
      document.getElementById('loading-screen').classList.add('hidden');
      document.getElementById('game-ui').classList.remove('hidden');
    });
  } catch (error) {
    console.error('Error initializing game:', error);
    // Show error on the loading screen
    const loadingText = document.querySelector('#loading-screen p');
    if (loadingText) {
      loadingText.textContent = 'Error loading game: ' + error.message;
      loadingText.style.color = 'red';
    }
  }
}