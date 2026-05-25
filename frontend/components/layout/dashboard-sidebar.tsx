"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  FileText,
  Brain,
  Map,
  FileSearch,
  BarChart3,
  Settings,
  PenLine,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/uploads", label: "Materials", icon: Upload },
  { href: "/notes", label: "AI Notes", icon: FileText },
  { href: "/notes/handwriting", label: "Handwriting", icon: PenLine },
  { href: "/quiz", label: "Quizzes", icon: Brain },
  { href: "/academic", label: "Academic AI", icon: GraduationCap },
  { href: "/roadmap", label: "Roadmap", icon: Map },
  { href: "/papers", label: "Past Papers", icon: FileSearch },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl">
      <div className="p-6">
        <Logo size="sm" />
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
