# Review Kas tablet dan laporan bisnis harian — D-74

13 Oktober 2026. Melanjutkan D-73 lokal pada proyek yang sama, mempertahankan perubahan/deletion lokal sebelumnya. Tidak melakukan reset, commit/push, simpan versi layanan atau deployment. Versi layanan terakhir yang tercatat tetap12/D-69, tidak dibaca ulang pada pekerjaan ini.

## Hasil dan dasar keputusan

- Kas memakai breakdown≤640 px kiri, finish bertumpuk kanan, area≤960 px/gap24 pada lebar≥900; sempit satu kolom. Aksi pergerakan/riwayat/blocker mengikuti kolom angka. Card angka dan finish sejajar atas; satu saldo tercatat/izin/hitung buta/ledger/blocker tetap.
- Owner menyerahkan keputusan navigasi: tetap atas pada tablet (Kasir/Pesanan/Riwayat/Kelola toko) untuk mempertahankan ruang katalog/pesanan, bawah pada HP (Kasir/Pesanan/Riwayat/Lainnya). Tidak membangun sidebar atau pembanding baru.
- Feedback lanjutan owner mengoreksi fokus refund. Halaman utama kini **Penjualan** (setelah diskon, sebelum pengembalian, di luar pajak/layanan), **Uang diterima** (pembayaran langsung dikurangi refund uang), jumlah transaksi berbayar dan rata-rata belanja. Refund/gratis/kolom pengembalian kontekstual. Bukan metrik laba/HPP, saldo rekening atau perkiraan omzet online.
- Toolbar periode ringkas, dua angka utama, disclosure perhitungan, metode penerimaan dan menu penyumbang penjualan (urut nilai atau qty neto). Telusuri angka ke pesanan asal dan kembali mempertahankan periode/tab/filter. Audit periode dan pencocokan platform terpisah; platform berlabel semua tagihan tersedia, bukan mengikuti filter pendapatan secara diam-diam.
- Audit kode lama menemukan filter tanggal tidak dipakai, refund kumulatif pesanan asal dan daftar terlaris tanpa sort. Domain read model baru memakai waktu settlement/audit refund ber-ID unit dan sesi refund; pengembalian memakai metode uang dikembalikan, pembalikan platform terpisah dari refund uang toko. Promo SKU/order dipisahkan. CSV laporan mengikuti kejadian/rentang terpilih, berbeda dari ekspor seluruh data contoh Pengaturan. Metadata historis tidak lengkap diberi peringatan dan ekspor laporan ditahan.

[UI/UX Pro Max](/Users/icang/.codex/skills/ui-ux-pro-max/SKILL.md) dipakai: breakpoint/horizontal overflow, hierarki heading/ukuran, grafik perubahan aditif dan derived data React. Pencarian awal secondary actions/progressive disclosure terlalu generik; query responsif/hierarki dipersempit. Rekomendasi BI padat dan treemap/sunburst tidak sesuai kasir awam, sehingga tidak diadopsi. Ringkasan angka/perhitungan tertulis dipilih tanpa chart dekoratif, palet/token D-73 tetap. [Sites](/Users/icang/.codex/plugins/cache/openai-curated-remote/sites/1.0.1/skills/sites/SKILL.md) dipakai hanya workflow checkout/preview/build lokal.

Tidak mengklaim metrik yang tidak dimiliki POS lain: [panduan resmi Moka](https://help.mokapos.com/materi-10-melihat-analisis-dashboard-dan-reports-di-backoffice) sudah mencantumkan bruto/neto/rata-rata/metode/menu/tren. Nilai desain yang dikejar Berrie adalah kejelasan dasar angka dan jalur ke transaksi penyebab; keunggulan kompetitif belum divalidasi.

## Bukti lokal

Typecheck/lint **tanpa error/warning**, **121/121 tes** dan build lokal lulus. Delapan tes laporan baru memeriksa refund lintas hari/metode/sesi, batas tanggal eksklusif zona toko, nilai negatif, platform terpisah, draft tidak dihitung, qty neto/peringkat, konservasi dasar+pajak+layanan, promo SKU/order, gratis/rata-rata, ekspor/filter/formula injection dan metadata lama tidak lengkap. Build memberi catatan klasifikasi route Vinext seperti sebelumnya; bukan kegagalan. Tidak ada script test:browser. Pemeriksaan konsistensi:21 dokumen/311 tautan lokal tanpa tautan putus; ID D-01–74/AC-01–154/UT-01–39 lengkap, git diff --check lulus. Preview lokal memberi HTTP200.

| Pemeriksaan browser langsung | Hasil aktual |
| --- | --- |
| Kas1024×768 | Breakdown640 px x24/y220, finish296 px x688/y220; gap24, jalur atas/bawah, saldo105.000 dari awal100.000 + penjualan5.000. Histori/blocker kolom angka |
| Tutup dengan pesanan lunas belum disajikan | Dialog tetap menampilkan blocker0001; Simpan hitungan akhir disabled. Tidak menutup sesi |
| Kas360 px | Card angka/finish336 px x12, finish di bawah. Document width360 tanpa overflow. Navigasi bawah empat tujuan |
| Laporan transaksi contoh | Pembayaran Air Mineral5.000 → penjualan5.000/penerimaan5.000,1 transaksi/rata-rata5.000, tanpa card refund/gratis/kolom pengembalian rutin |
| Telusur | Lihat penjualan → satu kejadian → pesanan asal → Kembali ke laporan; filter Penjualan/tab tetap. Konteks komponen dipertahankan saat halaman disembunyikan |
| Tanggal | Cakupan kalender menampilkan awal/akhir eksklusif. Pengisian native melalui fill belum mengirim perubahan React; input keyboard/ArrowUp memicu state dan rentang terbalik ditolak. Validasi tanggal domain dibuktikan tes; tidak mengklaim seluruh input tanggal/device diuji |
| Laporan360 px | Card satu kolom336 px; document width360, tabel panjang di region. Tab sempat overlap karena tinggi relatif trigger saat wrap; diperbaiki menjadi48 px, list110 px/dua baris, isi dimulai di bawahnya |
| Terang/gelap/teks200% | Laporan dan Kas dilihat pada tablet, document width1024; teks/card tumbuh vertikal. Tema/ukuran dipulihkan ke Terang100%. Ini pemeriksaan terpilih, bukan audit kontras/pembaca layar seluruh UI |

Screenshot sementara [Kas](/private/tmp/berrie-kas-d74.jpg) dan [Laporan](/private/tmp/berrie-laporan-d74.jpg) hanya bukti preview, bukan aset/desain pembanding atau thumbnail deployment. Preview akhir tetap tablet lokal. Data contoh memori: uang awal100.000 dan satu pembayaran5.000 untuk verifikasi; pesanan belum disajikan tetap blocker nyata di simulasi.

## Batas

Rujukan D-74, AC-153/154, UT-38/39 dan DESIGN-SYSTEM diselaraskan. Ini UI dan domain simulasi memori, bukan IndexedDB/transaksi server/keamanan/sync/backup/printer/restore. Laporan koreksi klasifikasi metode lengkap, snapshot audit sebelum/sesudah, seluruh sesi historis, data server dan batch platform periode belum dibuktikan; T-14 tetap belum selesai. UT peserta, device/printer fisik dan gerbang pilot/rilis belum lulus. Tidak menjanjikan hasil investigasi/kecurangan otomatis atau metrik kausal performa bisnis.
