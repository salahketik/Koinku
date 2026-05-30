"use client"

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Transaction, Category } from '@/app/lib/types';
import { 
  Activity,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Sparkles,
  Loader2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Heart,
  CalendarDays,
  Volume2,
  VolumeX,
  Gauge
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip as RechartsTooltip
} from 'recharts';
import { cn } from '@/lib/utils';
import { getFinancialInsight, getFinancialInsightAudio } from '@/ai/flows/financial-insight';
import { Button } from '@/components/ui/button';

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  emergencyFundTarget: number;
  initialBalance: number;
}

export function Dashboard({ transactions, categories, emergencyFundTarget, initialBalance }: DashboardProps) {
  const [aiInsight, setAiInsight] = useState<{ insight: string, status: string } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const incomeTotalAllTime = useMemo(() => transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0), [transactions]);
    
  const expenseTotalAllTime = useMemo(() => transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0), [transactions]);

  const currentBalance = initialBalance + incomeTotalAllTime - expenseTotalAllTime;

  const monthlyTotals = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyIncome = transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'income' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = transactions
      .filter(t => {
        const d = new Date(t.date);
        return t.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    return { monthlyIncome, monthlyExpense };
  }, [transactions]);

  const budgetAnalysis = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const expenseCategories = categories.filter(c => c.type === 'expense' && c.budget);
    
    return expenseCategories.map(cat => {
      const spent = transactions
        .filter(t => t.categoryId === cat.id && new Date(t.date).getMonth() === currentMonth && new Date(t.date).getFullYear() === currentYear)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const budget = cat.budget || 0;
      const percent = budget > 0 ? (spent / budget) * 100 : 0;
      
      return { ...cat, spent, percent };
    }).sort((a, b) => b.percent - a.percent);
  }, [categories, transactions]);

  const progressPercentage = emergencyFundTarget > 0 
    ? Math.min(Math.max((currentBalance / emergencyFundTarget) * 100, 0), 100) 
    : 0;

  const healthStatus = useMemo(() => {
    const savingsRatio = monthlyTotals.monthlyIncome > 0 
      ? (monthlyTotals.monthlyIncome - monthlyTotals.monthlyExpense) / monthlyTotals.monthlyIncome 
      : 0;
    
    if (savingsRatio > 0.3) return { label: 'Sangat Sehat', color: 'text-green-600', bg: 'bg-green-100', icon: Heart, desc: 'Anda menabung dengan sangat baik bulan ini!' };
    if (savingsRatio > 0) return { label: 'Stabil', color: 'text-blue-600', bg: 'bg-blue-100', icon: Activity, desc: 'Keuangan Anda terjaga dengan cukup aman.' };
    return { label: 'Perlu Perhatian', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle, desc: 'Pengeluaran Anda mendekati limit pemasukan.' };
  }, [monthlyTotals]);

  async function handleFetchInsight() {
    setLoadingAi(true);
    setAiError(null);
    setAudioUrl(null);
    try {
      const res = await getFinancialInsight({
        balance: currentBalance,
        monthlyIncome: monthlyTotals.monthlyIncome,
        monthlyExpense: monthlyTotals.monthlyExpense,
        emergencyFundTarget
      });
      setAiInsight(res);
      
      try {
        const audioRes = await getFinancialInsightAudio(res.insight);
        setAudioUrl(audioRes.audio);
      } catch (err) {
        console.warn("TTS Failed", err);
      }
    } catch (e: any) {
      setAiError("Batas kuota harian tercapai. Silakan coba sebentar lagi.");
    } finally {
      setLoadingAi(false);
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const chartData = useMemo(() => {
    if (!mounted) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const label = d.toLocaleDateString('id-ID', { weekday: 'short' });
      const dayTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.toDateString() === d.toDateString();
      });
      const netValue = dayTransactions.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
      return { name: label, balance: netValue };
    });
  }, [transactions, mounted]);

  const recentTransactions = useMemo(() => [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4), [transactions]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!mounted) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700 pb-24 md:pb-0">
      <div className="lg:col-span-8 space-y-8">
        {/* Main Wallet Card */}
        <div className="neo-card bg-white p-6 md:p-8 border-b-[12px] flex flex-col gap-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 opacity-40">
                <Wallet className="h-3.5 w-3.5" />
                <p className="text-[10px] font-black uppercase tracking-widest">Saldo Saat Ini</p>
              </div>
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter italic">
                {formatCurrency(currentBalance)}
              </h3>
            </div>
            <div className={cn("px-6 py-4 rounded-2xl neo-border flex items-center gap-3", healthStatus.bg)}>
              <healthStatus.icon className={cn("h-6 w-6 animate-pulse-soft", healthStatus.color)} />
              <div className="text-left">
                <p className="text-[8px] font-black uppercase opacity-40">Kesehatan</p>
                <p className={cn("text-xs font-black uppercase italic", healthStatus.color)}>{healthStatus.label}</p>
              </div>
            </div>
          </div>
            
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-muted rounded-xl neo-border border-1 text-center">
              <p className="text-[7px] font-black uppercase opacity-50 mb-1">Awal</p>
              <p className="font-black text-[10px] truncate">{formatCurrency(initialBalance)}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl neo-border border-1 text-center">
              <p className="text-[7px] font-black uppercase text-green-700 mb-1">Pemasukan</p>
              <p className="font-black text-[10px] text-green-800 truncate">+{formatCurrency(monthlyTotals.monthlyIncome)}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl neo-border border-1 text-center">
              <p className="text-[7px] font-black uppercase text-red-700 mb-1">Pengeluaran</p>
              <p className="font-black text-[10px] text-red-800 truncate">-{formatCurrency(monthlyTotals.monthlyExpense)}</p>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center gap-2 opacity-30">
               <CalendarDays className="h-3 w-3" />
               <p className="text-[8px] font-black uppercase tracking-widest">Tren Arus Kas 7 Hari Terakhir</p>
             </div>
             <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <RechartsTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-black text-white p-3 rounded-xl neo-border border-white/20 text-[10px] font-black uppercase shadow-2xl">
                          <p>{payload[0].payload.name}</p>
                          <p className={(payload[0].value as number) >= 0 ? "text-green-400" : "text-red-400"}>
                            {formatCurrency(payload[0].value as number)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Area type="monotone" dataKey="balance" stroke="#000" strokeWidth={4} fill="#54D696" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* AI Insight Card */}
        <div className={cn(
          "neo-card p-6 border-b-[8px] relative overflow-hidden group transition-all duration-500",
          aiError ? "bg-amber-500 text-white" : aiInsight?.status === 'warning' ? "bg-red-500 text-white" : "bg-primary text-white"
        )}>
          <div className="relative z-10 flex items-start gap-5">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 neo-border border-white/20">
              {loadingAi ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] opacity-70">Wawasan Cerdas AI</h4>
                {audioUrl && (
                  <button onClick={toggleAudio} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                    {isPlaying ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {aiInsight ? (
                <div className="space-y-4">
                  <p className="font-bold text-base leading-relaxed animate-in fade-in slide-in-from-left-2">{aiInsight.insight}</p>
                  <div className="flex items-center gap-3">
                    <Button onClick={handleFetchInsight} disabled={loadingAi} className="h-8 bg-white/20 hover:bg-white/30 text-white border-white/40 neo-border rounded-xl text-[9px] font-black uppercase">
                      <RefreshCw className={cn("mr-2 h-3 w-3", loadingAi && "animate-spin")} /> Analisis Ulang
                    </Button>
                    {audioUrl && (
                      <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-bold text-sm opacity-90 italic leading-relaxed">
                    {loadingAi ? "Menganalisis performa keuangan Anda..." : aiError ? aiError : healthStatus.desc}
                  </p>
                  {!loadingAi && (
                    <Button onClick={handleFetchInsight} className="bg-white text-primary hover:bg-secondary hover:text-black neo-border neo-shadow-sm font-black uppercase text-[10px] px-8 py-6 rounded-2xl transition-all">
                      <Sparkles className="mr-3 h-4 w-4" /> Mulai Analisa Cerdas
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4 space-y-8">
        {/* Budget vs Actual Tracker */}
        <div className="neo-card bg-white p-6 border-b-[10px] space-y-6">
          <div className="flex items-center gap-3 opacity-30">
            <Gauge className="h-4 w-4" />
            <h4 className="font-black text-[10px] uppercase tracking-widest">Kontrol Anggaran Bulanan</h4>
          </div>
          <div className="space-y-5">
            {budgetAnalysis.slice(0, 3).map((item) => (
              <div key={item.id} className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase">
                  <span className="truncate max-w-[120px]">{item.name}</span>
                  <span className={cn(item.percent > 90 ? "text-red-600" : "opacity-40")}>
                    {formatCurrency(item.spent)} / {formatCurrency(item.budget || 0)}
                  </span>
                </div>
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden neo-border border-1">
                  <div 
                    className={cn(
                      "h-full transition-all duration-1000",
                      item.percent > 100 ? "bg-red-500" : item.percent > 75 ? "bg-amber-400" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(item.percent, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {budgetAnalysis.length === 0 && (
              <p className="text-[9px] font-bold italic opacity-20 text-center py-4 uppercase">Belum ada anggaran diset.</p>
            )}
          </div>
        </div>

        {/* Savings Target Card */}
        <div className="neo-card bg-accent/10 p-8 border-b-[10px]">
          <div className="flex justify-between items-center mb-6">
            <div className="h-12 w-12 bg-white neo-border flex items-center justify-center rounded-2xl neo-shadow-sm">
              <Target className={cn("h-6 w-6", progressPercentage >= 100 ? "text-green-600" : "text-accent")} />
            </div>
            <div className="text-right">
               <span className="font-black text-2xl italic tracking-tighter block">{Math.round(progressPercentage)}%</span>
               <span className="text-[8px] font-black uppercase opacity-30">Dana Darurat</span>
            </div>
          </div>
          <h4 className="font-black text-xs uppercase tracking-widest mb-1">Target Tabungan</h4>
          <div className="flex items-center gap-2 mb-4">
             <span className="text-[10px] font-black">{formatCurrency(currentBalance)}</span>
             <ArrowRight className="h-3 w-3 opacity-20" />
             <span className="text-[10px] font-black opacity-40">{formatCurrency(emergencyFundTarget)}</span>
          </div>
          <Progress value={progressPercentage} className="h-6 neo-border border-2 bg-white rounded-xl overflow-hidden shadow-inner" />
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h4 className="font-black uppercase text-[10px] tracking-widest opacity-30">Aktivitas Terakhir</h4>
          <div className="space-y-3">
            {recentTransactions.map((t) => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="neo-card bg-white p-4 flex items-center justify-between border-b-4 hover:translate-x-1 transition-transform">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 rounded-lg neo-border flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: cat?.color || '#eee' }}>
                      {t.type === 'income' ? <TrendingUp className="h-3.5 w-3.5 text-white" /> : <TrendingDown className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-black text-[10px] truncate">{t.description}</p>
                      <p className="text-[7px] font-black uppercase opacity-30">{new Date(t.date).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                  <p className={cn("font-black text-[10px] shrink-0 italic", t.type === 'income' ? "text-green-600" : "text-black")}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
