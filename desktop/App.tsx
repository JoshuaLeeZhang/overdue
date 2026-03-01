import { useState, useCallback } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StatsCards, DeadlinesList } from "@/components/dashboard/stats-cards";
import { PipelineView } from "@/components/dashboard/pipeline-view";
import { AgentActivity } from "@/components/dashboard/agent-activity";
import { CourseOverview } from "@/components/dashboard/course-overview";
import { AgentControl } from "@/components/dashboard/agent-control";
import { tasks, upcomingDeadlines, type PipelineTask } from "@/lib/tasks-data";

export type AgentState = "idle" | "starting" | "running" | "stopping";

export default function App() {
	const [logs, setLogs] = useState<string[]>([]);
	const [result, setResult] = useState<{ title?: string; text?: string }>({});
	const [searchQuery, setSearchQuery] = useState("");
	const [activePage, setActivePage] = useState("Dashboard");
	const [agentState, setAgentState] = useState<AgentState>("idle");

	const handleLogs = useCallback((newLogs: string[]) => {
		setLogs((prev) => [...prev, ...newLogs]);
	}, []);

	const handleResult = useCallback((data: { title?: string; text?: string }) => {
		setResult(data);
	}, []);

	const handleSearch = useCallback((query: string) => {
		setSearchQuery(query);
	}, []);

	const renderPage = () => {
		switch (activePage) {
			case "Pipeline":
				return (
					<div className="p-6">
						<PipelineView searchQuery={searchQuery} />
					</div>
				);
			case "Deadlines":
				return (
					<div className="p-6">
						<DeadlinesList searchQuery={searchQuery} variant="page" />
					</div>
				);
			case "Courses":
				return (
					<div className="p-6">
						<CourseOverview searchQuery={searchQuery} variant="page" />
					</div>
				);
			case "Dashboard":
			default:
				return (
					<div className="flex flex-col gap-6 p-6">
						<StatsCards searchQuery={searchQuery} />
						<AgentControl 
							onLogs={handleLogs} 
							onResult={handleResult} 
							agentState={agentState} 
							onStateChange={setAgentState} 
						/>
						{/* Electron Playwright Results Section */}
						{(logs.length > 0 || result.title) && (
							<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col h-64">
									<h2 className="text-sm font-semibold text-foreground mb-4">
										Live Execution Logs
									</h2>
									<div className="flex-1 overflow-y-auto space-y-1 font-mono text-xs bg-muted/50 p-3 rounded-md">
										{logs.map((log, i) => (
											<div key={i} className="text-primary">
												<span className="text-muted-foreground mr-2">
													[{new Date().toLocaleTimeString()}]
												</span>
												{log}
											</div>
										))}
									</div>
								</div>
								<div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col h-64">
									<h2 className="text-sm font-semibold text-foreground mb-4">
										Extracted Content
									</h2>
									<div className="flex-1 space-y-4 overflow-y-auto text-sm">
										{result.title && (
											<div>
												<h3 className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">
													Page Title
												</h3>
												<p className="font-medium">{result.title}</p>
											</div>
										)}
										{result.text && (
											<div>
												<h3 className="text-muted-foreground text-xs uppercase tracking-wider font-semibold mb-1">
													Body Text (Preview)
												</h3>
												<div className="text-muted-foreground bg-muted/50 p-2 rounded max-h-32 overflow-y-auto">
													{result.text.slice(0, 500)}...
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						)}

						<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
							<div className="lg:col-span-2">
								<div className="rounded-xl border border-border bg-card p-4 shadow-sm h-full">
									<div className="mb-4 flex items-center gap-2">
										<h2 className="text-sm font-semibold text-foreground">
											Task Pipeline
										</h2>
										<span className="text-xs text-muted-foreground">
											7 total tasks
										</span>
									</div>
									<PipelineView searchQuery={searchQuery} />
								</div>
							</div>

							<div className="flex flex-col gap-6">
								<AgentActivity searchQuery={searchQuery} />
								<DeadlinesList searchQuery={searchQuery} />
								<CourseOverview searchQuery={searchQuery} />
							</div>
						</div>
					</div>
				);
		}
	};

	const activeTaskCount = tasks.filter((t: PipelineTask) => t.status === "processing" || t.status === "urgent").length;
	const deadlineCount = upcomingDeadlines.length;

	return (
		<SidebarProvider>
			<AppSidebar 
				activePage={activePage} 
				onPageChange={setActivePage} 
				agentState={agentState}
				activeTaskCount={activeTaskCount}
				deadlineCount={deadlineCount}
			/>
			<SidebarInset>
				<DashboardHeader onSearch={handleSearch} />
				<div className="flex-1 overflow-y-auto bg-background">
					{renderPage()}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
