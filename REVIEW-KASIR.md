# Review revisi Kasir Berrie

7 Oktober 2026 · proyek `appgprj_6ac54219b9248191bf551b9871d78958` · D-43–45. Revisi kode tersedia untuk review; visual belum disetujui. Pemilik kemudian meminta tidak mengambil/menampilkan screenshot tambahan, sehingga laporan berikut memakai pemeriksaan browser dan tes yang sudah dijalankan. Tidak ada deployment.

## Hasil yang diperiksa

| Bagian | Bukti aktual pada preview |
| --- | --- |
| Mulai melayani | Kas tertutup hanya mempunyai satu Buka kas; form kosong dan Rp0 diterima. Pelanggan baru muncul setelah kas berhasil dibuka |
| Tabel | Lima kolom tablet; A–Z berdasarkan tipe/nama/varian, stok 0 Habis/disabled, stok manual Tidak dihitung, saldo positif yang dinonaktifkan tetap alasan eksplisit. Filter kategori/promo bekerja |
| Promo SKU | Kopi Besar Rp20.000 diskon 10% menjadi Rp18.000. Tiga unit + Extra shot Rp5.000/unit: subtotal Rp75.000, promo Rp6.000, total Rp69.000. Topping tidak dipotong |
| Snapshot | Mengubah promo menjadi potongan Rp3.000 menghasilkan harga katalog Rp17.000; tagihan lama tetap Rp18.000/unit. Refresh draft eksplisit tersedia; tidak mengganti batch lama |
| Channel/metode | Default Toko saja. GoFood muncul setelah diaktifkan dengan akun outlet. Promo Toko tidak berpindah ke platform. Toko contoh memakai Tunai + QRIS; aktivasi baru hanya Tunai |
| Dua penyajian | SKU sama Bungkus dan Makan di tempat menjadi dua baris dalam satu tagihan; tidak ada opsi Campuran |
| Bayar dulu | Uang kosong/kurang ditolak; input bertahan. Total Rp69.000, uang Rp100.000, kembalian Rp31.000. Commit mengonfirmasi batch dan stok 10→7 sekali, tetap belum disajikan |
| Buat dulu | Stok berkurang ketika batch dikonfirmasi. Pembayaran QRIS atas batch lama membutuhkan verifikasi manusia dan tidak mengurangi stok lagi |
| Gangguan simpan | Gagal simpan mempertahankan input. Hasil belum diketahui menahan tindakan baru; Periksa hasil operasi yang sama menyelesaikan operasi sekali tanpa debit kedua |
| Struk | Default Pelanggan & dapur untuk batch baru; pratinjau dapur tanpa harga, pelanggan dengan harga/status. Saat membayar batch lama default Pelanggan saja |
| Cetak tambahan/salinan | Kiriman 2 bertanda TAMBAHAN dan hanya memuat item baru. Cetak ulang eksplisit SALINAN tidak mengubah uang/stok; konfirmasi kertas terpisah dari upaya cetak |
| Serah-terima | Sesi terbuka Maya→Rani mempertahankan kas seharusnya Rp105.000 dan histori ledger. Tidak membuka sesi baru/reset saldo |
| Nama/keranjang panjang | Nama menu panjang dan Rp98.765.432 tetap terbaca. Delapan baris dengan catatan berbeda memakai scroll isi; total dan kedua tindakan sah tetap terlihat pada 1024×768 |

Pembukaan/penutupan form bayar tidak memberi efek bisnis. Promo SKU + diskon order ditolak dengan alasan, tanpa membuang potongan/input diam-diam. Perubahan promo, refund dari alokasi asli dan pengembalian stok terpisah juga diperiksa lewat tes domain.

## Ukuran dan komponen

Browser diperiksa pada landscape 1024×768, portrait 768×1024, HP lebar 360/390 dan desktop 1280 px. Lebar dokumen sama dengan viewport: tidak ada scroll horizontal Kasir. Portrait/HP memakai tabel kolom prioritas; tipe dan promo bergabung dalam sel Menu. Pemeriksaan terakhir pada 360 px membuktikan dropdown kategori Minuman + Sedang promo menyisakan SKU promo yang benar.

Font DOM aktual: `-apple-system, system-ui, Segoe UI, sans-serif`; ukuran utama/input/tombol 16 px, bantuan 14 px, judul/total 24 px. Primer dan sekunder 48 px/radius kapsul, tombol ikon 44 px, input/dropdown 48 px/radius 12 px, segmented ≥44 px/radius 10 px dalam shell bertingkat. Fokus keyboard hitam 2 px diperiksa; Escape menutup dialog dan kontrol dapat dinavigasi. Ikon Lucide lokal memakai 20 px/stroke 1,75, chevron/spinner 16 px. Panel demo menyediakan review primer/sekunder/tersier/ikon, disabled/loading/error serta contoh modal/tabel/segmented.

Kontras WCAG dihitung dari pasangan warna kontrol yang dibaca pada DOM; bukan klaim semua keadaan sudah diaudit:

| Pasangan | Rasio |
| --- | --- |
| Hitam / putih | 21,00:1 |
| Hitam / cyan muda #D7F6F8 | 18,43:1 |
| Hitam / lavender #A49EDB | 8,49:1 |
| Teks #4B5563 / sekunder #F3F4F6 | 6,87:1 |
| Teks #4B5563 / loading #E5E7EB | 6,10:1 |
| Error #B91C1C / putih | 6,47:1 |
| Border #6B7280 / putih | 4,83:1 |

CSS reduced motion/transparency dan fallback putih solid tersedia. Preferensi tersebut belum diemulasi pada browser/perangkat nyata; zoom native 200% belum diperiksa. Bukti ini tidak meluluskan seluruh AC-109.

## Pemeriksaan kode

- `npm run typecheck`: lulus.
- `npm run lint`: lulus.
- `npm test`: 24 lulus, 0 gagal. Mencakup perhitungan integer/basis point, pembulatan/alokasi, promo per channel, snapshot, no stacking, pembayaran/stock rollback, retry idempoten, dua penyajian, batch tambahan, cetak/konfirmasi/SALINAN, refund nilai asli, return sekali, custody dan batas kasir aktif.
- Build dan packaging dijalankan melalui helper Sites sebelum sumber/versi disimpan; kegagalan menghentikan workflow. Catatan simpan aktual berada di `../REVIEW-SITES-SAVE.md` pada workspace induk.

AC-102–108 mempunyai bukti simulasi terpilih di tabel di atas dan tes domain. Migrasi/restore, replay tersimpan permanen, isolasi transaksi lintas tab, server/auth, printer fisik dan pengujian perangkat tetap belum dibuktikan. AC-101 membutuhkan persetujuan visual pemilik serta perbandingan aplikasi operasional kelak. UT-01–18 membutuhkan peserta sesuai spesifikasi dan belum dinyatakan lulus.

## Batas prototipe

Data contoh berada di memori dan hilang saat reload. Commit atomik menggunakan salinan state dalam simulasi, bukan transaksi IndexedDB/server. QRIS hanya pencatatan/verifikasi manual contoh. Cetak dan konfirmasi fisik disimulasikan tanpa koneksi printer. UI dan tes domain bukan bukti siap pilot/rilis. Stack produksi D-02–05 dan mockup lokal lama dipertahankan.
