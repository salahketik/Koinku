"use client"

import React, { useState, useMemo } from 'react';
import { 
  User, 
  Trash2, 
  Database, 
  Target, 
  Activity, 
  Save, 
  FileJson, 
  FileSpreadsheet, 
  Settings, 
  Plus, 
  Search, 
  Zap,
  UploadCloud,
  Loader2,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Category, Transaction } from '@/app/lib/types';
import { cn } from '@/lib/utils';

interface ProfileViewProps {
  transactions: Transaction[];
  categories: Category[];
  initialBalance: number;
  emergencyFundTarget: number;
  isOnline: boolean;
  isSavingProfile: boolean;
  isSyncingCategories: boolean;
  missingSystemCategories: Category[];
  onUpdateProfile: (balance: number, target: number) => void;
  onAddCategory: (name: string, type: 'expense' | 'income', budget?: number) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateCategoryBudget: (id: string, budget: number) => void;
  onPushMissingCategories: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onResetData: () => void;
}

export function ProfileView({
  transactions,
  categories,
  initialBalance,
  emergencyFundTarget,
  isOnline,
  isSavingProfile,
  isSyncingCategories,
  missingSystemCategories,
  onUpdateProfile,
  onAddCategory,
  onDeleteCategory,
  onUpdateCategoryBudget,
  onPushMissingCategories,
  onExportJSON,
  onExportCSV,
  onResetData
}: ProfileViewProps) {
  const [tempBalance, setTempBalance] = useState(initialBalance);
  const [tempTarget, setTempTarget] = useState(emergencyFundTarget);
  const [catSearch, setCatSearch] = useState('');
  const [catFilter, setCatFilter] = useState<'expense' | 'income'>('expense');
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState<number>(0);

  const stats = useMemo(() => {
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const currentBalance = initialBalance + totalIncome - totalExpense;
    const savingsRatio = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentExpenses = transactions.filter(t => t.type === 'expense' && new Date(t.date) >= thirtyDaysAgo);
    const dailyAverage = recentExpenses.length > 0 ? recentExpenses.reduce((sum, t) => sum + t.amount, 0) / 30 : 0;

    const progressToTarget = emergencyFundTarget > 0 ? (currentBalance / emergencyFundTarget) * 100 : 0;
    const healthScore = Math.min(Math.max((savingsRatio * 0.5) + (progressToTarget * 0.5), 0), 100);

    return { totalIncome, totalExpense, currentBalance, savingsRatio, dailyAverage, healthScore };
  }, [transactions, initialBalance, emergencyFundTarget]);

  const categoryUsage = useMemo(() => {
    const usage: { [key: string]: number } = {};
    transactions.forEach(t => {
      usage[t.categoryId] = (usage[t.categoryId] || 0) + t.amount;
    });
    return usage;
  }, [transactions]);

  const filteredCategories = useMemo(() => {
    return categories
      .filter(c => c.type === catFilter)
      .filter(c => c.name.toLowerCase().includes(catSearch.toLowerCase()));
  }, [categories, catFilter, catSearch]);

  const formatDots = (val: number) => val.toLocaleString('id-ID');

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
      {/* Profile Header */}
      <div className="neo-card bg-white p-10 flex flex-col items-center text-center">
        <Avatar className="h-28 w-28 neo-border border-4 mb-6 shadow-xl">
          <AvatarImage src={`https://picsum.photos/seed/koin-ku-pro/150`} />
          <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <h3 className="text-3xl font-black uppercase italic tracking-tighter">Profil Finansial Elit</h3>
        <p className="text-[10px] font-black uppercase opacity-40 mt-2 tracking-widest italic">Solo Edition Pro v6.0</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7 space-y-8">
          
          {/* Health Score Card */}
          <div className={cn(
            "neo-card border-b-[12px] p-8 flex items-center justify-between transition-all",
            stats.healthScore > 70 ? "bg-green-50" : stats.healthScore > 40 ? "bg-blue-50" : "bg-amber-50"
          )}>
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 rounded-full neo-border border-4 bg-white flex items-center justify-center relative">
                <Zap className={cn("h-8 w-8", stats.healthScore > 40 ? "text-primary" : "text-amber-500")} />
                <div className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded-full neo-border border-1">VITALITY</div>
              </div>
              <div>
                 <h4 className="text-2xl font-black italic tracking-tighter">{Math.round(stats.healthScore)} / 100</h4>
                 <p className="text-[10px] font-black uppercase opacity-40 italic">Financial Health Status</p>
              </div>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[9px] font-black uppercase opacity-40 mb-1">Performa</p>
              <p className={cn("text-xs font-black uppercase italic", stats.healthScore > 50 ? "text-primary" : "text-amber-600")}>
                {stats.healthScore > 70 ? 'Optimal' : stats.healthScore > 40 ? 'Stabil' : 'Waspada'}
              </p>
            </div>
          </div>

          {/* Category Management */}
          <div className="neo-card bg-white p-8 border-b-[12px] space-y-8">
            <div className="flex flex-col gap-4 border-b-2 border-black/5 pb-4">
              <div className="flex items-center gap-3">
                <Settings className="h-5 w-5 text-secondary" />
                <h4 className="font-black uppercase text-sm italic">Kelola Kategori & Anggaran</h4>
              </div>
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 opacity-30" />
                <Input 
                  placeholder="Cari kategori..." 
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  className="neo-border rounded-xl h-12 pl-12 text-[11px] font-bold w-full"
                />
              </div>
            </div>
            
            <div className="flex gap-2 p-1.5 bg-muted rounded-2xl neo-border w-full">
              {(['expense', 'income'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setCatFilter(type)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all",
                    catFilter === type ? "bg-black text-white neo-shadow-sm" : "opacity-40 hover:opacity-100"
                  )}
                >
                  {type === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2 bg-muted/20 p-4 rounded-2xl neo-border border-1">
                <p className="text-[9px] font-black uppercase opacity-40">Tambah Kategori Baru</p>
                <div className="flex gap-2">
                  <Input 
                    placeholder="Nama Kategori..." 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="neo-border rounded-xl h-12 text-[11px] font-bold flex-1"
                  />
                  {catFilter === 'expense' && (
                    <Input 
                      placeholder="Anggaran (Rp)..." 
                      value={newCatBudget === 0 ? '' : newCatBudget.toLocaleString('id-ID')}
                      onChange={(e) => setNewCatBudget(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                      className="neo-border rounded-xl h-12 text-[11px] font-bold w-32"
                    />
                  )}
                  <Button onClick={() => { onAddCategory(newCatName, catFilter, newCatBudget); setNewCatName(''); setNewCatBudget(0); }} disabled={!newCatName} className="h-12 w-12 bg-black text-white neo-border rounded-xl shrink-0">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 max-h-[450px] overflow-y-auto pr-2 no-scrollbar">
                {filteredCategories.map((cat) => (
                  <div key={cat.id} className="flex flex-col gap-3 p-4 bg-white neo-border border-1 rounded-2xl group hover:bg-muted/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="h-5 w-5 rounded-full shrink-0 neo-border border-1" style={{ backgroundColor: cat.color }} />
                        <span className="text-[11px] font-black uppercase truncate block">{cat.name}</span>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="neo-border rounded-[32px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-black italic text-xl">Hapus Kategori?</AlertDialogTitle>
                            <AlertDialogDescription className="font-bold">Aksi ini akan menghapus kategori "{cat.name}".</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="neo-border rounded-xl">Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteCategory(cat.id)} className="neo-border bg-destructive text-white rounded-xl">Ya, Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    {cat.type === 'expense' && (
                      <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl neo-border border-1 border-dashed">
                        <Wallet className="h-3.5 w-3.5 opacity-30" />
                        <div className="flex-1">
                          <p className="text-[8px] font-black uppercase opacity-40">Batas Anggaran Bulanan</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black italic">Rp</span>
                             <input 
                               type="text"
                               value={cat.budget?.toLocaleString('id-ID') || '0'}
                               onChange={(e) => onUpdateCategoryBudget(cat.id, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)}
                               className="bg-transparent border-none focus:outline-none text-[12px] font-black w-full"
                             />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[8px] font-black uppercase opacity-40">Terpakai</p>
                          <p className={cn("text-[10px] font-black", (categoryUsage[cat.id] || 0) > (cat.budget || 0) && cat.budget ? "text-red-500" : "text-primary")}>
                            {Math.round(((categoryUsage[cat.id] || 0) / (cat.budget || 1)) * 100)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-5 space-y-8">
          {/* Targets & Balance */}
          <div className="neo-card bg-white p-8 border-b-[12px] space-y-8">
            <div className="flex items-center gap-3 border-b-2 border-black/5 pb-4">
              <Target className="h-5 w-5 text-accent" />
              <h4 className="font-black uppercase text-sm italic">Target & Saldo</h4>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40 tracking-widest">Saldo Awal</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black opacity-30">Rp</span>
                  <Input 
                    type="text" 
                    inputMode="numeric"
                    value={formatDots(tempBalance)} 
                    onChange={(e) => setTempBalance(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} 
                    className="neo-border h-16 pl-12 font-black text-2xl rounded-2xl bg-muted/20 focus:bg-white transition-all" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase opacity-40 tracking-widest">Target Dana Darurat</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black opacity-30">Rp</span>
                  <Input 
                    type="text" 
                    inputMode="numeric"
                    value={formatDots(tempTarget)} 
                    onChange={(e) => setTempTarget(parseInt(e.target.value.replace(/\D/g, ''), 10) || 0)} 
                    className="neo-border h-16 pl-12 font-black text-2xl rounded-2xl bg-muted/20 focus:bg-white transition-all" 
                  />
                </div>
              </div>
              <Button 
                onClick={() => onUpdateProfile(tempBalance, tempTarget)} 
                disabled={isSavingProfile}
                className="w-full h-16 neo-border bg-black text-white hover:bg-primary font-black uppercase text-[11px] rounded-[24px] flex gap-3 transition-all"
              >
                {isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Simpan Profil
              </Button>
            </div>
          </div>

          {/* Data Controls */}
          <div className="neo-card bg-white p-8 border-b-[12px] space-y-6">
            <div className="flex items-center gap-3 border-b-2 border-black/5 pb-4">
              <Database className="h-5 w-5 text-primary" />
              <h4 className="font-black uppercase text-sm italic">Kontrol Data</h4>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <Button onClick={onExportJSON} variant="outline" className="h-14 neo-border rounded-xl font-black uppercase text-[10px] flex gap-2">
                <FileJson className="h-4 w-4" /> Backup JSON (Private)
              </Button>
              <Button onClick={onExportCSV} variant="outline" className="h-14 neo-border rounded-xl font-black uppercase text-[10px] flex gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Laporan CSV (Excel)
              </Button>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full h-14 neo-border rounded-xl font-black uppercase text-[10px] flex gap-2">
                  <Trash2 className="h-4 w-4" /> Bersihkan Seluruh Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="neo-border rounded-[32px]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-black italic text-xl flex items-center gap-3">
                    <AlertTriangle className="text-red-500" /> Hapus Semua Data?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="font-bold">Ini adalah aksi permanen. Seluruh riwayat Anda akan hilang selamanya.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="neo-border rounded-xl">Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onResetData} className="neo-border bg-destructive text-white rounded-xl">HAPUS PERMANEN</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}
