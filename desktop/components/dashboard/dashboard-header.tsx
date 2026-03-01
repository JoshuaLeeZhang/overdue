"use client";

import { useState, useRef, useEffect } from "react";
import { SidebarTrigger } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Search, Bell, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
	onSearch?: (query: string) => void;
}

export function DashboardHeader({ onSearch }: DashboardHeaderProps) {
	const [searchOpen, setSearchOpen] = useState(false);
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Propagate query up
	useEffect(() => {
		onSearch?.(query);
	}, [query, onSearch]);

	// Focus input when search opens
	useEffect(() => {
		if (searchOpen) {
			setTimeout(() => inputRef.current?.focus(), 50);
		} else {
			setQuery("");
			onSearch?.("");
		}
	}, [searchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

	// Keyboard shortcuts
	useEffect(() => {
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setSearchOpen(false);
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				setSearchOpen(true);
			}
		};
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, []);

	// Close on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setSearchOpen(false);
			}
		};
		if (searchOpen) document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [searchOpen]);

	return (
		<header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="mr-1 h-4" />

			{/* Title — always visible */}
			<div className="flex flex-1 items-center gap-3">
				<h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
				<Badge
					variant="outline"
					className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5"
				>
					Agent Active
				</Badge>
			</div>

			{/* Constrained search area */}
			<div ref={containerRef} className="flex items-center gap-1">
				{searchOpen && (
					<div className="relative flex items-center">
						<Search className="absolute left-2.5 size-3.5 text-muted-foreground pointer-events-none" />
						<input
							ref={inputRef}
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							placeholder="Search sections…"
							className="h-8 w-52 rounded-md border border-border bg-background pl-8 pr-7 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all"
						/>
						{query && (
							<button
								type="button"
								onClick={() => setQuery("")}
								className="absolute right-2 text-muted-foreground hover:text-foreground"
							>
								<X className="size-3" />
							</button>
						)}
					</div>
				)}

				<Button
					variant="ghost"
					size="icon"
					className={cn(
						"size-8 transition-colors",
						searchOpen
							? "text-primary bg-primary/10"
							: "text-muted-foreground hover:text-foreground",
					)}
					onClick={() => setSearchOpen((o) => !o)}
				>
					<Search className="size-4" />
					<span className="sr-only">Search (⌘K)</span>
				</Button>

				<Button
					variant="ghost"
					size="icon"
					className="relative size-8 text-muted-foreground hover:text-foreground"
				>
					<Bell className="size-4" />
					<span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
					<span className="sr-only">Notifications</span>
				</Button>
			</div>
		</header>
	);
}
