
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
  Activity
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
      } else {
        await supabase.from('profiles').insert([{ id: 'global', initial_balance: 0, emergency_fund_target: 20000000 }]);
      }

      const { data: catData } = await supabase.from('categories').select('*').order('name', { ascending: true });
      if (catData && catData.length > 0) {
        const cats = catData.map(c => ({ id: c.id, name: c.name, type: c.type, color: c.color }));
        setCategories(cats);
        saveToCache('categories', cats);
      } else {
        setCategories(INITIAL_CATEGORIES);
        saveToCache('categories', INITIAL_CATEGORIES);
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
    loadFromCache();
    syncWithServer();

    const handleOnline = () => { setIsOnline(true); syncWithServer(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const profileSub = supabase.channel('profile-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => syncWithServer()).subscribe();
    const catSub = supabase.channel('cat-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => syncWithServer()).subscribe();
    const transSub = supabase.channel('trans-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => syncWithServer()).subscribe();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(profileSub);
      supabase.removeChannel(catSub);
      supabase.removeChannel(transSub);
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
      toast({ title: "Profil Diperbarui", description: "Pengaturan Anda telah tersimpan di sistem utama." });
    } catch (err) {
      toast({ variant: "destructive", title: "Berhasil Lokal", description: "Data tersimpan di cache. Akan sinkron saat online." });
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
      ? transactions.map(t => t.id === transactionId ? { ...t, ...newTransaction, categoryId: data.categoryId } : t)
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
      toast({ variant: "destructive", title: "Mode Offline Aktif", description: "Transaksi tersimpan aman di perangkat Anda." });
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const updatedTransactions = transactions.filter(t => t.id !== id);
    setTransactions(updatedTransactions);
    saveToCache('transactions', updatedTransactions);

    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      toast({ variant: "destructive", title: "Hapus Lokal", description: "Sinkronisasi tertunda karena koneksi." });
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    const palette = ['#FFD93D', '#6C5CE7', '#FF8AAE', '#FF6B6B', '#44DDFF', '#54D696', '#A29BFE', '#FDCB6E', '#FF9F43', '#10AC84', '#00D2D3', '#5F27CD', '#FF9FF3', '#48DBFB', '#1DD1A1'];
    const usedColors = categories.map(c => c.color.toUpperCase());
    const availablePalette = palette.filter(color => !usedColors.includes(color.toUpperCase()));
    let chosenColor = availablePalette.length > 0 ? availablePalette[Math.floor(Math.random() * availablePalette.length)] : `hsl(${Math.floor(Math.random() * 360)}, 85%, 60%)`;

    const newCategory = { id: `cat-${Math.random().toString(36).substr(2, 5)}`, name: newCatName, type: newCatType, color: chosenColor };
    const updatedCats = [...categories, newCategory];
    setCategories(updatedCats);
    saveToCache('categories', updatedCats);
    setNewCatName('');

    try {
      const { error } = await supabase.from('categories').insert([newCategory]);
      if (error) throw error;
      toast({ title: "Kategori Baru Ditambahkan" });
    } catch (err) {
      toast({ variant: "destructive", title: "Tersimpan di Cache" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (transactions.some(t => t.categoryId === id)) {
      toast({ variant: "destructive", title: "Kategori Digunakan", description: "Hapus atau pindahkan transaksi terkait terlebih dahulu." });
      return;
    }
    const updatedCats = categories.filter(c => c.id !== id);
    setCategories(updatedCats);
    saveToCache('categories', updatedCats);

    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      toast({ variant: "destructive", title: "Gagal Hapus Sistem" });
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'transactions', label: 'Log', icon: History },
    { id: 'profile', label: 'Akun', icon: User },
  ];

  const formatDots = (val: number) => val > 0 ? val.toLocaleString('id-ID') : '';

  if (!mounted) return null;

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-background overflow-hidden selection:bg-primary/30">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-72 flex-col bg-white border-r-4 border-black p-8 gap-8 shrink-0 h-full z-20">
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
          {navItems.map((item) => (
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
               {!isOnline ? 'Offline Mode' : isSyncing ? 'Sinkron Sistem...' : 'Pribadi Aktif'}
             </p>
           </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Header Global */}
        <header className="h-20 bg-white border-b-4 border-black px-6 md:px-10 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-4">
            <div className="md:hidden h-10 w-10 bg-black rounded-xl flex items-center justify-center neo-border border-white/20">
              <Activity className="text-white h-5 w-5" />
            </div>
            <h2 className="text-xs md:text-sm font-black uppercase tracking-[0.3em] opacity-80 italic">
              {navItems.find(i => i.id === view)?.label}
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
             {isSyncing && <Loader2 className="h-4 w-4 animate-spin opacity-40" />}
             <div className="hidden md:flex flex-col text-right">
               <p className="text-[9px] font-black uppercase opacity-30">Status Sistem</p>
               <p className="text-[10px] font-black italic">Solo Edition</p>
             </div>
             <Avatar className="h-10 w-10 neo-border border-2 neo-shadow-sm">
               <AvatarImage src={`https://picsum.photos/seed/user-pribadi/100`} />
               <AvatarFallback>U</AvatarFallback>
             </Avatar>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <section className="flex-1 overflow-y-auto p-4 md:p-10 no-scrollbar bg-[#f9fbf9]">
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
                  <div className="relative mb-6">
                    <Avatar className="h-28 w-28 neo-border border-4">
                      <AvatarImage src={`https://picsum.photos/seed/pribadi-full/150`} />
                    </Avatar>
                    <div className="absolute -right-2 -bottom-2 h-10 w-10 bg-secondary neo-border rounded-xl flex items-center justify-center">
                      <Settings className="h-5 w-5" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-black uppercase italic tracking-tighter">Pengaturan Pribadi</h3>
                  <p className="text-[10px] font-black uppercase opacity-40 mt-2 tracking-widest italic">Solo User Edition • Lokal & Sistem</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <div className="md:col-span-7 space-y-8">
                    <div className="neo-card bg-white p-8 border-b-[12px] space-y-8">
                      <div className="flex items-center gap-3 border-b-2 border-black/5 pb-4">
                        <Target className="h-5 w-5 text-accent" />
                        <h4 className="font-black uppercase text-sm italic">Target & Saldo</h4>
                      </div>
                      
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase opacity-40 tracking-widest px-1">Saldo Awal</label>
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
                          <label className="text-[10px] font-black uppercase opacity-40 tracking-widest px-1">Target Dana Darurat</label>
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
                          disabled={isSavingProfile || (tempInitialBalance === initialBalance && tempEmergencyFundTarget === emergencyFundTarget)}
                          className="w-full h-16 neo-border bg-black text-white hover:bg-primary font-black uppercase text-[11px] rounded-[24px] neo-interactive neo-shadow-sm flex gap-3 transition-all"
                        >
                          {isSavingProfile ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                          Simpan Perubahan
                        </Button>
                      </div>
                    </div>

                    <div className="neo-card bg-white p-8 border-b-[12px] space-y-8">
                      <div className="flex items-center justify-between border-b-2 border-black/5 pb-4">
                        <h4 className="font-black uppercase text-sm italic">Daftar Kategori</h4>
                        <RefreshCw className={cn("h-4 w-4 opacity-30 cursor-pointer", isSyncing && "animate-spin")} onClick={() => syncWithServer()} />
                      </div>
                      <div className="grid grid-cols-1 gap-6">
                        <div className="flex flex-col gap-4">
                           <Input placeholder="Nama kategori baru..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="neo-border h-14 rounded-2xl font-bold px-6" />
                           <div className="flex gap-2">
                             <button onClick={() => setNewCatType('expense')} className={cn("flex-1 h-12 rounded-xl text-[9px] font-black uppercase neo-border transition-all", newCatType === 'expense' ? "bg-black text-white neo-shadow-sm" : "bg-white opacity-40")}>Keluar</button>
                             <button onClick={() => setNewCatType('income')} className={cn("flex-1 h-12 rounded-xl text-[9px] font-black uppercase neo-border transition-all", newCatType === 'income' ? "bg-black text-white neo-shadow-sm" : "bg-white opacity-40")}>Masuk</button>
                           </div>
                           <Button onClick={handleAddCategory} className="w-full neo-border bg-primary text-white h-14 font-black uppercase rounded-2xl neo-interactive">Tambah Kategori</Button>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar border-t-2 border-black/5 pt-4">
                          {categories.map(cat => (
                            <div key={cat.id} className="flex items-center justify-between p-4 neo-border bg-white rounded-2xl hover:bg-muted/30 transition-all">
                              <div className="flex items-center gap-4 overflow-hidden">
                                <div className="w-4 h-4 rounded-full neo-border shrink-0" style={{ backgroundColor: cat.color }} />
                                <span className="font-black text-[10px] uppercase truncate max-w-[120px]">{cat.name}</span>
                              </div>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <button className="text-red-500 p-2 hover:bg-red-50 rounded-xl transition-colors shrink-0"><Trash2 className="h-4 w-4" /></button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="neo-border rounded-[32px]">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle className="font-black italic text-xl">Hapus Kategori?</AlertDialogTitle>
                                    <AlertDialogDescription className="font-bold text-sm">Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="neo-border rounded-xl">Batal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteCategory(cat.id)} className="neo-border bg-destructive text-white rounded-xl">Hapus</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-5 space-y-8">
                    <div className="neo-card bg-amber-50 p-8 border-b-[12px] space-y-6">
                      <div className="flex items-center gap-3 border-b-2 border-amber-200 pb-4">
                        <Database className="h-5 w-5 text-amber-600" />
                        <h4 className="font-black uppercase text-sm italic">Arsip & Backup</h4>
                      </div>
                      <div className="space-y-4">
                        <Button onClick={() => {
                          const data = JSON.stringify({ transactions, categories, profile: { initialBalance, emergencyFundTarget } }, null, 2);
                          const blob = new Blob([data], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = `koinku_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
                        }} variant="outline" className="w-full h-14 neo-border bg-white rounded-2xl font-black uppercase text-[10px] flex gap-3 neo-interactive">
                          <FileJson className="h-4 w-4" /> Ekspor JSON
                        </Button>
                        <Button onClick={() => {
                          const headers = ['Tanggal', 'Deskripsi', 'Tipe', 'Nominal', 'Kategori'];
                          const rows = transactions.map(t => [new Date(t.date).toLocaleDateString(), t.description, t.type === 'income' ? 'Masuk' : 'Keluar', t.amount, categories.find(c => c.id === t.categoryId)?.name || 'Lainnya']);
                          const csv = [headers, ...rows].map(e => e.join(",")).join("\n");
                          const blob = new Blob([csv], { type: 'text/csv' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a'); a.href = url; a.download = `koinku_laporan_${new Date().toISOString().split('T')[0]}.csv`; a.click();
                        }} variant="outline" className="w-full h-14 neo-border bg-white rounded-2xl font-black uppercase text-[10px] flex gap-3 neo-interactive">
                          <FileSpreadsheet className="h-4 w-4" /> Ekspor CSV
                        </Button>
                      </div>
                    </div>

                    <div className="neo-card bg-primary/5 p-8 border-b-[10px] text-center">
                      <div className="flex justify-center mb-4">
                        <div className="h-14 w-14 bg-white neo-border rounded-2xl flex items-center justify-center neo-shadow-sm">
                           <Coins className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                      <h4 className="font-black uppercase text-[10px] tracking-widest mb-1 opacity-40">Kapasitas Lokal</h4>
                      <p className="font-black text-xl italic tracking-tighter">MODE SOLO AKTIF</p>
                      <div className="h-2 w-full bg-muted rounded-full mt-6 overflow-hidden neo-border border-1">
                        <div className={cn("h-full bg-primary transition-all duration-1000", isOnline ? "w-full" : "w-1/3")} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Floating Navigation Mobile - Fixed Position Solution */}
        <div className="md:hidden fixed inset-x-0 bottom-6 px-4 z-50 pointer-events-none">
          <nav className="max-w-md mx-auto h-20 bg-white/95 backdrop-blur-xl neo-border rounded-[32px] px-2 flex items-center justify-between shadow-2xl pointer-events-auto">
            {navItems.slice(0, 2).map((item) => (
              <button 
                key={item.id}
                onClick={() => setView(item.id as View)} 
                className={cn(
                  "flex-1 h-14 flex flex-col items-center justify-center rounded-2xl transition-all gap-1", 
                  view === item.id ? "bg-secondary neo-border neo-shadow-sm" : "opacity-30"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[7px] font-black uppercase tracking-tighter">{item.label}</span>
              </button>
            ))}
            
            <div className="flex-1 flex justify-center items-center">
              <button 
                onClick={() => { setEditingTransaction(null); setIsFormOpen(true); }} 
                className="h-14 w-14 bg-primary text-white neo-border rounded-full flex items-center justify-center neo-interactive neo-shadow-sm -translate-y-2 border-white/20"
              >
                <Plus className="h-7 w-7" />
              </button>
            </div>
            
            <button 
              onClick={() => setView('profile')} 
              className={cn(
                "flex-1 h-14 flex flex-col items-center justify-center rounded-2xl transition-all gap-1", 
                view === 'profile' ? "bg-secondary neo-border neo-shadow-sm" : "opacity-30"
              )}
            >
              <User className="h-5 w-5" />
              <span className="text-[7px] font-black uppercase tracking-tighter">Akun</span>
            </button>
          </nav>
        </div>
      </main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="p-0 border-0 bg-white max-w-lg h-[90vh] rounded-[40px] md:rounded-[48px] overflow-hidden flex flex-col neo-border-black">
          <DialogHeader className="sr-only">
            <DialogTitle>Input Transaksi</DialogTitle>
            <DialogDescription>Catat pengeluaran atau pemasukan baru Anda.</DialogDescription>
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
    </div>
  );
}
