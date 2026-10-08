# Review Kasir/Pesanan/Menu & Stok — D-55/D-56

8 Oktober 2026 · proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958` · revisi setelah versi 5, tanpa deployment. [Design system](../DESIGN-SYSTEM.md), [indeks](../specs/README.md) dan [tasks](../tasks.md) memuat keputusan/status/identitas penyimpanan layanan.

## Hasil implementasi

- Nama toko satu kali di bawah brand; tanpa duplikasi di topbar seluruh tab.
- Keranjang solid lavender-soft #E8E7F6, katalog #FCFCFD; tema gelap memakai grouped. Beri diskon/Catatan lebar isi dengan target ≥44. Bayar hitam, Bayar nanti abu-abu. Tidak ada Pesanan baru di Kasir, baik kosong maupun berisi; detail tetap menawarkan order baru dan draft tidak dibuang.
- No. antrean / nama (wajib), domain menolak blank/whitespace sebelum save/process/settle tanpa efek uang/stok/batch. Nama dan penyajian berada dalam target edit yang sama untuk menghemat tinggi tanpa mengurangi hit area.
- Pesanan Semua/Lunas/Belum bayar/Tersimpan, default Lunas; kolom Pelanggan/Status/Keuangan/Rincian tanpa Total. Requested = Belum disajikan, draft tetap jujur. Detail mempertahankan total dan empat item pendek; copy Belum diserahkan/Sudah diserahkan dengan danger/positive.
- Modal Penyajian: Pilih item yang sudah disajikan atau diserahkan, kolom Pilih item/Penyajian, Pilih semua, tanpa Nilai asal. Refund tetap mempertahankan nilai alokasi asal yang diperlukan.
- MenuEditor satu form: Tipe kiri/Kode unik read-only kanan, default Normal/Paket/Promo/custom; alias N/P/PR, collision otomatis 2–3 karakter. Kode SKU otomatis unik alias-sequence, kode lama stabil. Tipe hanyalah label, bukan bundle/promo otomatis. Kategori dropdown dari Pengaturan; harga platform hanya channel aktif dan wajib eksplisit.
- Pilihan ukuran/rasa flat 1–30 baris berisi nama/harga/stok, topping opsional existing/baru dengan harga tambahan. Seluruh SKU/topping/setting/opening/audit satu commit dan idempoten; invalid baris akhir rollback seluruhnya. Saldo existing tetap melalui Tambah/Koreksi stok; harga tersembunyi tidak ditimpa.
- Total stok (wajib), Stok Minimal, copy Peringatan muncul saat stok mencapai angka ini atau lebih rendah. Stok rendah membuka daftar per SKU ≤threshold; toast sesudah crossing committed, bukan setiap render atau draft. Bukan push/WA/email/integrasi platform.

## Bukti terpilih aktual

Browser in-app localhost, iframe 1024×768/default:

- Computed workspace width/scrollWidth 1024/1024. Katalog rgb(252,252,253), keranjang rgb(232,231,246). Nama toko tunggal di sidebar, judul Kasir tanpa toko.
- Keranjang Air Mineral/Americano/Ayam Bakar/Cappuccino: empat baris penuh, masing-masing 53 px dalam area 274,05 px. Target edit/hapus ≥44 px. Total Rp75.000. Antrean blank pada Bayar nanti ditolak; item tetap. Setelah 12 / Rani, Simpan pembayaran Rp75.000 membuka Struk dan composer kosong.
- Pesanan default Lunas; tabel baru tanpa Total, Belum disajikan/Lunas. Detail empat baris penuh, masing-masing 57 px dalam area 239,45 px. Modal penyajian baru hanya dua kolom; memilih satu item berhasil tanpa perubahan tagihan. Sudah diserahkan computed text/fill rgb(36,99,51)/rgb(226,246,226); belum rgb(166,27,37)/rgb(255,240,241).
- Form tiga ukuran Kopi Uji: Regular 15.000/stok10, Medium 20.000/stok8, Large 25.000/stok6, satu topping Cokelat 3.000; Simpan menu menghasilkan N-001/N-002/N-003. Kasir tap Medium + Cokelat menghasilkan Rp23.000, tanpa langkah pemilih ukuran tambahan.
- + Tambah tipe → Premium menghasilkan kode read-only PRE dan SKU PRE-001, tabel Kasir PRE/Kopi Spesial Uji. Konfirmasi stok 6→5 memunculkan toast Stok rendah dan daftar threshold 5. Blank tipe/varian/duplikat/rollback juga diuji domain.
- Tanpa platform aktif: semua field harga platform absen. Setelah owner mengaktifkan GoFood dengan akun contoh: Harga GoFood muncul, GrabFood/ShopeeFood tetap absen. Harga channel belum diisi tidak memakai fallback dan tidak dapat dijual.
- Katalog default memperlihatkan 9 baris penuh sebelum scroll, target ≥8 terpenuhi pada fixture terpilih, ideal 10 belum tercapai.

Typecheck, lint dan 51 tes domain/katalog/filter lulus. Tes mencakup identitas wajib rollback, varian+topping atomik/idempotensi, tipe collision, harga channel eksplisit/preservasi, threshold, serta regresi uang/promo/refund/cetak/stock return. Build/packaging dan identitas simpan final dicatat pada tasks setelah workflow selesai. Tidak ada script test:browser.

## Batas bukti

Empat item terbukti pada nama pendek/default, bukan janji empat nama/catatan panjang selalu muat; konten panjang membungkus dan bergulir. Review terang tablet terpilih, belum pemeriksaan penuh HP/zoom/keyboard layar/forced colors/tema gelap. Interaksi checkbox ukuran melalui label digunakan karena otomasi tombol checkbox gagal menarget koordinat; label berhasil dan hasil form dibuktikan. Tidak menganggap ini hasil UT peserta.

Pemetaan AC-101/109–121 dan UT-01/02/03/04/07/10/17/18 adalah bukti prototipe terpilih, bukan kelulusan penuh. Data di memori, reload kembali fixture; belum IndexedDB/API/approval server/backup/restore/printer fisik/push/perpindahan uang nyata. Label Paket/Promo bukan dukungan bundle/discount otomatis. Tidak mengubah akses, tidak deployment, belum persetujuan visual/pilot.
