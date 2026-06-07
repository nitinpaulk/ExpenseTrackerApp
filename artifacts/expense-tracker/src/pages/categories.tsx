import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  useListCategories, getListCategoriesQueryKey,
  useCreateCategory,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Edit, Trash2 } from "lucide-react";
import { safeArray } from "@/lib/utils";

const formSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  color: z.string().min(1, { message: "Color is required" }),
});

export default function Categories() {
  const { data: categories, isLoading: loadingCategories } = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const categoriesArray = safeArray(categories);
  const createCategory = useCreateCategory();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<null | { id: number; name: string; color: string }>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", color: "#ff5733" },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createCategory.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Category created" });
        queryClient.invalidateQueries();
        setOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Failed to create category", variant: "destructive" });
      }
    });
  };

  const editForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", color: "#ff5733" },
  });

  const openEdit = (cat: { id: number; name: string; color: string }) => {
    setEditing(cat);
    editForm.reset({ name: cat.name, color: cat.color });
    setEditOpen(true);
  };

  const onEditSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!editing) return;
    try {
      const resp = await fetch(`/api/categories/${editing.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!resp.ok) throw new Error("Failed to update");
      toast({ title: "Category updated" });
      queryClient.invalidateQueries();
      setEditOpen(false);
      setEditing(null);
    } catch (err) {
      toast({ title: "Failed to update category", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const resp = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (resp.status === 409) {
        const body = await resp.json();
        toast({ title: body?.error || "Cannot delete category", variant: "destructive" });
        return;
      }
      if (!resp.ok) throw new Error("Failed to delete");
      toast({ title: "Category deleted" });
      queryClient.invalidateQueries();
    } catch (err) {
      toast({ title: "Failed to delete category", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Categories</h1>
          <p className="text-muted-foreground">Manage your spending categories.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl hover-elevate shadow">
              <Plus className="w-4 h-4 mr-2" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Travel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" className="w-16 p-1 h-10" {...field} />
                          <Input type="text" className="flex-1 font-mono uppercase" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createCategory.isPending}>
                    {createCategory.isPending ? "Creating..." : "Create Category"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
          <CardTitle className="text-lg">All Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingCategories ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : categoriesArray.length > 0 ? (
            <div className="divide-y divide-border/50">
              {categoriesArray.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color }} />
                    <span className="font-medium text-sm">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {cat.isDefault && (
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground px-2 py-0.5 bg-muted rounded-full">Default</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      onClick={() => openEdit({ id: cat.id, name: cat.name, color: cat.color })}
                      title="Edit category"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cat.isDefault ? "h-8 w-8 text-muted-foreground/30 cursor-not-allowed" : "h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"}
                      disabled={cat.isDefault}
                      onClick={() => { if (!cat.isDefault) { setPendingDeleteId(cat.id); setPendingDeleteName(cat.name); } }}
                      title={cat.isDefault ? "Cannot delete default category" : "Delete category"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground text-sm">No categories found.</div>
          )}
        </CardContent>
      </Card>

        {/* Edit category dialog */}
        <Dialog open={editOpen} onOpenChange={(open) => { if (!open) { setEditing(null); } setEditOpen(open); }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4 pt-2">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Travel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input type="color" className="w-16 p-1 h-10" {...field} />
                          <Input type="text" className="flex-1 font-mono uppercase" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-4">
                  <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditing(null); }}>Cancel</Button>
                  <Button type="submit" className="ml-2">Save Changes</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) { setPendingDeleteId(null); setPendingDeleteName(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this category?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>"{pendingDeleteName}"</strong> will be removed. Expenses linked to it will not be deleted, but they'll lose the category association.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex justify-end gap-2 pt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { if (pendingDeleteId) { handleDelete(pendingDeleteId); setPendingDeleteId(null); setPendingDeleteName(""); } }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
