# Review prototipe Menu & Stok — D-57–60

8 Oktober 2026. Proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`. Revisi lokal dari versi 6, tanpa deployment. Identitas simpan layanan dicatat pada tasks root setelah konfirmasi.

## Perubahan

Menu berupa tabel langsung dengan satu pilihan rasa/ukuran per baris, dropdown, tempel TSV, duplikat, kategori/harga banyak baris, filter sel salah dan satu simpan. Lima baris per halaman; nama/checkbox tetap saat scroll horizontal. Topping/Rincian tombol teks tanpa pill. Harga channel tambahan hanya ketika channel aktif; tidak ada fallback untuk harga yang belum diisi. Form detail lama tetap menyediakan promo dan tindakan terpisah.

Satu saldo awal/minimal grup menu dipakai seluruh rasa/ukuran. Tiga Milkshake contoh = Coklat/Pisang/Vanilla dengan harga 15.000/15.000/18.000 dan satu saldo 50. Checkout menghitung total kebutuhan semua pilihan sebelum debit; cancel/return memakai grup asal, ledger dan idempotensi. Nilai stock per SKU dalam prototipe hanya cache yang diperbarui serentak; produksi memerlukan StockGroup dan ledger tunggal.

Racikan Es/Gula gratis dengan default Normal, pilihan Less ice/Less sugar/Tanpa es/Tanpa gula; custom kelompok/pilihan. Snapshot pilihan dan definisi disimpan pada unit agar edit katalog tidak mengubah draft lama. Pilihan terlihat di keranjang dan preview struk/dapur. Topping tetap opsi gratis/berbayar per unit; tanpa double/triple/BOGO/paket komponen.

Tab Stok menyediakan perubahan beberapa menu dan keterangan per baris. Rekap online hanya jumlah pemakaian per menu sesudah antrean, cutoff periode berurutan dan histori; tidak membuat pesanan/omzet/kas. Konfirmasi mengecualikan pesanan yang sudah dicatat. Owner mengaktifkan pengingat header/tutup kas; pengingat bukan blocker penutupan baru. Saldo belum realtime sebelum rekap.

## Bukti lokal

- Preview root memakai iframe workspace 1024×768. Tabel Menu menampilkan tepat lima baris, tinggi terukur 64,5–65 px; input/select/tombol teks 56 px. Kelima baris default terlihat penuh. Topping/Rincian computed border-radius 0 px/background transparan. Screenshot `/private/tmp/berrie-menu-five-rows.jpg`, bukan thumbnail deployment.
- Browser: harga Es Kopi Susu Besar diisi −1, filter otomatis menunjukkan sel salah dengan petunjuk; tabel tidak disimpan. Setelah diperbaiki 21.000, pindah Stok→Menu mempertahankan input, kemudian simpan berhasil. Tiga rasa Milkshake tampil terpisah.
- Browser: pengingat rekap diaktifkan, waktu akhir diisi, pemakaian Milkshake8 disimpan; saldo bersama50→42 dan histori1. Uji domain memastikan orders/cash/payouts tidak berubah.
- Browser: kas dibuka dengan saldo0, Es Kopi Susu Besar dipilih Less ice/Less sugar; keranjang menunjukkan dua racikan dan harga promo18.000. Tidak mencetak ke printer fisik.
- Suite 64 tes domain/katalog: seluruhnya lulus sebelum pemeriksaan akhir. Termasuk rollback tabel/rekap/stok, satu pembukaan stok tiga rasa, kebutuhan gabungan sebelum pembayaran, return, snapshot racikan, retry/duplikasi periode, zero recap, izin/HP/writer/expiry, CSV mempertahankan grup dan satu opening menu multi-varian, batas30 pilihan atomik.

Typecheck/lint lulus setelah perbaikan pilihan racikan; pemeriksaan akhir dan build dilakukan oleh workflow sebelum simpan. Hasil final aktual dicatat pada tasks.

## Batas bukti

AC-122–126 punya bukti prototipe terpilih; bukan kelulusan AC produksi atau UT-19–21 peserta. Belum IndexedDB, API/server authorization, locking antar-tab nyata, migrasi/restore, backup, platform sync, integrasi revenue atau uji performa/perangkat/printer. Data hanya memori dan hilang saat reload. Paste clipboard/bulk/custom lengkap belum diuji lewat browser; domain dan kontrolnya tidak membuktikan kemudahan owner tanpa UT.
