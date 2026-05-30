"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  User, 
  Plus,
  LayoutDashboard,
  History,
  CreditCard,
  WifiOff,
  Wifi,
  Loader2,
  Activity
} from 'lucide-react';
import { Dashboard } from '@/app/components/Dashboard';
import { TransactionList } from '@/app/components/TransactionList';
import { TransactionForm } from '@/app/components/TransactionForm';
import { ProfileView } from '@/app/components/ProfileView';
import { Transaction, Category, INITIAL_CATEGORIES } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';

type View = 'dashboard' | 'transactions' | 'profile';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [emergencyFundTarget, setEmergencyFundTarget] = useState<number>(20000000);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSyncingCategories, setIsSyncingCategories] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const saveToCache = useCallback((type: 'transactions' | 'categories' | 'profile', data: any) => {
    localStorage.setItem(`koinku_${type}`, JSON.stringify(data));
  }, []);

  const syncWithServer = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', 'global').maybeSingle();
      if (profileData) {
        const p = { 
          initialBalance: Number(profileData.initial_balance), 
          emergencyFundTarget: Number(profileData.emergency_fund_target) 
        };
        setInitialBalance(p.initialBalance);
        setEmergencyFundTarget(p.emergencyFundTarget);
        saveToCache('profile', p);
      }

      const { data: catData } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (catData && catData.length > 0) {
        const cats = catData.map(c => ({ 
          id: c.id, 
          name: c.name, 
          type: c.type, 
          color: c.color,
          budget: Number(c.budget) || 0 
        }));
        setCategories(cats);
        saveToCache('categories', cats);
      }

      const { data: transData } = await supabase.from('transactions').select('*').order('date', { ascending: false });
      if (transData) {
        const trans = transData.map(t => ({ 
          id: t.id, 
          description: t.description, 
          amount: Number(t.amount), 
          date: t.date, 
          type: t.type, 
          categoryId: t.category_id 
        }));
        setTransactions(trans);
        saveToCache('transactions', trans);
      }
    } catch (err) {
      console.error('Sync Error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [saveToCache]);

  useEffect(() => {
    setMounted(true);
    const cachedTransactions = localStorage.getItem('koinku_transactions');
    const cachedCategories = localStorage.getItem('koinku_categories');
    const cachedProfile = localStorage.getItem('koinku_profile');

    if (cachedTransactions) setTransactions(JSON.parse(cachedTransactions));
    if (cachedCategories) setCategories(JSON.parse(cachedCategories));
    else setCategories(INITIAL_CATEGORIES);
    
    if (cachedProfile) {
      const p = JSON.parse(cachedProfile);
      setInitialBalance(p.initialBalance);
      setEmergencyFundTarget(p.emergencyFundTarget);
    }

    syncWithServer();

    const handleOnline = () => { setIsOnline(true); syncWithServer(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWithServer]);

  const missingSystemCategories = useMemo(() => {
    return INITIAL_CATEGORIES.filter(initial => 
      !categories.some(current => current.name.toLowerCase() === initial.name.toLowerCase())
    );
  }, [categories]);

  const handleUpdateProfile = async (balance: number, target: number) => {
    setIsSavingProfile(true);
    const newProfile = { initialBalance: balance, emergencyFundTarget: target };
    setInitialBalance(balance);
    setEmergencyFundTarget(target);
    saveToCache('profile', newProfile);

    try {
      const { error } = await supabase.from('profiles').update({ 
        initial_balance: balance, 
        emergency_fund_target: target,
        updated_at: new Date().toISOString() 
      }).eq('id', 'global');
      if (error) throw error;
      toast({ title: "Profil Tersinkron" });
    } catch (err) {
      toast({ variant: "destructive", title: "Berhasil Lokal" });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePushMissingCategories = async () => {
    if (!isOnline) return;
    setIsSyncingCategories(true);
    try {
      const { error } = await supabase.from('categories').upsert(missingSystemCategories);
      if (error) throw error;
      toast({ title: "Sistem Diperbarui" });
      await syncWithServer();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Gagal Sinkron" });
    } finally {
      setIsSyncingCategories(false);
    }
  };

  const handleAddTransaction = async (data: any) => {
    const id = editingTransaction?.id || `TX-${Math.random().toString(36).substr(2, 9)}`;
    const newTx = {
      id,
      description: data.description,
      amount: Number(data.amount),
      type: data.type,
      category_id: data.categoryId,
      date: editingTransaction?.date || new Date().toISOString(),
    };

    const updated = editingTransaction 
      ? transactions.map(t => t.id === id ? { ...t, ...newTx, categoryId: data.categoryId } : t)
      : [{ ...newTx, categoryId: data.categoryId } as Transaction, ...transactions];
    
    setTransactions(updated as Transaction[]);
    saveToCache('transactions', updated);
    setIsFormOpen(false);
    setEditingTransaction(null);

    try {
      await supabase.from('transactions').upsert([newTx]);
      toast({ title: editingTransaction ? "Data Diubah" : "Berhasil Dicatat" });
    } catch (err) {
      toast({ variant: "destructive", title: "Tersimpan Lokal" });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    saveToCache('transactions', updated);
    try {
      await supabase.from('transactions').delete().eq('id', id);
      toast({ title: "Terhapus" });
    } catch (err) {
      toast({ variant: "destructive", title: "Terhapus Lokal" });
    }
  };

  const handleAddCategory = async (name: string, type: 'expense' | 'income', budget?: number) => {
    const id = `cat-${Math.random().toString(36).substr(2, 9)}`;
    const colors = ['#FFD93D', '#6C5CE7', '#FF8AAE', '#FF6B6B', '#44DDFF', '#FFA502', '#2ED573'];
    const newCat = { id, name, type, budget, color: colors[Math.floor(Math.random() * colors.length)] };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveToCache('categories', updated);
    try {
      await supabase.from('categories').insert([newCat]);
      toast({ title: "Kategori Ditambah" });
    } catch (e) {
      toast({ title: "Simpan Lokal" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    saveToCache('categories', updated);
    try {
      await supabase.from('categories').delete().eq('id', id);
      toast({ title: "Kategori Dihapus" });
    } catch (e) {
      toast({ title: "Hapus Lokal" });
    }
  };

  const handleUpdateCategoryBudget = async (id: string, budget: number) => {
    const updated = categories.map(c => c.id === id ? { ...c, budget } : c);
    setCategories(updated);
    saveToCache('categories', updated);
    try {
      await supabase.from('categories').update({ budget }).eq('id', id);
    } catch (e) {
      console.warn("Budget update local only");
    }
  };

  const handleResetData = async () => {
    setTransactions([]);
    saveToCache('transactions', []);
    try {
      await supabase.from('transactions').delete().neq('id', 'none');
      toast({ title: "Data Dibersihkan" });
    } catch (e) {
      toast({ title: "Reset Lokal" });
    }
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ transactions, categories, initialBalance, emergencyFundTarget }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koinku_backup.json`;
    a.click();
  };

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Deskripsi', 'Tipe', 'Nominal', 'Kategori'];
    const rows = transactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.description,
      t.type === 'income' ? 'Masuk' : 'Keluar',
      t.amount,
      categories.find(c => c.id === t.categoryId)?.name || 'Lainnya'
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koinku_laporan.csv`;
    a.click();
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background overflow-hidden relative selection:bg-primary/30">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r-4 border-black p-8 gap-8 shrink-0 h-full z-40">
        <div className="flex items-center gap-4 px-2">
          <div className="h-12 w-12 bg-black neo-border border-white flex items-center justify-center rounded-2xl neo-shadow-sm">
            <CreditCard className="text-white h-6 w-6" />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">KOIN KU</h1>
        </div>
        <button 
          onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }}
          className="w-full flex items-center justify-center gap-3 p-5 rounded-[24px] bg-primary text-white font-black uppercase text-[11px] tracking-widest neo-interactive neo-border neo-shadow-sm"
        >
          <Plus className="h-5 w-5" /> Catat Baru
        </button>
        <nav className="flex-1 space-y-3">
          {[
            { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
            { id: 'transactions', label: 'Log', icon: History },
            { id: 'profile', label: 'Akun', icon: User },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-4 p-5 rounded-[24px] font-black uppercase text-[11px] tracking-widest transition-all neo-interactive",
                view === item.id ? "bg-secondary neo-border neo-shadow-sm translate-x-1" : "hover:bg-muted opacity-40"
              )}
            >
              <item.icon className="h-5 w-5" /> {item.label}
            </button>
          ))}
        </nav>
        <div className={cn(
          "p-5 rounded-[28px] border-2 border-dashed flex items-center gap-3",
          !isOnline ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/20"
        )}>
           {!isOnline ? <WifiOff className="h-5 w-5 text-red-500" /> : <Wifi className="h-5 w-5 text-primary" />}
           <p className={cn("font-black text-[10px] uppercase truncate", !isOnline ? "text-red-500" : "text-primary")}>
             {!isOnline ? 'Offline' : isSyncing ? 'Sinkron...' : 'Solo Edition'}
           </p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Mobile Header */}
        <header className="h-20 bg-white border-b-4 border-black px-6 md:px-10 flex items-center justify-between shrink-0 z-40">
          <div className="flex items-center gap-4">
            <div className="md:hidden h-10 w-10 bg-black rounded-xl flex items-center justify-center neo-border border-white/20">
              <Activity className="text-white h-5 w-5" />
            </div>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.3em] opacity-80 italic">
              {view === 'dashboard' ? 'Home' : view === 'transactions' ? 'Riwayat' : 'Pengaturan'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             {isSyncing && <Loader2 className="h-4 w-4 animate-spin opacity-40" />}
             <Avatar className="h-10 w-10 neo-border border-2 neo-shadow-sm">
               <AvatarImage src={`https://picsum.photos/seed/user-pribadi/100`} />
               <AvatarFallback>U</AvatarFallback>
             </Avatar>
          </div>
        </header>

        {/* Content Area */}
        <section className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar bg-[#f9fbf9] relative z-10">
          <div className="max-w-6xl mx-auto w-full pb-32 md:pb-10">
            {view === 'dashboard' && (
              <Dashboard 
                transactions={transactions} 
                categories={categories} 
                emergencyFundTarget={emergencyFundTarget} 
                initialBalance={initialBalance} 
              />
            )}
            {view === 'transactions' && (
              <TransactionList 
                transactions={transactions} 
                categories={categories} 
                onDelete={handleDeleteTransaction} 
                onEdit={(t) => { setEditingTransaction(t); setIsFormOpen(true); }} 
              />
            )}
            {view === 'profile' && (
              <ProfileView 
                transactions={transactions}
                categories={categories}
                initialBalance={initialBalance}
                emergencyFundTarget={emergencyFundTarget}
                isOnline={isOnline}
                isSavingProfile={isSavingProfile}
                isSyncingCategories={isSyncingCategories}
                missingSystemCategories={missingSystemCategories}
                onUpdateProfile={handleUpdateProfile}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateCategoryBudget={handleUpdateCategoryBudget}
                onPushMissingCategories={handlePushMissingCategories}
                onExportJSON={handleExportJSON}
                onExportCSV={handleExportCSV}
                onResetData={handleResetData}
              />
            )}
          </div>
        </section>

        {/* Mobile Navigation */}
        <div className="md:hidden fixed inset-x-0 bottom-0 px-4 pb-8 pt-4 z-50 pointer-events-none safe-area-bottom">
          <nav className="max-w-md mx-auto h-20 bg-white/95 backdrop-blur-xl neo-border rounded-[32px] px-2 flex items-center justify-between shadow-2xl pointer-events-auto">
            <button onClick={() => setView('dashboard')} className={cn("flex-1 h-14 flex flex-col items-center justify-center rounded-2xl gap-1", view === 'dashboard' ? "bg-secondary neo-border neo-shadow-sm" : "opacity-30")}>
              <LayoutDashboard className="h-5 w-5" />
              <span className="text-[7px] font-black uppercase">Home</span>
            </button>
            <button onClick={() => setView('transactions')} className={cn("flex-1 h-14 flex flex-col items-center justify-center rounded-2xl gap-1", view === 'transactions' ? "bg-secondary neo-border neo-shadow-sm" : "opacity-30")}>
              <History className="h-5 w-5" />
              <span className="text-[7px] font-black uppercase">Log</span>
            </button>
            <div className="flex-1 flex justify-center items-center">
              <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="h-14 w-14 bg-primary text-white neo-border rounded-full flex items-center justify-center neo-interactive -translate-y-2 border-white/20 shadow-xl">
                <Plus className="h-7 w-7" />
              </button>
            </div>
            <button onClick={() => setView('profile')} className={cn("flex-1 h-14 flex flex-col items-center justify-center rounded-2xl gap-1", view === 'profile' ? "bg-secondary neo-border neo-shadow-sm" : "opacity-30")}>
              <User className="h-5 w-5" />
              <span className="text-[7px] font-black uppercase">Akun</span>
            </button>
          </nav>
        </div>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="p-0 border-0 bg-white max-w-lg h-[90vh] rounded-[40px] md:rounded-[48px] overflow-hidden flex flex-col neo-border-black shadow-2xl">
          <DialogHeader className="p-6 pb-0 sr-only">
            <DialogTitle>Form Transaksi Elit</DialogTitle>
            <DialogDescription>Catat pengeluaran atau pemasukan baru Anda dengan asisten AI.</DialogDescription>
          </DialogHeader>
          <TransactionForm 
            categories={categories} 
            initialData={editingTransaction} 
            pastTransactions={transactions} 
            onSubmit={handleAddTransaction} 
            onCancel={() => setIsFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .safe-area-bottom {
          padding-bottom: calc(2rem + env(safe-area-inset-bottom));
        }
        @supports (-webkit-touch-callout: none) {
          .h-[100dvh] {
            height: -webkit-fill-available;
          }
        }
      `}</style>
    </div>
  );
}
