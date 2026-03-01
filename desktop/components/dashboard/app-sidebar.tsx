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
} from "lucide-react";

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
	SidebarTrigger,
} from "../ui/sidebar";

const mainNav = [
	{ title: "Dashboard", icon: LayoutDashboard, isActive: true },
	{ title: "Pipeline", icon: ListTodo, badge: "3" },
	{ title: "Deadlines", icon: CalendarClock, badge: "5" },
	{ title: "Courses", icon: BookOpen },
	{ title: "Agent", icon: Bot },
];

const secondaryNav = [
	{ title: "Notifications", icon: Bell, badge: "2" },
	{ title: "Settings", icon: Settings },
];

export function AppSidebar() {
	return (
		<Sidebar collapsible="icon" className="border-r border-sidebar-border">
			<SidebarHeader className="p-4">
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" tooltip="Overdue">
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
							{mainNav.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton
										isActive={item.isActive}
										tooltip={item.title}
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
						<SidebarTrigger className="w-full justify-start gap-2 h-8 px-2 text-muted-foreground hover:text-foreground" />
					</SidebarMenuItem>
					<SidebarMenuItem>
						<SidebarMenuButton tooltip="Agent Status" size="lg">
							<div className="relative flex size-8 items-center justify-center">
								<Bot className="size-4 text-primary" />
								<span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-sidebar" />
							</div>
							<div className="flex flex-col">
								<span className="text-xs font-medium">Agent Active</span>
								<span className="text-xs text-muted-foreground">
									Processing 2 tasks
								</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
