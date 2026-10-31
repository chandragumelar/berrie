# Spesifikasi Berrie

**Pesanan terkini D-78 · 31 Oktober 2026:** workspace Aktif/Tersimpan, filter pengerjaan/pembayaran AND awal Semua, daftar operasional dan detail bersama tablet/HP. Menggantikan default Lunas/tabel/halaman detail tablet D-55. Kasir D-76/D-77 dan integritas tetap. [Review lokal D-78](../berrie-site/REVIEW-PESANAN-D78.md). Rujukan D-01–78, AC-01–172, UT-01–49, V-01–10; belum UT peserta/pilot.

**Koreksi copy D-77:** Channel dan nilainya sebaris; hapus copy terlihat Default penyajian/Untuk item berikutnya, tanpa perubahan perilaku.

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md). Rujukan terkini D-01–77, AC-01–165, UT-01–46, V-01–10.

**Acuan administrasi: D-75 · 31 Oktober 2026.** Aksi editor Menu/Stok sticky, laporan disederhanakan dengan dasar metrik eksplisit, alias masuk Tipe menu, Toko pertama/default dan pengelolaan staf sesuai model akses. [Review D-75](../berrie-site/REVIEW-ADMIN-LAPORAN-D75.md). D-74 tetap untuk Kas dan aturan lain. Kas tablet memakai breakdown kiri dan selesai bertugas bertumpuk kanan; laporan mengutamakan hasil jualan harian dan penelusuran angka, dengan refund kontekstual. Navigasi tablet atas/HP bawah tetap. [Review D-74](../berrie-site/REVIEW-KAS-LAPORAN-D74.md). D-73 lainnya tetap: Harga/qty/stok agnostik, varian opsional pada form Tambah menu yang sama, Kas dengan label–nominal berdekatan, dan audit fondasi visual terhadap dokumentasi resmi Atlassian. Alur Kasir/cetak/draft D-72 tetap; token aktif pada [design system](../DESIGN-SYSTEM.md), bukti pada [review D-73](../berrie-site/REVIEW-MENU-KAS-D73.md) dan [tasks](../tasks.md). Rujukan D-01–75, AC-01–158, UT-01–43, V-01–10. Belum versi layanan baru/deployment atau kelulusan UT/pilot. Histori sebelumnya tetap di bawah.

Baseline disetujui + revisi pengawasan/channel/tabel/promo SKU dan Kasir · 7 Oktober 2026 · Bahasa produk: Indonesia · Mata uang: IDR.

Spesifikasi ini memuat aturan Berrie yang bisa didesain, diimplementasikan, dan diuji. Latar belakang serta batas riset berada pada [01 — Product scope](01-product-scope.md); alasan keputusan dan referensi teknis pada [11](11-decisions-and-open-questions.md). Folder proyek sekarang `berrie`; penyebutan lama `Berrie POS` merujuk proyek yang sama. `/specs` berarti folder ini di dalam proyek.

Pemilik telah menyetujui seluruh keputusan dalam `/specs` dan menetapkannya sebagai **sumber kebenaran**. Keputusan produk dan implementasi yang tertulis sudah final; prototipe telah dibangun sebagian, sedangkan implementasi operasional, pengukuran biaya dan gerbang uji belum selesai. Menunggu pelaksanaan atau bukti uji tidak berarti pilihan dibuka kembali. Perubahan keputusan memerlukan instruksi eksplisit pemilik dan pembaruan dokumen terkait.

## Urutan baca

| File | Isi dan tanggung jawab utama |
| --- | --- |
| [01 — Product scope](01-product-scope.md) | Siapa pengguna, hasil yang dituju, batas MVP dan urutan pengerjaan |
| [02 — User flows](02-user-flows.md) | Alur harian dari aktivasi sampai tutup kas |
| [03 — Menu and availability](03-menu-and-availability.md) | Menu/kombinasi, variabel, stok/rekap; impor ditunda |
| [04 — Orders and dine-in](04-orders-and-dine-in.md) | Status, batch dapur, tambahan dan pembatalan |
| [05 — Payments and refunds](05-payments-and-refunds.md) | Pembayaran manual, settlement dan refund |
| [06 — Cash and reports](06-cash-and-reports.md) | Buku kas, periode dan definisi angka laporan |
| [07 — Data and business rules](07-data-and-business-rules.md) | Entitas, invariants, rumus dan kontrak penyimpanan |
| [08 — Offline, backup and restore](08-offline-backup-and-restore.md) | Hak offline, sinkronisasi, keamanan dan pemulihan |
| [09 — Screens and hardware](09-screens-and-hardware.md) | Layar, interaksi, cetakan dan dukungan perangkat |
| [10 — Acceptance criteria](10-acceptance-criteria.md) | Skenario uji dan syarat pilot/rilis |
| [11 — Decisions and open questions](11-decisions-and-open-questions.md) | Keputusan final, pekerjaan validasi implementasi, dan catatan konsistensi |
| [12 — UX principles](12-ux-principles.md) | Kemudahan penggunaan, tindakan per kondisi, cakupan UI, bahasa, aksesibilitas dan rencana uji pengguna baru |

Baca berurutan untuk review penuh. Untuk membangun pengalaman pengguna: 01 → 12 → 02 → 09 → 10; aturan bisnis rinci tetap pada 03–08. File 12 menjadi acuan UX, 02/09 memuat penerapan, dan 10 memuat verifikasi; jangan menyalin seluruh pedoman ke masing-masing file.

## Status informasi

- **Keputusan final:** baseline yang disetujui pemilik; daftar alasan `D-xx` ada di file 11.
- **Latar belakang dan riset:** asal kebutuhan serta batas bukti pada file 01; keputusan final tetap mengatur implementasi.
- **Pekerjaan implementasi/validasi:** pembangunan dan bukti yang belum tersedia, termasuk biaya aktual dan uji printer. Status pekerjaan tidak membuka ulang keputusan dan tidak membuktikan hasil pengujian.
- Sinyal riset awal pada file 01 mencakup cepat, mudah, stok/kas tepercaya, offline, cetak dan pemulihan. Target angka, desain, dan stack di sini adalah keputusan produk/teknis, bukan temuan riset pengguna baru.

Jika ada pertentangan, instruksi eksplisit terbaru pemilik didahulukan, lalu keputusan final `/specs`; selaraskan dokumen terdampak dalam revisi yang sama. Rumus mengikuti file 07, definisi laporan mengikuti 06, pemulihan mengikuti 08, dan UX mengikuti 12 tanpa mengubah bisnis. Konflik nyata antarsesama spesifikasi yang tidak terjawab keputusan tertulis harus ditampilkan secara konkret kepada pemilik; jangan menebak, menyembunyikan, atau membuka ulang keputusan final hanya karena implementasinya belum selesai.

## Istilah wajib konsisten

| Istilah | Makna |
| --- | --- |
| Draft | Item belum dikonfirmasi untuk dibuat; belum mengurangi stok |
| Konfirmasi pembuatan | Batch dan stok sekali melalui Bayar nanti atau commit Simpan pembayaran saat Bayar; tiket dicoba setelah commit |
| Batch | Sekumpulan unit item yang dikonfirmasi bersama; tambahan menjadi batch berikutnya |
| Disajikan | Sudah disajikan untuk dine-in atau diserahkan untuk bungkus |
| Lunas | Nilai tagihan sudah diselesaikan; tidak menyatakan makanan selesai |
| Refund | Pencatatan pengembalian uang yang dilakukan manual |
| Sesi kas | Satu periode buka–tutup toko; dapat berisi beberapa segmen serah-terima laci |
| Tersimpan lokal | Transaksi berhasil disimpan di perangkat |
| Tersinkron | Server mengakui penyimpanan perubahan tersebut |
| Backup | Salinan yang dapat dipulihkan; CSV bukan backup aplikasi |

## Cara memberi feedback

Untuk revisi berikutnya, sebut nama file, bagian, dan perubahan yang diinginkan, misalnya `04, Tambahan: ...`. Semua keputusan yang sudah disetujui tetap berlaku sampai ada instruksi perubahan eksplisit; usulan revisi tidak otomatis menggantinya.

## Status terkini — 7 Oktober 2026

- Rujukan **D-01–56, V-01–10, AC-01–121 dan UT-01–18**. Histori/alasan keputusan ada di file 11, pelaksanaan ada pada [tasks.md](../tasks.md); tidak mengulang seluruh register pada indeks ini.
- Prototipe Sites D-43–45 sudah diterapkan dan disimpan sebagai versi 1, tanpa deployment. [Review Kasir](../berrie-site/REVIEW-HISTORY.md#d43-d45) memuat bukti terpilih serta identitas versi/commit. Visual belum disetujui; data contoh di memori, bukan aplikasi operasional.
- **D-46–48 sudah diterapkan pada prototipe Kasir dan disimpan sebagai versi 2, tanpa deployment.** D-47 menetapkan font UI tanpa 16 px, nama/harga item 14 px regular, promo sejajar Camilan dan tabel tablet yang lebih rapat (target ≥8 menu pendek terlihat, ideal 10). Review mencatat 9 baris penuh pada fixture 21 SKU; target 10 belum tercapai. Seluruh aturan domain/izin tetap.
- **D-49: design system ditulis ulang dari nol sesuai instruksi pemilik; arah estetika prototipe sebelumnya ditolak.** HEX palet, font Apple/Inter lokal, page/surface/text, spacing dan konstruksi komponen menjadi panduan aktif dan telah diterapkan pada prototipe Kasir lokal. AC-112 menambah review komposisi/cakupan, UT-01–18 tetap. D-50 menambahkan gradasi bubblegum pada permukaan terang; cyan aktif tetap. [Bukti terpilih](../berrie-site/REVIEW-HISTORY.md#d49-d50), persetujuan visual belum selesai.
- Aplikasi operasional/scaffold T-01 belum dibangun. Tes prototipe tidak meluluskan AC operasional, UT peserta, printer fisik, keamanan, restore drill atau pilot.

## Acuan desain dan berkas pelaksanaan

Nilai visual berada pada [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md), interaksi pada file 12, penerapan per layar pada file 09. D-49 membentuk sistem baru dan D-50 menetapkan gradasi bubblegum terang; keduanya mengganti design system lama dan mendahului pemetaan palet/font/shape/spacing D-42/44–46 yang berbeda. Ukuran item/kepadatan D-47–48 dan promo SKU D-43 tetap; perilaku Kasir diperbarui D-51, stok wajib D-52 mendahului mode manual lama. Invariants uang/debit/idempotensi tetap. Design system hanya memuat panduan aktif; histori berada di file 11. UI yang disetujui dipakai kembali sesuai AC-101. Folder mockup M-01/M-02 dipensiunkan pada 8 Oktober 2026 atas instruksi pemilik; histori pengujian tetap pada [tasks](../tasks.md). Prototipe aktif hanya Sites.

Untuk revisi proyek Sites yang sudah ada, ikuti file 12 → 02 → 09 → 10, design system terkini dan [petunjuk prototipe lokal](../berrie-site/README.md). Scope revisi tetap Kasir dahulu. Simpan tanpa deployment sampai publikasi diotorisasi.

Peta lengkap file, kode, tooling, keluaran generasi dan bukti historis ada di [AGENTS.md](../AGENTS.md). Pembaruan dokumen bukan izin otomatis implementasi/publikasi atau bukti desain selesai.

Bukti revisi terbaru tersedia di [review D-51/D-52](../berrie-site/REVIEW-HISTORY.md#d51-d52); identitas versi 4 tanpa deployment yang dikonfirmasi layanan ada di [catatan pelaksanaan](../tasks.md). Identitas versi 2 tetap pada review D-46–48. Visual tetap menunggu review.

Revisi aktif D-51/D-52: Kasir composer pembelian/filter tunggal dan stok kuantitas wajib pada seluruh SKU. Instruksi terbaru mendahului manual stock/filter gabungan/tindakan pascapembayaran di Kasir yang tercatat pada histori. Bukti pada [review D-51/D-52](../berrie-site/REVIEW-HISTORY.md#d51-d52); tanpa deployment dan belum menjadi bukti aplikasi operasional.

- 8 Oktober 2026: D-53/D-54 diterapkan lokal pada Kasir/Pesanan/Riwayat. Permukaan solid menggantikan D-50, cyan aktif tetap; riwayat hanya selesai, refund paid dengan konfirmasi uang, dapur saja sebelum bayar, frame localhost 1024×768. [Review terbaru](../berrie-site/REVIEW-HISTORY.md#d53-d54), tanpa deployment; persetujuan visual/UT peserta/operasional tetap belum selesai.

- **8 Oktober 2026 — D-55/D-56:** revisi pemilik Kasir/Pesanan/Menu & Stok diterapkan lokal tanpa deployment; [review terkini](../berrie-site/REVIEW-HISTORY.md#d55-d56). Identitas wajib, default Lunas, keranjang/detail empat item pendek, form tipe/varian/topping dan peringatan stok di aplikasi. Identitas penyimpanan versi baru hanya dicatat sesudah konfirmasi layanan pada tasks.

## Revisi sebelumnya — D-57–60 (8 Oktober 2026)

Arahan pemilik: tabel input seperti Excel satu rasa/ukuran per row, stok bersama per menu, racikan Es/Gula, rekap stok online setelah antrean reda dengan cutoff/pengingat. Menu lima row per halaman dan topping/rincian tanpa pill. D-57–60 mendahului form/per-varian D-56 yang berbeda; D-01–60, AC-01–126, UT-01–21, V-01–10. Status dan bukti ada pada tasks/review terbaru; tetap prototype lokal tanpa deployment, belum aplikasi operasional/pilot.

## Revisi aktif — D-61–65 (8 Oktober 2026)

Menu memakai variabel buatan owner/dropdown single atau multi dan harga per kombinasi; stok Isi stok/Stok opname; rekap online sampai menit dan koreksi berizin; Kas dua alur sesuai petugas sama/ganti petugas, uang masuk/keluar jelas. Impor ditunda seluruhnya. Rujukan D-01–65, V-01–10, AC-01–131, UT-01–25. [Review terkini](../berrie-site/REVIEW-HISTORY.md#d61-d65), identitas simpan pada tasks. Revisi aktif sudah tersimpan sebagai versi 8 tanpa deployment; pemeriksaan final dan identitas layanan ada pada tasks. Visual/UT peserta/produksi tetap belum disetujui/selesai.

## Revisi aktif — D-66 (8 Oktober 2026)

Menu & Stok mengikuti feedback pemilik: Varian/copy ringkas, Status/Menu/Varian/Harga/Kategori, + Menu modal/Batal/hasil paling atas, harga langsung di dialog Varian, tanpa + Kombinasi/Rincian. Diskon sub tersendiri, opname/ledger di Stok. Rujukan D-01–67, AC-01–132, UT-01–26, V-01–10. [Review lokal terbaru](../berrie-site/REVIEW-HISTORY.md#d66); versi 9 tersimpan tanpa deployment, identitas dikonfirmasi layanan pada tasks. Tidak ada kelulusan UT/pilot baru.

Revisi terbaru **D-67 (9 Oktober 2026)**: Menu & Stok dua status/hapus aman/Batal perubahan, varian tambahan per pilihan/default pertama, tabel stok per menu dengan baseline beralasan, dan Diskon navigasi utama. AC-133/134, UT-27/28; aturan terbaru pada03/07/08/09/12. Belum persetujuan visual/UT/pilot.

## Revisi terkini — D-68 (9 Oktober 2026)

D-68 mendahului kategori opsional, Batal perubahan, lokasi hapus, label Ubah stok dan daftar Diskon per menu yang berbeda pada histori di atas. Kategori wajib/CRUD kategori-tipe/tambah inline; pustaka reusable persen/potongan/Beli X gratis Y; aksi kontekstual simetris, log hapus dan penjelasan kas. Rujukan D-01–68, AC-01–139, UT-01–30, V-01–10. [Bukti review D-68](../berrie-site/REVIEW-HISTORY.md#d68), [status pekerjaan](../tasks.md). Sumber awal versi10 terkonfirmasi layanan, tanpa deployment; identitas hasil simpan berikutnya dicatat setelah terkonfirmasi. UT/pilot/operasional belum lulus.


## Revisi terkini — D-69 (10 Oktober 2026)

Jadwal diskon mulai–selesai opsional zona toko, copy ringkas, Menu/Stok/Rekap bergulir vertikal, grid periode rekap dan Kas ringkas. D-69 mendahului batas jadwal manual/pagination/copy D-60/67/68 yang berbeda. Rujukan D-01–69, AC-01–142, UT-01–32, V-01–10. Melanjutkan versi11 terkonfirmasi; [bukti revisi](../berrie-site/REVIEW-HISTORY.md#d69)/[tasks](../tasks.md). Tanpa deployment; operasional/UT peserta/pilot belum selesai.
