import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import {
  useCreateExpense,
  useListCategories, getListCategoriesQueryKey,
  useListCards, getListCardsQueryKey,
  useCreateCard,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CreditCard, Plus, X, Check } from "lucide-react";

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b",
];

const formSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be positive" }),
  description: z.string().min(1, { message: "Description is required" }),
  categoryId: z.coerce.number().positive({ message: "Category is required" }),
  cardId: z.coerce.number().optional(),
  date: z.string().min(1, { message: "Date is required" }),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function AddExpense() {
  const { data: categories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const { data: cards } = useListCards({ query: { queryKey: getListCardsQueryKey() } });
  const createExpense = useCreateExpense();
  const createCard = useCreateCard();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [showAddCard, setShowAddCard] = useState(false);
  const [newCardName, setNewCardName] = useState("");
  const [newCardLastFour, setNewCardLastFour] = useState("");
  const [newCardColor, setNewCardColor] = useState(PRESET_COLORS[0]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      categoryId: undefined,
      cardId: undefined,
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      amount: values.amount,
      description: values.description,
      categoryId: values.categoryId,
      cardId: values.cardId ?? undefined,
      date: values.date,
      notes: values.notes || undefined,
    };
    createExpense.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Expense logged successfully" });
        queryClient.invalidateQueries();
        setLocation("/expenses");
      },
      onError: () => {
        toast({ title: "Failed to log expense", variant: "destructive" });
      }
    });
  };

  const handleAddNewCard = () => {
    if (!newCardName.trim()) return;
    createCard.mutate(
      { data: { name: newCardName.trim(), lastFour: newCardLastFour || undefined, color: newCardColor } },
      {
        onSuccess: (newCard) => {
          queryClient.invalidateQueries({ queryKey: getListCardsQueryKey() });
          form.setValue("cardId", newCard.id);
          setShowAddCard(false);
          setNewCardName("");
          setNewCardLastFour("");
          setNewCardColor(PRESET_COLORS[0]);
          toast({ title: `Card "${newCard.name}" added and selected` });
        },
        onError: () => toast({ title: "Failed to add card", variant: "destructive" }),
      }
    );
  };

  const handleCancelAddCard = () => {
    setShowAddCard(false);
    setNewCardName("");
    setNewCardLastFour("");
    setNewCardColor(PRESET_COLORS[0]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Log Expense</h1>
        <p className="text-muted-foreground">Record a new transaction.</p>
      </div>

      <Card className="border-border/50 shadow-md">
        <CardContent className="p-6 sm:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                            className="pl-8 font-mono text-lg"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
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
                      <FormLabel>
                        Credit card
                        <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                      </FormLabel>
                      <Select
                        onValueChange={(val) => {
                          if (val === "__add_new__") {
                            setShowAddCard(true);
                          } else {
                            field.onChange(val === "none" ? undefined : Number(val));
                          }
                        }}
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
                          <SelectItem value="__add_new__">
                            <div className="flex items-center gap-2 text-primary font-medium">
                              <Plus className="w-3.5 h-3.5" />
                              Add new card
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Inline add-card form */}
              {showAddCard && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      New card
                    </p>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancelAddCard}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="new-card-name" className="text-xs">Card name</Label>
                      <Input
                        id="new-card-name"
                        value={newCardName}
                        onChange={(e) => setNewCardName(e.target.value)}
                        placeholder="e.g. Chase Sapphire"
                        className="h-9 text-sm"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewCard(); } }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="new-card-last-four" className="text-xs">
                        Last 4 digits <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Input
                        id="new-card-last-four"
                        value={newCardLastFour}
                        onChange={(e) => setNewCardLastFour(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="1234"
                        maxLength={4}
                        className="h-9 text-sm font-mono"
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddNewCard(); } }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className="w-6 h-6 rounded-full transition-all"
                          style={{
                            backgroundColor: c,
                            outline: newCardColor === c ? `3px solid ${c}` : "none",
                            outlineOffset: "2px",
                            transform: newCardColor === c ? "scale(1.2)" : "scale(1)",
                          }}
                          onClick={() => setNewCardColor(c)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={handleCancelAddCard}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddNewCard}
                      disabled={!newCardName.trim() || createCard.isPending}
                      className="gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {createCard.isPending ? "Adding..." : "Add Card"}
                    </Button>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes <span className="text-muted-foreground font-normal">(Optional)</span></FormLabel>
                    <FormControl>
                      <Textarea placeholder="Any additional details..." className="resize-none h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => setLocation("/expenses")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createExpense.isPending} className="min-w-[120px]">
                  {createExpense.isPending ? "Saving..." : "Save Expense"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
