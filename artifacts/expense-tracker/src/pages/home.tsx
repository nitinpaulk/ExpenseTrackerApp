import { Link } from "wouter";
import { Activity, TrendingUp, PieChart, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
            <Activity className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Track your spending</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link href="/sign-up" className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-8 shadow-lg shadow-primary/25">
          <Activity className="w-9 h-9" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight mb-4 max-w-xl">
          Know exactly where your money goes
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mb-10">
          Log expenses, tag them by category, and see visual breakdowns that help you spend smarter.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/sign-up" className="text-base font-semibold bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">
            Start for free
          </Link>
          <Link href="/sign-in" className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors px-6 py-3">
            Sign in
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-3xl w-full text-left">
          {[
            { icon: TrendingUp, title: "Monthly trends", desc: "Bar charts showing your spending over the last 12 months so you can spot patterns." },
            { icon: PieChart, title: "Category breakdown", desc: "See exactly what percentage of your budget goes to food, rent, transport, and more." },
            { icon: Shield, title: "Your data, only yours", desc: "Every expense is tied to your account. No one else can see your financial history." },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-6 rounded-2xl border border-border/50 bg-card">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
