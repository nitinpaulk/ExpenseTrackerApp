import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListExpenses, getListExpensesQueryKey,
  useListCategories, getListCategoriesQueryKey,
  useListCards, getListCardsQueryKey,
  useDeleteExpense,
  useUpdateExpense,
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Trash2, ListFilter, AlertCircle, Pencil, CreditCard } from "lucide-react";
import { Link } from "wouter";

type ExpenseRow = {
  id: number;
  amount: number;
  description: string;
  categoryId: number;
  categoryName: string;
  cardId?: number | null;
  cardName?: string | null;
  cardColor?: string | null;
  cardLastFour?: string | null;
  notes?: string | null;
  date: string;
  createdAt: string;
};

const editSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be positive" }),
  description: z.string().min(1, { message: "Description is required" }),
  categoryId: z.coerce.number().positive({ message: "Category is required" }),
  cardId: z.coerce.number().optional(),
  date: z.string().min(1, { message: "Date is required" }),
  notes: z.string().optional(),
});
type EditValues = z.infer<typeof editSchema>;

function EditExpenseDialog({
  expense,
  onClose,
}: {
  expense: ExpenseRow;
  onClose: () => void;
}) {
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const { data: cards } = useListCards({ query: { queryKey: getListCardsQueryKey() } });
  const updateExpense = useUpdateExpense();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      amount: expense.amount,
      description: expense.description,
      categoryId: expense.categoryId,
      cardId: expense.cardId ?? undefined,
      date: expense.date,
      notes: expense.notes ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      amount: expense.amount,
      description: expense.description,
      categoryId: expense.categoryId,
      cardId: expense.cardId ?? undefined,
      date: expense.date,
      notes: expense.notes ?? "",
    });
  }, [expense.id]);

  const onSubmit = (values: EditValues) => {
    updateExpense.mutate(
      {
        id: expense.id,
        data: {
          amount: values.amount,
          description: values.description,
          categoryId: values.categoryId,
          cardId: values.cardId ?? null,
          date: values.date,
          notes: values.notes || null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Expense updated" });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          queryClient.invalidateQueries({ queryKey: ["stats"] });
          onClose();
        },
        onError: () => {
          toast({ title: "Failed to update expense", variant: "destructive" });
        },
      }
    );
  };

  return (
    <DialogContent className="sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Edit Expense</DialogTitle>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8 font-mono"
                        {...field}
                        value={field.value || ""}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" className="font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Morning Coffee" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            {cat.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cardId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Card <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "none" ? undefined : Number(val))}
                    value={field.value?.toString() || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No card" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-muted-foreground">No card</span>
                      </SelectItem>
                      {cards?.map((card) => (
                        <SelectItem key={card.id} value={card.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: card.color }} />
                            <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                            {card.name}
                            {card.lastFour && (
                              <span className="text-muted-foreground font-mono text-xs">••{card.lastFour}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional details..." className="resize-none h-20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateExpense.isPending} className="min-w-[100px]">
              {updateExpense.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

export default function Expenses() {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteDescription, setPendingDeleteDescription] = useState<string>("");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });

  const params = {
    ...(categoryFilter !== "all" && { category: categoryFilter }),
    ...(monthFilter !== "all" && { month: monthFilter }),
  };

  const { data: expenses, isLoading } = useListExpenses(params, { query: { queryKey: getListExpensesQueryKey(params) } });

  const deleteExpense = useDeleteExpense();

  const allIds = expenses?.map((e) => e.id) ?? [];
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = allIds.some((id) => selected.has(id));
  const selectedCount = allIds.filter((id) => selected.has(id)).length;

  const toggleAll = () => {
    if (allSelected) {
      setSelected((prev) => { const next = new Set(prev); allIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelected((prev) => { const next = new Set(prev); allIds.forEach((id) => next.add(id)); return next; });
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  const requestDelete = (id: number, description: string) => {
    setPendingDeleteId(id);
    setPendingDeleteDescription(description);
  };

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    deleteExpense.mutate({ id: pendingDeleteId }, {
      onSuccess: () => {
        toast({ title: "Expense removed" });
        setSelected((prev) => { const n = new Set(prev); n.delete(pendingDeleteId!); return n; });
        invalidateAll();
      },
      onError: () => { toast({ title: "Could not remove expense", variant: "destructive" }); },
      onSettled: () => { setPendingDeleteId(null); setPendingDeleteDescription(""); }
    });
  };

  const handleBulkDelete = async () => {
    const ids = allIds.filter((id) => selected.has(id));
    let failed = 0;
    for (const id of ids) {
      try {
        await new Promise<void>((resolve, reject) => {
          deleteExpense.mutate({ id }, { onSuccess: () => resolve(), onError: () => reject() });
        });
      } catch { failed++; }
    }
    setSelected(new Set());
    invalidateAll();
    if (failed === 0) {
      toast({ title: `${ids.length} expense${ids.length !== 1 ? "s" : ""} removed` });
    } else {
      toast({ title: `${ids.length - failed} removed, ${failed} failed`, variant: "destructive" });
    }
    setConfirmBulkDelete(false);
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
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 animate-in fade-in slide-in-from-right-2 duration-200"
              onClick={() => setConfirmBulkDelete(true)}
            >
              <Trash2 className="w-4 h-4" />
              Remove {selectedCount} selected
            </Button>
          )}
          <Link href="/add" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2 rounded-xl hover-elevate">
            Add Expense
          </Link>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/20 border-b border-border/50 p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <ListFilter className="w-4 h-4" />
              <span>Filters</span>
            </div>
            <div className="flex flex-1 gap-4 w-full">
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setSelected(new Set()); }}>
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

              <Select value={monthFilter} onValueChange={(v) => { setMonthFilter(v); setSelected(new Set()); }}>
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

        {!isLoading && expenses && expenses.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/50 bg-muted/10">
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              aria-label="Select all"
              data-state={someSelected && !allSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
            />
            <span className="text-xs text-muted-foreground">
              {selectedCount > 0 ? `${selectedCount} of ${allIds.length} selected` : `${allIds.length} expense${allIds.length !== 1 ? "s" : ""}`}
            </span>
          </div>
        )}

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : expenses && expenses.length > 0 ? (
            <div className="divide-y divide-border/50">
              {expenses.map((exp, idx) => {
                const isChecked = selected.has(exp.id);
                return (
                  <div
                    key={exp.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-bottom-2 group ${isChecked ? "bg-primary/5" : ""}`}
                    style={{ animationDelay: `${idx * 30}ms`, animationFillMode: 'both' }}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleOne(exp.id)}
                      aria-label={`Select ${exp.description}`}
                      className="shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-base truncate">{exp.description}</p>
                        {exp.notes && (
                          <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold border-transparent bg-secondary text-secondary-foreground">Note</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                        <span className="uppercase tracking-wider font-bold text-muted-foreground text-[11px] px-2 py-1 bg-muted rounded-md">{exp.categoryName}</span>
                        {exp.cardName && (
                          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                            <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: exp.cardColor ?? "#94a3b8" }} />
                            {exp.cardName}
                            {exp.cardLastFour && <span className="font-mono">••{exp.cardLastFour}</span>}
                          </span>
                        )}
                        <span className="text-muted-foreground font-mono">{format(new Date(exp.date), 'MMM d, yyyy')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <div className="font-mono font-bold text-lg mr-2">
                        {formatCurrency(exp.amount)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => setEditingExpense(exp as ExpenseRow)}
                        title="Edit expense"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => requestDelete(exp.id, exp.description)}
                        title="Delete expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
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

      {/* Edit dialog */}
      <Dialog open={editingExpense !== null} onOpenChange={(open) => { if (!open) setEditingExpense(null); }}>
        {editingExpense && (
          <EditExpenseDialog
            expense={editingExpense}
            onClose={() => setEditingExpense(null)}
          />
        )}
      </Dialog>

      {/* Single delete confirmation */}
      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) { setPendingDeleteId(null); setPendingDeleteDescription(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this expense?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{pendingDeleteDescription}"</strong> will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {selectedCount} expense{selectedCount !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              All {selectedCount} selected expense{selectedCount !== 1 ? "s" : ""} will be permanently deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove {selectedCount}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
