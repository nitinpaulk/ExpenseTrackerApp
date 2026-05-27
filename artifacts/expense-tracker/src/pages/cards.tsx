import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListCards, getListCardsQueryKey,
  useCreateCard,
  useDeleteCard,
  useGetStatsByCard, getGetStatsByCardQueryKey,
  useListExpenses, getListExpensesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, Trash2, Plus } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const PRESET_COLORS = [
  "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#84cc16",
];

const formSchema = z.object({
  name: z.string().min(1, "Card name is required"),
  lastFour: z.string().max(4).regex(/^\d{0,4}$/, "Must be up to 4 digits").optional().or(z.literal("")),
  color: z.string().min(1),
});
type FormValues = z.infer<typeof formSchema>;

export default function Cards() {
  const { data: cards, isLoading: loadingCards } = useListCards({ query: { queryKey: getListCardsQueryKey() } });
  const { data: cardStats, isLoading: loadingStats } = useGetStatsByCard({}, { query: { queryKey: getGetStatsByCardQueryKey({}) } });
  const { data: expenses } = useListExpenses({}, { query: { queryKey: getListExpensesQueryKey({}) } });
  const createCard = useCreateCard();
  const deleteCard = useDeleteCard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", lastFour: "", color: PRESET_COLORS[0] },
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);

  const onSubmit = (values: FormValues) => {
    createCard.mutate(
      { data: { name: values.name, lastFour: values.lastFour || undefined, color: selectedColor } },
      {
        onSuccess: () => {
          toast({ title: "Card added" });
          queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsByCardQueryKey({}) });
          form.reset();
          setSelectedColor(PRESET_COLORS[0]);
          setShowForm(false);
        },
        onError: () => toast({ title: "Failed to add card", variant: "destructive" }),
      }
    );
  };

  const confirmDelete = () => {
    if (pendingDeleteId === null) return;
    deleteCard.mutate(
      { id: pendingDeleteId },
      {
        onSuccess: () => {
          toast({ title: "Card removed" });
          queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsByCardQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey({}) });
        },
        onError: () => toast({ title: "Failed to remove card", variant: "destructive" }),
        onSettled: () => { setPendingDeleteId(null); setPendingDeleteName(""); },
      }
    );
  };

  const pieData = cardStats?.filter((s) => s.total > 0) ?? [];
  const topCard = cardStats?.filter(s => s.cardId !== null).sort((a, b) => b.total - a.total)[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Cards</h1>
          <p className="text-muted-foreground">Track spending across your credit and debit cards.</p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Add Card
        </Button>
      </div>

      {showForm && (
        <Card className="border-border/50 shadow-md animate-in fade-in slide-in-from-top-2 duration-300">
          <CardHeader>
            <CardTitle className="text-base">New Card</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Chase Sapphire" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastFour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last 4 digits <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <Input placeholder="1234" maxLength={4} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <Label>Card color</Label>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className="w-7 h-7 rounded-full transition-all"
                        style={{
                          backgroundColor: c,
                          outline: selectedColor === c ? `3px solid ${c}` : "none",
                          outlineOffset: "2px",
                          transform: selectedColor === c ? "scale(1.15)" : "scale(1)",
                        }}
                        onClick={() => setSelectedColor(c)}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                  <Button type="submit" disabled={createCard.isPending}>
                    {createCard.isPending ? "Adding..." : "Add Card"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {loadingStats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      ) : cardStats && cardStats.filter(s => s.cardId !== null).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Total across all cards</p>
              <p className="text-2xl font-bold font-mono">
                {formatCurrency(cardStats.filter(s => s.cardId !== null).reduce((sum, s) => sum + s.total, 0))}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Most used card</p>
              {topCard ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: topCard.color }} />
                  <div>
                    <p className="font-bold">{topCard.cardName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{formatCurrency(topCard.total)}</p>
                  </div>
                </div>
              ) : <p className="text-muted-foreground text-sm">—</p>}
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">Cards tracked</p>
              <p className="text-2xl font-bold font-mono">{cards?.length ?? 0}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Spending by Card</CardTitle>
            <CardDescription>All-time breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loadingStats ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="total"
                    nameKey="cardName"
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => formatCurrency(val)}
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontFamily: "var(--font-sans)", fontWeight: 500 }}
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
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                Add a card and log expenses to see data
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Card Totals</CardTitle>
            <CardDescription>Total spent per card</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loadingStats ? (
              <Skeleton className="w-full h-full rounded-xl" />
            ) : cardStats && cardStats.filter(s => s.cardId !== null && s.total > 0).length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cardStats.filter(s => s.cardId !== null && s.total > 0)}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-mono)" }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <YAxis
                    dataKey="cardName"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "var(--font-sans)" }}
                    width={110}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val), "Total"]}
                    contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontFamily: "var(--font-sans)", fontWeight: 500 }}
                  />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {cardStats.filter(s => s.cardId !== null && s.total > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No card spending data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>My Cards</CardTitle>
          <CardDescription>Manage your cards and view per-card stats</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCards ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : cards && cards.length > 0 ? (
            <div className="space-y-3">
              {cards.map((card, idx) => {
                const stat = cardStats?.find((s) => s.cardId === card.id);
                const cardExpenses = expenses?.filter((e) => e.cardId === card.id) ?? [];
                return (
                  <div
                    key={card.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors group animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${idx * 40}ms`, animationFillMode: "both" }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: card.color }}
                      >
                        <CreditCard className="w-5 h-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">
                          {card.name}
                          {card.lastFour && (
                            <span className="text-muted-foreground font-mono text-sm ml-2">•••• {card.lastFour}</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {cardExpenses.length} expense{cardExpenses.length !== 1 ? "s" : ""}
                          {stat && stat.total > 0 && (
                            <span className="ml-2 font-mono font-semibold text-foreground">{formatCurrency(stat.total)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {stat && stat.percentage > 0 && (
                        <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                          {stat.percentage.toFixed(1)}%
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                        onClick={() => { setPendingDeleteId(card.id); setPendingDeleteName(card.name); }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 gap-3 text-muted-foreground">
              <CreditCard className="w-8 h-8 opacity-30" />
              <p className="text-sm">No cards yet — add one above to start tracking</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) { setPendingDeleteId(null); setPendingDeleteName(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this card?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{pendingDeleteName}"</strong> will be removed. Expenses linked to it will not be deleted, but they'll lose the card association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
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
