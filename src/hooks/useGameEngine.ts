import { useCallback, useEffect, useState } from "react";
import {
	DDOS_CHANCE,
	FIREWALL_MODE_STATS,
	GAME_EVENTS,
	GAME_TICK_RATE_MS,
	INITIAL_BUDGET,
	INITIAL_COMPONENTS,
	INITIAL_REPUTATION,
	INITIAL_TASKS,
	LOAD_WEIGHTS,
	NODE_ADMIN_COST,
	NODE_DECAY_RATE,
	NODE_OVERLOAD_DECAY,
	NODE_TIERS,
	NODE_TYPE_STATS,
	REPUTATION_RATES,
	REVENUE_RATES,
	TIER_REPAIR_COSTS,
	TRAFFIC_PATTERNS,
	UPGRADE_SCALING,
	UPKEEP_SCALING_CONFIG,
} from "../constants";
import {
	type ChartDataPoint,
	ComponentType,
	FirewallMode,
	type GameState,
	type LogEntry,
	NodeStatus,
	NodeTier,
	NodeType,
	type ServerNode,
	type UpgradeStats,
} from "../types";

const MAX_LOGS = 100;
const MAX_CHART_POINTS = 60;

// Simple ID generator
const generateId = () =>
	Math.random().toString(36).substring(2, 9) + Date.now().toString(36);

// Pure helper function moved outside hook to ensure stability
const calculateLayerStats = (
	demand: number,
	nodes: ServerNode[],
	efficiencyMult: number = 1.0,
	bufferCapacity: number = 0,
) => {
	const activeNodes = nodes.filter((n) => n.status !== NodeStatus.CRASHED);

	// Effective Capacity: Nodes provide full capacity if health > 30%, otherwise scale down.
	const effectiveCapacity =
		activeNodes.reduce((acc, n) => {
			const healthFactor = n.health > 30 ? 1.0 : Math.max(0, n.health / 30);
			return acc + n.capacity * healthFactor;
		}, 0) * efficiencyMult;

	const totalAvailableCapacity = effectiveCapacity + bufferCapacity;

	const theoreticalMaxCapacity =
		activeNodes.reduce((acc, n) => acc + n.capacity, 0) * efficiencyMult;
	const utilization =
		theoreticalMaxCapacity > 0
			? demand / theoreticalMaxCapacity
			: demand > 0
				? 2.0
				: 0;

	const drops = Math.max(0, demand - totalAvailableCapacity);

	const successRate = demand > 0 ? (demand - drops) / demand : 1.0;

	return {
		utilization,
		drops,
		successRate: Math.max(0, Math.min(1.0, successRate)),
	};
};

export const useGameEngine = () => {
	const [gameState, setGameState] = useState<GameState>({
		isPlaying: false,
		isGameOver: false,
		isPaused: true,
		tickCount: 0,
		budget: INITIAL_BUDGET,
		reputation: INITIAL_REPUTATION,
		upkeepCost: 0,
		nodes: [],
		loadBalancer: { ...INITIAL_COMPONENTS[ComponentType.LOAD_BALANCER] },
		databaseTech: { ...INITIAL_COMPONENTS[ComponentType.DATABASE_TECH] },
		firewall: { ...INITIAL_COMPONENTS[ComponentType.FIREWALL] },
		cdn: { ...INITIAL_COMPONENTS[ComponentType.CDN] },
		memoryCache: { ...INITIAL_COMPONENTS[ComponentType.CACHE] },
		messageQueue: { ...INITIAL_COMPONENTS[ComponentType.QUEUE] },

		firewallMode: FirewallMode.STANDARD,
		tasks: INITIAL_TASKS,
		activeEvent: null,
		activeTrafficPattern: "NORMAL",

		currentTraffic: 0,
		processedTraffic: 0,
		droppedTraffic: 0,
		maliciousTraffic: 0,
		blockedMalicious: 0,
		appLoad: 0,
		workerLoad: 0,
		dbLoad: 0,
		cdnLoad: 0,
	});

	const [logs, setLogs] = useState<LogEntry[]>([]);
	const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

	const addLog = useCallback(
		(message: string, type: LogEntry["type"] = "info") => {
			const newLog: LogEntry = {
				id: generateId(),
				timestamp: Date.now(),
				message,
				type,
			};
			setLogs((prev) => [...prev, newLog].slice(-MAX_LOGS));
		},
		[],
	);

	// Actions
	const buyNode = (type: NodeType) => {
		const tier = NodeTier.T1;
		const tierSpecs = NODE_TIERS[tier];
		const typeStats = NODE_TYPE_STATS[type];

		const finalCost = tierSpecs.cost * typeStats.costMult;
		const finalCapacity = tierSpecs.capacity * typeStats.capMult;

		if (gameState.budget < finalCost) {
			addLog(`Insufficient funds to buy ${typeStats.name}.`, "warning");
			return;
		}
		const newNode: ServerNode = {
			id: generateId(),
			name: `${type}-${Math.floor(100 + Math.random() * 900)}`,
			tier: tier,
			type: type,
			status: NodeStatus.ONLINE,
			health: 100,
			capacity: finalCapacity,
			isProcessing: false,
		};

		setGameState((prev) => ({
			...prev,
			budget: prev.budget - finalCost,
			nodes: [...prev.nodes, newNode],
		}));
		addLog(
			`New ${typeStats.name} (${tier}) provisioned. Capacity: ${finalCapacity.toFixed(0)} RPS.`,
			"success",
		);
	};

	const upgradeNode = (id: string) => {
		const node = gameState.nodes.find((n) => n.id === id);
		if (!node) return;

		let nextTier: NodeTier | null = null;
		if (node.tier === NodeTier.T1) nextTier = NodeTier.T2;
		else if (node.tier === NodeTier.T2) nextTier = NodeTier.T3;

		if (!nextTier) {
			addLog("Node is already at maximum tier.", "warning");
			return;
		}

		const tierSpecs = NODE_TIERS[nextTier];
		const typeStats = NODE_TYPE_STATS[node.type];
		const upgradeCost = tierSpecs.cost * typeStats.costMult;

		if (gameState.budget < upgradeCost) {
			addLog(
				`Insufficient funds to upgrade node ($${upgradeCost}).`,
				"warning",
			);
			return;
		}

		const newCapacity = tierSpecs.capacity * typeStats.capMult;

		setGameState((prev) => ({
			...prev,
			budget: prev.budget - upgradeCost,
			nodes: prev.nodes.map((n) =>
				n.id === id
					? {
							...n,
							tier: nextTier!,
							capacity: newCapacity,
							health: 100,
							status: NodeStatus.ONLINE,
						}
					: n,
			),
		}));
		addLog(
			`Upgraded ${node.name} to ${nextTier}. New Capacity: ${newCapacity.toFixed(0)}`,
			"success",
		);
	};

	const repairNode = (id: string) => {
		const node = gameState.nodes.find((n) => n.id === id);
		if (!node) return;

		const baseRepairCost = TIER_REPAIR_COSTS[node.tier];
		const cost =
			node.status === NodeStatus.CRASHED ? baseRepairCost * 2 : baseRepairCost;

		if (gameState.budget < cost) {
			addLog(`Insufficient funds ($${cost}) to repair node.`, "warning");
			return;
		}

		setGameState((prev) => ({
			...prev,
			budget: prev.budget - cost,
			nodes: prev.nodes.map((n) =>
				n.id === id ? { ...n, health: 100, status: NodeStatus.ONLINE } : n,
			),
		}));
		addLog(`Node ${node.name} repaired/rebooted for $${cost}.`, "info");
	};

	const repairAllNodes = () => {
		const nodesToRepair = gameState.nodes.filter(
			(n) => n.health < 100 || n.status === NodeStatus.CRASHED,
		);
		if (nodesToRepair.length === 0) {
			addLog("All nodes are healthy.", "info");
			return;
		}

		let totalCost = 0;
		nodesToRepair.forEach((n) => {
			const base = TIER_REPAIR_COSTS[n.tier];
			totalCost += n.status === NodeStatus.CRASHED ? base * 2 : base;
		});

		if (gameState.budget < totalCost) {
			addLog(
				`Insufficient funds to repair all ($${totalCost} needed).`,
				"warning",
			);
			return;
		}

		setGameState((prev) => ({
			...prev,
			budget: prev.budget - totalCost,
			nodes: prev.nodes.map((n) => ({
				...n,
				health: 100,
				status: NodeStatus.ONLINE,
			})),
		}));

		addLog(
			`Repaired ${nodesToRepair.length} nodes for $${totalCost}.`,
			"success",
		);
	};

	const upgradeComponent = (type: ComponentType) => {
		const componentKey =
			type === ComponentType.LOAD_BALANCER
				? "loadBalancer"
				: type === ComponentType.DATABASE_TECH
					? "databaseTech"
					: type === ComponentType.CDN
						? "cdn"
						: type === ComponentType.CACHE
							? "memoryCache"
							: type === ComponentType.QUEUE
								? "messageQueue"
								: "firewall";

		const currentComp = gameState[componentKey] as UpgradeStats;

		if (gameState.budget < currentComp.cost) {
			addLog(`Insufficient funds to upgrade ${currentComp.name}.`, "warning");
			return;
		}

		const scale = UPGRADE_SCALING[type];
		const nextLevel = currentComp.level + 1;
		const nextCost = currentComp.cost * scale.costMult;

		let nextEffect = currentComp.effectiveness;
		let desc = "";

		if (type === ComponentType.CACHE) {
			nextEffect = Math.min(
				0.95,
				currentComp.level === 0
					? 0.2
					: currentComp.effectiveness + scale.effectMult,
			);
			desc = `Memory Cache. Reduces DB Read load by ${(nextEffect * 100).toFixed(0)}%.`;
		} else if (type === ComponentType.QUEUE) {
			nextEffect =
				currentComp.level === 0
					? 50
					: currentComp.effectiveness + scale.effectMult;
			desc = `Message Queue. Buffers ${nextEffect} requests during spikes.`;
		} else if (type === ComponentType.LOAD_BALANCER) {
			nextEffect = Math.floor(currentComp.effectiveness * scale.effectMult);
			desc = `Max Traffic Limit: ${nextEffect.toLocaleString()} RPS.`;
		} else if (type === ComponentType.DATABASE_TECH) {
			nextEffect = currentComp.effectiveness * scale.effectMult;
			desc = `DB Tech Level ${nextLevel}. Efficiency: ${(nextEffect * 100).toFixed(0)}%.`;
		} else if (type === ComponentType.FIREWALL) {
			nextEffect = Math.floor(currentComp.effectiveness * scale.effectMult);
			desc = `Advanced WAF Rules. Filters ${nextEffect} reqs/s.`;
		} else if (type === ComponentType.CDN) {
			nextEffect = Math.floor(currentComp.effectiveness * scale.effectMult);
			desc = `Global Edge Network. Handles ${nextEffect} static reqs/s.`;
		}

		setGameState((prev) => ({
			...prev,
			budget: prev.budget - currentComp.cost,
			[componentKey]: {
				...currentComp,
				level: nextLevel,
				cost: nextCost,
				effectiveness: nextEffect,
				description: desc,
			},
		}));
		addLog(`Upgraded ${currentComp.name} to Level ${nextLevel}.`, "success");
	};

	const setFirewallMode = (mode: FirewallMode) => {
		setGameState((prev) => ({ ...prev, firewallMode: mode }));
		addLog(
			`Firewall switched to ${FIREWALL_MODE_STATS[mode].name} mode.`,
			"info",
		);
	};

	const activateTask = (taskId: string) => {
		const now = Date.now();
		setGameState((prev) => {
			const taskIndex = prev.tasks.findIndex((t) => t.id === taskId);
			if (taskIndex === -1) return prev;

			const task = prev.tasks[taskIndex];
			if (now - task.lastUsed < task.cooldown && task.lastUsed !== 0) {
				addLog(`${task.name} is on cooldown!`, "warning");
				return prev;
			}

			const newTasks = [...prev.tasks];
			newTasks[taskIndex] = { ...task, isActive: true, lastUsed: now };
			addLog(`Activated: ${task.name}`, "info");

			return { ...prev, tasks: newTasks };
		});
	};

	const restartGame = () => {
		setGameState({
			isPlaying: true,
			isGameOver: false,
			isPaused: true,
			tickCount: 0,
			budget: INITIAL_BUDGET,
			reputation: INITIAL_REPUTATION,
			upkeepCost: 0,
			nodes: [],
			loadBalancer: { ...INITIAL_COMPONENTS[ComponentType.LOAD_BALANCER] },
			databaseTech: { ...INITIAL_COMPONENTS[ComponentType.DATABASE_TECH] },
			firewall: { ...INITIAL_COMPONENTS[ComponentType.FIREWALL] },
			cdn: { ...INITIAL_COMPONENTS[ComponentType.CDN] },
			memoryCache: { ...INITIAL_COMPONENTS[ComponentType.CACHE] },
			messageQueue: { ...INITIAL_COMPONENTS[ComponentType.QUEUE] },
			firewallMode: FirewallMode.STANDARD,
			tasks: INITIAL_TASKS,
			activeEvent: null,
			activeTrafficPattern: "NORMAL",
			currentTraffic: 0,
			processedTraffic: 0,
			droppedTraffic: 0,
			maliciousTraffic: 0,
			blockedMalicious: 0,
			appLoad: 0,
			workerLoad: 0,
			dbLoad: 0,
			cdnLoad: 0,
		});
		setLogs([]);
		setChartData([]);
		setTimeout(
			() => addLog("System initialized. Welcome, Architect.", "info"),
			100,
		);
	};

	const togglePause = () => {
		setGameState((prev) => {
			if (!prev.isPlaying && prev.isPaused) {
				return { ...prev, isPlaying: true, isPaused: false };
			}
			return { ...prev, isPaused: !prev.isPaused };
		});
	};

	const triggerRandomEvent = (current: GameState): GameState => {
		if (!current.activeEvent && Math.random() < 0.01) {
			const randomEvent =
				GAME_EVENTS[Math.floor(Math.random() * GAME_EVENTS.length)];

			let newBudget = current.budget;
			if (randomEvent.type === "INVESTOR_FUNDING") {
				newBudget += randomEvent.effectValue;
				addLog(
					`Event: ${randomEvent.name}! Received $${randomEvent.effectValue} funding.`,
					"success",
				);
			} else {
				addLog(
					`EVENT: ${randomEvent.name} - ${randomEvent.description}`,
					"event",
				);
			}

			return {
				...current,
				budget: newBudget,
				activeEvent: {
					...randomEvent,
					id: generateId(),
					startTime: Date.now(),
				},
			};
		}
		return current;
	};

	const tick = useCallback(() => {
		setGameState((current) => {
			if (current.isGameOver || current.isPaused) return current;

			try {
				const now = Date.now();
				const tickCount = current.tickCount + 1;

				// 0. Event Management
				let stateWithEvent = triggerRandomEvent(current);
				if (stateWithEvent.activeEvent) {
					const elapsed = now - stateWithEvent.activeEvent.startTime;
					if (elapsed > stateWithEvent.activeEvent.duration) {
						addLog(`Event Ended: ${stateWithEvent.activeEvent.name}`, "info");
						stateWithEvent = { ...stateWithEvent, activeEvent: null };
					}
				}

				const activeEvent = stateWithEvent.activeEvent;

				// 1. Update Tasks & Traffic Pattern
				let activeTrafficPattern = stateWithEvent.activeTrafficPattern;
				if (!TRAFFIC_PATTERNS[activeTrafficPattern])
					activeTrafficPattern = "NORMAL";

				if (tickCount % 60 === 0) {
					const patterns = Object.keys(TRAFFIC_PATTERNS);
					const nextPattern =
						patterns[Math.floor(Math.random() * patterns.length)];
					if (nextPattern && nextPattern !== activeTrafficPattern) {
						activeTrafficPattern = nextPattern;
						addLog(
							`Traffic Shift: ${TRAFFIC_PATTERNS[nextPattern].name}`,
							"event",
						);
					}
				}

				const trafficWeights = TRAFFIC_PATTERNS[activeTrafficPattern].weights;

				const updatedTasks = stateWithEvent.tasks.map((t) => {
					if (t.isActive && now - t.lastUsed > t.duration) {
						return { ...t, isActive: false };
					}
					return t;
				});

				const flushCacheActive = updatedTasks.find(
					(t) => t.id === "flush_cache",
				)?.isActive;
				const optimizeDbActive = updatedTasks.find(
					(t) => t.id === "optimize_db",
				)?.isActive;
				const patchSecurityActive = updatedTasks.find(
					(t) => t.id === "patch_security",
				)?.isActive;

				// 2. Traffic Calculation (Steeper Late Game Scaling)
				const t = tickCount;

				// Revised Growth Formula:
				// 1. Logarithmic base for early game
				// 2. Linear component for mid game
				// 3. Exponential kicker for late game (post 1200 ticks)
				const logGrowth = Math.log(1 + t / 15) * 2.5;
				const linearBoost = t * 0.12;
				const lateGameKicker = t > 1200 ? Math.pow((t - 1200) / 300, 2) : 0;

				let baseRPS = 2.0 + logGrowth + linearBoost + lateGameKicker;

				if (activeEvent?.type === "TRAFFIC_SPIKE")
					baseRPS *= activeEvent.effectValue;
				if (activeEvent?.type === "FIBER_CUT")
					baseRPS *= activeEvent.effectValue;

				const noise = baseRPS * (Math.random() * 0.2 - 0.1);
				const rawRPS = Math.max(1.0, baseRPS + noise);

				// 3. Load Balancer Bottleneck (HARD CAP)
				const albCapacity = stateWithEvent.loadBalancer.effectiveness;
				let trafficEnteringSystem = rawRPS;
				let droppedByALB = 0;

				if (rawRPS > albCapacity) {
					trafficEnteringSystem = albCapacity;
					droppedByALB = rawRPS - albCapacity;
				}

				// 4. Traffic Distribution & DDoS
				const isBotnetEvent = activeEvent?.type === "BOTNET";
				const isRandomDdos = Math.random() < DDOS_CHANCE;

				let ddosTraffic = 0;
				if (isBotnetEvent) {
					ddosTraffic =
						trafficEnteringSystem * (activeEvent?.effectValue || 3.0);
				} else if (isRandomDdos) {
					ddosTraffic = trafficEnteringSystem * (2 + Math.random() * 2);
				}

				const totalProcessing = trafficEnteringSystem + ddosTraffic;
				const maliciousLoad =
					totalProcessing * trafficWeights.MALICIOUS + ddosTraffic;
				const legitimateLoad = totalProcessing - maliciousLoad;

				// 5. Security (WAF)
				const modeStats = FIREWALL_MODE_STATS[stateWithEvent.firewallMode];
				const taskBonus = patchSecurityActive ? 0.2 : 0;
				const wafCapacity = stateWithEvent.firewall.effectiveness;
				// WAF fails if load > capacity
				const wafOverload = totalProcessing > wafCapacity;

				let blockRate = 0.8 + modeStats.bonus + taskBonus;
				if (wafOverload) blockRate *= 0.4; // Severe penalty for WAF overload
				blockRate = Math.min(0.99, blockRate);

				const blockedMalicious = maliciousLoad * blockRate;
				const leakedMalicious = maliciousLoad - blockedMalicious;
				const falsePositives = legitimateLoad * modeStats.falsePositive;

				const trafficPassingWaf = legitimateLoad - falsePositives;

				// --- FIXED DISTRIBUTION LOGIC ---
				// Weights in constants sum to 1.0 including MALICIOUS.
				// We must normalize legit weights to sum to 1.0 relative to LEGIT traffic.
				const legitWeightSum =
					trafficWeights.STATIC +
					trafficWeights.READ +
					trafficWeights.WRITE +
					trafficWeights.UPLOAD +
					trafficWeights.SEARCH;
				const norm = legitWeightSum > 0 ? 1.0 / legitWeightSum : 1;

				const staticLoad = trafficPassingWaf * (trafficWeights.STATIC * norm);
				const readLoad = trafficPassingWaf * (trafficWeights.READ * norm);
				const writeLoad = trafficPassingWaf * (trafficWeights.WRITE * norm);
				const searchLoad = trafficPassingWaf * (trafficWeights.SEARCH * norm);
				const uploadLoad = trafficPassingWaf * (trafficWeights.UPLOAD * norm);

				// 6. CDN
				let cdnCapacity = stateWithEvent.cdn.effectiveness;
				if (flushCacheActive) cdnCapacity *= 1.5;

				const staticServedByCdn = Math.min(staticLoad, cdnCapacity);
				const staticOverflow = staticLoad - staticServedByCdn;
				const cdnUtilization =
					staticLoad > 0 ? staticServedByCdn / cdnCapacity : 0;

				// 7. Layer Demands
				const cacheEffectiveness =
					stateWithEvent.memoryCache.level > 0
						? stateWithEvent.memoryCache.effectiveness
						: 0;
				const readDemand = readLoad * (1 - cacheEffectiveness);
				const searchDemand = searchLoad * (1 - cacheEffectiveness);

				const appDemand =
					staticOverflow +
					readLoad +
					writeLoad +
					searchLoad +
					uploadLoad +
					leakedMalicious;
				const workerDemand = uploadLoad * LOAD_WEIGHTS.UPLOAD + writeLoad * 0.5;

				let dbDemand =
					readDemand * LOAD_WEIGHTS.READ +
					writeLoad * LOAD_WEIGHTS.WRITE +
					searchDemand * LOAD_WEIGHTS.SEARCH;
				if (optimizeDbActive) dbDemand *= 0.6;

				// 8. Stats Calculation
				const appNodes = stateWithEvent.nodes.filter(
					(n) => n.type === NodeType.APP,
				);
				const workerNodes = stateWithEvent.nodes.filter(
					(n) => n.type === NodeType.WORKER,
				);
				const dbNodes = stateWithEvent.nodes.filter(
					(n) => n.type === NodeType.DB,
				);

				const queueCapacity =
					stateWithEvent.messageQueue.level > 0
						? stateWithEvent.messageQueue.effectiveness
						: 0;

				const workerStats = calculateLayerStats(
					workerDemand,
					workerNodes,
					1.0,
					queueCapacity,
				);
				const appStats = calculateLayerStats(appDemand, appNodes);
				const dbStats = calculateLayerStats(
					dbDemand,
					dbNodes,
					stateWithEvent.databaseTech.effectiveness,
				);

				// 9. Success Rates
				const staticSuccessRate = appStats.successRate;
				const dataSuccessRate = Math.min(
					appStats.successRate,
					dbStats.successRate,
				);
				const computeSuccessRate = Math.min(
					appStats.successRate,
					workerStats.successRate,
					dbStats.successRate,
				);

				const processedStatic =
					staticServedByCdn + staticOverflow * staticSuccessRate;
				const processedRead = readLoad * dataSuccessRate;
				const processedSearch = searchLoad * dataSuccessRate;
				const processedWrite = writeLoad * computeSuccessRate;
				const processedUpload = uploadLoad * computeSuccessRate;
				const leakedProcessed = leakedMalicious * appStats.successRate;

				const totalProcessedLegit =
					processedStatic +
					processedRead +
					processedWrite +
					processedUpload +
					processedSearch;
				const processedTotal = totalProcessedLegit + leakedProcessed;

				// Total Drop Calculation
				// rawRPS = what the world sent.
				// processedTotal = what we handled.
				// blockedMalicious = what we intentionally dropped.
				// The rest is unintentional drops.
				const droppedTotal = Math.max(
					0,
					rawRPS + ddosTraffic - processedTotal - blockedMalicious,
				);

				// Critical: Drop Penalty now includes LB drops
				const droppedLegitNodeFailure =
					Math.max(0, trafficPassingWaf - totalProcessedLegit) + droppedByALB;

				// 10. Economics & Upkeep
				const upkeepProgress = Math.min(
					tickCount / UPKEEP_SCALING_CONFIG.TIME_TO_MAX_SECONDS,
					1.0,
				);
				const timeMultiplier =
					UPKEEP_SCALING_CONFIG.BASE_MULT +
					(UPKEEP_SCALING_CONFIG.MAX_MULT - UPKEEP_SCALING_CONFIG.BASE_MULT) *
						upkeepProgress;

				// Component Upkeep Tax (1% of component value per tick)
				const componentValue =
					stateWithEvent.loadBalancer.cost +
					stateWithEvent.databaseTech.cost +
					stateWithEvent.firewall.cost +
					stateWithEvent.cdn.cost +
					(stateWithEvent.memoryCache.level > 0
						? stateWithEvent.memoryCache.cost
						: 0) +
					(stateWithEvent.messageQueue.level > 0
						? stateWithEvent.messageQueue.cost
						: 0);
				const componentUpkeep = componentValue * 0.001;

				// Node Upkeep + Overhead (Administrative Cost per Node)
				const nodesUpkeep = stateWithEvent.nodes.reduce((acc, n) => {
					const typeMult = NODE_TYPE_STATS[n.type].costMult;
					return acc + NODE_TIERS[n.tier].upkeep * typeMult + NODE_ADMIN_COST;
				}, 0);

				const totalUpkeep = (componentUpkeep + nodesUpkeep) * timeMultiplier;

				const revenue =
					processedStatic * REVENUE_RATES.STATIC +
					processedRead * REVENUE_RATES.READ +
					processedWrite * REVENUE_RATES.WRITE +
					processedUpload * REVENUE_RATES.UPLOAD +
					processedSearch * REVENUE_RATES.SEARCH +
					blockedMalicious * REVENUE_RATES.BLOCKED_MALICIOUS;

				const profit = revenue - totalUpkeep;

				// 11. Reputation (NORMALIZED)
				const totalLegitDemand = totalProcessedLegit + droppedLegitNodeFailure;
				let netRepChange = 0;

				if (totalLegitDemand > 0) {
					const successRate = totalProcessedLegit / totalLegitDemand;
					const dropRate = droppedLegitNodeFailure / totalLegitDemand;

					// Base gain vs failure penalty (percentage based)
					netRepChange += successRate * REPUTATION_RATES.GAIN_PER_TICK;
					netRepChange -= dropRate * REPUTATION_RATES.LOSS_PER_TICK;
				}

				// Malicious Leak Penalty (Percentage based)
				const totalTraffic = totalLegitDemand + maliciousLoad;
				if (totalTraffic > 0 && leakedMalicious > 0) {
					const leakRate = leakedMalicious / totalTraffic;
					netRepChange -= leakRate * REPUTATION_RATES.MALICIOUS_PENALTY;
				}

				const newReputation = Math.max(
					0,
					Math.min(100, stateWithEvent.reputation + netRepChange),
				);
				const newBudget = stateWithEvent.budget + profit;

				// 12. Health Decay
				const newNodes = stateWithEvent.nodes.map((node) => {
					if (node.status === NodeStatus.CRASHED) return node;

					let utilization = 0;
					if (node.type === NodeType.APP) utilization = appStats.utilization;
					if (node.type === NodeType.WORKER)
						utilization = workerStats.utilization;
					if (node.type === NodeType.DB) utilization = dbStats.utilization;

					let decay = NODE_DECAY_RATE;

					if (utilization > 0.95) {
						decay = NODE_OVERLOAD_DECAY * Math.pow(utilization, 2);
					} else if (utilization > 0.6) {
						decay = NODE_DECAY_RATE * 1.5;
					}

					if (activeEvent?.type === "COOLING_FAILURE")
						decay *= activeEvent.effectValue;

					const newHealth = node.health - decay;
					if (newHealth <= 0) {
						return { ...node, health: 0, status: NodeStatus.CRASHED };
					}
					return { ...node, health: newHealth };
				});

				const isGameOver = newReputation <= 0 || newBudget <= -1000;

				return {
					...stateWithEvent,
					tickCount,
					activeTrafficPattern,
					tasks: updatedTasks,
					budget: newBudget,
					reputation: newReputation,
					upkeepCost: totalUpkeep,
					nodes: newNodes,
					currentTraffic: rawRPS + ddosTraffic, // Show full attempted traffic
					processedTraffic: processedTotal,
					droppedTraffic: droppedTotal,
					maliciousTraffic: maliciousLoad,
					blockedMalicious: blockedMalicious,
					appLoad: Math.min(100, appStats.utilization * 100),
					workerLoad: Math.min(100, workerStats.utilization * 100),
					dbLoad: Math.min(100, dbStats.utilization * 100),
					cdnLoad: Math.min(100, cdnUtilization * 100),
					isGameOver,
					isPlaying: !isGameOver,
				};
			} catch (e) {
				console.error("Tick error:", e);
				return current;
			}
		});
	}, []);

	useEffect(() => {
		let interval: number;
		if (gameState.isPlaying && !gameState.isPaused && !gameState.isGameOver) {
			interval = window.setInterval(tick, GAME_TICK_RATE_MS);
		}
		return () => window.clearInterval(interval);
	}, [gameState.isPlaying, gameState.isPaused, gameState.isGameOver, tick]);

	// Logging & Charts
	useEffect(() => {
		if (gameState.isPaused) return;

		if (gameState.appLoad > 90)
			addLog(
				`App Servers Overloaded (${gameState.appLoad.toFixed(0)}%)`,
				"warning",
			);
		if (gameState.workerLoad > 90)
			addLog(
				`Workers Overloaded (${gameState.workerLoad.toFixed(0)}%)`,
				"warning",
			);
		if (gameState.dbLoad > 90)
			addLog(`DB Overloaded (${gameState.dbLoad.toFixed(0)}%)`, "warning");
		if (
			gameState.droppedTraffic > 0 &&
			gameState.droppedTraffic > gameState.processedTraffic * 0.1
		) {
			addLog(
				`Dropping ${Math.round(gameState.droppedTraffic)} reqs/s!`,
				"error",
			);
		}

		const newPoint: ChartDataPoint = {
			time: new Date().toLocaleTimeString(),
			legitimate: Math.round(
				gameState.currentTraffic - gameState.maliciousTraffic,
			),
			malicious: Math.round(gameState.maliciousTraffic),
			processed: Math.round(gameState.processedTraffic),
		};
		setChartData((prev) => [...prev, newPoint].slice(-MAX_CHART_POINTS));
	}, [gameState.tickCount]);

	return {
		gameState,
		logs,
		chartData,
		buyNode,
		repairNode,
		repairAllNodes,
		upgradeComponent,
		upgradeNode,
		setFirewallMode,
		activateTask,
		restartGame,
		togglePause,
	};
};
