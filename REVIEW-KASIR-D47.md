# Review revisi Kasir D-46–48

7 Oktober 2026 · proyek `appgprj_6ac54219b9248191bf551b9871d78958`. Revisi diterapkan untuk review, tanpa screenshot baru atau deployment. Visual belum disetujui. Review versi 1 tetap pada [REVIEW-KASIR.md](REVIEW-KASIR.md).

## Perubahan dan hasil aktual

| Bagian | Bukti browser/tes |
| --- | --- |
| Font | Isi/input/tabel/tombol 14 px; Kasir 18 px, dialog 20 px, nominal Total 22 px. Nama/harga/subtotal regular; 600 hanya judul dan nominal total. Pemeriksaan DOM pada Kasir baseline menghasilkan teks 14/18 px, tanpa teks 16 px |
| Kepadatan tablet | 1024×768/default, fixture 21 SKU bernama pendek: **9 baris penuh** sebelum scroll. Area isi 431,91 px; baris sederhana 45 px termasuk divider, manual/dinonaktifkan 66 px karena alasan. Minimum 8 terpenuhi pada fixture ini; target 10 belum tercapai |
| Filter | Semua/Minuman/Makanan/Camilan/Sedang promo sejajar pada satu baris (baseline y=225). Minuman + promo menyisakan Kopi Besar dengan stok 10, diskon 10, harga 18.000 |
| Sel numerik D-48 | Semua sel stok/diskon/harga cocok pola angka/pemisah numerik atau kosong; tidak ada Rp/%/dash/slash/rentang. Header Diskon. Nilai diskon sesuai jenis owner; jenis dan harga dasar/efektif tersedia di detail. Stok manual kosong, alasan di Menu; bukan 0 palsu |
| SKU/varian | Kopi Besar dan Kecil menjadi baris bernama unik dengan stok/harga pasti. Kecil dinonaktifkan meski stok 20; alasan terlihat. Identitas SKU nyata tetap di item/keranjang/refund. Kode membedakan varian bernama identik |
| Alias | Input ! ditolak inline. ab disimpan sebagai AB; perubahan hanya tampilan. Tes batas domain menolak kosong/invalid/duplikat/tipe baru dan perubahan oleh staf |
| Keranjang | Penyajian dan identitas langsung terlihat; Batalkan/Catat refund/Koreksi terbuka. Pesanan baru menahan draft dengan Simpan dulu. Delapan baris Air Mineral berisi catatan berbeda total Rp40.000; area item 109 px/scroll 760 px; kedua aksi utama berakhir y=614, Simpan y=666, baris batal/refund/koreksi y=718, tetap dalam viewport 768 |
| Toggle kas | Membuka form Buka/Tutup kas sebagai button, bukan perubahan langsung. Batal membuka tidak mengubah kas tertutup; Rp0 diterima. Tutup kas menampilkan blocker unit belum diserahkan |
| Bayar dulu | Kopi Besar dua unit Rp36.000. Tunai Rp10.000 ditolak (kurang Rp26.000), input tetap; Rp40.000 diterima. Struk pelanggan/dapur menampilkan varian nyata; stok sekali, lunas bukan disajikan |
| Buat dulu | Air Mineral dikonfirmasi sebelum bayar; Struk pelanggan BELUM BAYAR. Pembayaran QRIS sesudahnya perlu verifikasi; default Struk Pelanggan saja, tidak debit batch lama lagi |
| Batal/refund/koreksi | Batalkan membuka unit/asalan/pemberitahuan dapur. Setelah satu Kopi Besar dibatalkan, pemilih refund hanya menawarkan unit tersebut dengan alokasi asli Rp18.000. Koreksi menawarkan jenis penyajian/metode/return terpisah dan disabled dengan alasan sesuai keadaan |
| Navigasi kiri | Expanded 136 px → rail 60 px. Lebar katalog 536,44 → 584,29 px; total Rp36.000 tetap. Tombol Buka/Ciutkan navigasi punya aria-expanded; Tab menuju Kasir dengan fokus hitam 2 px |
| Nama/angka panjang | Nama 80 karakter dan 98.765.432 tanpa pemotongan. Lebar dokumen sama dengan viewport pada 390, portrait 768, desktop 1280; angka tabel tetap numerik |
| Tema/reflow | Terang dan gelap diperiksa. Surface gelap aktual rgb(28,34,36), teks rgb(245,247,248). HP 360 px tetap tanpa scroll horizontal. Teks review 200% menjadi 28 px pada input/menu, tidak overflow pada 360/1024 dan dua panel reflow vertikal. Kertas Struk tetap putih/hitam |

Navigasi tetap sama; tidak membangun ulang layar lain. Pembersihan starter yang sudah ada sebelum tugas dipertahankan. Font sistem lokal dan Lucide tetap dependensi terkunci; tidak memasang paket/HIG/MCP baru.

## Validasi dan batas

`npm run typecheck`, `npm run lint` dan `npm test` lulus; **31 tes, 0 gagal**. Regresi tambahan memeriksa alias pada batas domain, preservasi katalog/histori, SKU unik, filter SKU nyata, sel numerik dan stok manual. Tes lama promo/perhitungan integer, snapshot/alokasi/refund, idempotensi, rollback pembayaran/stok, batch tambahan dan SALINAN tetap lulus.

Build lokal dan packaging melalui helper Sites lulus. Penyimpanan sempat tertahan oleh Sites project not found; akses proyek yang sama kemudian pulih pada 7 Oktober 2026. Kode lokal dipertahankan, proyek tidak diganti. Identitas versi/commit dan hasil penyimpanan dicatat setelah layanan mengonfirmasi pada [catatan simpan](../REVIEW-SITES-SAVE.md). Tanpa deployment.

Kontras menggunakan token semantik D-46. Contoh pasangan aktual: terang hitam/putih 21:1, teks sekunder #4B5563/putih 7,56:1; gelap #F5F7F8/#1C2224 14,99:1 dan #C0CBD0/#1C2224 9,74:1 (dibulatkan, dihitung dari sRGB). Belum audit semua backdrop/hover/pressed/perangkat. CSS reduced motion/transparency, prefers-contrast dan forced-colors tersedia dengan fallback solid/system colors, tetapi belum diemulasi sebagai preferensi OS. Panel review menunjukkan komponen/state untuk pemeriksaan lanjutan.

Teks 200% diuji melalui kontrol review yang mengubah root, **bukan klaim zoom browser native 200% atau Dynamic Type**. Browser tersedia belum menyediakan emulasi media/zoom native; Safari/iPhone fisik, keyboard layar dan autozoom input 14 px belum diuji. Zoom tidak dinonaktifkan. Pembaca layar/perangkat nyata juga belum menjadi bukti.

AC-74/75/96/101/106/109/110/111 mempunyai bukti prototipe terpilih di atas, tidak otomatis lulus penuh. AC domain punya regresi simulasi, bukan bukti penyimpanan IndexedDB/isolasi antar-tab/server/offline/migrasi/restore/printer fisik. UT-01–18 tetap membutuhkan peserta. Data bisnis di memori dan hilang saat reload; pembayaran/printing adalah simulasi. Tidak menyatakan siap pilot, native Apple atau desain disetujui.
