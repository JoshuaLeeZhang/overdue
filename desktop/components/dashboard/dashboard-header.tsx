"use client"

import { SidebarTrigger } from "../ui/sidebar"
import { Separator } from "../ui/separator"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Search, Bell } from "lucide-react"

export function DashboardHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 h-4" />

      <div className="flex flex-1 items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">Dashboard</h1>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5">
          Agent Active
        </Badge>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8 text-muted-foreground hover:text-foreground">
          <Search className="size-4" />
          <span className="sr-only">Search</span>
        </Button>
        <Button variant="ghost" size="icon" className="relative size-8 text-muted-foreground hover:text-foreground">
          <Bell className="size-4" />
          <span className="absolute top-1 right-1 size-2 rounded-full bg-destructive" />
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </header>
  )
}
