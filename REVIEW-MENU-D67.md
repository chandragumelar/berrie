# Review prototipe — Menu & Stok D-67

9 Oktober 2026. Sites `appgprj_6ac54219b9248191bf551b9871d78958`, checkout `berrie-site/`, sumber sebelumnya versi9 yang dikonfirmasi layanan. Nama review yang diminta pada prompt tidak ada; file yang sesuai adalah REVIEW-MENU-KAS-D61-D65.md dan review D-66. Identitas hasil penyimpanan versi dicatat pada [tasks](../tasks.md) setelah konfirmasi layanan; tidak ada deployment/perubahan akses.

## Hasil revisi

- Dua status Dijual/Tidak dijual; warna hijau/merah hanya pada sel status. Arsip bukan status UI ketiga. Hapus melalui ikon tong sampah di samping nama, membuka dialog nama/dampak semua varian dan Batal/Ya, hapus menu. Fokus awal Batal. Soft delete mempertahankan ID/grup/saldo/ledger/order; draft aktif dan grid stale ditahan.
- Checkbox/bulk dihapus. Batal perubahan dekat Simpan perubahan mengembalikan draft ke katalog committed terbaru, termasuk penambahan/varian/sel. Hapus ditahan selama draft tabel belum disimpan/dibatalkan. + Varian/N varian tombol berfill/border/ikon, tidak tersembunyi di ujung tabel.
- Varian satu modal: harga dasar + tambahan integer≥0 tiap pilihan.0 tidak mengubah harga; pilihan pertama default berbintang. Tidak ada preset Rasa/Ukuran/Topping, copy menu tanpa varian, Pengaturan harga atau Lanjut ke harga. Single berharga menjadi row kombinasi, semua0 modifier gratis; multi berharga memakai tambahan per pilihan tanpa subset eksponensial. Harga lama dipertahankan jika aditif; legacy nonaditif/multi kombinasi/channel selisih lain atau penggabungan status/promo/tipe/kategori berbeda ditahan dengan pesan. Snapshot pesanan lama tidak diubah.
- Stok satu row per grup/menu: Status/Menu/Harga/Kategori/Stok awal/Stok minimal/Stok sisa. Harga ringkasan satu angka/rentang, status aktif jika ada varian dijual. Hanya baseline dan minimal dapat diedit; baseline melalui modal total aktual baru + alasan wajib, delta terhadap saldo kini, expected balance menahan race. Log tanggal/jam/pelaku/before/after/delta/alasan. Penjualan/rekap/return mempertahankan baseline. Minimal tidak mengubah saldo/ledger. Tab Isi stok/opname lama dipensiunkan; opname lewat Ubah stok awal.
- Tiga copy rekap yang ditolak dihapus, rentang menit/exclude/order/checkpoint/stock-only tetap. Diskon navigasi utama sejajar Menu & Stok, tanpa sub/tab.
- Root localhost tetap iframe1024×768; browser review juga diatur1024×768. Hosted tetap responsif. Tidak ada perubahan dependency/lockfile/runtime atau deployment thumbnail.

## Pemeriksaan aktual

Tes domain **83/83** lulus, termasuk tambahan0/5000/single/multi, kompatibilitas harga/ID/kode/promo, konflik penggabungan, limit30, stok baseline/debit/reset/log/actor/race/retry/minimal, konfirmasi/izin/draft/stale soft delete. Regresi domain pembayaran/promo/refund/stock bersama/rekap/cash lama tetap lulus. Typecheck strict dan lint lulus pada sumber final; build/packaging diverifikasi workflow penyimpanan, identitas/hasil akhirnya pada tasks. `git diff --check` diperiksa. Tidak ada script test:browser.

Browser langsung pada localhost:

1. Frame terukur1024×768; lima row Menu terukur64,5–65px, input56px. Status warna hanya sel, tombol hapus terlihat di samping nama, label Varian tidak terlipat. Edit harga Es Teh5000→7000 lalu Batal mengembalikan5000.
2. Varian baru Ukuran/Kecil0/Besar3000 pada Es Teh dasar5000 menghasilkan row5000/8000; Terapkan memperbarui draft dan Simpan perubahan berhasil. Modal existing Es Kopi Susu membaca dasar15000, Kecil0/Besar5000 serta Es/Gula0/topping lama5000. Default pertama ditampilkan berbintang, tanpa langkah harga/preset. Tes domain menjaga harga/SKU/promo existing pada commit.
3. Stok satu row/menu. Ubah Es Teh1000→999 tanpa alasan ditolak dan input999 bertahan; alasan Hasil stok opname pagi berhasil, baseline/sisa999 dan log09 Okt13.41, Maya·Owner,1000→999/delta−1/alasan terlihat. Angka/waktu ini bukti demo, bukan transaksi nyata.
4. Simulasi Gagal simpan pada Es Kopi Susu target14/alasan Produksi tambahan pagi mempertahankan kedua input dan pesan; setelah Batal baseline tetap10. Tidak mengubah saldo.
5. Hapus Es Teh pertama membuka konfirmasi/fokus Batal; Batal mempertahankan menu. Ya, hapus menu menghilangkan row dari daftar aktif (24→23 pilihan); tes domain membuktikan ledger/order/ID tidak dihapus. Tombol terakhir direlokasi dekat nama, perilaku konfirmasi memakai handler sama.
6. Diskon membuka heading/daftar diskon sendiri tanpa subtab. Rekap online saat diaktifkan menampilkan Dari/Sampai/qty/exclude/histori, tanpa tiga copy lama. Data contoh dikembalikan ke fixture awal sesudah pemeriksaan; perubahan demo bukan data yang disimpan pada versi Sites.

Bukti screenshot lokal `/private/tmp/berrie-menu-d67.jpg`, `/private/tmp/berrie-varian-d67.jpg` dan `/private/tmp/berrie-stok-d67.jpg`, bukan aset produk atau thumbnail deployment.

## Pemetaan dan batas

D-67, AC-133/134, UT-27/28; D-61/62/66 dan AC/UT terkait diselaraskan tanpa mengganti ID lama. AC-101 persetujuan visual, zoom/gelap/HP/keyboard/kontras menyeluruh, UT peserta, performa perangkat, printer fisik, backup/restore dan keamanan/server masih belum dibuktikan. Pemeriksaan browser ini terpilih, bukan semua AC lulus.

Ini prototipe memori. Tidak membuktikan transaksi IndexedDB/API, offline/outbox/receipt server, otorisasi/auth/PIN sungguhan atau hasil uang/kertas nyata. Token/profil/runtime Sites tetap prototipe, stack produksi tidak berubah. Tidak ada deployment atau perubahan akses.
