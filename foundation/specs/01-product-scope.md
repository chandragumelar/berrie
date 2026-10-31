# 01 — Product scope

## Produk dan pengguna

Berrie adalah kasir makanan/minuman untuk pemilik usaha kecil: warung, kedai, gerai minuman, dan usaha dengan layanan makan di tempat maupun bungkus. Owner atau staf yang diberi izin menjalankan toko bergantian pada satu perangkat kasir utama. Owner dapat menyetujui tindakan tertentu dari HP secara online. Operasional harus tetap bisa berjalan saat internet putus, dan angka penjualan, stok siap jual, serta uang tunai dapat ditelusuri.

Pilot pertama dilakukan di usaha pemilik. Penjualan ke usaha lain mengikuti bukti operasional pilot. Tidak ada asumsi bahwa riset POS umum sudah memvalidasi seluruh kebutuhan restoran.

## Latar belakang dan batas riset

Fokus Berrie berubah dari konsep kios retail umum menjadi makanan/minuman berdasarkan arahan pemilik. Jangan memakai asumsi POS supermarket/minimarket untuk mendesain alur produk ini.

Pemilik memberikan ringkasan `status-riset-pos-lite.md`, sebelumnya berada di `/Users/icang/Downloads/status-riset-pos-lite.md`. Ringkasan itu membandingkan fitur dan review publik Kasir Pintar, Qasir, Moka, iReap, Loyverse, Olsera, dan Square. Berkas riset mentah tidak tersedia dalam folder proyek, keberadaannya di lokasi lama tidak dijamin, dan tidak diklaim telah diperiksa ulang. Review publik bukan survei statistik representatif; riset awal mengenai POS kios/UMKM umum belum memvalidasi seluruh kebutuhan makanan/minuman.

Sinyal riset yang dirangkum pemilik:

- Transaksi cepat dan mudah dipelajari; banyak fitur tidak mengorbankan kemudahan dan keandalan.
- Stok dan laporan dapat dipercaya, dengan ringkasan harian sederhana dan kas yang jelas.
- Operasional inti tetap berjalan ketika internet putus.
- Struk dan koneksi printer andal pada kombinasi perangkat yang didukung.
- Data dapat diekspor, dicadangkan, dan dipulihkan.
- Harga serta batas paket transparan bila produk dijual.

Bedakan sinyal riset tersebut dari penyesuaian kebutuhan operasional pemilik, keputusan produk/teknis dan opini baru. Target angka, stack, harga serta alur rinci adalah keputusan yang disetujui; semuanya tetap membutuhkan bukti implementasi dan pengujian sesuai file 10–12.

## Hasil yang dituju

| Hasil | Target baseline; bukan hasil pengukuran |
| --- | --- |
| Cepat mulai | Transaksi pertama <5 menit setelah email terverifikasi, dengan satu menu; setup printer opsional |
| Checkout sederhana | Transaksi tunai bungkus tiga item ≤30 detik bagi pengguna terlatih, di luar waktu cetak |
| Respons lokal | p95 tambah item ≤200 ms; simpan/proses/bayar ≤1 detik pada perangkat pilot |
| Integritas | Nol transaksi hilang/ganda dan nol selisih stok/kas yang tidak dapat dijelaskan pada skenario wajib |
| Offline | Pesanan, pembayaran tunai, stok, refund manual, kas, riwayat dan cetak lokal bekerja setelah persiapan online |
| Pemulihan | Data dengan ACK server atau dalam backup valid dapat dipulihkan sesuai cakupan yang ditampilkan |

Target diuji dengan dataset 500 SKU, 10.000 pesanan historis, dan 50 pesanan aktif. Angka ini adalah beban uji, bukan batas paket berbayar.

Cara mengukur transaksi pertama dan kegunaan bagi pengguna baru mengikuti [12 — UX principles](12-ux-principles.md). Kemampuan lengkap ditampilkan bertahap, dengan Kasir sebagai layar kerja utama. Keinginan pengguna merekomendasikan Berrie adalah aspirasi pengalaman, bukan penambahan fitur pemasaran atau hasil yang sudah terbukti.

## Scope MVP

| Area | Komitmen |
| --- | --- |
| Akun | Owner email/password terverifikasi, satu toko/perangkat kasir aktif; identitas dan PIN enam digit per staf, izin aktivitas, persetujuan owner lokal atau dari HP |
| Setup | Identitas toko, zona waktu, katalog, metode bayar, pajak/layanan opsional |
| Menu | Kategori, variabel bernama dan harga per kombinasi D-61, catatan, pustaka diskon opsional persen/potongan/Beli X gratis Y D-68; impor ditunda D-65 |
| Pesanan | Penyajian per item: makan di tempat/bungkus/campuran satu tagihan; no. antrean/nama opsional, draft, bayar dulu atau dibuat dulu, batch tambahan |
| Dapur | Tiket kertas dari printer kasir; status penyajian dicatat manual |
| Pembayaran | Tunai, QRIS, transfer, e-wallet manual; satu metode untuk seluruh tagihan |
| Stok | Hitungan unit siap jual wajib pada setiap SKU; status jual aktif/nonaktif terpisah; ledger perubahan dan stok menipis |
| Pembatalan/refund | Alasan, pembatalan unit, refund seluruh/sebagian item dan keputusan stok terpisah |
| Kas/laporan | Buka–tutup, serah-terima kas antarstaf, kas masuk/keluar, selisih, penjualan per channel, metode bayar, item terlaris, pencocokan dana platform manual |
| Data | Simpan lokal, sync idempoten, backup terenkripsi, restore, export CSV |
| Struk | Thermal 58/80 mm, dapur sebelum bayar/pelanggan setelah settlement, SALINAN; tanpa berbagi struk pelanggan atau konfirmasi kertas rutin (D-71) |
| Komersial | Trial 60 hari, Rp50.000/bulan, semua fitur MVP dalam satu paket |

Efek bisnis pesanan, uang, stok dan kas tetap hanya dieksekusi perangkat kasir aktif. HP owner boleh membaca data server, mengelola staf/izin, serta menyetujui/menolak permintaan melalui API otorisasi online. Ini pengecualian terbatas untuk administrasi akses, bukan kasir kedua; HP tidak mengeksekusi refund atau mengedit ledger. Detail kontrak ada di [08](08-offline-backup-and-restore.md).

## Batas produk

Tidak termasuk barcode, banyak kasir/perangkat transaksi simultan, multi-outlet, stok bahan/resep, supplier/PO, gudang, batch kedaluwarsa, konversi satuan, CRM/loyalty, promo kompleks, payroll, akuntansi/laba, bon, split bill, campuran metode, penggabungan pesanan, reservasi, denah meja, waiter, layar dapur, dan printer dapur terpisah.

QRIS merchant digunakan di luar Berrie. Berrie tidak mendaftarkan QRIS, membuat QR dinamis, memverifikasi pembayaran otomatis, mencocokkan pencairan, atau memindahkan uang refund. Penagihan langganan Berrie adalah proses terpisah.

## Platform dan implementasi

Stack final: PWA responsif React + TypeScript dengan Vite; IndexedDB melalui Dexie untuk data lokal; Supabase Auth/PostgreSQL dengan satu lapisan API mutasi; frontend statis Cloudflare Pages; backup objek terpisah Cloudflare R2. Region awal ditargetkan Singapore sesuai D-05. Akun/provisioning, paket layanan, versi dependensi, biaya aktual dan ketersediaan region masih harus diperiksa/dikerjakan; vendor dan stack tidak sedang dipilih ulang. Detail dan pekerjaan validasi ada di [11](11-decisions-and-open-questions.md).

Tidak diperlukan aplikasi native atau perangkat khusus. Satu browser/profil/instalasi yang diaktifkan adalah satu perangkat logis; browser lain di HP yang sama bukan otomatis kasir yang sama. Printer sistem harus diuji per kombinasi platform dan hardware.

## Paket dan akses

- Trial dimulai pada aktivasi toko pertama, berlangsung 60 × 24 jam, tanpa kartu pembayaran.
- Rp50.000 per bulan mencakup satu toko, satu kasir aktif, dan seluruh fitur MVP. Tidak ada add-on struk, export, atau restore.
- Bulan langganan mengikuti tanggal perpanjangan kalender; tanggal yang tidak tersedia dijepit ke hari terakhir bulan. Anchor asli dipertahankan untuk bulan berikutnya.
- Pengingat H-7, H-3, H-1 dan tenggang tujuh hari. Setelah tenggang, hanya penyelesaian pesanan terbuka, refund, tutup kas, baca, export/backup/restore yang tersedia.
- Baseline penagihan pilot: transfer manual untuk langganan, diverifikasi operator Berrie saat online, lalu entitlement diperbarui dengan audit. Tidak perlu integrasi payment gateway.
- Salinan server disimpan minimal 90 hari setelah tenggang habis. Baseline penghapusan: notifikasi 30 dan 7 hari sebelumnya; jangan hapus sebelum pemberitahuan berhasil dikirim dan jangka waktunya terpenuhi.
- Printer, internet dan biaya layanan pembayaran eksternal berada di luar biaya Berrie. Tidak ada pembelian atau aktivasi layanan komersial dalam pekerjaan spesifikasi ini.

## Urutan implementasi

1. Fondasi domain uang/stok, penyimpanan atomik, auth/perangkat, pesanan dan kas lokal.
2. Katalog, checkout, batch dapur, pembayaran, pembatalan dan refund.
3. Cetakan, laporan, export, sync, backup dan restore sebagai alur ujung ke ujung.
4. Pengujian offline/crash, perangkat/printer, keamanan, migrasi dan pilot nyata.
5. Penagihan manual, observabilitas, dokumentasi dukungan dan gerbang rilis komersial.

MVP belum siap jual hanya karena checkout berhasil. Semua syarat wajib pada [10](10-acceptance-criteria.md) harus lulus.

## Perluasan disetujui — pengawasan dan penjualan platform

- Pengaturan izin per aktivitas: **Boleh kasir**, **Perlu persetujuan owner**, **Hanya owner**. Owner memilih aktivitas yang perlu konfirmasi; default dan batas diskon mengikuti file 08. Staf tidak memakai kredensial owner. Penjualan biasa yang diizinkan tetap offline; persetujuan dari HP membutuhkan kedua perangkat online pada pengiriman/pengambilan keputusan, bukan koneksi terus-menerus bersamaan.
- Pergantian penanggung jawab laci memakai serah-terima dan hitung kas tanpa memperlihatkan ekspektasi kepada staf sebelum hitungan disimpan. Satu sesi toko tetap terbuka; ini bukan payroll, absensi atau banyak kasir simultan.
- GoFood, GrabFood dan ShopeeFood dicatat **manual** dengan channel, akun outlet, ID eksternal, harga channel dan SKU stok bersama. Termasuk tagihan kepada platform, potongan, subsidi dan pencairan manual. Tidak ada integrasi/API platform, sinkronisasi ketersediaan, scraping, import laporan platform, penerimaan order otomatis atau verifikasi pembayaran otomatis pada tahap ini. D-65 menunda seluruh impor katalog pada tahap ini; ekspor dan backup tetap terpisah.
- Harga/pemetaan per channel sederhana; paket/resep otomatis dan promo bertumpuk tidak ditambahkan. Paket platform dicatat sebagai komponen SKU biasa dengan harga komponen yang disepakati owner; bila belum bisa dipetakan, tampilkan perlu pemetaan, jangan catat nominal bebas yang kehilangan stok.
- Daftar lintas layar memakai tabel kompak, bukan kartu per baris. Detail responsif dan kolom ada di file 09/12. D-43 menambahkan promo SKU yang diatur owner; diskon order tetap ada tanpa penggabungan promo dalam satu pesanan. Paket/komponen stok belum ditambahkan. D-69 menambahkan rentang mulai–selesai diskon per definisi dalam zona toko, tanpa jadwal berulang atau mesin kampanye.
- Klaim yang dituju adalah pembatasan akses dan penelusuran kejanggalan, **bukan jaminan bebas fraud**. Penjualan tak dicatat, kolusi, uang/barang fisik dan perangkat yang dikuasai penyerang tetap memerlukan pemeriksaan independen. Semua kemampuan tambahan belum diimplementasikan/diuji.

Fondasi staf/izin dan model channel dibangun bersama tahap 1; alur sensitif dan serah-terima pada tahap 2; approval HP dan pencocokan pencairan pada tahap 3; uji lintas perangkat/offline sebelum pilot. Scope tambahan masuk paket MVP yang sama tanpa mengubah vendor atau harga.

## D-41 — Sites untuk visual dan alur (7 Oktober 2026)

Pemilik memilih Sites sebagai tempat membangun dan mengevaluasi satu prototipe interaktif dengan visual yang ditujukan menjadi UI akhir Berrie. Visual dan alur dikerjakan bersama, bukan mockup kasar yang nanti didesain ulang. Setelah disetujui, pertahankan komponen, aset, token visual dan perilaku UI saat menghubungkannya ke domain/penyimpanan/backend operasional. Adaptasi teknis yang diperlukan harus dibandingkan kembali dengan versi Sites yang disetujui; tidak menjanjikan kemiripan persentase atau hasil bagus sekali generasi.

Pilihan ini mengubah workflow desain, bukan keputusan hosting/backend produksi D-02–05. Sites memakai data contoh dan simulasi yang dijelaskan; bukan tempat transaksi uang nyata pada tahap desain. Tidak ada otorisasi publikasi, pembelian layanan, akun atau perubahan data produksi dari keputusan workflow ini. Simpan tanpa deployment sampai publikasi diotorisasi. Aplikasi tetap tunduk pada offline/integritas/gerbang rilis yang sudah disepakati.

Arahan desain mengikuti [12 — UX principles](12-ux-principles.md), [09 — Screens and hardware](09-screens-and-hardware.md) dan [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md). Mockup lokal M-01/M-02 dipensiunkan pada 8 Oktober 2026 atas instruksi pemilik; histori tetap pada tasks. Prototipe aktif hanya `berrie-site/`. Status M-03: D-71 sudah diterapkan lokal pada `berrie-site/`; arah visual/alur disetujui pemilik, render akhir dan cakupan review lengkap belum dinilai. Versi layanan terakhir yang tercatat adalah12/D-69, bukan sumber lokal terbaru. Pemeriksaan browser tablet/HP dan tes domain bersifat terpilih. Data contoh di memori; bukan aplikasi operasional. Tidak ada deployment. Bukti terbaru dan batas pemeriksaan ada di [review D-71](../berrie-site/REVIEW-KASIR-D71.md); identitas versi dan posisi pekerjaan pada [tasks](../tasks.md#posisi-sekarang), bukti lama pada [riwayat review](../berrie-site/REVIEW-HISTORY.md).

## Cakupan tahap ini — D-61–65 (8 Oktober 2026)

Variabel menu dibuat/dinamai owner dengan pilihan tunggal atau beberapa pilihan, harga per kombinasi, opsi kosong `-`, dan pilihan gratis untuk racikan. Stok dipisahkan menjadi Isi stok dan Stok opname. Rekap online dapat dikoreksi dengan izin Koreksi stok; default persetujuan owner. Alur kas mengikuti keadaan petugas sama atau ganti petugas dalam satu sesi toko. Tidak ada impor CSV/Excel pada tahap ini; bukan pekerjaan yang menunggu format Excel. Batas stok resep, paket/komponen, banyak perangkat kasir, integrasi platform dan stack produksi tetap. Prototipe Sites memori hanya untuk evaluasi alur/visual, tanpa deployment.

D-71: pembayaran Berrie tetap rupiah; pembayaran kripto tidak ditambahkan sesuai persetujuan pemilik. Arah visual Jira tidak menambah integrasi Atlassian atau mengganti stack.
