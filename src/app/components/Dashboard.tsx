"use client"

import React, { useState, useMemo, useEffect } from 'react';
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
  Heart
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
import { getFinancialInsight } from '@/ai/flows/financial-insight';
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

  const progressPercentage = emergencyFundTarget > 0 
    ? Math.min(Math.max((currentBalance / emergencyFundTarget) * 100, 0), 100) 
    : 0;

  const healthStatus = useMemo(() => {
    const savingsRatio = monthlyTotals.monthlyIncome > 0 
      ? (monthlyTotals.monthlyIncome - monthlyTotals.monthlyExpense) / monthlyTotals.monthlyIncome 
      : 0;
    
    if (savingsRatio > 0.3) return { label: 'Sangat Sehat', color: 'text-green-600', bg: 'bg-green-100', icon: Heart };
    if (savingsRatio > 0) return { label: 'Stabil', color: 'text-blue-600', bg: 'bg-blue-100', icon: Activity };
    return { label: 'Perlu Perhatian', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertCircle };
  }, [monthlyTotals]);

  async function handleFetchInsight() {
    setLoadingAi(true);
    setAiError(null);
    try {
      const res = await getFinancialInsight({
        balance: currentBalance,
        monthlyIncome: monthlyTotals.monthlyIncome,
        monthlyExpense: monthlyTotals.monthlyExpense,
        emergencyFundTarget
      });
      setAiInsight(res);
    } catch (e: any) {
      setAiError("Batas kuota harian tercapai. Silakan coba 1 menit lagi.");
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
                <p className="text-[10px] font-black uppercase tracking-widest">Status Saldo Utama</p>
              </div>
              <h3 className="text-4xl md:text-6xl font-black tracking-tighter italic">
                {formatCurrency(currentBalance)}
              </h3>
            </div>
            <div className={cn("px-6 py-4 rounded-2xl neo-border flex items-center gap-3", healthStatus.bg)}>
              <healthStatus.icon className={cn("h-6 w-6 animate-pulse-soft", healthStatus.color)} />
              <div className="text-left">
                <p className="text-[8px] font-black uppercase opacity-40">Finansial</p>
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

          <div className="h-44 w-full mt-4">
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

        {/* AI Insight Card - Re-designed */}
        <div className={cn(
          "neo-card p-6 border-b-[8px] relative overflow-hidden group transition-all duration-500",
          aiError ? "bg-amber-500 text-white" : aiInsight?.status === 'warning' ? "bg-red-500 text-white" : "bg-primary text-white"
        )}>
          <div className="relative z-10 flex items-start gap-5">
            <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 neo-border border-white/20">
              {loadingAi ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              <h4 className="font-black text-[10px] uppercase tracking-[0.3em] mb-1 opacity-70">Saran Cerdas AI</h4>
              {aiInsight ? (
                <div className="space-y-4">
                  <p className="font-bold text-base leading-relaxed animate-in fade-in slide-in-from-left-2">{aiInsight.insight}</p>
                  <Button onClick={handleFetchInsight} disabled={loadingAi} className="h-8 bg-white/20 hover:bg-white/30 text-white border-white/40 neo-border rounded-xl text-[9px] font-black uppercase">
                    <RefreshCw className={cn("mr-2 h-3 w-3", loadingAi && "animate-spin")} /> Analisis Ulang
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="font-bold text-sm opacity-90 italic">
                    {loadingAi ? "Menganalisis performa keuangan Anda..." : aiError ? aiError : "Dapatkan wawasan cerdas berdasarkan riwayat transaksi Anda."}
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

        {/* Recent Activity Mini-list */}
        <div className="space-y-4">
          <h4 className="font-black uppercase text-[10px] tracking-widest opacity-30">Aktivitas Terakhir</h4>
          <div className="space-y-3">
            {recentTransactions.map((t) => {
              const cat = categories.find(c => c.id === t.categoryId);
              return (
                <div key={t.id} className="neo-card bg-white p-4 flex items-center justify-between border-b-4 hover:translate-x-1">
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
