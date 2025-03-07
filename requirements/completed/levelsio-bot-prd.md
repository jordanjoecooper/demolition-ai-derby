Product Requirements Document (PRD): Levels Bot Implementation
1. Introduction
This PRD specifies the requirements for implementing the Levels Bot, a unique AI-controlled enemy in a demolition derby game. The Levels Bot is a formidable adversary designed to challenge players with its roaming behavior, combat abilities, and high durability. To maintain game balance and focus, only one Levels Bot must be present on the map at any given time.
2. Key Features
2.1 Bot Behavior
Description: The Levels Bot actively roams the map, engaging players by driving into them and firing a machine gun.

Requirements:
Implement a simple pathfinding system (e.g., A* algorithm or waypoint navigation) for the bot to move realistically around the arena.

The bot randomly selects a player as its target and drives toward them, dynamically adjusting its path to avoid obstacles like walls or debris.

Equip the bot with a machine gun that activates when a player is within 50 meters, firing at targets in range.

2.2 Health and Damage
Description: The Levels Bot is tougher than player cars and inflicts damage via collisions and gunfire.

Requirements:
Health: Assign the bot 2000 HP (20x the typical player car health).

Collision Damage: Use the same formula as player-to-player collisions: damage = (relative speed) / 5, with a minimum of 5 HP.

Machine Gun:
Fires 2 shots per second.

Each shot deals 5 HP damage to player cars.

Range: 50 meters.

Firing arc: 45 degrees in front of the bot.

Damage Taken: Players can damage the bot through collisions, calculated using the same collision damage formula.

2.3 Elimination and Respawn
Description: The Levels Bot can be destroyed by players but will respawn after a delay, ensuring only one bot exists at a time.

Requirements:
When the bot’s HP drops to 0, it is eliminated, and the player dealing the final blow earns 100 kill points.

Post-elimination, the bot respawns at a random map location after a 1-minute (60-second) delay.

Enforce a single-bot rule: no new bot spawns until the current one is destroyed and the respawn timer completes.

2.4 Visual and Audio Indicators
Description: The Levels Bot must stand out visually and audibly to enhance player recognition and engagement.

Requirements:
Use a distinct 3D model or color scheme (e.g., a larger, armored vehicle) to differentiate the bot from player cars.

Add visual effects for the machine gun (e.g., muzzle flash) and audio cues (e.g., gunfire sounds).

Display a health bar above the bot, visible to all players, showing its current HP.

3. Technical Requirements
3.1 AI Implementation
Description: The bot’s actions are driven by a straightforward AI system.

Requirements:
Use a state machine with three states:
Idle: When no players are within 100 meters, the bot drives randomly across the map.

Pursue: When a player is within 100 meters, the bot targets and drives toward them.

Attack: When a player is within 50 meters, the bot fires its machine gun.

Implement player detection using raycasting or similar techniques to determine line-of-sight targeting.

3.2 Networking
Description: The bot’s state must be consistent across all players in a multiplayer environment.

Requirements:
The server controls the bot’s state (position, health, actions) and syncs updates to all clients.

Ensure smooth, lag-free movement and attack animations for all players.

3.3 Respawn Logic
Description: Control the bot’s lifecycle to enforce the single-instance rule.

Requirements:
Server tracks the bot’s status (active or eliminated).

After elimination, initiate a 60-second timer before respawning the bot at a random location.

Before spawning, verify no other bot is active to prevent duplicates.

4. User Experience
4.1 Player Interaction
Description: The Levels Bot should challenge players while remaining fair and engaging.

Requirements:
Design the bot’s movement to be semi-predictable, allowing strategic counterplay, but with enough randomness to keep it threatening.

Balance the machine gun’s power: it should be a significant threat but allow skilled players to evade or outmaneuver it.

4.2 Feedback
Description: Players need clear indicators of the bot’s status changes.

Requirements:
Show a dramatic effect (e.g., explosion) and notification when the bot is eliminated.

Announce the bot’s respawn to all players (e.g., “The Levels Bot has returned!”) via text or audio.

5. Testing Instructions
Description: Ensure the Levels Bot behaves as intended and maintains the single-instance rule.

Instructions:
Test bot movement and targeting with multiple players in the arena.

Confirm that only one bot spawns at a time and that respawn occurs correctly after a 60-second delay post-elimination.

Validate health, collision damage, and machine gun mechanics against specifications.

Verify synchronization of bot actions (movement, attacks, health updates) across all clients in a multiplayer setting.

