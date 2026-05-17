import React from "react";
import { Link, useLocation } from "wouter";
import { PieChart, List, PlusCircle, Tags, Activity, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClerk, useUser } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: PieChart },
  { href: "/expenses", label: "Expenses", icon: List },
  { href: "/add", label: "Add Expense", icon: PlusCircle },
  { href: "/categories", label: "Categories", icon: Tags },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <nav className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border bg-card p-6 flex flex-col gap-8 shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">Track your spending</h1>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">Finance Tracker</p>
          </div>
        </div>

        <div className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 hide-scrollbar">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/dashboard" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 shrink-0 font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover-elevate",
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto flex flex-col gap-3">
          {user && (
            <div className="flex items-center gap-3 px-2">
              {user.imageUrl ? (
                <img src={user.imageUrl} alt={user.firstName ?? "User"} className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                  {(user.firstName?.[0] ?? user.emailAddresses?.[0]?.emailAddress?.[0] ?? "?").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{user.firstName ?? user.emailAddresses?.[0]?.emailAddress}</p>
                <p className="text-xs text-muted-foreground truncate">{user.emailAddresses?.[0]?.emailAddress}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ redirectUrl: basePath || "/" })}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200 font-medium w-full text-left"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </nav>

      <main className="flex-1 min-w-0 max-w-[1200px] mx-auto w-full p-6 md:p-10 relative">
        {children}
      </main>
    </div>
  );
}
