
-- SKEMA DATABASE KOIN KU - SOLO USER EDITION (MAXIMIZED)
-- Jalankan kode ini di SQL Editor Supabase Anda.

-- Hapus tabel lama untuk pembersihan struktur (Hati-hati: Data akan hilang jika dijalankan ulang)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS profiles;

-- 1. Tabel Profil (Pusat Pengaturan Pribadi)
CREATE TABLE profiles (
  id TEXT PRIMARY KEY DEFAULT 'global',
  emergency_fund_target BIGINT DEFAULT 20000000,
  initial_balance BIGINT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabel Kategori (Klasifikasi Transaksi)
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Tabel Transaksi (Data Keuangan Utama)
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  amount BIGINT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Aktifkan Fitur Real-time (Sync Otomatis)
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- 5. Inisialisasi Data Default
INSERT INTO profiles (id, initial_balance, emergency_fund_target) 
VALUES ('global', 0, 20000000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, name, type, color) VALUES
('cat-1', 'Makan & Minum', 'expense', '#FFD93D'),
('cat-2', 'Transportasi', 'expense', '#6C5CE7'),
('cat-3', 'Kost & Sewa', 'expense', '#FF8AAE'),
('cat-4', 'Self Reward', 'expense', '#FF6B6B'),
('cat-5', 'Internet & Pulsa', 'expense', '#44DDFF'),
('cat-6', 'Listrik & Air', 'expense', '#FFA502'),
('cat-7', 'Kesehatan', 'expense', '#2ED573'),
('cat-8', 'Lainnya', 'expense', '#A4B0BE'),
('cat-9', 'Gaji Utama', 'income', '#20BF6B'),
('cat-10', 'Freelance', 'income', '#8854D0'),
('cat-11', 'Bonus', 'income', '#F7B731')
ON CONFLICT (id) DO NOTHING;

-- 6. Kebijakan Keamanan (RLS) - Mode Solo User (Publik Terbuka)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Akses Publik Profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Publik Categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Akses Publik Transactions" ON transactions FOR ALL USING (true) WITH CHECK (true);
