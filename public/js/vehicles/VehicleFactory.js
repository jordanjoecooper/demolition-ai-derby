class VehicleFactory {
  static vehicles = {
    futurecar: FutureCar
    // Add more vehicles here as they are created
  };

  static getAvailableVehicles() {
    return Object.entries(this.vehicles).map(([id, VehicleClass]) => ({
      id,
      name: VehicleClass.getName(),
      description: VehicleClass.getDescription(),
      stats: VehicleClass.getStats()
    }));
  }

  static createVehicle(vehicleId, color = 0xFFFFFF) {
    const VehicleClass = this.vehicles[vehicleId];
    if (!VehicleClass) {
      throw new Error(`Unknown vehicle type: ${vehicleId}`);
    }
    return VehicleClass.create(color);
  }

  static getVehicleStats(vehicleId) {
    const VehicleClass = this.vehicles[vehicleId];
    if (!VehicleClass) {
      throw new Error(`Unknown vehicle type: ${vehicleId}`);
    }
    return VehicleClass.getStats();
  }
} 