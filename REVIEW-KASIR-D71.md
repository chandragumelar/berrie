# Review Kasir, Riwayat dan visual Jira — D-71/D-72

Fondasi visual dan Menu/Kas terbaru: [review D-73](REVIEW-MENU-KAS-D73.md). Ukuran/radius D-71 di bawah adalah bukti versi saat itu; token aktif mengikuti DESIGN-SYSTEM D-73.

12 Oktober 2026. Melanjutkan pekerjaan lokal D-70 pada Site yang sama `appgprj_6ac54219b9248191bf551b9871d78958`. Arah dan alur disetujui pemilik; render akhir belum dinilai pemilik/peserta. Lokal, tanpa deployment, commit/push atau simpan versi layanan. Latest layanan yang terakhir dikonfirmasi tetap12 (D-69); tidak dibaca ulang pada pekerjaan ini.

## Perubahan

- Arah Jira diterapkan pada seluruh komponen bersama: Inter lokal/OFL, biru/netral terang dan gelap, radius6/badge4, border/elevation, hierarki tipografi/ruang, tombol/form/dropdown/tabel/tab/modal/feedback. Ikon Lucide konsisten stroke1.5/ujung datar, metafora navigasi diperbarui; glyph merek/paket ADS tidak dipasang. Struktur katalog kiri–pesanan kanan/navigasi horizontal tetap, target sentuh≥44.
- Kartu menu membuka modal/default terisi; hanya Tambahkan ke pesanan menambah unit, tanpa Atur/copy bantuan lama. CTA tetap terjangkau saat modal bergulir. Qty draft inline tetap.
- Item berikutnya berada di dalam Pesanan baru, Makan di tempat kiri/Bungkus kanan; default Bungkus dan item lama tidak berubah. Judul tunggal Pesanan baru.
- Copy pembayaran dihapus; QRIS/non-tunai Catatan, verifikasi tetap wajib. Simpan dulu/Bayar nanti/Simpan pembayaran sukses mengosongkan Kasir, notifikasi spesifik dan Lihat pesanan menuju asal. Gagal/unknown mempertahankan input; input/aksi edit terkunci ketika pending/unknown. Pembayaran detail juga tidak membuka Struk otomatis.
- Struk selesai setelah attempt tercatat; tanpa konfirmasi kertas/bagikan/salin/unduh. Buka kembali detail menyediakan Cetak ulang — SALINAN; snapshot/uang/stok tetap. Status/konfirmasi/manual lama pada model domain dipertahankan untuk kompatibilitas histori, bukan tombol kasir baru. Tidak mengklaim kertas keluar.
- Riwayat tanggal awal–akhir inklusif/default hari ini zona toko, validasi terbalik, kombinasi metode/search. Helper kalender terpisah dari React, tanpa asumsi24 jam atau zona browser.

## Bukti lokal

`npm run typecheck`, `npm run lint`, `npm test` **103/103**, `npm run build` lulus. Empat tes tanggal baru memeriksa batas kedua hari, zona toko/browser berbeda, satu hari, batas kosong/terbalik dan hari25jam DST. Tes domain uang/stok/promo/idempotensi sebelumnya tetap lulus. Build menampilkan catatan klasifikasi route statis Vinext, bukan error build. Tidak ada perintah test:browser.

Pemeriksaan browser langsung pada preview lokal:

| Area | Hasil aktual |
| --- | --- |
| Tablet1024×768 | Font computed Inter;8 kartu pendek penuh. Tiga baris biasa masing-masing72px/total216px berada dalam area216px, setelah perbaikan jarak; target kontrol tidak dikecilkan |
| Modal/penyajian | Ketuk Air Mineral membuka modal dan basket masih0 sebelum Tambahkan; Americano/Ayam Bakar ditambahkan eksplisit. Mengganti Item berikutnya tidak mengubah tiga baris Bungkus yang sudah ada |
| Simpan dulu | Tiga item/identitas tersimpan, Kasir kembali0/empty state |
| Pembayaran | QRIS Catatan/verifikasi; total51.000 tersimpan, empty state/notifikasi/Lihat pesanan membuka tiga unit transaksi asal. Tunai5.000/Uang pas juga selesai; Lunas tidak otomatis Disajikan |
| Gagal/unknown | Gagal Bayar nanti mempertahankan Es Teh5.000 dan identitas. Unknown tetap menampilkan pesanan, operasi yang sama diperiksa lalu empty+Pesanan diminta dibuat; tidak memulai transaksi kedua |
| Struk | Attempt pertama menutup modal; reopen menampilkan Cetak ulang — SALINAN. Tidak ada Kertas sudah keluar/Bagikan struk pelanggan |
| Riwayat | Transaksi lunas dan diserahkan tampil pada hari ini; rentang terbalik menampilkan error, rentang valid di luar transaksi memberi empty state. Native tanggal diuji dengan keyboard/commit perubahan |
| Administrasi | Menu row64,5–65px/input56px, gaya kontrol/varian/tabel baru; Kas tema gelap diperiksa |
| Mobile360×780 | Modal Americano: CTA tinggi52px, bawah740 di dalam viewport780. Tiga filter Riwayat satu kolom302px, kiri29/kanan331 |
| Teks200% | Grid Kasir reflow flex satu kolom; pemeriksaan terbatas, bukan audit seluruh layar/pembaca layar |

Saat pengembangan ditemukan modul preview lama gagal dimuat; server yang sudah ada disegarkan. Referensi ClipboardList yang tertinggal setelah penggantian ikon menyebabkan error empty Riwayat, lalu diperbaiki menjadi ListChecks; typecheck dan buka Riwayat/populated/empty diulang berhasil. Log lama tetap ada di tab, tidak ditafsirkan sebagai error baru. Override viewport sementara dipulihkan; fixture transaksi uji dihapus melalui reload memori dan preview akhir Kasir kosong/kas contoh terbuka0.

## Acuan dan batas

[Design system](../DESIGN-SYSTEM.md), [register D-71](../specs/11-decisions-and-open-questions.md), AC-54/108/116/143–147 dan UT-04/33–35 diselaraskan; ID lama dipertahankan. [UI/UX Pro Max](/Users/icang/.codex/skills/ui-ux-pro-max/SKILL.md) dipakai untuk pedoman interaksi/target sentuh dan [Sites](/Users/icang/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/skills/sites/SKILL.md) untuk workflow lokal. Arah konstruksi resmi/tautan pada design system.

Ini prototipe memori React. Tidak ada bukti IndexedDB/API atomik/keamanan/sync/backup/printer fisik/restore/performa perangkat atau UT peserta/pilot. Browser manual di atas bukan seluruh matriks aksesibilitas/tema/mobile; approval arah desain bukan kelulusan operasional. Crypto tidak ditambahkan. Stack/izin/invariants bisnis tidak diubah.

## Lanjutan feedback Kasir/Pesanan/Riwayat — D-72 · 12 Oktober 2026

Perubahan lokal D-71 tetap dipertahankan. Modal tanpa copy bantuan/harga per unit, penyajian hanya di modal/default Bungkus. Racikan12px sama dengan penyajian dan total panel22px. Error identitas dekat field dengan aria-invalid/describedby/fokus dan hilang saat dikoreksi. Copy Pesanan/Riwayat dihapus; nominal Riwayat rata kiri.

Setelah commit, adapter prototipe mencatat attempt dapur batch baru saat Bayar nanti; settlement mencatat dapur batch baru lalu pelanggan, tanpa batch baru hanya pelanggan. Tidak ada dialog cetak otomatis. Save tidak mencetak/debit. Unknown belum memulai cetak sampai hasil operasi diperiksa; key attempt diturunkan dari operation ID. Ulang tetap eksplisit SALINAN, tujuan pelanggan/dapur/keduanya sesuai kelayakan. Gagal attempt mempertahankan commit dan memberi petunjuk Struk di detail. Ini simulasi pencatatan, bukan pengiriman ke printer fisik.

Detail draft menyediakan **Edit pesanan** ke Kasir. Tambah/hapus menu, qty, pilihan/penyajian/catatan memakai order/nomor/identitas asal. Input kerja terpisah dari draft committed sampai simpan/proses/bayar; payload/revisi asal tetap diperiksa. Draft tidak bisa menyisipkan unit confirmed/debit/alokasi/refund/retur. Perpindahan ke pesanan lain ditahan saat masih ada input kerja. Detail order yang sudah diproses menyediakan Tambah item, batch lama tetap.

Pemeriksaan final: **111/111 tes**, typecheck/lint/build lokal dan git diff --check lulus. Delapan tes baru memeriksa urutan cetak, pembayaran batch lama/tambahan, simpan/edit tanpa efek uang/stok/cetak, rollback ketika stok kurang, penolakan patch confirmed, gagal attempt serta resolusi unknown/replay. Build tetap memberi catatan klasifikasi route Vinext seperti sebelumnya, tanpa error.

Browser manual pada preview lokal memverifikasi:

| Area | Hasil aktual |
| --- | --- |
| Identitas kosong | Bayar → error dekat field → isi identitas → bayar bisa dilanjutkan; tablet dan360px. Pada reproduksi awal field masih bisa diisi, tetapi error lama tidak hilang; tidak mengklaim seluruh penyebab laporan terkunci telah direproduksi |
| Modal/font | Copy bantuan/harga satuan/toggle card hilang. Racikan Gula: Tanpa gula dan penyajian computed12px; total panel22px. Default jumlah1/Bungkus |
| Bayar langsung | Pembayaran5.000 → empty/notifikasi; detail pelanggan dan dapur sama-sama SALINAN, kedua tujuan ulang tersedia dan attempt menutup dialog |
| Simpan/edit | Draft0003 Americano18.000 → Edit pesanan → qty2 + Air Mineral5.000/penyajian berbeda + Gula Less sugar/catatan Hangat → simpan tetap0003/identitas/total41.000, tanpa Struk sebelum diproses |
| Bayar nanti/bayar akhir | Draft41.000 diproses → dapur SALINAN, pelanggan belum layak; bayar → pelanggan layak, unit tidak otomatis disajikan. Tes domain memastikan dapur lama tidak diulang |
| Gagal/unknown | Draft0004 Es Teh qty1 diedit qty2; Gagal simpan mempertahankan input kerja. Kembali melalui Pesanan/Tersimpan/detail/Edit tetap qty2. Unknown process dikunci lalu Periksa operasi sama → detail dapur SALINAN; tes memastikan satu debit/attempt |
| Pesanan/Riwayat | Copy tambahan hilang. Riwayat transaksi41.000 setelah diserahkan, computed text-align:left |
| Tablet1024×768 | Tiga baris biasa72px penuh dalam area283px; delapan kartu pendek terlihat. Campuran batch confirmed/draft mempunyai area lebih pendek dan tetap bergulir |
| HP360×780 | Modal Americano CTA52px, bawah708,64 di viewport780; identitas kosong bisa dikoreksi dan panel bayar terbuka |

Bukti ini terpilih, bukan seluruh audit tema/aksesibilitas/zoom atau UT peserta. Printer fisik/silent printing/API/IndexedDB/sync/backup/restore/performa/pilot tetap belum dibuktikan. Satu printer produksi tetap mengikuti jalur sistem dan perangkat yang diuji; tidak menjanjikan kertas otomatis keluar. Tidak ada commit/push/simpan versi layanan/deployment; latest layanan terakhir dikonfirmasi12. Spesifikasi/register/design system/status mengikuti D-72, AC-148–150 dan UT-36, dengan ID lama dipertahankan.

Pemeriksaan dokumen:19 berkas/293 tautan lokal tanpa target hilang; ID D-72/AC-148–150/UT-36 tetap unik. Preview akhir dikembalikan ke Kasir kosong/kas contoh terbukaRp0, override viewport dipulihkan, tanpa console error pada tab uji. Server preview yang sudah ada dipakai kembali dan dibiarkan untuk review.
