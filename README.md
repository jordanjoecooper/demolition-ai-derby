# Demolition Derby

A real-time multiplayer cyber demolition derby game inspired by Need for Speed 2, reimagined with a modern twist. Players control cars in a shared arena, aiming to smash other players' cars while avoiding destruction.

## Features

- Real-time multiplayer with Socket.IO
- 3D graphics using Three.js
- Open joining - players can join at any time
- Demolition derby gameplay with health bars and collision damage
- Simple controls (arrow keys/WASD and space for boost)
- Rounds that end when one player remains

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd demolition-derby
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## How to Play

1. Enter a username or play as a guest
2. Use the following controls:
   - W / Arrow Up: Accelerate
   - S / Arrow Down: Reverse
   - A / Arrow Left: Turn left
   - D / Arrow Right: Turn right
   - Space: Activate boost (10-second cooldown)

3. Crash into other players to damage them
4. Avoid getting hit to stay alive
5. The last player standing wins the round

## Development

To run the server in development mode with auto-restart:

```
npm run dev
```

## Technologies Used

- **Frontend**:
  - Three.js (3D rendering)
  - HTML5 / CSS3
  - JavaScript

- **Backend**:
  - Node.js
  - Express.js
  - Socket.IO

## Future Enhancements

- Leaderboards
- More detailed car models and arena
- Power-ups and special abilities
- Mobile support
- Monetization features (cosmetic items, performance boosts)

## License

[MIT](LICENSE)