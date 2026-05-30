'use server';
/**
 * @fileOverview A GenAI tool for suggesting categories for financial transactions with advanced logic.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TransactionCategorySuggestionInputSchema = z.object({
  description: z.string().describe('The description of the new transaction.'),
  amount: z.number().describe('The amount of the new transaction.'),
  type: z.enum(['income', 'expense']).describe('The type of the new transaction (income or expense).'),
  pastTransactions: z.array(z.object({
    description: z.string().describe('Description of a past transaction.'),
    category: z.string().describe('Category assigned to the past transaction.'),
    type: z.enum(['income', 'expense']).describe('Type of the past transaction (income or expense).'),
  })).describe('A list of the user\'s past transactions with their categories.'),
});
export type TransactionCategorySuggestionInput = z.infer<typeof TransactionCategorySuggestionInputSchema>;

const TransactionCategorySuggestionOutputSchema = z.object({
  suggestedCategory: z.string().describe('The AI-suggested category for the new transaction.'),
  confidenceScore: z.number().min(0).max(100).describe('A confidence score (0-100) for the suggested category.'),
  reasoning: z.string().describe('Brief reasoning for the suggestion.'),
});
export type TransactionCategorySuggestionOutput = z.infer<typeof TransactionCategorySuggestionOutputSchema>;

export async function suggestTransactionCategory(input: TransactionCategorySuggestionInput): Promise<TransactionCategorySuggestionOutput> {
  return transactionCategorySuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'transactionCategorySuggestionPrompt',
  input: {schema: TransactionCategorySuggestionInputSchema},
  output: {schema: TransactionCategorySuggestionOutputSchema},
  prompt: `Anda adalah asisten keuangan cerdas untuk aplikasi KOIN KU. Tugas Anda adalah memberikan kategori yang paling akurat berdasarkan tipe transaksi (Masuk/Keluar) dan deskripsi.

Daftar Kategori yang Tersedia:
- PENGELUARAN (Expense): Makan & Minum, Transportasi, Kost & Sewa, Belanja & Gaya Hidup, Tagihan & Pulsa, Cicilan & Hutang, Investasi & Tabungan, Pinjaman (Lending), Kesehatan, Lainnya.
- PEMASUKAN (Income): Gaji Utama, Freelance & Side Hustle, Bonus & Hadiah, Pengembalian Piutang, Investasi (Profit), Lainnya.

ATURAN LOGIKA UTAMA:

1. ALIRAN INVESTASI & TABUNGAN:
   - Jika tipe adalah PENGELUARAN (Expense) dan deskripsi mengandung "beli", "topup", "nabung", "invest", "emas", "crypto" -> Kategori: 'Investasi & Tabungan'.
   - Jika tipe adalah PEMASUKAN (Income) dan deskripsi mengandung "jual", "profit", "hasil investasi", "tarik emas" -> Kategori: 'Investasi (Profit)'.

2. ALIRAN HUTANG & PIUTANG:
   - Jika tipe PENGELUARAN (Expense) dan deskripsi mengandung "pinjamin", "pinjamkan", "kasih pinjam" -> Kategori: 'Pinjaman (Lending)'.
   - Jika tipe PENGELUARAN (Expense) dan deskripsi mengandung "bayar hutang", "cicilan" -> Kategori: 'Cicilan & Hutang'.
   - Jika tipe PEMASUKAN (Income) dan deskripsi mengandung "balik", "kembali", "bayar hutang ke saya" -> Kategori: 'Pengembalian Piutang'.

3. KATEGORI UMUM & PEMASUKAN:
   - "Transfer Jago", "Isi dompet", "Uang di dana" jika tipenya PEMASUKAN (Income) -> Kategori: 'Gaji Utama' atau 'Lainnya' (BUKAN Kesehatan).
   - "Kesehatan" HANYA digunakan jika ada kata "obat", "sakit", "dokter", "rs", "apotek", atau "vitamin".
   - Jika bingung untuk pemasukan umum, gunakan 'Lainnya' atau 'Gaji Utama'.

Transaksi Baru:
- Tipe: {{{type}}}
- Deskripsi: {{{description}}}
- Nominal: Rp {{{amount}}}

Berikan saran kategori yang tepat, skor kepercayaan, dan alasan singkat dalam Bahasa Indonesia.`,
});

const transactionCategorySuggestionFlow = ai.defineFlow(
  {
    name: 'transactionCategorySuggestionFlow',
    inputSchema: TransactionCategorySuggestionInputSchema,
    outputSchema: TransactionCategorySuggestionOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
