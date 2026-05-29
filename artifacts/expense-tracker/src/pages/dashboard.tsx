import React, { useState } from "react";
import {
  useGetExpenseSummary, getGetExpenseSummaryQueryKey,
  useGetMonthlyStats, getGetMonthlyStatsQueryKey,
  useListExpenses, getListExpensesQueryKey,
  useGetStatsByCategory, getGetStatsByCategoryQueryKey,
  useDeleteExpense
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip,
} from "recharts";
import { DollarSign, TrendingUp, Calendar, Hash, Trash2, Target } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { safeArray } from "@/lib/utils";

export default function Dashboard() {
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteDescription, setPendingDeleteDescription] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: summary, isLoading: loadingSummary } = useGetExpenseSummary({ query: { queryKey: getGetExpenseSummaryQueryKey() } });
  const { data: monthlyStats, isLoading: loadingStats } = useGetMonthlyStats({ query: { queryKey: getGetMonthlyStatsQueryKey() } });
  const { data: recentExpenses, isLoading: loadingExpenses } = useListExpenses({}, { query: { queryKey: getListExpensesQueryKey({}) } });
  const { data: categoryStats, isLoading: loadingCategoryStats } = useGetStatsByCategory({}, { query: { queryKey: getGetStatsByCategoryQueryKey({}) } });

  const monthlyStatsArray = safeArray(monthlyStats);
  const recentExpensesArray = safeArray(recentExpenses);
  const categoryStatsArray = safeArray(categoryStats);

  const deleteExpense = useDeleteExpense();

  const requestDelete = (id: number, description: string) => {
    setPendingDeleteId(id);
    setPendingDeleteDescription(description);
  };

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    deleteExpense.mutate({ id: pendingDeleteId }, {
      onSuccess: () => {
        toast({ title: "Expense removed" });
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetExpenseSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMonthlyStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsByCategoryQueryKey({}) });
      },
      onError: () => {
        toast({ title: "Could not remove expense", variant: "destructive" });
      },
      onSettled: () => {
        setPendingDeleteId(null);
        setPendingDeleteDescription("");
      }
    });
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
    setPendingDeleteDescription("");
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const pieData = categoryStatsArray.filter((s) => s.total > 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Your financial co-pilot overview.</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total All Time" value={summary?.totalAllTime} icon={DollarSign} loading={loadingSummary} formatter={formatCurrency} />
        <StatCard title="This Month" value={summary?.totalThisMonth} icon={TrendingUp} loading={loadingSummary} formatter={formatCurrency} highlight />
        <StatCard title="Daily Average" value={summary?.averagePerDay} icon={Calendar} loading={loadingSummary} formatter={formatCurrency} />
        <StatCard title="Top Category" value={summary?.topCategory} icon={Hash} loading={loadingSummary} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly bar chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Monthly Trends</CardTitle>
            <CardDescription>Spending over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingStats ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : monthlyStatsArray.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyStatsArray} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(val) => {
                      const [y, m] = val.split('-');
                      return `${m}/${y.slice(2)}`;
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontFamily: "var(--font-sans)", fontWeight: 500 }}
                    formatter={(value: number) => [formatCurrency(value), "Total"]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No data available</div>
            )}
          </CardContent>
        </Card>

        {/* Category pie chart */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Spending Breakdown
            </CardTitle>
            <CardDescription>All-time distribution across categories</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loadingCategoryStats ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="categoryName"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', fontFamily: "var(--font-sans)", fontWeight: 500 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => <span className="text-xs font-medium text-foreground ml-1">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">No spending data to visualize</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent expenses */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingExpenses ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : recentExpensesArray.length > 0 ? (
            <div className="space-y-3">
              {recentExpensesArray.slice(0, 6).map((exp, idx) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors animate-in fade-in slide-in-from-bottom-2 group"
                  style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-semibold text-sm truncate">{exp.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{exp.categoryName}</span>
                      <span className="text-muted-foreground text-[10px]">•</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{format(new Date(exp.date), 'MMM d')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="font-mono font-bold text-sm">
                      {formatCurrency(exp.amount)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => requestDelete(exp.id, exp.description)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">No recent expenses</div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) cancelDelete(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{pendingDeleteDescription}"</strong> will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
  formatter,
  highlight = false,
}: {
  title: string;
  value?: number | string | null;
  icon: React.ElementType;
  loading?: boolean;
  formatter?: (val: any) => string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn("border-border/50 shadow-sm relative overflow-hidden", highlight && "border-primary/30 shadow-primary/5 bg-primary/5")}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <div className={cn("p-2 rounded-lg", highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-4">
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <h3 className="text-2xl font-bold font-mono tracking-tight text-foreground">
              {value === null || value === undefined ? "-" : (formatter ? formatter(value) : value)}
            </h3>
          )}
        </div>
      </CardContent>
      {highlight && (
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
      )}
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}
