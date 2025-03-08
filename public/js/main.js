// Main entry point for the game
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  
  // Initialize background music
  const backgroundMusic = document.getElementById('background-music');
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
    { message: 'INITIALIZING SYSTEMS', progress: 15 },
    { message: 'MADE WITH ❤️ AND COFFEE', progress: 30 },
    { message: 'INSPIRED BY @LEVELSIO', progress: 50 },
    { message: 'PURE INDIE HACKER VIBES', progress: 70 },
    { message: 'GET READY TO RACE', progress: 85 },
    { message: 'WELCOME TO CYBER DERBY', progress: 100 }
  ];

  function updateLoadingProgress(step, substep = 0) {
    const currentStep = loadingSteps[step];
    const previousStep = step > 0 ? loadingSteps[step - 1] : { progress: 0 };
    const progressRange = currentStep.progress - previousStep.progress;
    const currentProgress = previousStep.progress + (progressRange * substep);
    
    loadingProgress.textContent = Math.floor(currentProgress) + '%';
    
    const systemMessage = document.querySelector('#loading-screen .system-message');
    if (systemMessage) {
      // Clear existing text
      systemMessage.textContent = '';
      // Type out the new message with a cool effect
      let charIndex = 0;
      const typeInterval = setInterval(() => {
        if (charIndex < currentStep.message.length) {
          const char = currentStep.message[charIndex];
          if (char === '@') {
            systemMessage.innerHTML += `<span style="color: #ff3333;">@</span>`;
          } else if (char === '❤️') {
            systemMessage.innerHTML += `<span style="color: #ff3333;">❤️</span>`;
          } else {
            systemMessage.textContent += char;
          }
          charIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 50); // Adjust typing speed here
    }
    
    return currentProgress;
  }

  function showLoadingScreen() {
    // Add fade out class to username modal
    usernameModal.classList.add('fade-out');
    
    // Trigger travel effect
    const travelEffect = document.querySelector('.travel-effect');
    travelEffect.classList.add('active');
    
    // After travel effect, show loading screen
    setTimeout(() => {
      usernameModal.classList.add('hidden');
      loadingScreen.classList.remove('hidden');
      loadingScreen.classList.add('fade-in');
      updateLoadingProgress(0);
      
      // Remove travel effect
      setTimeout(() => {
        travelEffect.classList.remove('active');
      }, 1000);
    }, 2000);
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