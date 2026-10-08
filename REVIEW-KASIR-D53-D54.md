# Review Kasir/Pesanan/Riwayat — D-53/D-54

8 Oktober 2026 · proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958` · revisi setelah versi 4, tanpa deployment. [Design system](../DESIGN-SYSTEM.md) dan [spesifikasi](../specs/README.md) menjadi acuan; identitas versi setelah penyimpanan dicatat di [tasks](../tasks.md).

## Perubahan

- Panel transaksi putih sejuk solid #FCFCFD, tanpa bubblegum/gradient. Cyan pilihan aktif #61DCE2 tetap; font/spacing/shape D-49 tetap.
- Kasir: tanpa Lihat di Pesanan/helper Bayar nanti. No. antrean / nama tetap opsional, Beri diskon, header Stok/Harga. Bayar dan Struk full-width sejajar setelah konfirmasi.
- Sebelum bayar, modal Struk memilih Dapur saja; pelanggan/keduanya disabled, tanpa bagikan pelanggan. Domain menolak cetak pelanggan pada seluruh tahap sebelum settlement. Bayar batch lama tidak mendebit/cetak dapur kedua otomatis.
- Pesanan: Semua/Tersimpan/Lunas/Belum bayar, tanpa filter Refund tertunda. Nomor/nama teks biasa, tombol Buka rincian pada kolom tersendiri. Detail mempertahankan nomor/nama dan kembali ke daftar asal.
- Riwayat hanya settlement dengan seluruh pekerjaan selesai dan due 0. Pesanan belum bayar/lunas belum diserahkan tidak masuk. Refund selesai tetap histori; cancel sebelum payment tetap dalam data/audit tetapi tidak menjadi transaksi selesai. Tanpa 0 belum disajikan/diserahkan; search dan grup tanggal/metode berjarak 16 px, antarfield 16 px. State metode/tanggal Riwayat terpisah dari filter Pesanan.
- Pemicu Refund untuk unit paid requested/served/cancelled; submit Catat refund disabled sebelum uang dikembalikan. Requested memerlukan dapur diberi tahu, cancellation dan refund atomik. Alasan refund wajib, tanpa alasan metode berbeda tambahan; metode aktual/unit/sesi terjejak. Refund lintas sesi masuk kas kini, settlement dan sesi asal tetap. Approval disiapkan sebelum uang melalui pemicu tersendiri; bukan hasil refund. Due pembatalan terpisah tetap aktif dan blocker kas.
- Root localhost memakai iframe viewport 1024×768 termasuk dialog; jendela desktop lebih lebar tidak memperbesar UI. `?workspace=responsive` membuka UI langsung untuk pemeriksaan responsif; hosted tetap responsif.

## Bukti aktual

Tes domain/katalog/filter: 43 lulus, 0 gagal. Regresi menolak cetak pelanggan sebelum bayar, dapur/bayar tanpa debit kedua, membedakan active/completed, refund dengan metode berbeda tanpa alasan tambahan, audit metode/unit, refund requested atomik memerlukan dapur+uang, rollback/idempotensi, dan refund histori sesi lama pada kas kini. Typecheck/lint/build dan pemeriksaan dokumentasi dicatat final di tasks.

Browser DOM/computed pada localhost:

- Viewport iframe 1024×768; 9 baris menu penuh sebelum scroll pada hasil akhir (≥8, target ideal 10 belum tercapai). Surface rgb(252,252,253), background-image none, seleksi rgb(97,220,226).
- Air Mineral Bayar nanti stok 18→17; modal default Dapur saja, opsi Pelanggan & dapur/Pelanggan saja disabled. Tanpa share pelanggan. Setelah dialog ditutup, Bayar dan Struk masing-masing x=700, width=296, height=48.
- Order belum bayar tidak masuk Riwayat, Refund disabled. Sesudah bayar Rp5.000 tetap tidak di Riwayat sebelum penyajian; muncul pada filter Lunas di Pesanan. Tidak ada filter Refund tertunda, Buka rincian membuka detail.
- Refund requested: unit dipilih + alasan + dapur masih disabled sebelum uang; setelah uang dicentang enabled. Commit menghasilkan Dibatalkan/Lunas · Refund penuh pada Riwayat, Pesanan aktif 0.
- Pisang Rp12.000 lunas tetap Pesanan; sesudah Tandai disajikan/diserahkan masuk Riwayat. Refund dari Riwayat dengan metode QRIS berbeda dari Tunai tidak mempunyai field alasan metode berbeda; tanpa konfirmasi uang disabled, setelah dikonfirmasi tersimpan dan tetap di Riwayat.
- Riwayat search→filter gap 16 px, antarfield 16 px, tidak ada metadata 0 belum disajikan.

## Batas

Pemetaan AC-101/108/109–117 dan UT-04/07/09/11 adalah bukti prototipe terpilih, bukan kelulusan penuh. Input kalender native tidak dapat diisi melalui otomasi browser sesi ini; perilaku filter tanggal belum dibuktikan melalui UI. Tidak ada tes browser script baru. State di memori, belum IndexedDB/API/izin server/backup/restore/perpindahan uang nyata/printer fisik/UT peserta/pilot. Checkbox adalah pernyataan kasir, bukan verifikasi rekening otomatis. Keputusan visual pemilik masih belum dicatat. Tidak mengubah akses atau melakukan deployment.
