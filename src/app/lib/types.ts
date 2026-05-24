export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
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
  // Expenses (Pengeluaran)
  { id: 'cat-1', name: 'Makan & Minum', type: 'expense', color: '#FFD93D' },
  { id: 'cat-2', name: 'Transportasi', type: 'expense', color: '#6C5CE7' },
  { id: 'cat-3', name: 'Kost & Sewa', type: 'expense', color: '#FF8AAE' },
  { id: 'cat-4', name: 'Self Reward', type: 'expense', color: '#FF6B6B' },
  { id: 'cat-5', name: 'Internet & Pulsa', type: 'expense', color: '#44DDFF' },
  { id: 'cat-6', name: 'Listrik & Air', type: 'expense', color: '#FFA502' },
  { id: 'cat-7', name: 'Kesehatan', type: 'expense', color: '#2ED573' },
  { id: 'cat-8', name: 'Lainnya', type: 'expense', color: '#A4B0BE' },
  
  // Income (Pemasukan)
  { id: 'cat-9', name: 'Gaji Utama', type: 'income', color: '#20BF6B' },
  { id: 'cat-10', name: 'Freelance', type: 'income', color: '#8854D0' },
  { id: 'cat-11', name: 'Bonus', type: 'income', color: '#F7B731' },
];
