export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  budget?: number; // Anggaran bulanan (opsional)
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: TransactionType;
  categoryId: string;
}

export const INITIAL_CATEGORIES: Category[] = [
  // Expenses (Pengeluaran) - Uang Keluar
  { id: 'cat-1', name: 'Makan & Minum', type: 'expense', color: '#FFD93D', budget: 1500000 },
  { id: 'cat-2', name: 'Transportasi', type: 'expense', color: '#6C5CE7', budget: 500000 },
  { id: 'cat-3', name: 'Kost & Sewa', type: 'expense', color: '#FF8AAE', budget: 2000000 },
  { id: 'cat-4', name: 'Belanja & Gaya Hidup', type: 'expense', color: '#FF6B6B', budget: 1000000 },
  { id: 'cat-5', name: 'Tagihan & Pulsa', type: 'expense', color: '#44DDFF', budget: 300000 },
  { id: 'cat-6', name: 'Cicilan & Hutang', type: 'expense', color: '#FFA502' },
  { id: 'cat-7', name: 'Investasi & Tabungan', type: 'expense', color: '#2ED573' },
  { id: 'cat-8', name: 'Pinjaman (Lending)', type: 'expense', color: '#A4B0BE' },
  { id: 'cat-9', name: 'Kesehatan', type: 'expense', color: '#FC427B', budget: 200000 },
  { id: 'cat-10', name: 'Lainnya', type: 'expense', color: '#57606f' },
  
  // Income (Pemasukan) - Uang Masuk
  { id: 'cat-11', name: 'Gaji Utama', type: 'income', color: '#20BF6B' },
  { id: 'cat-12', name: 'Freelance & Side Hustle', type: 'income', color: '#8854D0' },
  { id: 'cat-13', name: 'Bonus & Hadiah', type: 'income', color: '#F7B731' },
  { id: 'cat-14', name: 'Pengembalian Piutang', type: 'income', color: '#45aaf2' },
  { id: 'cat-15', name: 'Investasi (Profit)', type: 'income', color: '#26de81' },
  { id: 'cat-16', name: 'Lainnya', type: 'income', color: '#A5B1C2' },
];
