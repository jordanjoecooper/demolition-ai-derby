Product Requirements Document (PRD): Modern Demolition Derby Game
1. Introduction
This PRD defines the requirements for a web-based, real-time multiplayer 3D demolition derby game built with Three.js. Players control cars in an arena, smashing into each other to reduce opponents’ health while collecting power-ups to survive. The game emphasizes chaotic, arcade-style fun with real-time multiplayer interactions, inspired by Need for Speed 2. Players can join at any time, and rounds continue indefinitely with respawn mechanics.
2. Core Gameplay Features
2.1 Health System
Description: Each car begins with a full health bar.

Requirements:
Starting health is 100%, displayed as a bar above each car, visible to all players.

Health decreases upon collisions with other cars.

When health reaches 0%, the car is eliminated, triggering a "wasted" screen with a respawn button.

2.2 Collision Mechanics
Description: Cars bounce off each other during collisions, with damage tied to speed.

Requirements:
Implement arcade-style physics for bouncing upon impact.

Damage calculation: Health deduction increases with the combined speed of both cars at the moment of collision (e.g., higher speed = more damage).

Include basic visual feedback (e.g., sparks) and audio (e.g., crash sound) for collisions.

2.3 Power-Ups
Description: Health and shield icons spawn randomly to aid players.

Requirements:
Health Icons:
Spawn 2-3 health icons on the map at random locations.

Collecting an icon restores the car’s health to 100%.

Icons respawn at new random locations after being collected.

Shield Icons:
Spawn 2-3 shield icons on the map at random locations.

Collecting an icon grants a damage shield for 1 minute, preventing health loss from collisions.

Icons respawn at new random locations after being collected.

Ensure visual distinction (e.g., different colors or shapes) between health and shield icons.

2.4 Speed and Controls
Description: Cars have variable speed with intuitive controls.

Requirements:
Speed ranges from 0 to 100 mph (referred to as "plaid speed").

Use existing key bindings (e.g., WASD or arrow keys) for movement, consistent with current controls.

Acceleration and deceleration feel responsive and smooth.

3. Multiplayer and Interaction Features
3.1 Real-time Multiplayer
Description: Players share a 3D arena and interact in real-time.

Requirements:
Support 20-50 concurrent players per arena.

Sync car movements, collisions, and power-up collections across all players.

Use Three.js for 3D rendering and Socket.IO for real-time networking.

3.2 Open Joining and Respawning
Description: Players can join or rejoin the game seamlessly.

Requirements:
Allow players to join the arena at any time, spawning at random locations.

Provide a 3-second invincibility period upon spawning to prevent instant elimination.

After elimination, display a "wasted" screen with a respawn button to re-enter the game.

3.3 Scoreboard
Description: Tracks and displays player achievements.

Requirements:
Record "kills" when a player’s collision directly eliminates another car (health reaches 0%).

Record "trick points" earned from aerial stunts (see Air Time section).

Display a real-time scoreboard visible to all players, showing kills and trick points.

3.4 Radar
Description: A mini-map enhances situational awareness.

Requirements:
Display a basic radar showing the relative positions of all players in the arena.

Update in real-time as players move.

Use simple dots or icons to represent players.

4. Enemy and Special Features
4.1 Levelsio Bot
Description: A unique AI-controlled enemy car with enhanced abilities.

Requirements:
Roams the map, randomly driving into and shooting at player cars.

Equipped with a machine gun (the only car with this feature), firing short bursts at nearby players.

Has 20 times the health of a normal player car (e.g., 2000% health).

Eliminating the bot awards the player 100 kill points on the scoreboard.

Respawns after elimination at a random location.

4.2 Aerial Stunts
Description: Players can perform tricks while airborne to earn points.

Requirements:
When airborne, allow smaller turning adjustments compared to ground movement.

Holding the spacebar while in the air enables the car to flip or spin.

Award "trick points" based on trick complexity:
Simple flip/spin: Low points (e.g., 10-20).

Multiple flips/spins: Higher points (e.g., 30-50).

Display trick points on the scoreboard alongside kills.

5. Technical Requirements
5.1 Technologies
Frontend: Three.js for 3D rendering, HTML5, JavaScript.

Backend: Node.js with Express.js for server logic.

Networking: Socket.IO for real-time communication.

Deployment: Host on Heroku or DigitalOcean.

5.2 Performance
Description: Ensure smooth gameplay on web browsers.

Requirements:
Optimize 3D car models and arena textures for web performance.

Minimize latency in real-time updates for movements and collisions.

5.3 Security
Description: Maintain fair play and data integrity.

Requirements:
Use HTTPS for secure communication.

Validate movements, collisions, and power-up collections server-side to prevent cheating.

6. User Experience
6.1 Joining the Game
Description: Simple and fast entry process.

Requirements:
Accessible via a URL (e.g., http://localhost:3000 during development).

Optional username input before joining.

Quick loading and spawning into the arena with brief invincibility.

6.2 In-Game Experience
Description: Engaging and intuitive gameplay.

Requirements:
Provide clear visual cues for health, shields, and power-ups (e.g., distinct colors, icons).

Ensure controls are responsive with immediate feedback (e.g., speed changes, collision effects).

Maintain continuous gameplay with minimal downtime between eliminations and respawns.

7. Future Enhancements
These are potential improvements for post-MVP development:
Enhanced Graphics:
Add detailed car models and textures.

Implement particle effects for collisions and power-ups.

Include environmental details in the arena (e.g., debris, barriers).

Game Features:
Introduce additional power-ups or special abilities.

Implement a persistent leaderboard across sessions.

Add sound effects (e.g., engine noises, crashes) and background music.

Create multiple arena variations.

Monetization:
Offer cosmetic items (e.g., car skins, decals) for $0.99-$2.99.

Sell performance boosts (e.g., temporary shields, speed boosts) for $1.99-$4.99.

Technical Improvements:
Optimize network code for scalability.

Add server-side validation to enhance security.

Implement lag compensation for smoother multiplayer interactions.

