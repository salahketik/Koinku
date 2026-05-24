"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Plus,
  LayoutDashboard,
  History,
  CreditCard,
  Trash2,
  Database,
  Target,
  Coins,
  WifiOff,
  Wifi,
  RefreshCw,
  Loader2,
  Save,
  FileJson,
  FileSpreadsheet,
  Settings,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { Dashboard } from '@/app/components/Dashboard';
import { TransactionList } from '@/app/components/TransactionList';
import { TransactionForm } from '@/app/components/TransactionForm';
import { Transaction, Category, INITIAL_CATEGORIES } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';

type View = 'dashboard' | 'transactions' | 'profile';

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [emergencyFundTarget, setEmergencyFundTarget] = useState<number>(20000000);
  const [initialBalance, setInitialBalance] = useState<number>(0);
  
  const [tempInitialBalance, setTempInitialBalance] = useState<number>(0);
  const [tempEmergencyFundTarget, setTempEmergencyFundTarget] = useState<number>(20000000);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
  const [mounted, setMounted] = useState(false);
  
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  const loadFromCache = useCallback(() => {
    const cachedTransactions = localStorage.getItem('koinku_transactions');
    const cachedCategories = localStorage.getItem('koinku_categories');
    const cachedProfile = localStorage.getItem('koinku_profile');

    if (cachedTransactions) setTransactions(JSON.parse(cachedTransactions));
    if (cachedCategories) setCategories(JSON.parse(cachedCategories));
    if (cachedProfile) {
      const profile = JSON.parse(cachedProfile);
      setInitialBalance(profile.initialBalance);
      setEmergencyFundTarget(profile.emergencyFundTarget);
      setTempInitialBalance(profile.initialBalance);
      setTempEmergencyFundTarget(profile.emergencyFundTarget);
    }
  }, []);

  const saveToCache = useCallback((type: 'transactions' | 'categories' | 'profile', data: any) => {
    localStorage.setItem(`koinku_${type}`, JSON.stringify(data));
  }, []);

  const syncWithServer = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      // Sync Profile
      const { data: profileData } = await supabase.from('profiles').select('*').eq('id', 'global').maybeSingle();
      if (profileData) {
        const p = { 
          initialBalance: Number(profileData.initial_balance), 
          emergencyFundTarget: Number(profileData.emergency_fund_target) 
        };
        setInitialBalance(p.initialBalance);
        setEmergencyFundTarget(p.emergencyFundTarget);
        setTempInitialBalance(p.initialBalance);
        setTempEmergencyFundTarget(p.emergencyFundTarget);
        saveToCache('profile', p);
      }

      // Sync Categories
      const { data: catData } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (catData && catData.length > 0) {
        const cats = catData.map(c => ({ id: c.id, name: c.name, type: c.type, color: c.color }));
        setCategories(cats);
        saveToCache('categories', cats);
      } else if (categories.length === 0) {
        setCategories(INITIAL_CATEGORIES);
        saveToCache('categories', INITIAL_CATEGORIES);
      }

      // Sync Transactions
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
  }, [saveToCache, categories.length]);

  useEffect(() => {
    setMounted(true);
    loadFromCache();
    syncWithServer();

    const handleOnline = () => { setIsOnline(true); syncWithServer(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncWithServer, loadFromCache]);

  const handleUpdateProfile = async () => {
    setIsSavingProfile(true);
    const newProfile = { initialBalance: tempInitialBalance, emergencyFundTarget: tempEmergencyFundTarget };
    setInitialBalance(tempInitialBalance);
    setEmergencyFundTarget(tempEmergencyFundTarget);
    saveToCache('profile', newProfile);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          initial_balance: tempInitialBalance, 
          emergency_fund_target: tempEmergencyFundTarget,
          updated_at: new Date().toISOString() 
        })
        .eq('id', 'global');
      if (error) throw error;
      toast({ title: "Profil Diperbarui", description: "Sinkronisasi sistem berhasil." });
    } catch (err) {
      toast({ variant: "destructive", title: "Berhasil Lokal", description: "Data tersimpan di perangkat (Mode Offline)." });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddTransaction = async (data: any) => {
    const transactionId = editingTransaction?.id || `TX-${Math.random().toString(36).substr(2, 9)}`;
    const newTransaction = {
      id: transactionId,
      description: data.description,
      amount: data.amount,
      type: data.type,
      category_id: data.categoryId,
      date: editingTransaction?.date || new Date().toISOString(),
    };

    const updatedTransactions = editingTransaction 
      ? transactions.map(t => t.id === transactionId ? { ...t, ...newTransaction, categoryId: data.categoryId, amount: Number(data.amount) } : t)
      : [{ ...newTransaction, categoryId: data.categoryId, amount: Number(data.amount) } as Transaction, ...transactions];
    
    setTransactions(updatedTransactions as Transaction[]);
    saveToCache('transactions', updatedTransactions);
    setIsFormOpen(false);
    setEditingTransaction(null);

    try {
      const { error } = await supabase.from('transactions').upsert([newTransaction]);
      if (error) throw error;
      toast({ title: editingTransaction ? "Data Diubah" : "Berhasil Dicatat" });
    } catch (err) {
      toast({ variant: "destructive", title: "Mode Offline", description: "Transaksi tersimpan di memori perangkat." });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const updatedTransactions = transactions.filter(t => t.id !== id);
    setTransactions(updatedTransactions);
    saveToCache('transactions', updatedTransactions);

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Berhasil Dihapus" });
    } catch (err) {
      toast({ variant: "destructive", title: "Hapus Lokal", description: "Data terhapus di memori perangkat." });
    }
  };

  const handleResetData = async () => {
    setTransactions([]);
    saveToCache('transactions', []);
    try {
      const { error } = await supabase.from('transactions').delete().neq('id', 'none');
      if (error) throw error;
      toast({ title: "Semua Data Dihapus", description: "Riwayat Anda telah dibersihkan." });
    } catch (e) {
      toast({ title: "Reset Lokal Berhasil" });
    }
  };

  const handleExportJSON = () => {
    const data = JSON.stringify({ transactions, categories, profile: { initialBalance, emergencyFundTarget } }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `koinku_backup_${new Date().toISOString().split('T')[0]}.json`;
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
    a.download = `koinku_laporan_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const formatDots = (val: number) => val > 0 ? val.toLocaleString('id-ID') : '';

  if (!mounted) return null;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/30 relative">
      
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
          "p-5 rounded-[28px] border-2 border-dashed flex items-center gap-3 transition-colors",
          !isOnline ? "bg-red-50 border-red-200" : "bg-primary/5 border-primary/20"
        )}>
           {!isOnline ? <WifiOff className="h-5 w-5 text-red-500" /> : <Wifi className="h-5 w-5 text-primary" />}
           <div className="overflow-hidden">
             <p className={cn("font-black text-[10px] uppercase truncate", !isOnline ? "text-red-500" : "text-primary")}>
               {!isOnline ? 'Offline' : isSyncing ? 'Sinkron...' : 'Solo Edition'}
             </p>
           </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        
        {/* Header Global */}
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

        {/* Scrollable Content Area */}
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
              <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4">
                <div className="neo-card bg-white p-10 flex flex-col items-center text-center">
                  <Avatar className="h-28 w-28 neo-border border-4 mb-6">
                    <AvatarImage src={`https://picsum.photos/seed/pribadi-full/150`} />
                  </Avatar>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter">Pengaturan Pribadi</h3>
                  <p className="text-[10px] font-black uppercase opacity-40 mt-2 tracking-widest italic">Solo User Edition</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-7 space-y-8">
                    {/* Profile Settings */}
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
                              value={formatDots(tempInitialBalance)} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                                setTempInitialBalance(val);
                              }} 
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
                              value={formatDots(tempEmergencyFundTarget)} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                                setTempEmergencyFundTarget(val);
                              }} 
                              className="neo-border h-16 pl-12 font-black text-2xl rounded-2xl bg-muted/20 focus:bg-white transition-all" 
                            />
                          </div>
                        </div>
                        <Button 
                          onClick={handleUpdateProfile} 
                          disabled={isSavingProfile}
                          className="w-full h-16 neo-border bg-black text-white hover:bg-primary font-black uppercase text-[11px] rounded-[24px] flex gap-3 transition-all"
                        >
                          {isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                          Simpan Perubahan Profil
                        </Button>
                      </div>
                    </div>

                    {/* Data Control Section */}
                    <div className="neo-card bg-white p-8 border-b-[12px] space-y-6">
                      <div className="flex items-center gap-3 border-b-2 border-black/5 pb-4">
                        <Database className="h-5 w-5 text-primary" />
                        <h4 className="font-black uppercase text-sm italic">Kontrol Data</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Button onClick={handleExportJSON} variant="outline" className="h-14 neo-border rounded-xl font-black uppercase text-[10px] flex gap-2">
                          <FileJson className="h-4 w-4" /> Backup JSON
                        </Button>
                        <Button onClick={handleExportCSV} variant="outline" className="h-14 neo-border rounded-xl font-black uppercase text-[10px] flex gap-2">
                          <FileSpreadsheet className="h-4 w-4" /> Ekspor CSV
                        </Button>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full h-14 neo-border rounded-xl font-black uppercase text-[10px] flex gap-2">
                            <Trash2 className="h-4 w-4" /> Reset Semua Data
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="neo-border rounded-[32px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="font-black italic text-xl flex items-center gap-3">
                              <AlertTriangle className="text-red-500" /> Hapus Permanen?
                            </AlertDialogTitle>
                            <AlertDialogDescription className="font-bold">
                              Semua riwayat transaksi Anda akan dihapus selamanya. Pastikan sudah melakukan backup.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="neo-border rounded-xl">Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleResetData} className="neo-border bg-destructive text-white rounded-xl">Ya, Hapus Semua</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-8">
                    <div className="neo-card bg-primary/5 p-8 border-b-[10px] text-center">
                       <Coins className="h-12 w-12 text-primary mx-auto mb-4" />
                       <h4 className="font-black uppercase text-[10px] tracking-widest mb-1 opacity-40">Tipe Lisensi</h4>
                       <p className="font-black text-xl italic tracking-tighter">SOLO EDITION</p>
                       <div className="h-2 w-full bg-muted rounded-full mt-6 overflow-hidden neo-border border-1">
                        <div className="h-full bg-primary w-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
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
              <button onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} className="h-14 w-14 bg-primary text-white neo-border rounded-full flex items-center justify-center neo-interactive -translate-y-2 border-white/20">
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
        <DialogContent className="p-0 border-0 bg-white max-w-lg h-[90vh] rounded-[40px] md:rounded-[48px] overflow-hidden flex flex-col neo-border-black">
          <DialogHeader className="sr-only">
            <DialogTitle>Input Transaksi</DialogTitle>
            <DialogDescription>Simpan riwayat pengeluaran atau pemasukan baru.</DialogDescription>
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
      `}</style>
    </div>
  );
}
