export enum ComponentType {
  LOAD_BALANCER = 'LOAD_BALANCER',
  DATABASE_TECH = 'DATABASE_TECH',
  FIREWALL = 'FIREWALL',
  CDN = 'CDN',
  CACHE = 'CACHE',
  QUEUE = 'QUEUE',
}

export enum NodeStatus {
  ONLINE = 'ONLINE',
  DEGRADED = 'DEGRADED',
  CRASHED = 'CRASHED',
}

export enum FirewallMode {
  STANDARD = 'STANDARD',
  HIGH = 'HIGH',
  PANIC = 'PANIC'
}

export enum NodeTier {
  T1 = 'T1',
  T2 = 'T2',
  T3 = 'T3',
}

export enum NodeType {
  APP = 'APP',
  WORKER = 'WORKER',
  DB = 'DB',
}

export interface ServerNode {
  id: string;
  name: string;
  tier: NodeTier;
  type: NodeType; 
  status: NodeStatus;
  health: number; // 0-100
  capacity: number; // Requests per tick (Base)
  isProcessing: boolean;
}

export interface UpgradeStats {
  level: number;
  cost: number;
  effectiveness: number; // Context specific: Capacity, Buffer size, or % Reduction
  description: string;
  name: string;
}

export interface Task {
  id: string;
  name: string;
  cooldown: number; // ms
  duration: number; // ms
  lastUsed: number;
  isActive: boolean;
  description: string;
  icon: 'database' | 'globe' | 'shield';
}

export interface GameEvent {
  id: string;
  type: 'TRAFFIC_SPIKE' | 'BOTNET' | 'COOLING_FAILURE' | 'FIBER_CUT' | 'INVESTOR_FUNDING';
  name: string;
  description: string;
  duration: number; // ms
  startTime: number;
  effectValue: number;
}

export interface TrafficWeights {
  STATIC: number;
  READ: number;
  WRITE: number;
  UPLOAD: number;
  SEARCH: number;
  MALICIOUS: number;
}

export interface GameState {
  isPlaying: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  tickCount: number;
  
  // Resources
  budget: number;
  reputation: number; // 0-100%
  upkeepCost: number; // Cost per tick
  
  // Infrastructure
  nodes: ServerNode[];
  loadBalancer: UpgradeStats;
  databaseTech: UpgradeStats; 
  firewall: UpgradeStats;
  cdn: UpgradeStats;
  memoryCache: UpgradeStats; // New: Reduces DB Load
  messageQueue: UpgradeStats; // New: Buffers Bursts
  
  firewallMode: FirewallMode;
  
  // Events & Tasks
  tasks: Task[];
  activeEvent: GameEvent | null;
  activeTrafficPattern: string; // Name of current pattern
  
  // Metrics for current tick
  currentTraffic: number; // Raw RPS
  processedTraffic: number;
  droppedTraffic: number;
  maliciousTraffic: number;
  blockedMalicious: number;
  
  // Load Metrics (0-100%)
  appLoad: number;    
  workerLoad: number; 
  dbLoad: number;     
  cdnLoad: number;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'error' | 'success' | 'warning' | 'event';
}

export interface ChartDataPoint {
  time: string;
  legitimate: number;
  malicious: number;
  processed: number;
}
