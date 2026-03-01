"use client";

import {
	LayoutDashboard,
	ListTodo,
	CalendarClock,
	BookOpen,
	Bot,
	Settings,
	Bell,
	GraduationCap,
	Loader2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { AgentState } from "@/App";

import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "../ui/sidebar";

const secondaryNav = [
	{ title: "Settings", icon: Settings },
];

interface AppSidebarProps {
	activePage: string;
	onPageChange: (page: string) => void;
	agentState: AgentState;
	activeTaskCount: number;
	deadlineCount: number;
}

export function AppSidebar({ 
	activePage, 
	onPageChange, 
	agentState,
	activeTaskCount,
	deadlineCount
}: AppSidebarProps) {
	const isAgentRunning = agentState === "running" || agentState === "starting";
	
	const dynamicMainNav = [
		{ title: "Dashboard", icon: LayoutDashboard },
		{ title: "Pipeline", icon: ListTodo, badge: activeTaskCount > 0 ? activeTaskCount.toString() : undefined },
		{ title: "Deadlines", icon: CalendarClock, badge: deadlineCount > 0 ? deadlineCount.toString() : undefined },
		{ title: "Courses", icon: BookOpen },
	];

	return (
		<Sidebar collapsible="icon" className="border-r border-sidebar-border">
			<SidebarHeader className="p-4">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton 
							size="lg" 
							tooltip="Overdue"
							isActive={activePage === "Dashboard"}
							onClick={() => onPageChange("Dashboard")}
						>
							<div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
								<GraduationCap className="size-4" />
							</div>
							<div className="flex flex-col gap-0.5 leading-none">
								<span className="text-sm font-semibold tracking-tight">
									Overdue
								</span>
								<span className="text-xs text-muted-foreground">Web Agent</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			<SidebarSeparator />

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel>Navigation</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{dynamicMainNav.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										isActive={activePage === item.title}
										tooltip={item.title}
										onClick={() => onPageChange(item.title)}
									>
										<item.icon className="size-4" />
										<span>{item.title}</span>
									</SidebarMenuButton>
									{item.badge && (
										<SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
									)}
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarSeparator />

				<SidebarGroup>
					<SidebarGroupLabel>System</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{secondaryNav.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton tooltip={item.title}>
										<item.icon className="size-4" />
										<span>{item.title}</span>
									</SidebarMenuButton>
									{item.badge && (
										<SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
									)}
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter className="p-2">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton tooltip="Agent Status" size="lg">
							<div className="relative flex size-8 items-center justify-center">
								{agentState === "starting" || agentState === "stopping" ? (
									<Loader2 className="size-4 animate-spin text-primary" />
								) : (
									<Bot className={cn("size-4", isAgentRunning ? "text-primary" : "text-muted-foreground")} />
								)}
								{isAgentRunning && (
									<span className={cn(
										"absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-sidebar",
										agentState === "starting" ? "bg-chart-3" : "bg-primary"
									)} />
								)}
							</div>
							<div className="flex flex-col">
								<span className="text-xs font-medium">
									{agentState === "idle" && "Agent Offline"}
									{agentState === "starting" && "Starting..."}
									{agentState === "running" && "Agent Running"}
									{agentState === "stopping" && "Stopping..."}
								</span>
								<span className="text-[10px] text-muted-foreground leading-tight">
									{agentState === "idle" && "Standby mode"}
									{agentState === "starting" && "Initializing sync"}
									{agentState === "running" && "Processing tasks"}
									{agentState === "stopping" && "Winding down"}
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
