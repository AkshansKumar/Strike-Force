import * as THREE from 'three';

export type Team = 'alpha' | 'bravo';

export interface AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export interface Collider extends AABB {
  mesh?: THREE.Object3D;
}

export interface SpawnPoint {
  pos: THREE.Vector3;
  team: Team;
}

export interface SoldierState {
  id: number;
  name: string;
  team: Team;
  isPlayer: boolean;
  pos: THREE.Vector3; // feet position
  vel: THREE.Vector3;
  yaw: number;
  pitch: number;
  hp: number;
  alive: boolean;
  onGround: boolean;
  kills: number;
  deaths: number;
  respawnTimer: number;
  radius: number;
  height: number;
}

export interface HitResult {
  point: THREE.Vector3;
  victimId?: number;
  isHead?: boolean;
  normal?: THREE.Vector3;
}

export interface KillEvent {
  id: number;
  killer: string;
  killerTeam: Team;
  victim: string;
  victimTeam: Team;
  headshot: boolean;
}

export interface HudState {
  hp: number;
  ammo: number;
  reserve: number;
  reloading: boolean;
  scoreAlpha: number;
  scoreBravo: number;
  timeLeft: number;
  killTarget: number;
  alive: boolean;
  respawnIn: number;
  hitMarker: number; // increments on hit
  killMarker: number;
  damageFlash: number; // increments when damaged
  damageDir: number; // radians relative to view
  ads: boolean;
}

export interface PlayerRow {
  name: string;
  team: Team;
  kills: number;
  deaths: number;
  isPlayer: boolean;
}
