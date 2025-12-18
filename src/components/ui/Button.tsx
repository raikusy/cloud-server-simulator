import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: "primary" | "danger" | "success" | "neutral";
	size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
	children,
	variant = "primary",
	size = "md",
	className = "",
	disabled,
	...props
}) => {
	const baseStyle =
		"font-medium rounded focus:outline-none transition-all flex items-center justify-center gap-2 hover:cursor-pointer";

	const variants = {
		primary:
			"bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-900/50 disabled:text-blue-300",
		danger:
			"bg-red-600 hover:bg-red-500 text-white disabled:bg-red-900/50 disabled:text-red-300",
		success:
			"bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-emerald-900/50 disabled:text-emerald-300",
		neutral:
			"bg-slate-700 hover:bg-slate-600 text-slate-200 disabled:bg-slate-800 disabled:text-slate-500 border border-slate-600",
	};

	const sizes = {
		sm: "px-2 py-1 text-xs",
		md: "px-4 py-2 text-sm",
		lg: "px-6 py-3 text-base",
	};

	return (
		<button
			className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className} ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
			disabled={disabled}
			{...props}
		>
			{children}
		</button>
	);
};
