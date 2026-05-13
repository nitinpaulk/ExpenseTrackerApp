import React, { useState } from "react";
import { 
  useListExpenses, getListExpensesQueryKey,
  useListCategories, getListCategoriesQueryKey,
  useDeleteExpense
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ListFilter, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function Expenses() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteDescription, setPendingDeleteDescription] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  
  const params = {
    ...(categoryFilter !== "all" && { category: categoryFilter }),
    ...(monthFilter !== "all" && { month: monthFilter }),
  };

  const { data: expenses, isLoading } = useListExpenses(params, { query: { queryKey: getListExpensesQueryKey(params) } });
  
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
        queryClient.invalidateQueries({ queryKey: ["stats"] });
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const months = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return format(d, 'yyyy-MM');
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Expenses</h1>
          <p className="text-muted-foreground">View and manage your transactions.</p>
        </div>
        <Link href="/add" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 rounded-xl hover-elevate">
          Add Expense
        </Link>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/20 border-b border-border/50 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ListFilter className="w-4 h-4" />
              <span>Filters</span>
            </div>
            <div className="flex flex-1 gap-4 w-full">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>{format(new Date(m + '-01'), 'MMMM yyyy')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="divide-y divide-border/50">
              {expenses.map((exp, idx) => (
                <div 
                  key={exp.id} 
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-bottom-2 group"
                  style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-base truncate">{exp.description}</p>
                      {exp.notes && (
                        <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors border-transparent bg-secondary text-secondary-foreground">Note</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      <span className="uppercase tracking-wider font-bold text-muted-foreground text-[11px] px-2 py-1 bg-muted rounded-md">{exp.categoryName}</span>
                      <span className="text-muted-foreground font-mono">{format(new Date(exp.date), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full">
                    <div className="font-mono font-bold text-lg">
                      {formatCurrency(exp.amount)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => requestDelete(exp.id, exp.description)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium">No expenses found</h3>
              <p className="text-muted-foreground text-sm mt-1 mb-6 max-w-sm">
                No expenses match your current filters. Try adjusting them or add a new one.
              </p>
              <Button asChild variant="outline">
                <Link href="/add">Add New Expense</Link>
              </Button>
            </div>
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
