import {
	Activity,
	AlertTriangle,
	ArrowUpCircle,
	Cpu,
	Database,
	DollarSign,
	Globe,
	Hammer,
	HardDrive,
	Heart,
	Layers,
	MessageSquare,
	Pause,
	Play,
	RotateCw,
	Server,
	Shield,
	TrendingUp,
	Wrench,
	Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	FIREWALL_MODE_STATS,
	NODE_TIERS,
	NODE_TYPE_STATS,
	TIER_REPAIR_COSTS,
	TRAFFIC_PATTERNS,
	UPKEEP_SCALING_CONFIG,
} from "../constants";
import {
	type ChartDataPoint,
	ComponentType,
	FirewallMode,
	type GameEvent,
	type GameState,
	type LogEntry,
	NodeStatus,
	NodeTier,
	NodeType,
} from "../types";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

interface GameDashboardProps {
	gameState: GameState;
	logs: LogEntry[];
	chartData: ChartDataPoint[];
	onBuyNode: (type: NodeType) => void;
	onRepairNode: (id: string) => void;
	onUpgradeComponent: (type: ComponentType) => void;
	onTogglePause: () => void;
	onRestart: () => void;
	setFirewallMode?: (mode: FirewallMode) => void;
	activateTask?: (taskId: string) => void;
	repairAllNodes?: () => void;
	upgradeNode?: (id: string) => void; // New prop
}

export const GameDashboard: React.FC<GameDashboardProps> = ({
	gameState,
	logs,
	chartData,
	onBuyNode,
	onRepairNode,
	onUpgradeComponent,
	onTogglePause,
	onRestart,
	setFirewallMode,
	activateTask,
	repairAllNodes,
	upgradeNode,
}) => {
	const logContainerRef = useRef<HTMLDivElement>(null);
	const [selectedNodeType, setSelectedNodeType] = useState<NodeType>(
		NodeType.APP,
	);

	useEffect(() => {
		if (logContainerRef.current) {
			logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
		}
	}, [logs]);

	const getHealthColor = (health: number) => {
		if (health > 70) return "bg-emerald-500";
		if (health > 30) return "bg-yellow-500";
		return "bg-red-500";
	};

	const getLoadColor = (load: number) => {
		if (load < 50) return "text-emerald-400";
		if (load < 80) return "text-yellow-400";
		return "text-red-500 animate-pulse";
	};

	const getEventColor = (type: GameEvent["type"]) => {
		switch (type) {
			case "TRAFFIC_SPIKE":
				return "bg-blue-600 border-blue-400";
			case "BOTNET":
				return "bg-red-600 border-red-400";
			case "COOLING_FAILURE":
				return "bg-orange-600 border-orange-400";
			case "FIBER_CUT":
				return "bg-slate-600 border-slate-400";
			case "INVESTOR_FUNDING":
				return "bg-emerald-600 border-emerald-400";
			default:
				return "bg-indigo-600 border-indigo-400";
		}
	};

	const getNodeIcon = (type: NodeType, className: string = "w-4 h-4") => {
		switch (type) {
			case NodeType.APP:
				return <Server className={className} />;
			case NodeType.WORKER:
				return <Cpu className={className} />;
			case NodeType.DB:
				return <Database className={className} />;
			default:
				return <Server className={className} />;
		}
	};

	// Calculate scaling for display
	const upkeepProgress = Math.min(
		gameState.tickCount / UPKEEP_SCALING_CONFIG.TIME_TO_MAX_SECONDS,
		1.0,
	);
	const upkeepMult =
		UPKEEP_SCALING_CONFIG.BASE_MULT +
		(UPKEEP_SCALING_CONFIG.MAX_MULT - UPKEEP_SCALING_CONFIG.BASE_MULT) *
			upkeepProgress;
	const trafficMult = 1 + Math.floor(gameState.tickCount / 120) * 0.2;

	const patternName = TRAFFIC_PATTERNS[gameState.activeTrafficPattern].name;

	// Calculate Repair All cost
	const repairAllCost = gameState.nodes.reduce((acc, n) => {
		const baseCost = TIER_REPAIR_COSTS[n.tier];
		if (n.health < 100 && n.status !== NodeStatus.CRASHED)
			return acc + baseCost;
		if (n.status === NodeStatus.CRASHED) return acc + baseCost * 2;
		return acc;
	}, 0);

	// Calculate Drop Percentage
	const dropPercentage =
		gameState.currentTraffic > 0
			? (gameState.droppedTraffic / gameState.currentTraffic) * 100
			: 0;

	// Filter nodes for the selected tab
	const filteredNodes = gameState.nodes.filter(
		(n) => n.type === selectedNodeType,
	);
	const totalCapacity = filteredNodes.reduce((acc, n) => acc + n.capacity, 0);

	return (
		<div className="h-screen w-full bg-slate-950 text-slate-200 overflow-hidden flex flex-col font-sans">
			{/* Event Banner */}
			{gameState.activeEvent && (
				<div
					className={`w-full py-1 px-4 flex items-center justify-center gap-3 text-white font-bold text-sm animate-pulse border-b ${getEventColor(gameState.activeEvent.type)}`}
				>
					<AlertTriangle className="w-4 h-4" />
					<span>EVENT: {gameState.activeEvent.name}</span>
					<span className="font-normal opacity-90">
						- {gameState.activeEvent.description}
					</span>
				</div>
			)}

			{/* Top Status Bar */}
			<header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10">
				<div className="flex items-center gap-3">
					<div className="bg-blue-600 p-2 rounded-lg">
						<Activity className="w-6 h-6 text-white" />
					</div>
					<div>
						<h1 className="font-bold text-lg leading-tight">Cloud Architect</h1>
						<div className="text-xs text-slate-400 font-mono flex items-center gap-2">
							Sim v2.5 // Ticks: {gameState.tickCount}
							<span className="bg-slate-800 px-1.5 rounded text-blue-300 border border-slate-700 flex items-center gap-1">
								<TrendingUp className="w-3 h-3" /> {patternName}
							</span>
						</div>
					</div>
				</div>

				<div className="flex items-center gap-6">
					<div className="flex flex-col items-end">
						<div className="flex items-center gap-2">
							<DollarSign className="text-emerald-400 w-4 h-4" />
							<span
								className={`text-xl font-mono font-bold ${gameState.budget < 0 ? "text-red-500" : "text-emerald-400"}`}
							>
								${gameState.budget.toFixed(2)}
							</span>
						</div>
						<div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
							<span>Upkeep: -${gameState.upkeepCost.toFixed(2)}/s</span>
							{upkeepMult > 1.1 && (
								<span className="text-orange-400 text-[10px]">
									(×{upkeepMult.toFixed(1)})
								</span>
							)}
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Heart className="text-rose-400 w-5 h-5" />
						<div className="flex flex-col">
							<span className="text-sm text-slate-400 uppercase text-[10px] font-bold tracking-wider">
								Reputation
							</span>
							<span
								className={`text-lg font-mono font-bold ${gameState.reputation < 30 ? "text-red-500" : "text-white"}`}
							>
								{gameState.reputation.toFixed(1)}%
							</span>
						</div>
					</div>

					<div className="h-8 w-px bg-slate-700 mx-2"></div>
					<Button
						variant="neutral"
						size="sm"
						onClick={onTogglePause}
						disabled={gameState.isGameOver}
					>
						{gameState.isPaused ? (
							<Play className="w-4 h-4 mr-1" />
						) : (
							<Pause className="w-4 h-4 mr-1" />
						)}
						{gameState.isPaused ? "Resume" : "Pause"}
					</Button>
				</div>
			</header>

			{/* Main Content Grid */}
			<main className="flex-1 p-4 grid grid-cols-12 grid-rows-12 gap-4 overflow-hidden">
				{/* Left Col: Infrastructure Management */}
				<Card
					title={`Infrastructure (${gameState.nodes.length})`}
					className="col-span-12 lg:col-span-3 row-span-8"
					headerAction={
						repairAllCost > 0 && repairAllNodes ? (
							<Button
								variant="neutral"
								size="sm"
								onClick={repairAllNodes}
								className="text-[10px] h-6 px-2 flex items-center gap-1"
							>
								<Wrench className="w-3 h-3 text-amber-400" /> Fix All ($
								{repairAllCost})
							</Button>
						) : null
					}
					noPadding
				>
					{/* Node Type Selector Tabs */}
					<div className="flex border-b border-slate-700">
						{Object.values(NodeType).map((type) => (
							<button
								key={type}
								onClick={() => setSelectedNodeType(type)}
								className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 border-b-2 transition-colors
                        ${
													selectedNodeType === type
														? "border-blue-500 bg-slate-800 text-blue-400"
														: "border-transparent text-slate-500 hover:text-slate-300"
												}
                    `}
							>
								{getNodeIcon(type)}
								{type}
							</button>
						))}
					</div>

					{/* Quick Stats for Selected Type */}
					<div className="px-4 py-2 border-b border-slate-700 bg-slate-800/50 flex justify-between text-xs font-mono">
						<span>
							Load:
							<b
								className={getLoadColor(
									selectedNodeType === NodeType.APP
										? gameState.appLoad
										: selectedNodeType === NodeType.WORKER
											? gameState.workerLoad
											: gameState.dbLoad,
								)}
							>
								{selectedNodeType === NodeType.APP
									? gameState.appLoad.toFixed(0)
									: selectedNodeType === NodeType.WORKER
										? gameState.workerLoad.toFixed(0)
										: gameState.dbLoad.toFixed(0)}
								%
							</b>
						</span>
						<span className="text-slate-400">
							{NODE_TYPE_STATS[selectedNodeType].name}s
						</span>
					</div>

					{/* Buy Button (Restricted to T1) */}
					<div className="p-3 border-b border-slate-700">
						{(() => {
							const tier = NodeTier.T1;
							const stats = NODE_TYPE_STATS[selectedNodeType];
							const cost = Math.round(NODE_TIERS[tier].cost * stats.costMult);
							const capacity = Math.round(
								NODE_TIERS[tier].capacity * stats.capMult,
							);

							return (
								<button
									onClick={() => onBuyNode(selectedNodeType)}
									disabled={gameState.budget < cost}
									className="w-full flex items-center justify-between p-3 rounded bg-blue-600 hover:bg-blue-500 hover:cursor-pointer disabled:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
								>
									<div className="flex flex-col items-start">
										<span className="text-sm font-bold text-white flex items-center gap-2">
											Deploy New {stats.name}
										</span>
										<span className="text-[10px] text-blue-100 opacity-80">
											Tier 1 • {capacity} RPS Capacity
										</span>
									</div>
									<span className="text-lg font-mono font-bold text-white">
										${cost}
									</span>
								</button>
							);
						})()}
					</div>

					{/* Node List */}
					<div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2">
						{filteredNodes.map((node) => {
							// Determine upgrade cost
							let nextTier: NodeTier | null = null;
							if (node.tier === NodeTier.T1) nextTier = NodeTier.T2;
							else if (node.tier === NodeTier.T2) nextTier = NodeTier.T3;

							let upgradeCost = 0;
							if (nextTier) {
								upgradeCost = Math.round(
									NODE_TIERS[nextTier].cost *
										NODE_TYPE_STATS[node.type].costMult,
								);
							}

							// Determine repair cost
							const repairCost =
								TIER_REPAIR_COSTS[node.tier] *
								(node.status === NodeStatus.CRASHED ? 2 : 1);

							return (
								<div
									key={node.id}
									className={`p-3 rounded border ${node.status === NodeStatus.CRASHED ? "bg-red-900/10 border-red-900/50" : "bg-slate-700/50 border-slate-600"} flex justify-between items-center transition-all`}
									title={`Tier: ${node.tier}\nCapacity: ${Math.round(node.capacity)} RPS`}
								>
									<div className="flex items-center gap-3">
										<div className="relative">
											{getNodeIcon(
												node.type,
												`w-8 h-8 ${node.status === NodeStatus.ONLINE ? "text-slate-200" : "text-red-400"}`,
											)}
											{node.status === NodeStatus.ONLINE && (
												<span className="absolute -bottom-1 -right-1 flex h-3 w-3">
													<span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
												</span>
											)}
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className="text-xs font-mono text-slate-300 truncate max-w-[80px]">
													{node.name}
												</span>
												<span className="text-[9px] bg-slate-800 px-1 rounded text-slate-500 border border-slate-700">
													{node.tier}
												</span>
											</div>
											<div className="w-20 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
												<div
													className={`h-full ${getHealthColor(node.health)} transition-all duration-300`}
													style={{ width: `${node.health}%` }}
												/>
											</div>
										</div>
									</div>

									<div className="flex items-center gap-1">
										{/* Upgrade Button */}
										{nextTier && upgradeNode && (
											<button
												onClick={() => upgradeNode(node.id)}
												disabled={gameState.budget < upgradeCost}
												className="p-1.5 hover:bg-slate-600 rounded text-cyan-400 disabled:opacity-30 transition-colors flex flex-col items-center hover:cursor-pointer"
												title={`Upgrade to ${nextTier} ($${upgradeCost})`}
											>
												<ArrowUpCircle className="w-4 h-4" />
												<span className="text-[9px]">${upgradeCost}</span>
											</button>
										)}

										{/* Repair Button */}
										{node.health < 100 &&
											node.status !== NodeStatus.CRASHED && (
												<button
													onClick={() => onRepairNode(node.id)}
													className="p-1.5 hover:bg-slate-600 rounded text-amber-400 transition-colors hover:cursor-pointer"
													title={`Repair ($${repairCost})`}
													disabled={gameState.budget < repairCost}
												>
													<Hammer className="w-4 h-4" />
												</button>
											)}
										{node.status === NodeStatus.CRASHED && (
											<button
												onClick={() => onRepairNode(node.id)}
												className="p-1.5 hover:bg-slate-600 rounded text-red-400 transition-colors flex flex-col items-center hover:cursor-pointer"
												title={`Reboot ($${repairCost})`}
											>
												<RotateCw className="w-4 h-4" />
												<span className="text-[10px] mt-0.5">
													${repairCost}
												</span>
											</button>
										)}
									</div>
								</div>
							);
						})}
						{filteredNodes.length === 0 && (
							<div className="text-center text-slate-500 py-10 italic text-xs">
								No active {NODE_TYPE_STATS[selectedNodeType].name}s.
							</div>
						)}
					</div>

					{/* Summary Footer */}
					<div className="p-2 bg-slate-900/50 border-t border-slate-700 flex justify-between items-center text-[10px] font-mono text-slate-400 px-4">
						<span>
							Total Nodes:{" "}
							<span className="text-white font-bold">
								{filteredNodes.length}
							</span>
						</span>
						<span>
							Total Capacity:{" "}
							<span className="text-blue-400 font-bold">
								{Math.round(totalCapacity)}
							</span>{" "}
							RPS
						</span>
					</div>
				</Card>

				{/* Center: Traffic & Architecture */}
				<Card
					title="Traffic & Load Analysis"
					className="col-span-12 lg:col-span-6 row-span-8 relative"
				>
					{/* Load Breakdown Bar */}
					<div className="absolute top-0 left-0 right-0 h-1 flex">
						<div
							className="bg-blue-500 transition-all duration-500"
							style={{ width: `${Math.min(100, gameState.appLoad / 3)}%` }}
						></div>
						<div
							className="bg-purple-500 transition-all duration-500"
							style={{ width: `${Math.min(100, gameState.workerLoad / 3)}%` }}
						></div>
						<div
							className="bg-cyan-500 transition-all duration-500"
							style={{ width: `${Math.min(100, gameState.dbLoad / 3)}%` }}
						></div>
					</div>

					<div className="absolute top-4 right-4 flex gap-4 text-xs font-mono bg-slate-900/80 p-2 rounded border border-slate-700 z-10">
						<div className="flex items-center gap-1">
							<div className="w-2 h-2 rounded-full bg-blue-500"></div>Legit
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2 h-2 rounded-full bg-red-500"></div>Malicious
						</div>
						<div className="flex items-center gap-1">
							<div className="w-2 h-2 rounded-full bg-emerald-500"></div>
							Processed
						</div>
					</div>

					<div className="h-full w-full pt-4">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart data={chartData}>
								<defs>
									<linearGradient id="colorLegit" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
									</linearGradient>
									<linearGradient
										id="colorMalicious"
										x1="0"
										y1="0"
										x2="0"
										y2="1"
									>
										<stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#1e293b"
									vertical={false}
								/>
								<XAxis dataKey="time" hide />
								<YAxis
									stroke="#475569"
									fontSize={12}
									tickFormatter={(val) =>
										val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val
									}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "#0f172a",
										borderColor: "#1e293b",
										color: "#f1f5f9",
									}}
									itemStyle={{ fontSize: "12px" }}
								/>
								<Area
									type="monotone"
									dataKey="malicious"
									stackId="1"
									stroke="#ef4444"
									fill="url(#colorMalicious)"
									animationDuration={300}
								/>
								<Area
									type="monotone"
									dataKey="legitimate"
									stackId="2"
									stroke="#3b82f6"
									fill="url(#colorLegit)"
									animationDuration={300}
								/>
								<Area
									type="step"
									dataKey="processed"
									stroke="#10b981"
									fill="none"
									strokeWidth={2}
									dot={false}
									animationDuration={300}
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>

					{/* Realtime Metrics Overlay */}
					<div className="absolute top-14 left-6 pointer-events-none opacity-80 space-y-4">
						<div>
							<div className="text-xs text-slate-400 flex items-center gap-2">
								Total Traffic
								{trafficMult > 1 && (
									<span className="bg-blue-600 text-white px-1 rounded text-[10px] font-bold">
										SURGE ×{trafficMult.toFixed(1)}
									</span>
								)}
							</div>
							<div className="text-2xl font-mono text-white font-bold">
								{Math.round(gameState.currentTraffic)}{" "}
								<span className="text-sm text-slate-500">req/s</span>
							</div>
						</div>

						{/* Architecture Health Status */}
						<div className="grid grid-cols-2 gap-x-8 gap-y-2 pointer-events-auto">
							<div className="flex flex-col">
								<span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
									<Server className="w-3 h-3" /> App Load
								</span>
								<span
									className={`text-lg font-mono font-bold ${getLoadColor(gameState.appLoad)}`}
								>
									{gameState.appLoad.toFixed(0)}%
								</span>
							</div>
							<div className="flex flex-col">
								<span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
									<Cpu className="w-3 h-3" /> Worker Load
								</span>
								<span
									className={`text-lg font-mono font-bold ${getLoadColor(gameState.workerLoad)}`}
								>
									{gameState.workerLoad.toFixed(0)}%
								</span>
							</div>
							<div className="flex flex-col">
								<span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
									<Database className="w-3 h-3" /> DB Load
								</span>
								<span
									className={`text-lg font-mono font-bold ${getLoadColor(gameState.dbLoad)}`}
								>
									{gameState.dbLoad.toFixed(0)}%
								</span>
							</div>
							<div className="flex flex-col">
								<span className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
									<Globe className="w-3 h-3" /> CDN Load
								</span>
								<span
									className={`text-lg font-mono font-bold ${getLoadColor(gameState.cdnLoad)}`}
								>
									{gameState.cdnLoad.toFixed(0)}%
								</span>
							</div>
						</div>
					</div>

					{/* Load Warning Labels - Updated for % and Threshold */}
					{dropPercentage > 30 && (
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 border border-slate-600 p-4 rounded text-center z-20">
							<div className="text-xs text-slate-400 uppercase">
								Dropping Requests
							</div>
							<div className="text-2xl font-bold text-red-500 font-mono">
								{Math.round(dropPercentage)}%
							</div>
							<div className="text-[10px] text-slate-500">
								({Math.round(gameState.droppedTraffic)}/s)
							</div>
							<div className="text-[10px] text-slate-500 mt-1">
								Check Capacity
							</div>
						</div>
					)}
				</Card>

				{/* Right Col: Components & Tasks */}
				<Card
					title="System Components"
					className="col-span-12 lg:col-span-3 row-span-8"
				>
					<div className="flex flex-col gap-3 h-full overflow-y-auto pr-2 pb-2">
						{/* Load Balancer */}
						<div className="bg-slate-700/30 border border-slate-700 p-2.5 rounded-lg">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
									<Layers className="w-3 h-3" /> ALB Lvl{" "}
									{gameState.loadBalancer.level}
								</span>
								<Button
									size="sm"
									variant="neutral"
									className="text-[10px] h-5 px-1.5"
									onClick={() =>
										onUpgradeComponent(ComponentType.LOAD_BALANCER)
									}
									disabled={gameState.budget < gameState.loadBalancer.cost}
								>
									Up ${Math.round(gameState.loadBalancer.cost)}
								</Button>
							</div>
							<div className="text-[9px] text-slate-400">
								{gameState.loadBalancer.description}
							</div>
						</div>

						{/* Database Tech */}
						<div className="bg-slate-700/30 border border-slate-700 p-2.5 rounded-lg">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-bold text-cyan-300 flex items-center gap-1">
									<HardDrive className="w-3 h-3" /> DB Tech Lvl{" "}
									{gameState.databaseTech.level}
								</span>
								<Button
									size="sm"
									variant="neutral"
									className="text-[10px] h-5 px-1.5"
									onClick={() =>
										onUpgradeComponent(ComponentType.DATABASE_TECH)
									}
									disabled={gameState.budget < gameState.databaseTech.cost}
								>
									Up ${Math.round(gameState.databaseTech.cost)}
								</Button>
							</div>
							<div className="text-[9px] text-slate-400 truncate max-w-[150px]">
								{gameState.databaseTech.description}
							</div>
						</div>

						{/* Cache Component (New) */}
						<div className="bg-slate-700/30 border border-slate-700 p-2.5 rounded-lg">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-bold text-purple-300 flex items-center gap-1">
									<Zap className="w-3 h-3" /> Cache Lvl{" "}
									{gameState.memoryCache.level}
								</span>
								<Button
									size="sm"
									variant="neutral"
									className="text-[10px] h-5 px-1.5"
									onClick={() => onUpgradeComponent(ComponentType.CACHE)}
									disabled={gameState.budget < gameState.memoryCache.cost}
								>
									{gameState.memoryCache.level === 0 ? "Buy" : "Up"} $
									{Math.round(gameState.memoryCache.cost)}
								</Button>
							</div>
							<div className="text-[9px] text-slate-400 truncate max-w-[150px]">
								{gameState.memoryCache.description}
							</div>
						</div>

						{/* Queue Component (New) */}
						<div className="bg-slate-700/30 border border-slate-700 p-2.5 rounded-lg">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-bold text-orange-300 flex items-center gap-1">
									<MessageSquare className="w-3 h-3" /> Queue Lvl{" "}
									{gameState.messageQueue.level}
								</span>
								<Button
									size="sm"
									variant="neutral"
									className="text-[10px] h-5 px-1.5"
									onClick={() => onUpgradeComponent(ComponentType.QUEUE)}
									disabled={gameState.budget < gameState.messageQueue.cost}
								>
									{gameState.messageQueue.level === 0 ? "Buy" : "Up"} $
									{Math.round(gameState.messageQueue.cost)}
								</Button>
							</div>
							<div className="text-[9px] text-slate-400 truncate max-w-[150px]">
								{gameState.messageQueue.description}
							</div>
						</div>

						{/* CDN */}
						<div className="bg-slate-700/30 border border-slate-700 p-2.5 rounded-lg">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-bold text-blue-300 flex items-center gap-1">
									<Globe className="w-3 h-3" /> CDN Lvl {gameState.cdn.level}
								</span>
								<Button
									size="sm"
									variant="neutral"
									className="text-[10px] h-5 px-1.5"
									onClick={() => onUpgradeComponent(ComponentType.CDN)}
									disabled={gameState.budget < gameState.cdn.cost}
								>
									Up ${Math.round(gameState.cdn.cost)}
								</Button>
							</div>
							<div className="text-[9px] text-slate-400 truncate max-w-[150px]">
								{gameState.cdn.description}
							</div>
						</div>

						{/* Firewall */}
						<div className="bg-slate-700/30 border border-slate-700 p-2.5 rounded-lg">
							<div className="flex items-center justify-between mb-1">
								<span className="text-xs font-bold text-rose-300 flex items-center gap-1">
									<Shield className="w-3 h-3" /> WAF Lvl{" "}
									{gameState.firewall.level}
								</span>
								<Button
									size="sm"
									variant="neutral"
									className="text-[10px] h-5 px-1.5"
									onClick={() => onUpgradeComponent(ComponentType.FIREWALL)}
									disabled={gameState.budget < gameState.firewall.cost}
								>
									Up ${Math.round(gameState.firewall.cost)}
								</Button>
							</div>

							{/* Firewall Mode Selectors */}
							{setFirewallMode && (
								<div className="grid grid-cols-3 gap-1 my-1.5">
									{(Object.keys(FIREWALL_MODE_STATS) as FirewallMode[]).map(
										(mode) => (
											<button
												key={mode}
												onClick={() => setFirewallMode(mode)}
												className={`
                            px-0.5 py-1 text-[8px] uppercase font-bold rounded border transition-all hover:cursor-pointer
                            ${
															gameState.firewallMode === mode
																? "bg-rose-600 border-rose-500 text-white shadow-[0_0_8px_rgba(225,29,72,0.5)]"
																: "bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700"
														}
                          `}
											>
												{FIREWALL_MODE_STATS[mode].name}
											</button>
										),
									)}
								</div>
							)}
						</div>

						{/* System Operations (Tasks) */}
						<div className="mt-2 border-t border-slate-700 pt-2">
							<h4 className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
								System Ops
							</h4>
							<div className="space-y-1.5">
								{gameState.tasks.map((task) => {
									const now = Date.now();
									const isOnCooldown =
										now - task.lastUsed < task.cooldown && task.lastUsed !== 0;
									const remainingCooldown = Math.max(
										0,
										task.cooldown - (now - task.lastUsed),
									);

									return (
										<button
											key={task.id}
											onClick={() => activateTask && activateTask(task.id)}
											disabled={isOnCooldown || task.isActive}
											className={`
                          w-full p-2 rounded flex items-center justify-between text-left border transition-all hover:cursor-pointer
                          ${
														task.isActive
															? "bg-emerald-900/50 border-emerald-500 text-emerald-200"
															: isOnCooldown
																? "bg-slate-800/50 border-slate-800 text-slate-600 cursor-not-allowed"
																: "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600 hover:border-slate-500"
													}
                        `}
										>
											<div>
												<div className="text-[10px] font-bold">{task.name}</div>
												<div className="text-[8px] opacity-70 hidden sm:block">
													{task.description}
												</div>
											</div>
											<div className="text-[10px] font-mono w-10 text-right">
												{task.isActive
													? "ACT"
													: isOnCooldown
														? `${(remainingCooldown / 1000).toFixed(0)}s`
														: "RDY"}
											</div>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</Card>

				{/* Bottom: System Logs (Expanded) */}
				<Card
					title="System Logs"
					className="col-span-12 row-span-4 bg-black/40"
				>
					<div
						ref={logContainerRef}
						className="h-full overflow-y-auto font-mono text-xs space-y-1 p-2"
					>
						{logs.length === 0 && (
							<span className="text-slate-600">Waiting for system logs...</span>
						)}
						{logs.map((log) => (
							<div
								key={log.id}
								className="flex gap-3 border-b border-slate-800/30 pb-0.5"
							>
								<span className="text-slate-500">
									[{new Date(log.timestamp).toLocaleTimeString().split(" ")[0]}]
								</span>
								<span
									className={`
                    ${log.type === "error" ? "text-red-400 font-bold" : ""}
                    ${log.type === "warning" ? "text-amber-400" : ""}
                    ${log.type === "success" ? "text-emerald-400" : ""}
                    ${log.type === "event" ? "text-blue-400 font-bold underline decoration-blue-500/50" : ""}
                    ${log.type === "info" ? "text-slate-300" : ""}
                  `}
								>
									{log.type === "error" && (
										<span className="mr-2">CRITICAL:</span>
									)}
									{log.message}
								</span>
							</div>
						))}
					</div>
				</Card>
			</main>

			{/* Game Over Modal */}
			{gameState.isGameOver && (
				<div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
					<div className="bg-slate-900 border border-slate-700 rounded-lg p-8 max-w-md w-full text-center shadow-2xl">
						<div className="mb-6 flex justify-center">
							<AlertTriangle className="w-16 h-16 text-red-500" />
						</div>
						<h2 className="text-3xl font-bold text-white mb-2">
							SYSTEM FAILURE
						</h2>
						<p className="text-slate-400 mb-6">
							{gameState.budget <= -500
								? "Bankruptcy declared. Infrastructure seized by cloud provider."
								: "Reputation critical. Business operations suspended."}
						</p>
						<div className="bg-slate-800 rounded p-4 mb-6 grid grid-cols-2 gap-4">
							<div className="text-center">
								<div className="text-xs text-slate-500 uppercase">
									Ticks Survived
								</div>
								<div className="text-xl font-mono text-white">
									{gameState.tickCount}
								</div>
							</div>
							<div className="text-center">
								<div className="text-xs text-slate-500 uppercase">
									Peak Traffic
								</div>
								<div className="text-xl font-mono text-white">
									{Math.round(gameState.currentTraffic)} RPS
								</div>
							</div>
						</div>
						<Button
							variant="primary"
							size="lg"
							className="w-full"
							onClick={onRestart}
						>
							Reboot System
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};
