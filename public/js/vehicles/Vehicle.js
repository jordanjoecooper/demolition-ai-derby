class Vehicle {
  static create(color = 0xFFFFFF) {
    throw new Error('Vehicle.create() must be implemented by subclass');
  }

  static getStats() {
    return {
      speed: 1.0,
      handling: 1.0,
      acceleration: 1.0,
      durability: 1.0
    };
  }

  static getName() {
    return 'Base Vehicle';
  }

  static getDescription() {
    return 'Base vehicle description';
  }
} 