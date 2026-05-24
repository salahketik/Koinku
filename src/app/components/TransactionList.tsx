
"use client"

import React, { useState, useMemo } from 'react';
import { Transaction, Category } from '@/app/lib/types';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Search,
  Trash2,
  Edit2,
  ChevronDown,
  LayoutGrid,
  Sparkles,
  Filter,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip 
} from 'recharts';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  onDelete: (id: string) => void;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, categories, onDelete, onEdit }: TransactionListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'expense' | 'income'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => t.description.toLowerCase().includes(searchTerm.toLowerCase()))
      .filter(t => activeTab === 'all' || t.type === activeTab)
      .filter(t => categoryFilter === 'all' || t.categoryId === categoryFilter);
  }, [transactions, searchTerm, activeTab, categoryFilter]);

  const paginated = filtered.slice(0, pageSize);

  const pieData = useMemo(() => {
    const totalFiltered = filtered.reduce((sum, t) => sum + t.amount, 0);
    if (totalFiltered === 0) return [];
    
    return categories
      .filter(c => activeTab === 'all' || c.type === activeTab)
      .map(cat => {
        const amount = filtered
          .filter(t => t.categoryId === cat.id)
          .reduce((sum, t) => sum + t.amount, 0);
        return { name: cat.name, value: amount, color: cat.color };
      })
      .filter(d => d.value > 0);
  }, [categories, activeTab, filtered]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 pb-24 md:pb-0">
      <div className="lg:col-span-8 space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 opacity-30" />
              <Input 
                placeholder="Cari transaksi..." 
                className="pl-14 h-14 md:h-16 neo-border rounded-[24px] bg-white font-bold text-sm shadow-inner"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 p-1.5 bg-white neo-border rounded-[24px] shadow-sm">
              {(['all', 'expense', 'income'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    "px-6 md:px-8 py-2 md:py-3 rounded-2xl text-[10px] font-black uppercase transition-all",
                    activeTab === tab ? "bg-black text-white neo-shadow-sm" : "opacity-40 hover:opacity-100"
                  )}
                >
                  {tab === 'all' ? 'Semua' : tab === 'expense' ? 'Keluar' : 'Masuk'}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 opacity-30" />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[200px] neo-border rounded-xl bg-white font-black text-[10px] uppercase shadow-sm">
                <SelectValue placeholder="Pilih Kategori" />
              </SelectTrigger>
              <SelectContent className="neo-border rounded-xl">
                <SelectItem value="all" className="font-black uppercase text-[10px]">Semua Kategori</SelectItem>
                {categories.filter(c => activeTab === 'all' || c.type === activeTab).map(cat => (
                  <SelectItem key={cat.id} value={cat.id} className="font-black uppercase text-[10px]">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryFilter !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setCategoryFilter('all')} className="h-8 px-2">
                <X className="h-3 w-3 mr-2" /> <span className="text-[10px] font-black uppercase">Reset</span>
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {paginated.length > 0 ? (
            paginated.map((t) => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="neo-card p-4 md:p-5 flex items-center justify-between group bg-white border-b-8 md:border-b-[10px] hover:translate-x-1">
                  <div className="flex items-center gap-4 md:gap-5 overflow-hidden flex-1">
                    <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl neo-border flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: cat?.color || '#eee' }}>
                      {t.type === 'income' ? <ArrowDownLeft className="h-5 w-5 text-white" /> : <ArrowUpRight className="h-5 w-5 text-white" />}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm md:text-base font-black truncate tracking-tight leading-tight">{t.description}</h3>
                      <p className="text-[9px] font-black uppercase opacity-40 truncate">
                        {cat?.name || 'Tanpa Kategori'} • {new Date(t.date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 md:gap-6 shrink-0 ml-4">
                    <p className={cn("text-sm md:text-lg font-black italic tracking-tighter tabular-nums", t.type === 'income' ? "text-green-600" : "text-black")}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </p>
                    <div className="hidden md:flex gap-2">
                      <button onClick={() => onEdit(t)} className="p-2 neo-border rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><Edit2 className="h-4 w-4" /></button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-2 neo-border rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="neo-border rounded-[32px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-black italic text-xl">Hapus Data?</AlertDialogTitle>
                            <AlertDialogDescription className="font-bold">Aksi ini permanen dan tidak bisa dibatalkan dari sistem utama.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="neo-border rounded-xl">Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(t.id)} className="neo-border bg-destructive text-white rounded-xl">Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <button onClick={() => onEdit(t)} className="md:hidden p-2 opacity-30 hover:opacity-100">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="neo-card bg-white/50 p-16 text-center border-dashed border-2 opacity-20 italic font-bold rounded-[32px] shadow-inner">
              Belum ada riwayat ditemukan untuk filter ini.
            </div>
          )}
        </div>

        {filtered.length > pageSize && (
          <div className="flex justify-center pt-8">
            <Button onClick={() => setPageSize(prev => prev + 10)} className="neo-border bg-black text-white px-10 h-16 font-black uppercase rounded-[28px] text-xs neo-interactive shadow-lg">
              Lihat Lebih Banyak <ChevronDown className="ml-3 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      <div className="lg:col-span-4 space-y-8">
        <div className="neo-card bg-white p-6 md:p-8 border-b-[10px] sticky top-28">
          <div className="flex items-center gap-3 mb-6">
            <LayoutGrid className="h-5 w-5 opacity-30" />
            <h4 className="font-black text-[10px] uppercase tracking-widest opacity-30">Distribusi Kategori</h4>
          </div>
          {pieData.length > 0 ? (
            <div className="flex flex-col">
              <div className="h-48 md:h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={8} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#000" strokeWidth={2} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-black text-white p-4 rounded-2xl neo-border text-[10px] font-black uppercase shadow-2xl">
                            <p className="opacity-60">{payload[0].name}</p>
                            <p className="text-base italic">{formatCurrency(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 mt-6">
                {pieData.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-black uppercase">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-3 h-3 rounded-full neo-border shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="opacity-50 truncate max-w-[120px]">{d.name}</span>
                    </div>
                    <span className="tabular-nums">
                      {Math.round((d.value / (filtered.reduce((s, x) => s + x.amount, 0) || 1)) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 opacity-10 italic">
              <Sparkles className="h-10 w-10 mb-4" />
              <p className="text-[9px] font-black uppercase tracking-widest text-center">Data grafik belum cukup.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
