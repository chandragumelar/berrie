# Review Kasir — D-51/D-52

7 Oktober 2026 · proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958` · revisi berikut versi 3, disimpan tanpa deployment. Identitas hasil simpan layanan dicatat pada [tasks](../tasks.md). [Design system aktif](../DESIGN-SYSTEM.md) dan [spesifikasi](../specs/README.md) tetap acuan; ini bukti prototipe, bukan aturan tambahan.

## Perubahan

- Semua/Habis/Promo tetap, kategori owner dari Pengaturan, tepat satu pilihan aktif. Stok 0 hanya Habis dan disabled; SKU inactive/arsip tidak muncul di Menu hari ini.
- Keranjang tanpa pemilih penyajian duplikat. Dialog item menetapkan Bungkus/Makan di tempat. Reguler bawaan tunggal disembunyikan; varian/kode nyata tetap membedakan SKU. Catatan item terlihat berlabel sejak draft.
- Diskon order/Catatan sejajar dengan ikon, fill dan border; Simpan dulu juga jelas sebagai button. Bayar nanti/Bayar diperpendek, bantuan menyatakan Bayar nanti langsung meminta dibuat.
- Refund, koreksi dan penyajian hanya pada detail Pesanan/Riwayat; draft diedit dengan tap item. Setelah settlement di Kasir berhasil, keranjang baru kosong. Struk mengacu order/batch asal; pembayaran tidak berarti disajikan.
- Seluruh SKU wajib stok integer ≥0. Form baru/aktivasi memerlukan angka, CSV hanya quantity dan stok awal baru wajib. Contoh Es Teh 1000; existing CSV tidak mengubah saldo. Legacy tanpa saldo ditahan dari Kasir dan commit, diperbaiki lewat hitungan awal admin berjejak; tidak berubah menjadi 0 diam-diam. Status jual terpisah dari saldo, seluruh penjualan baru mendebit sekali.

## Bukti lokal

`npm run test`: 38 lulus, 0 gagal. Termasuk agregasi stok, rollback seluruh settlement/batch/ledger, replay, bayar batch lama, return terpisah, uang/alokasi/promo, stok baru/CSV wajib, perbaikan legacy, hitungan 1000→998 dan retry, kategori reserved/duplikat. Typecheck dan lint lulus. Build/arsip dan identitas versi final dicatat pada tasks setelah workflow selesai.

Browser DOM/computed pada localhost, tanpa screenshot baru:

- Tablet 1024×768: Semua 19 SKU dapat dijual, 20 aktif termasuk satu Habis; 10 baris menu pendek terlihat penuh sebelum scroll. Lebar dokumen 1024. Gradient lavender→pale cyan→mint dan selected cyan #61DCE2 dipertahankan.
- Promo→Minuman menghasilkan satu aria-pressed aktif; Habis hanya Kentang Goreng 0/disabled. Kecil inactive tidak ada di filter Kasir, tetap terlihat dengan saldo 20 dan Jual kembali di Menu & Stok.
- Pengaturan menolak kategori Promo, daftar kosong menyisakan Semua/Habis/Promo; tambahan Spesial muncul. Mengubah daftar tidak menghapus SKU.
- Form Menu baru stok kosong ditolak dengan input tetap; 1000 berhasil dan tampil pada pengelolaan.
- Pisang Goreng Makan di tempat + Cokelat Bungkus/catatan less ice pada draft: tanpa Reguler generik, tanpa serving control keranjang, catatan terlihat sebelum bayar; total Rp32.000. Bayar Rp50.000 memberi struk order asal, keranjang 0; penyajian dilakukan dari Pesanan.
- Puding Bayar nanti mengonfirmasi batch/debit sekali, tetap belum bayar; tanpa refund/koreksi/serve pada Kasir. Bayar masih tersedia dan pengelolaan lewat Lihat di Pesanan.
- Es Teh catatan less ice, bayar Rp10.000/total Rp5.000, simulasi hasil belum diketahui: catatan dan uang input 10.000 tetap; periksa operasi sama menghasilkan struk order 0001 dan keranjang kosong, stok 1000→999 sekali.
- Baseline 360×800: lebar dokumen 360, filter select. Teks review 200% pada tablet: item font 28 px, lebar dokumen tetap 1024, alur tumbuh vertikal. Preview final kembali 1024×768/100%, data contoh direset, kas terbuka.

## Batas

Pemetaan AC-101/106/108/109–115 dan UT-01/02/03/05/10/17/18 adalah bukti terpilih prototipe. Belum seluruh AC lulus, belum UT peserta, belum pilot. State hanya memori; legacy diuji pada domain fixture, bukan migrasi IndexedDB produksi. Auth/izin server, sinkron, printer fisik, perpindahan uang, backup/restore nyata dan browser/perangkat lain belum dibuktikan. Mockup lama tidak diubah, tanpa deployment.
