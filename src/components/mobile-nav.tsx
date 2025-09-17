"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Menu,
  Home,
  BarChart3,
  Brain,
  TrendingDown,
  Settings,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import LogoutButton from "@/components/logout-button";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "P/L Analysis",
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "AI Recommendations",
    href: "/ai-recommendations",
    icon: Brain,
  },
  {
    name: "Trail Stop Orders",
    href: "/trail-stop",
    icon: TrendingDown,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface MobileNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export default function MobileNav({ user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <Menu className="h-4 w-4" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <div className="flex flex-col space-y-4">
            {/* User Info */}
            <div className="flex items-center space-x-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-50 truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col space-y-2">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50",
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Actions */}
            <div className="flex flex-col space-y-2 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Theme
                </span>
                <ThemeToggle />
              </div>
              <LogoutButton
                variant="ghost"
                size="sm"
                className="justify-start"
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
