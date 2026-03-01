# Overdue

**A web agent for academic busywork.** Overdue is an autonomous agent that runs in the browser and on the web: it monitors your coursework, reminds you about deadlines, auto-completes tedious assignments, and reviews your submissions against rubrics so nothing slips.

The core of this project is building a **real web agent**—software that can navigate learning management systems, interact with course pages, and automate the workflows students repeat every semester. Unlike chatbots or static tools, Overdue operates **proactively** in the background: it observes incoming academic responsibilities, evaluates urgency and complexity, and organizes work into a clear execution pipeline. Let the agent handle the busywork assignments so you can focus on what actually matters.

---

## How It Works

The web agent ingests, plans, and acts on your academic workload:

1. **Ingest** — Assignment data enters the system via authorized integrations (e.g. LMS access), structured imports, or user-provided inputs.

2. **Analyze** — A prioritization engine evaluates each task using deadlines, estimated workload, difficulty, and scheduling constraints.

3. **Plan** — The agent builds a dynamic execution plan that updates in real time as conditions change.

4. **Execute** — Work is processed asynchronously in the background. The agent **auto-completes** assignments (especially the tedious ones), and **reviews work you’ve submitted** to ensure it follows rubrics before or after you turn it in.

5. **Present** — A visual pipeline interface shows tasks in states such as *queued*, *processing*, and *completed*, so you always see what the agent is working on and what needs your attention.

---

## Key Features

- **Web agent first** — Built as an agent that operates on the web: navigates course sites, interacts with assignment interfaces, and automates browser-based academic workflows.

- **Proactive monitoring & reminders** — Tracks coursework and deadlines and reminds you so you never miss an assignment.

- **Auto-complete assignments** — Automates the tedious, time-wasting assignments in the background so work is done before deadlines.

- **Rubric review** — Reviews work you’ve submitted against assignment rubrics to ensure it meets requirements before or after you turn it in.

- **Smart prioritization** — Considers deadlines, workload, difficulty, and constraints to order and schedule work.

- **Asynchronous processing** — Schedules work in the background and delivers results when they’re needed.

- **Urgency response mode** — When a deadline approaches, the agent reprioritizes, compresses schedules, and generates a focused action plan to finish in time.

- **Pipeline transparency** — A clear view of queued, in-progress, and completed work so you always know what the AI is doing.

---

## Vision

Overdue rethinks how students interact with academic responsibilities. Instead of reacting to deadlines and grinding through busywork, you get an AI that:

- **Reminds you** what’s due and when  
- **Automates** the assignments that are wastes of time  
- **Reviews** your submissions against rubrics so you don’t lose points on technicalities  

Less time on stupid assignments, fewer surprises, better alignment with what instructors actually want.

---

## Technical Concepts

This project is centered on building a **web agent** and integrates several ideas in one system:

- **Web agent** — An autonomous agent that runs in or against the web: browses pages, fills forms, navigates LMS/course sites, and performs academic workflows without constant user input.  
- **Workflow orchestration** — Coordinating multi-step processes and state transitions across web interfaces.  
- **Task prioritization** — Algorithms that weigh deadlines, effort, and constraints.  
- **Asynchronous processing pipelines** — Non-blocking, scheduled execution so the agent can work in the background.  
- **Human–agent collaboration** — Interfaces that make the agent’s state and outputs visible and actionable.

---

## Development

The project is written in TypeScript. Build and run:

```bash
npm install
npm run build
npm run server    # backend at http://localhost:3000
npm run electron  # desktop app (requires server running)
npm run dev       # desktop app
npm run mcp       # MCP server (stdio; requires server running)
```

---

## Summary

**Overdue** is a **web agent** for academic busywork: it runs on the web to remind you about assignments, auto-complete the tedious ones, and review your submissions against rubrics so you stop wasting time.
