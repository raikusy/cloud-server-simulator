import React from "react";

interface CardProps {
	title?: string;
	children: React.ReactNode;
	className?: string;
	headerAction?: React.ReactNode;
	noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
	title,
	children,
	className = "",
	headerAction,
	noPadding = false,
}) => {
	return (
		<div
			className={`bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden flex flex-col ${className}`}
		>
			{title && (
				<div className="px-4 py-3 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center shrink-0">
					<h3 className="font-semibold text-slate-200">{title}</h3>
					{headerAction && <div>{headerAction}</div>}
				</div>
			)}
			<div className={`flex-1 min-h-0 flex flex-col ${noPadding ? "" : "p-4"}`}>
				{children}
			</div>
		</div>
	);
};
