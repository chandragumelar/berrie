# Review Diskon, Menu, Rekap dan Kas — D-69

10 Oktober 2026. Melanjutkan versi11/commit `2ca3e9b4e95216a4a5d775a803023f64ff745db2` pada proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`, terkonfirmasi layanan/sumber. Versi4 pada prompt adalah rujukan lama; REVIEW-KASIR-D68 tidak ada, bukti aktual sebelumnya REVIEW-MENU-KAS-D68.md. Tanpa deployment/perubahan akses.

## Perubahan

Jadwal Diskon opsional: tanggal/jam mulai dan selesai dalam zona toko. Window lengkap, presisi menit, mulai inklusif/selesai eksklusif; input parsial/terbalik invalid. Tanpa jadwal tetap berlaku seperti sebelumnya. Pustaka memperlihatkan status/rentang; semua mode dan filter Promo/label BOGO mengikuti quote efektif. Tampilan menyegarkan di batas menit/fokus. Snapshot item yang dipilih tetap sampai refresh draft eksplisit; confirmed tidak berubah. Tidak ada cron cloud atau jadwal berulang. Copy tambahan/teknis Diskon dihapus.

Menu/Stok/Rekap tabel bergulir vertikal, header tetap dan seluruh row tersedia, tanpa pagination. Input56/baris≥64/font14 tetap. Helper Varian dan bintang/Default visual dihapus, perilaku default pertama tetap. Rekap memakai kelompok Dari read-only/Sampai tanggal+jam/Waktu sekarang sejajar dan konversi zona toko.

Kas menghapus copy/nominal duplikat, label mengikuti permintaan dan tombol uang masuk/keluar di atas. Satu Saldo kas tercatat di bawah breakdown tetap; label hitungan akhir dipertahankan menjadi Uang akhir di laci (Rp). Belum pernah buka: panel pendek/CTA tanpa Rp0/tabel kosong. Kas aktif fullwidth, finish dua jalur pendek, riwayat disclosure dengan jumlah. Actor pembuka tidak berubah; pemegang kini tampil hanya bila berbeda. Blind count/seluruh blocker/ledger tetap. Dialog tutup step1 tautan rekap, tanpa blocker baru.

Subagen UIUX meninjau layout rekap dan Kas secara read-only. Skill UI/UX Pro Max dari repositori nextlevelbuilder terpasang global atas permintaan pemilik; panduan empty state/progressive disclosure diterapkan tanpa mengganti token Berrie. Review bukan UT peserta.

## Pemeriksaan

99/99 tes domain lulus, termasuk4 tes baru tanggal/zona/invalid window/batas persen-potongan-BOGO/filter/channel/snapshot/refresh/hapus jadwal. Typecheck/lint final lulus; build/packaging/identitas simpan dicatat sesudah hasil aktual di tasks. Browser1024×768 memverifikasi root iframe tepat1024×768, Menu24 row/scroll1588>376 dan Stok21 row/scroll1485>376; input Harga EsTeh5000→7000 bertahan lintas Stok/Menu dan Batal kembali5000. Varian tanpa helper/default visual. Rekap tanggal/jam56px, Waktu sekarang mengisi keduanya dalam zona toko, layout tiga kelompok sejajar. Diskon Beli1gratis1 rentang11Okt08.00–17.00 tersimpan Terjadwal; akhir07.00 ditolak dengan pesan spesifik/input bertahan. Native tanggal/jam menangani event input agar nilai tidak hilang saat pindah field. Kas belum dibuka satu CTA; buka100000 metadata asli dan total tunggal; aktif card penuh/finish dua tombol/disclosure. Tutup kas menampilkan step1 tautan yang membuka Rekap online. Screenshot sementara `/private/tmp/berrie-kas-d69.jpg` dan `/private/tmp/berrie-rekap-d69.jpg`. Tidak ada script test:browser.

## Batas

Data simulasi dalam memori; reload menghapus demo. Waktu memakai jam perangkat, belum bukti sumber waktu tepercaya saat offline/jam berubah. Belum IndexedDB/API transaksi/server izin/backup/restore/printer fisik/performa perangkat/UT peserta/pilot. AC-140–142/UT-31–32 adalah pemetaan perubahan dan target, bukan seluruhnya lulus operasional. Identitas versi berikutnya hanya dicatat setelah layanan mengonfirmasi.
