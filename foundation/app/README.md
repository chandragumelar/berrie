# Fondasi aplikasi Berrie

Scaffold belum dapat digunakan untuk transaksi. UI dan data contoh tetap di `../berrie-site/`; integrasi UI mengikuti T-06 setelah fondasi dan izin siap.

Dengan Node 22 dan npm: `npm ci --legacy-peer-deps`, `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. `npm run test:browser` menjalankan tes Chrome lokal melalui Playwright; konfigurasi saat ini memakai Chrome di `/Applications/Google Chrome.app`. `.env.example` tidak berisi rahasia. Lockfile mencatat versi terpasang.

`src/domain` mencakup kalkulasi dan snapshot awal, `src/storage` berisi primitive Dexie berversi, pemeriksaan revisi/urutan dan Web Locks. Ini belum merupakan API transaksi berizin: T-04 harus memvalidasi identitas, kebijakan, permit dan perangkat aktif, dan command bisnis harus memvalidasi seluruh invariants dalam transaksi. Web Locks yang tidak tersedia menyebabkan penolakan, bukan fallback tanpa lock. Checkpoint/staging awal bukan backup terenkripsi atau restore produksi; tidak mengaktifkan database staging. Lihat tasks untuk pekerjaan dan batas yang tersisa.

`stageSnapshot(db, input)` menerima `unknown`, memvalidasi checkpoint schema 1 dan hubungan receipt/state/event/sequence sebelum menulis atomik ke database staging yang masih kosong. Fungsi tidak mengaktifkan staging atau mengubah database sumber. Nilai bisnis masih `unknown` tanpa penanda jenis settlement/refund: validator tidak memeriksa isi bisnis tersebut dan bukan bukti autentisitas atau perlindungan dari manipulasi checkpoint yang terkoordinasi.
