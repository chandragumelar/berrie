# 05 — Payments and refunds

**Pesanan aktif D-78:** workspace Aktif/Tersimpan dan detail bersama mengikuti bagian D-78; default Lunas/tabel/halaman detail tablet lama diganti. Kasir D-76/D-77 dan aturan integritas tetap. [Review](../berrie-site/REVIEW-PESANAN-D78.md).

**Acuan UI aktif D-72 · 12 Oktober 2026:** visual Jira/Inter D-71 tetap. Penyajian hanya di modal item, default Bungkus; tanpa Item berikutnya di card. Modal tanpa copy bantuan/harga per unit, hasil racikan 12px seperti penyajian dan total panel 22px. Identitas kosong diberi error dekat input, tetap bisa dikoreksi. Setelah commit, Bayar nanti otomatis mencoba dapur; pembayaran dengan draft baru mencoba dapur lalu pelanggan, pembayaran batch lama hanya pelanggan. Simpan dulu tanpa cetak/debit; detail draft menyediakan Edit pesanan ke Kasir dengan identitas/nomor tetap. Cetak ulang memilih pelanggan/dapur/keduanya yang layak, SALINAN; attempt bukan bukti kertas. Kasir kosong/notifikasi/Lihat pesanan hanya sesudah sukses; gagal/unknown mempertahankan input dan operasi sama. Riwayat tetap rentang inklusif zona toko, nominal rata kiri. D-72 mendahului uraian D-71 yang berbeda; uang/stok/izin/snapshot/gerbang rilis tetap. [Design system](../DESIGN-SYSTEM.md), [review lokal](../berrie-site/REVIEW-KASIR-D71.md).

## Metode dan prasyarat

Tunai selalu tersedia. QRIS, transfer dan e-wallet diaktifkan owner secara terpisah. Semuanya pencatatan pembayaran yang diverifikasi manusia. Tidak ada token kartu, kredensial wallet, webhook pembayaran pelanggan, atau dana pelanggan yang disimpan Berrie.

Satu order mempunyai maksimal satu settlement berhasil. Bila total >0, sumber penyelesaiannya tepat salah satu: satu Payment nyata dengan satu metode, atau satu PlatformReceivable (tagihan kepada platform) sesuai bagian channel di bawah. Keduanya tidak boleh dibuat bersama untuk order yang sama. Tidak ada cicilan, split bill, gabungan metode, ataupun tambahan setelah lunas. Retry memakai ID operasi yang sama. Settlement Rp0 merupakan penyelesaian tagihan gratis dengan alasan wajib, tanpa payment atau pergerakan kas.

Sesi kas terbuka diperlukan untuk settlement, tagihan platform dan refund semua metode agar pelaporan terikat periode yang jelas. Order tidak boleh kosong/seluruhnya batal saat dibayar. Validasi ulang unit draft serta versi total sebelum commit; order processed dapat dibayar tanpa menguji ulang ketersediaan stok yang sudah dikonsumsi.

## Tunai

Masukkan uang diterima ≥tagihan; kembalian = uang diterima −tagihan. Ledger penerimaan kas hanya sebesar tagihan. Contoh tagihan Rp27.500, diterima Rp50.000, kembali Rp22.500 → kas bertambah Rp27.500. Tidak ada pembulatan total ke kelipatan Rp500 atau pencatatan kembalian sebagai biaya.

Konfirmasi **Simpan pembayaran** berarti uang sudah diterima. Commit menyimpan settlement, payment, alokasi unit, audit dan outbox secara atomik. Bila ada unit draft, commit yang sama mengonfirmasi batch serta ledger stok/print job sesuai file 04. Tanpa draft tidak ada konfirmasi/debit kedua. D-72: tiket dapur batch baru otomatis dicoba sebelum struk pelanggan setelah commit; bila tidak ada batch baru, hanya struk pelanggan dicoba. Simpan dulu tidak mencetak. Gagal cetak tidak membatalkan pembayaran atau permintaan pembuatan.

## Non-tunai

Tampilkan metode, total dan checkbox wajib **Pembayaran sudah saya verifikasi berhasil**. Field **Catatan** opsional, tanpa meminta data rahasia. Notifikasi/screenshot pelanggan saja tidak dijadikan verifikasi otomatis oleh aplikasi.

Jika keberhasilan tidak dapat diperiksa, simpan order belum bayar. Berrie offline tidak menjamin jaringan pembayaran eksternal tersedia. Payment yang berhasil diverifikasi lewat perangkat/layanan lain boleh dicatat ketika Berrie offline; metode dan pernyataan verifikasi tetap disimpan.

## Penguncian nilai dan diskon

Harga unit/topping berasal dari snapshot order; tarif pajak/layanan disalin ketika order dibuat. Sebelum lunas, pengguna sesuai izin file 08 boleh mengganti diskon order: nominal rupiah atau persen, tidak keduanya, alasan wajib bila >0. Promo SKU katalog ditambahkan melalui D-43/file 03; kasir tidak mengedit diskon baris bebas. Promo SKU dan diskon order tidak digabung dalam satu pesanan.

Diskon nominal tidak boleh melebihi subtotal. Bila pembatalan sebelum bayar membuat subtotal turun di bawah diskon nominal, minta owner menyesuaikannya sebelum commit pembatalan. Persen 0–100%, maksimal dua desimal. Pada settlement, bekukan dasar, tarif, nilai dan alokasi per unit mengikuti [07](07-data-and-business-rules.md).

Total gratis tetap mempunyai settlement Rp0, badge **LUNAS · Rp0**, dan jejak alasan; tidak boleh membuat pembayaran tunai palsu Rp0. Penyelesaian gratis mengikuti bayar dulu: unit draft ikut dikonfirmasi dalam commit, tanpa payment moneter atau pergerakan kas; tetap belum disajikan sampai kasir mencatatnya.

## Status keuangan

| Kondisi | Tampilan |
| --- | --- |
| Belum settlement | Belum bayar |
| Settlement, belum refund | Lunas |
| 0 < refund kumulatif < payment asal | Lunas · Refund sebagian |
| Refund kumulatif = payment asal >0 | Lunas · Refund penuh |
| Pembatalan paid belum dikembalikan | Tambahan badge Refund tertunda dan nominal |
| Batal penuh sebelum payment | Dibatalkan · Tanpa pembayaran |

Refund tidak mengembalikan status menjadi Belum bayar. Metode payment salah tidak boleh diedit diam-diam. Baseline koreksi: tindakan khusus beralasan yang mereklasifikasi metode, hanya di sesi asal yang masih terbuka, mempertahankan jumlah dan histori asli serta menulis selisih ledger metode/kas. Owner harus memastikan catatan sesuai perpindahan uang nyata; tidak menghasilkan payment kedua. Sesudah tutup kas, koreksi administratif memerlukan catatan penyesuaian pada sesi kini dengan referensi asal, tanpa menulis ulang laporan lama; alur ini harus terlihat di audit dan laporan penyesuaian, bukan sebagai penjualan/refund baru.

## Refund berdasarkan unit

Refund sebagian berarti sebagian unit dari transaksi, bukan nominal bebas atau pecahan satu porsi. Pilih qty per baris; aplikasi mengambil unit belum direfund dengan urutan ID stabil. Nilai setiap unit = harga+topping−promo SKU−alokasi diskon order+pajak+layanan saat settlement. Tidak menggunakan harga/tarif hari ini.

- Tiap unit boleh direfund uang paling banyak sekali, sebesar seluruh nilai settlement unit itu. Pengembalian goodwill nominal bebas ditunda.
- Jumlah seluruh refund ≤payment asal. Unit Rp0 dapat dicatat retur/batal tanpa perpindahan uang dan tanpa payment/refund moneter Rp0.
- Refund berisi payment asal, unit, nominal terhitung, metode pengembalian tunggal, alasan, sesi saat ini dan pernyataan uang sudah dikembalikan.
- Default metode refund mengikuti payment; metode lain boleh dipilih sesuai izin refund, misalnya QRIS dikembalikan tunai. Tidak ada alasan metode berbeda tambahan; alasan refund tetap wajib dan metode sebenarnya berjejak. Ledger kas mengikuti metode pengembalian sebenarnya.
- Jika kas ekspektasi tidak mencukupi refund tunai, tahan konfirmasi dan minta owner mencatat tambahan uang nyata lewat kas masuk atau memilih metode lain. Jangan menambah modal fiktif otomatis.
- Untuk unit draft/processed yang tidak akan diserahkan, form refund juga meminta konfirmasi dapur dan membatalkan unit requested atomik bersama refund setelah uang dikembalikan. Draft belum dibayar tidak eligible refund. Refund tanpa pembatalan hanya untuk unit yang sudah disajikan.
- Pembatalan dapat tersimpan lebih dulu dengan kewajiban refund. Konfirmasi refund menyelesaikan kewajiban itu; jangan menyatakan uang sudah kembali hanya karena pembatalan tersimpan.

Pembatalan unit bernilai Rp0 tidak membuat kewajiban uang atau blocker refund. Penyelesaian operasional dan keputusan stok tetap wajib, dengan audit pembatalan/retur tanpa nominal.

## Stok saat refund

Default **Tidak dikembalikan ke stok**. Pilihan kembali hanya untuk barang layak jual dan hanya sebesar unit yang pernah mengurangi stok namun belum dikembalikan. Pembatalan lebih dulu mungkin sudah mengembalikan stok; layar refund menunjukkan **Stok sudah dikembalikan** dan menonaktifkan pengembalian kedua.

Refund dan stock return memiliki ID/event berbeda dengan referensi unit yang sama. Bila dilakukan bersama, commit lokal atomik. Ledger stock return tidak pernah dibuat untuk unit yang belum diproses atau mode ketersediaan manual.

## Bukti dan kegagalan

Struk asli tetap menampilkan settlement asli. Tampilan/cetak ulang terbaru menambahkan ringkasan refund serta referensi bukti refund; bukti refund menyebut nominal, metode, waktu, alasan dan unit. Sebelum settlement hanya tiket dapur tersedia, tanpa struk/bagikan pelanggan (D-54).

Browser crash setelah commit dibuka kembali dari histori payment/refund; tidak memulai transfer uang lagi. Jika server menolak sync, payment lokal yang sudah dicatat tidak dihapus. Tampilkan perlu pemeriksaan dan ikuti rekonsiliasi pada file 08.

## Persetujuan sebelum tindakan dan uang nyata

Refund, diskon, gratis Rp0, koreksi metode dan tindakan sensitif lainnya mengikuti matriks file 08. Minta persetujuan atas unit, nilai, metode dan keputusan stok **sebelum** kasir melakukan pengembalian uang; persetujuan tidak menyatakan uang sudah dikembalikan. Setelah disetujui, kasir memeriksa kelayakan, menggunakan otorisasi eksekusi satu operasi, mengembalikan uang nyata, kemudian mencatat konfirmasinya. Jika hasil perpindahan uang/commit tidak diketahui, periksa operasi dan bukti dahulu; jangan meminta pengembalian kedua. Perubahan input substantif memerlukan persetujuan baru, bukan memakai persetujuan nominal lama. Salah catat setelah uang telanjur dipindah masuk pemulihan berjejak owner, tidak menghapus bukti.

## Tagihan dan pengembalian melalui platform — manual

**Catat tagihan platform** berarti petugas sudah memeriksa pada aplikasi merchant bahwa nilai order menjadi tanggungan platform. Simpan referensi dan pernyataan verifikasi, tanpa mengaku uang sudah masuk rekening. Buat Settlement + PlatformReceivable sebesar total G file 07; jika masih ada draft, konfirmasi batch/stok bersama dalam commit yang sama seperti bayar dulu. Label: **Ditagihkan ke platform · Belum cair**; status pembuatan/penyerahan tetap terpisah. Pesanan boleh selesai operasional setelah diserahkan dan kewajiban pelanggan selesai, meskipun pencairan belum terjadi. Jika bukti belum dapat diverifikasi, simpan belum selesai keuangan; jangan membuat klaim penerimaan fiktif.

Harga channel dan diskon yang ditanggung toko menjadi dasar nilai penjualan. Subsidi promo yang ditanggung platform dicatat sebagai bagian pembiayaan total G oleh platform, **bukan diskon toko tambahan**: misalnya G=25.000, subsidi platform=5.000, kontribusi pelanggan untuk menu=20.000; hak bruto toko tetap 25.000 sebelum biaya. Ongkir/biaya pelanggan milik platform tidak masuk penjualan toko. Pajak/layanan toko mengikuti snapshot tarif channel yang ditetapkan owner (default mati), tidak dikenakan ulang terhadap harga yang sudah termasuk komponen tersebut. Jika laporan tidak dapat dipetakan ke harga eksklusif/komponen yang didukung, tahan finalisasi dan minta owner memeriksa; jangan mengarang rincian.

Pembayaran langsung yang benar-benar diterima toko untuk order platform memakai Payment biasa dan tidak membentuk PlatformReceivable. Kanal GoFood/ShopeeFood bukan sinonim QRIS/e-wallet/transfer. Perubahan dari Payment ke tagihan platform atau sebaliknya membutuhkan koreksi owner dengan pembalikan klasifikasi berjejak dan validasi pencairan/refund yang sudah ada; tidak boleh dilakukan melalui edit metode biasa atau menciptakan penerimaan kedua.

Pembatalan sebelum settlement tidak punya refund moneter di Berrie; periksa kewajiban eksternal sebelum menganggap selesai. Setelah ditagihkan, catat **pembalikan tagihan platform** per unit berdasarkan konfirmasi platform, dengan nilai alokasi asli dan referensi bukti, terpisah dari refund yang dibayar toko. Jangan mengeluarkan uang laci bila platform yang menangani pengembalian. Sebelum platform mengonfirmasi pembalikan/penanganan, kewajiban tetap tertunda dan mengikuti blocker kas biasa. Setelah terkonfirmasi, selisih pencairan yang tersisa berada di pencocokan platform dan tidak menahan tutup kas. Jika sudah cair, pembalikan dapat menimbulkan saldo kewajiban kepada platform; jangan memaksa saldo menjadi nol.

Refund tunai toko atas order bertagihan platform di luar alur normal ditunda pada MVP: tampilkan **Periksa pengembalian melalui platform**, jangan menawarkan dua jalur refund untuk unit sama. Refund Payment langsung tetap mengikuti aturan unit di atas. Refund nominal bebas/parsial nilai satu unit tetap di luar MVP; potongan atau kompensasi platform yang tidak cocok unit dicatat sebagai penyesuaian platform beralasan dan bukti, bukan refund pelanggan fiktif. Pengembalian stok tetap keputusan terpisah, paling banyak sekali, default tidak kembali.

## Penyederhanaan form bayar — D-44

Hapus status Belum bayar/Belum diminta dibuat yang berulang di modal pembayaran; tetap pisahkan status kerja/keuangan pada pesanan. Bila ada draft, satu bantuan menyebut item baru diminta dibuat setelah pembayaran disimpan. Tunai: input uang diterima awal kosong, format ribuan, kembalian sejajar label kiri/nominal kanan; tanpa tombol Uang pas/nominal cepat. Metode non-tunai aktif berasal dari pengaturan, tanpa input tunai/kembalian dan tetap wajib verifikasi manusia. Satu Simpan pembayaran serta Kembali ke pesanan; validasi dan efek atomik lama tidak berubah.

D-54: Pemicu Refund tersedia dari Pesanan/Riwayat hanya setelah pembayaran moneter. Tombol Catat refund disabled sebelum uang sudah dikembalikan; domain/API menolak pula. Approval saja belum menghasilkan refund. Pembatalan terpisah tetap dapat menimbulkan kewajiban uang; hanya kewajiban itu yang belum selesai, bukan event refund final. Filter Refund tertunda dihapus tanpa menghapus kewajiban/blocker.

## Refund promo jumlah — D-68

Beli X gratis Y memakai potongan yang dibagi ke setiap unit kelompok promo sebagaimana file07. Settlement membekukan harga/promo/qty kelompok dan alokasi dasar/pajak/layanan/total tiap unit. Refund satu unit mengembalikan total_i asal; tidak mengembalikan harga penuh unit berbayar sambil membiarkan seluruh manfaat promo. Unit/topping gratis bukan unit tersembunyi. Refund tidak menghitung ulang kelompok promo confirmed yang masih tersisa, tidak mengubah snapshot lama, dan tidak melakukan return stok otomatis. Seluruh izin, konfirmasi uang/dapur, idempotensi dan blocker refund tetap.

## Penempatan tindakan detail — D-78

Tagihan dan **Bayar** tampil sebelum item/penyajian; **Tandai disajikan** berada pada bagian penyajian dan dapat tersedia bersamaan. Semua settlement/verifikasi/alasan/izin/commit/cetak existing tetap. Sisa tagihan dari operasi domain, refund due tampil terpisah dengan **Selesaikan refund** langsung. Refund, pembatalan, koreksi metode dan struk/cetak ulang berada pada **Aksi lainnya** bila relevan/diizinkan; kewajiban refund tidak tersembunyi di sana. Tombol dipindah tanpa mengubah aktivitas/actor/approver atau membuat settlement kedua. D-78 mengganti label Edit pesanan pada detail draft menjadi **Lanjutkan pesanan**, memakai editor dan order yang sama.
