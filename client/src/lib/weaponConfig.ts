export interface WeaponConfig {
  name: string;
  damage: number;
  fireRate: number;
  accuracy: number;
  description: string;
}

export const WEAPONS: Record<string, WeaponConfig> = {
  pistol: {
    name: 'Pistol',
    damage: 1,
    fireRate: 1,
    accuracy: 0.9,
    description: 'Basic sidearm'
  },
  shotgun: {
    name: 'Shotgun',
    damage: 3,
    fireRate: 0.7,
    accuracy: 0.8,
    description: 'Close range devastation'
  },
  flamethrower: {
    name: 'Flamethrower',
    damage: 5,
    fireRate: 2,
    accuracy: 0.95,
    description: 'Burns through hordes'
  },
  rocket: {
    name: 'Rocket Launcher',
    damage: 10,
    fireRate: 0.5,
    accuracy: 0.7,
    description: 'Explosive power'
  },
  nuke: {
    name: 'Nuclear Device',
    damage: 999,
    fireRate: 0.1,
    accuracy: 1.0,
    description: 'Ultimate destruction'
  }
};

export function getWeaponConfig(weaponType: string): WeaponConfig {
  return WEAPONS[weaponType] || WEAPONS.pistol;
}

export function getNextWeapon(currentWeapon: string): string {
  const weapons = Object.keys(WEAPONS);
  const currentIndex = weapons.indexOf(currentWeapon);
  
  if (currentIndex < weapons.length - 1) {
    return weapons[currentIndex + 1];
  }
  
  return currentWeapon;
}
