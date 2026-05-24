"use client"

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Sparkles, Loader2, Check, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { Category, Transaction } from '@/app/lib/types';
import { suggestTransactionCategory } from '@/ai/flows/transaction-category-suggestion';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  description: z.string().min(2, "Minimal 2 karakter"),
  amount: z.coerce.number().positive("Harus lebih dari 0"),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1, "Pilih kategori"),
});

interface TransactionFormProps {
  categories: Category[];
  initialData?: Transaction | null;
  pastTransactions?: Transaction[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export function TransactionForm({ categories, initialData, pastTransactions = [], onSubmit, onCancel }: TransactionFormProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ categoryId: string, name: string, confidence: number } | null>(null);
  const [catSearch, setCatSearch] = useState('');
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData ? {
      description: initialData.description,
      amount: initialData.amount,
      type: initialData.type,
      categoryId: initialData.categoryId,
    } : {
      description: "",
      amount: 0,
      type: "expense",
      categoryId: "",
    },
  });

  const currentType = form.watch('type');
  const currentAmount = form.watch('amount');
  const currentDesc = form.watch('description');
  const currentCatId = form.watch('categoryId');

  const [displayAmount, setDisplayAmount] = useState(initialData?.amount.toLocaleString('id-ID') || '');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const numericValue = parseInt(rawValue, 10) || 0;
    setDisplayAmount(numericValue > 0 ? numericValue.toLocaleString('id-ID') : '');
    form.setValue('amount', numericValue);
  };

  const filteredCategories = useMemo(() => {
    return categories
      .filter(c => c.type === currentType)
      .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, currentType, catSearch]);

  const handleAISuggestion = async () => {
    if (currentDesc.length < 3) return;
    setIsSuggesting(true);
    setAiSuggestion(null);
    try {
      const result = await suggestTransactionCategory({
        description: currentDesc,
        amount: currentAmount,
        type: currentType,
        pastTransactions: pastTransactions.slice(0, 10).map(t => ({
          description: t.description,
          category: categories.find(c => c.id === t.categoryId)?.name || 'Umum',
          type: t.type
        }))
      });

      if (result && result.suggestedCategory) {
        const found = categories.find(c => 
          c.name.toLowerCase().includes(result.suggestedCategory.toLowerCase()) && 
          c.type === currentType
        );
        if (found) {
          setAiSuggestion({
            categoryId: found.id,
            name: found.name,
            confidence: result.confidenceScore
          });
          
          if (result.confidenceScore > 85) {
            form.setValue('categoryId', found.id);
            toast({ title: "Saran AI Diterapkan Otomatis", description: `Confidence: ${result.confidenceScore}%` });
          }
        }
      }
    } catch (error) {
      console.error("AI Error:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const applyAISuggestion = () => {
    if (aiSuggestion) {
      form.setValue('categoryId', aiSuggestion.categoryId);
      setAiSuggestion(null);
      toast({ title: "Kategori Terpilih", description: aiSuggestion.name });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b-4 border-black bg-white sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl neo-border bg-black text-white flex items-center justify-center">
            <Check className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-black uppercase italic tracking-tighter">
            {initialData ? "Ubah Transaksi" : "Catat Transaksi"}
          </h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onCancel} className="h-10 w-10 rounded-xl neo-border hover:bg-red-50 hover:text-red-500">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar pb-32">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Tipe & Nominal */}
            <div className="space-y-4">
              <div className="flex gap-2 p-1.5 bg-muted/30 neo-border rounded-2xl w-fit mx-auto">
                {(['expense', 'income'] as const).map(type => (
                  <button key={type} type="button" onClick={() => form.setValue('type', type)} className={cn(
                      "px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all",
                      currentType === type ? "bg-black text-white neo-shadow-sm" : "text-black/40 hover:bg-white"
                    )}
                  >
                    {type === 'expense' ? 'Keluar' : 'Masuk'}
                  </button>
                ))}
              </div>

              <div className="text-center space-y-2">
                <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Nominal Transaksi</label>
                <div className="flex items-center justify-center gap-3">
                  <span className="text-3xl font-black opacity-20">Rp</span>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    value={displayAmount} 
                    onChange={handleAmountChange} 
                    placeholder="0"
                    className={cn(
                      "w-full bg-transparent text-center text-5xl font-black tracking-tighter focus:outline-none placeholder:opacity-10 py-2",
                      currentType === 'expense' ? "text-black" : "text-green-600"
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Deskripsi */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Catatan</label>
                <button 
                  type="button" 
                  onClick={handleAISuggestion} 
                  disabled={isSuggesting || currentDesc.length < 3}
                  className="flex items-center gap-2 text-[9px] font-black uppercase text-accent hover:opacity-70 disabled:opacity-20 transition-all"
                >
                  {isSuggesting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Cek Kategori AI
                </button>
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <Textarea 
                  {...field} 
                  placeholder="Misal: Jajan Kopi Sore"
                  className="neo-border rounded-2xl p-4 font-bold min-h-[100px] bg-white resize-none text-base"
                />
              )} />

              {aiSuggestion && (
                <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                  <button 
                    type="button" 
                    onClick={applyAISuggestion}
                    className="w-full flex items-center justify-between p-4 bg-accent/10 neo-border rounded-2xl group hover:bg-accent/20 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-accent" />
                      <div className="text-left">
                        <p className="text-[8px] font-black uppercase opacity-40">Prediksi AI</p>
                        <p className="text-xs font-black uppercase">{aiSuggestion.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black uppercase opacity-40">Confidence</p>
                      <p className="text-xs font-black">{aiSuggestion.confidence}%</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Kategori */}
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-[10px] font-black uppercase opacity-30 tracking-widest">Pilih Kategori</label>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 opacity-30" />
                  <input 
                    value={catSearch} 
                    onChange={(e) => setCatSearch(e.target.value)} 
                    placeholder="Cari..."
                    className="pl-7 pr-2 py-1 bg-muted/50 rounded-lg text-[9px] font-bold focus:outline-none neo-border border-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredCategories.map(cat => (
                  <button 
                    key={cat.id} 
                    type="button" 
                    onClick={() => form.setValue('categoryId', cat.id)}
                    className={cn(
                      "p-3 rounded-2xl text-[9px] font-black uppercase flex items-center gap-3 transition-all neo-border relative",
                      currentCatId === cat.id ? "bg-black text-white neo-shadow-sm" : "bg-white hover:bg-muted"
                    )}
                  >
                    <div className="w-5 h-5 rounded-full neo-border border-1 shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate flex-1 text-left">{cat.name}</span>
                    {currentCatId === cat.id && (
                      <Check className="h-3 w-3 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {filteredCategories.length === 0 && (
                <p className="text-[9px] font-bold italic opacity-30 text-center py-4">Kategori tidak ditemukan.</p>
              )}
            </div>
          </form>
        </Form>
      </div>

      {/* Footer Button */}
      <div className="p-6 border-t-4 border-black bg-white sticky bottom-0 z-30">
        <Button 
          onClick={form.handleSubmit(onSubmit)}
          disabled={!currentCatId || currentAmount <= 0 || currentDesc.length < 2}
          className="w-full h-16 rounded-2xl bg-black text-white hover:bg-primary font-black uppercase text-xs neo-interactive neo-border neo-shadow-sm flex gap-3 transition-all"
        >
          {initialData ? "Perbarui Data" : "Simpan Transaksi"}
          <Check className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
