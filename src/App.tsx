import { Cloud } from "lucide-react";
import React from "react";
import { GameDashboard } from "./components/GameDashboard";
import { useGameEngine } from "./hooks/useGameEngine";

const App: React.FC = () => {
	const {
		gameState,
		logs,
		chartData,
		buyNode,
		repairNode,
		repairAllNodes,
		upgradeComponent,
		upgradeNode, // New
		restartGame,
		togglePause,
		setFirewallMode,
		activateTask,
	} = useGameEngine();

	// Initial welcome screen if not playing and tick count is 0
	if (!gameState.isPlaying && gameState.tickCount === 0) {
		return (
			<div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-slate-200">
				<div className="max-w-2xl w-full text-center space-y-8">
					<div className="flex justify-center mb-6">
						<div className="bg-blue-600 p-6 rounded-2xl shadow-2xl shadow-blue-900/50">
							<Cloud className="w-24 h-24 text-white" />
						</div>
					</div>

					<h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
						Cloud Architect Simulator v2
					</h1>

					<div className="bg-slate-900 border border-slate-800 p-8 rounded-xl text-left space-y-4 shadow-xl">
						<h2 className="text-xl font-semibold text-white">
							Mission Briefing
						</h2>
						<p className="text-slate-400 leading-relaxed">
							Maintain uptime as traffic scales exponentially. Manage
							infrastructure costs (Upkeep), optimize database loads, and defend
							against attacks.
						</p>
						<div className="grid grid-cols-2 gap-4">
							<ul className="space-y-2 text-sm text-slate-300">
								<li className="font-bold text-white mb-1">Architecture</li>
								<li className="flex items-center gap-2">
									<span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
									Balance Compute vs Database load
								</li>
								<li className="flex items-center gap-2">
									<span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
									Don't exceed 50% load to avoid failures
								</li>
							</ul>
							<ul className="space-y-2 text-sm text-slate-300">
								<li className="font-bold text-white mb-1">Operations</li>
								<li className="flex items-center gap-2">
									<span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
									Use Tasks (Flush Cache, etc) for spikes
								</li>
								<li className="flex items-center gap-2">
									<span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
									Watch your hourly Upkeep cost!
								</li>
							</ul>
						</div>
					</div>

					<button
						onClick={restartGame}
						className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-500 hover:scale-105"
					>
						Start Simulation
						<div className="absolute -inset-3 rounded-xl bg-blue-400 opacity-20 group-hover:opacity-40 blur-lg transition-opacity duration-200" />
					</button>
				</div>
			</div>
		);
	}

	return (
		<GameDashboard
			gameState={gameState}
			logs={logs}
			chartData={chartData}
			onBuyNode={buyNode}
			onRepairNode={repairNode}
			repairAllNodes={repairAllNodes}
			onUpgradeComponent={upgradeComponent}
			upgradeNode={upgradeNode}
			onTogglePause={togglePause}
			onRestart={restartGame}
			setFirewallMode={setFirewallMode}
			activateTask={activateTask}
		/>
	);
};

export default App;
