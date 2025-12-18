import {
	ComponentType,
	FirewallMode,
	type GameEvent,
	NodeTier,
	NodeType,
	type Task,
	type TrafficWeights,
	type UpgradeStats,
} from "./types";

export const INITIAL_BUDGET = 600;
export const INITIAL_REPUTATION = 100;
export const GAME_TICK_RATE_MS = 1000;

// Rebalanced Revenue Rates
export const REVENUE_RATES = {
	STATIC: 0.4, // Reduced slightly to make "easy" traffic less profitable
	READ: 1.2,
	WRITE: 2.2, // High reward for heavy ops
	UPLOAD: 2.8,
	SEARCH: 1.8,
	BLOCKED_MALICIOUS: 0.0,
};

// Normalized Reputation Rates (Change per tick based on %)
export const REPUTATION_RATES = {
	GAIN_PER_TICK: 0.5, // +0.5% Rep per tick if 100% success (approx 3 mins to recover 0-100)
	LOSS_PER_TICK: 5.0, // Reduced from 8.0 to 5.0 to be less punishing
	MALICIOUS_PENALTY: 5.0, // -5.0% Rep per tick if 100% of traffic is malicious leak
};

// Upkeep Scaling
export const UPKEEP_SCALING_CONFIG = {
	BASE_MULT: 1.0,
	MAX_MULT: 4.0, // Higher max multiplier for late game difficulty
	TIME_TO_MAX_SECONDS: 1800, // 30 minutes to reach max pain
};

// Administrative Overhead per Node (Encourages using fewer, stronger nodes)
export const NODE_ADMIN_COST = 0.05;

export const TRAFFIC_PATTERNS: Record<
	string,
	{ name: string; weights: TrafficWeights }
> = {
	NORMAL: {
		name: "Normal Flow",
		weights: {
			STATIC: 0.3,
			READ: 0.2,
			WRITE: 0.15,
			UPLOAD: 0.05,
			SEARCH: 0.1,
			MALICIOUS: 0.2,
		},
	},
	COMMERCE_SPIKE: {
		name: "Shopping Spree",
		weights: {
			STATIC: 0.2,
			READ: 0.35,
			WRITE: 0.15,
			UPLOAD: 0.05,
			SEARCH: 0.2,
			MALICIOUS: 0.05,
		},
	},
	DATA_DUMP: {
		name: "Data Ingestion",
		weights: {
			STATIC: 0.1,
			READ: 0.1,
			WRITE: 0.4,
			UPLOAD: 0.3,
			SEARCH: 0.05,
			MALICIOUS: 0.05,
		},
	},
	VIRAL_CONTENT: {
		name: "Viral Content",
		weights: {
			STATIC: 0.6,
			READ: 0.1,
			WRITE: 0.05,
			UPLOAD: 0.05,
			SEARCH: 0.05,
			MALICIOUS: 0.15,
		},
	},
};

export const LOAD_WEIGHTS = {
	STATIC: 0.5,
	READ: 1.0,
	WRITE: 1.5,
	UPLOAD: 3.0,
	SEARCH: 2.5,
};

export const DDOS_CHANCE = 0.03; // Slightly higher chance

// Rebalanced Nodes: T3 is efficient but risky (High Upkeep)
export const NODE_TIERS: Record<
	NodeTier,
	{ cost: number; capacity: number; upkeep: number; name: string }
> = {
	[NodeTier.T1]: { cost: 100, capacity: 10, upkeep: 0.15, name: "Micro (T1)" },
	[NodeTier.T2]: {
		cost: 250,
		capacity: 35,
		upkeep: 0.45,
		name: "Standard (T2)",
	},
	[NodeTier.T3]: { cost: 600, capacity: 90, upkeep: 1.2, name: "Max (T3)" },
};

export const TIER_REPAIR_COSTS: Record<NodeTier, number> = {
	[NodeTier.T1]: 30,
	[NodeTier.T2]: 80,
	[NodeTier.T3]: 200,
};

export const NODE_TYPE_STATS: Record<
	NodeType,
	{ costMult: number; capMult: number; name: string; icon: string }
> = {
	[NodeType.APP]: {
		costMult: 1.0,
		capMult: 1.0,
		name: "App Server",
		icon: "server",
	},
	[NodeType.WORKER]: {
		costMult: 1.1,
		capMult: 1.3,
		name: "Worker Node",
		icon: "cpu",
	},
	[NodeType.DB]: {
		costMult: 2.5,
		capMult: 1.5,
		name: "Database Node",
		icon: "database",
	},
};

export const NODE_REPAIR_COST = 50;
export const NODE_DECAY_RATE = 0.2;
export const NODE_OVERLOAD_DECAY = 5.0; // Punish overload harder

export const FIREWALL_MODE_STATS: Record<
	FirewallMode,
	{ bonus: number; falsePositive: number; name: string }
> = {
	[FirewallMode.STANDARD]: { bonus: 0, falsePositive: 0, name: "Standard" },
	[FirewallMode.HIGH]: { bonus: 0.3, falsePositive: 0.05, name: "High Sec" },
	[FirewallMode.PANIC]: { bonus: 0.7, falsePositive: 0.25, name: "Panic" }, // Higher FP rate
};

export const INITIAL_TASKS: Task[] = [
	{
		id: "flush_cache",
		name: "Flush CDN Cache",
		description: "Clears static assets. CDN Capacity +50% for 15s.",
		cooldown: 40000,
		duration: 15000,
		lastUsed: 0,
		isActive: false,
		icon: "globe",
	},
	{
		id: "optimize_db",
		name: "Optimize Indexes",
		description: "Re-indexes database. DB Efficiency +50% for 15s.",
		cooldown: 60000,
		duration: 15000,
		lastUsed: 0,
		isActive: false,
		icon: "database",
	},
	{
		id: "patch_security",
		name: "Live Security Patch",
		description: "Tightens WAF rules. Boosts Firewall by 20% for 20s.",
		cooldown: 60000,
		duration: 20000,
		lastUsed: 0,
		isActive: false,
		icon: "shield",
	},
];

export const INITIAL_COMPONENTS: Record<ComponentType, UpgradeStats> = {
	[ComponentType.LOAD_BALANCER]: {
		name: "AWS ALB",
		level: 1,
		cost: 100,
		effectiveness: 50, // Starts low, acts as a HARD CAP on traffic
		description: "Hard limit on max concurrent requests.",
	},
	[ComponentType.DATABASE_TECH]: {
		name: "DB Optimization",
		level: 1,
		cost: 150,
		effectiveness: 1.0,
		description: "Query Efficiency. Multiplies DB Node Capacity.",
	},
	[ComponentType.FIREWALL]: {
		name: "WAF Basic",
		level: 1,
		cost: 80,
		effectiveness: 50,
		description: "Web Application Firewall. Filters 50 reqs/s.",
	},
	[ComponentType.CDN]: {
		name: "CloudEdge Basic",
		level: 1,
		cost: 100,
		effectiveness: 40,
		description: "Content Delivery Network. Handles 40 static reqs/s.",
	},
	[ComponentType.CACHE]: {
		name: "Redis Cluster",
		level: 0,
		cost: 200,
		effectiveness: 0,
		description: "Memory Cache. Reduces DB Read/Search load.",
	},
	[ComponentType.QUEUE]: {
		name: "SQS Queue",
		level: 0,
		cost: 150,
		effectiveness: 0,
		description: "Message Queue. Buffers spikes in Write/Upload.",
	},
};

// Steeper Scaling for late game
export const UPGRADE_SCALING = {
	[ComponentType.LOAD_BALANCER]: { costMult: 1.6, effectMult: 1.5 }, // Essential upgrade
	[ComponentType.DATABASE_TECH]: { costMult: 2.2, effectMult: 1.2 }, // Very Expensive
	[ComponentType.FIREWALL]: { costMult: 1.5, effectMult: 1.4 },
	[ComponentType.CDN]: { costMult: 1.5, effectMult: 1.6 },
	[ComponentType.CACHE]: { costMult: 1.8, effectMult: 0.12 },
	[ComponentType.QUEUE]: { costMult: 1.6, effectMult: 75 },
};

export const GAME_EVENTS: Omit<GameEvent, "id" | "startTime">[] = [
	{
		type: "TRAFFIC_SPIKE",
		name: "Viral Product Launch",
		description: "Massive influx of legitimate traffic!",
		duration: 25000,
		effectValue: 3.0,
	},
	{
		type: "BOTNET",
		name: "Botnet Detected",
		description: "Sophisticated DDoS attack inbound.",
		duration: 20000,
		effectValue: 5.0,
	},
	{
		type: "COOLING_FAILURE",
		name: "AC Failure",
		description: "Data center overheating. Nodes decaying rapidly.",
		duration: 30000,
		effectValue: 5.0,
	},
	{
		type: "FIBER_CUT",
		name: "Undersea Cable Cut",
		description: "Major region disconnected. Traffic dropped.",
		duration: 15000,
		effectValue: 0.2,
	},
	{
		type: "INVESTOR_FUNDING",
		name: "Series B Funding",
		description: "Investors injected capital.",
		duration: 5000,
		effectValue: 800,
	},
];
