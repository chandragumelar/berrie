# 09 — Screens and hardware

**Pesanan aktif D-78:** workspace Aktif/Tersimpan dan detail bersama mengikuti bagian D-78; default Lunas/tabel/halaman detail tablet lama diganti. Kasir D-76/D-77 dan aturan integritas tetap. [Review](../berrie-site/REVIEW-PESANAN-D78.md).

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md).

**Acuan UI D-73 · 13 Oktober 2026:** fondasi visual terkini ada pada DESIGN-SYSTEM D-73. Tambah menu: nama, kategori/tipe, harga dan Varian opsional pada form sama, preview Harga akhir, stok awal/minimal; footer Batal/Tambahkan ke tabel terpisah dari isi bergulir. Tanpa varian harga tunggal; tambahan0 harga tetap. Tidak ada pemilih satuan atau volume: Jumlah tetap angka agnostik. D-74: breakdown Kas maksimum640 px rata kiri/grid label–nominal; jalur Ganti petugas/Tutup toko bertumpuk di kanan pada lebar≥900 px, area total maksimum960 px; sempit satu kolom. Izin/hitung buta/blocker tetap. Alur Kasir D-72 di bawah berlanjut.

**Alur Kasir D-72 · 12 Oktober 2026:** visual Jira/Inter D-71 tetap. Penyajian hanya di modal item, default Bungkus; tanpa Item berikutnya di card. Modal tanpa copy bantuan/harga per unit, hasil racikan 12px seperti penyajian dan total panel 22px. Identitas kosong diberi error dekat input, tetap bisa dikoreksi. Setelah commit, Bayar nanti otomatis mencoba dapur; pembayaran dengan draft baru mencoba dapur lalu pelanggan, pembayaran batch lama hanya pelanggan. Simpan dulu tanpa cetak/debit; detail draft menyediakan Edit pesanan ke Kasir dengan identitas/nomor tetap. Cetak ulang memilih pelanggan/dapur/keduanya yang layak, SALINAN; attempt bukan bukti kertas. Kasir kosong/notifikasi/Lihat pesanan hanya sesudah sukses; gagal/unknown mempertahankan input dan operasi sama. Riwayat tetap rentang inklusif zona toko, nominal rata kiri. D-72 mendahului uraian D-71 yang berbeda; uang/stok/izin/snapshot/gerbang rilis tetap. [Design system](../DESIGN-SYSTEM.md), [review lokal](../berrie-site/REVIEW-KASIR-D71.md).

Acuan UX utama: [12 — UX principles](12-ux-principles.md). Gunakan tabel tindakan per keadaan, kamus label, contoh error, peta seluruh kemampuan dan ukuran aksesibilitas di sana. Bagian berikut menerapkan aturan itu pada layar; rumus/status bisnis tetap mengikuti file 03–08.

## Navigasi dan layout

Navigasi utama: **Kasir, Pesanan, Riwayat, Menu & Stok, Kas, Laporan, Pengaturan**. Pada HP gunakan empat tujuan utama Kasir/Pesanan/Riwayat/Lainnya; sisanya di Lainnya. Desktop/tablet memakai sidebar dan katalog–keranjang berdampingan; HP katalog dan keranjang bergantian dengan total serta tombol keranjang tetap terlihat.

Kasir adalah halaman setelah aktivasi/buka kunci pada perangkat aktif. Sidebar mengelompokkan Kasir/Pesanan/Riwayat sebagai pekerjaan harian, sisanya pengelolaan. Pesanan menampilkan jumlah aktif termasuk pesanan lunas yang belum selesai. HP owner membuka Laporan dengan checkpoint server dan akses Persetujuan/Staf & izin online; halaman laporan tetap hanya baca. Perangkat sekunder tidak menjadi kasir. Pengaturan memuat bagian Toko, Metode pembayaran, Pajak & biaya layanan, Printer, Data & Perangkat, Akun & keamanan, Staf & izin, Channel penjualan, Langganan; semua bisa ditemukan tanpa menyelesaikan onboarding tambahan.

Baseline lebar layar minimum 360 px. Target sentuh minimal 44×44 px, nominal rata kanan, angka rupiah konsisten dan tanpa desimal. Gunakan teks/ikon selain warna untuk status. Semua aksi utama bisa dijalankan keyboard; fokus dialog terkunci dengan benar dan kembali ke pemicu ketika ditutup. Tidak mengandalkan hover.

Pada HP, pemicu **Keranjang · jumlah item · total** tetap terlihat; tombol proses/bayar yang relevan tampil setelah keranjang dibuka; penyajian ada di detail Pesanan, boleh ditumpuk. Jangan mengecilkan target sentuh untuk memuat semua aksi dalam satu baris. Nama panjang membungkus pada ringkasan/konfirmasi; keyboard layar dan sticky bar tidak menutup input, error atau tindakan. Ukuran teks/kontras/zoom mengikuti file 12 bagian 9. Kembali dari detail mempertahankan filter dan posisi antrean.

## Daftar layar

| Layar | Isi / aksi utama | Kondisi penting |
| --- | --- | --- |
| Login/aktivasi | Email/password, verifikasi, toko, pilih perangkat, PIN | Internet diperlukan; jelaskan perangkat lama |
| Buka kunci | PIN, lupa PIN, status koneksi | Cooldown dan akses pemulihan online |
| Setup | Nama toko, zona, nama/harga menu pertama, buka kas | Metode non-tunai/uji cetak dan pengaturan menu tambahan bisa ditunda; indikator siap offline terpisah dari siap cetak |
| Kasir | Kategori/search, menu, varian/topping, qty, catatan, penyajian/identitas | Filter tunggal Semua/kategori/Habis/Promo; inactive hanya di Menu & Stok; Habis memuat SKU aktif berstok 0 disabled |
| Keranjang/order | Hasil penyajian dan catatan per item, rincian total, tombol catatan/diskon, Simpan dulu, Bayar nanti; Bayar | Kedua urutan terlihat bila sah; rincian pajak/layanan/diskon yang terpakai tidak disembunyikan |
| Pesanan | Aktif/Tersimpan, daftar operasional, search/filter pada daftar, detail bersama | D-78: awal Aktif + Semua/Semua; filter kerja/bayar AND; tablet≥900 daftar40%/detail60%, HP detail penuh/Kembali ke pesanan |
| Detail order | Timeline batch, penyajian parsial, cetak, batal, tambahan | Penyajian/refund/koreksi dari detail Pesanan/Riwayat; pembayaran berhasil di Kasir mengosongkan keranjang, tanpa menandai disajikan |
| Bayar | Total terkunci, metode, diterima/kembalian/verifikasi | Konflik total meminta muat ulang, tidak menerima nominal lama |
| Refund | Unit tersisa, nilai asli, metode, alasan, keputusan stok | Tampilkan stok sudah kembali dan kewajiban belum selesai |
| Riwayat | Cari nomor, no. antrean/nama, tanggal, metode, status refund | Hanya settlement dengan semua unit disajikan/dibatalkan dan tanpa pekerjaan/refund due tersisa; detail historis immutable, salinan dan bukti refund |
| Menu & Stok | Menu/kombinasi/variabel, Isi stok, Stok opname, rekap online dan histori | Konfigurasi owner, input stok/minimal jelas, koreksi berizin; impor ditunda |
| Kas | Buka, modal, kas masuk/keluar, ekspektasi, tutup | Daftar blocker dengan tautan langsung |
| Laporan | Filter tanggal/sesi, metrik pada file 06, export | Label cakupan lokal/server dan checkpoint |
| Data & Perangkat | Sync, konflik, backup, restore/pindah, hak offline, ekspor data, pemeliharaan | Berada di Pengaturan; banner status membuka lokasi yang sama; tampilkan cakupan sebelum restore |
| Pengaturan | Identitas, printer/lebar, pajak/layanan, metode, langganan | Semua fitur paket dan tanggal akses dijelaskan |

Antrean default berdasarkan pekerjaan belum selesai paling tua; tampilkan umur sejak batch pertama belum selesai. Filter Belum bayar tetap mencakup makanan yang sudah disajikan. Tidak ada status dapur otomatis berdasarkan durasi.

Banner global bahasa sehari-hari: **Tidak ada internet · 3 pesanan tersimpan di perangkat, belum terkirim. Sambungkan internet untuk mengirim.** atau **Data terkirim 14.32** hanya setelah bukti ACK. Pada prototipe memori gunakan **Catatan demo ada di perangkat ini, belum terkirim (simulasi)**; jangan mengklaim persistensi, keamanan atau cadangan. Detail backup/izin dibuka dari banner. Pada kegagalan lokal, gunakan pesan persisten **Belum tersimpan — coba lagi**; toast singkat tidak cukup untuk transaksi uang.

Pesan Belum tersimpan hanya dipakai jika commit terbukti gagal. Jika hasil belum diketahui, tampilkan pemeriksaan status operasi dan larang mengulangi perpindahan uang; gunakan contoh pesan file 12 bagian 6–7. Status payment, kerja, sinkron dan kertas tetap terpisah pada detail order. Card kosong dan pengaturan tambahan menyediakan aksi bernama, bukan tour wajib.

## Label dan dialog

- **Minta dibuat**; bantuan **Cetak struk untuk dapur**.
- **Bayar**, **Tandai disajikan** / **Tandai diserahkan**, **Cetak ulang — SALINAN**.
- Pembatalan: alasan, informasi **Beri tahu dapur secara langsung**, dan pilihan stok dengan default tidak kembali.
- Non-tunai: **Pembayaran sudah saya verifikasi berhasil**.
- Refund: **Uang sudah saya kembalikan**; jangan sekadar tombol yang menyiratkan transfer otomatis.
- Restore/tutup kas menampilkan ringkasan konsekuensi sebelum konfirmasi. Aksi membaca, memilih menu, dan simpan dulu tidak memakai dialog konfirmasi tambahan.

Form bayar memakai **Simpan pembayaran** sebagai konfirmasi final dengan validasi/checkbox sesuai metode, bukan dialog berulang. Pemicu refund memakai **Refund**; konfirmasi akhir **Catat refund** hanya aktif setelah uang dikembalikan (atau pembalikan platform diverifikasi). Ringkasan risiko menyebut objek/nominal/dampak; default fokus bukan tombol destruktif. Jangan membuat Undo untuk uang/dapur/stok tanpa alur koreksi yang sudah disetujui. Gunakan karakter visual file 12 bagian 10: token D-71 pada [design system](../DESIGN-SYSTEM.md), dasar netral dengan aksen selektif, spasi konsisten, respons lokal cepat tanpa animasi penghalang.

## Format cetakan

Template hitam-putih untuk 58 mm dan 80 mm; area cetak mengikuti margin nyata printer yang diuji, bukan mengasumsikan seluruh lebar kertas bisa dicetak. Teks panjang membungkus, tidak terpotong. Tidak ada logo wajib; nama toko berbasis teks cukup untuk MVP.

| Dokumen | Isi wajib |
| --- | --- |
| Tiket dapur | DAPUR, nomor order/batch, waktu proses, dine-in/bungkus, no. antrean/nama, unit, varian, topping, catatan; tanpa harga |
| Tiket tambahan | TAMBAHAN, nomor order sama, batch/waktu baru, hanya unit tambahan |
| Pesanan belum bayar | Hanya tiket dapur; tujuan pelanggan/keduanya disabled sampai settlement (D-54) |
| Struk lunas | Rincian settlement, LUNAS, metode, waktu bayar, diterima/kembalian tunai; Rp0 diberi keterangan gratis |
| Bukti refund | Nomor refund/transaksi asal, unit, nilai komponen, metode, alasan dan waktu |
| Salinan | Penanda SALINAN besar, referensi dokumen asli dan waktu cetak ulang |

Tiket batch selalu memakai snapshot batch asli meski kemudian dibatalkan. Cetak ulang tiket yang punya unit batal menambahkan penanda pembatalan yang diketahui saat cetak dan peringatan agar konfirmasi ke dapur. Tidak merekayasa tiket pengganti seolah-olah batch baru.

D-72: Bayar nanti otomatis mencoba tiket dapur batch baru; pembayaran otomatis mencoba dapur batch baru lalu pelanggan, atau hanya pelanggan bila batch sudah ada. Simpan dulu tanpa print job/attempt. Satu antrean logis mengurutkan tiket dapur sebelum struk pelanggan. Satu job dicoba pada satu waktu; pilihan awal pelanggan & dapur bila keduanya layak; pelanggan dapat dikecualikan lewat pilihan tujuan. Sebelum pembayaran, hanya dapur dapat dipilih; cetak pelanggan ditolak juga pada domain. Print job tidak otomatis diulang saat reload/sync karena kertas sebelumnya mungkin sudah keluar. Attempt kedua dan seterusnya selalu SALINAN. Membatalkan dialog bukan bukti kegagalan mesin; state `unknown` tersedia. D-71 menghapus konfirmasi kertas rutin. Selesai mengirim perintah/attempt menutup dialog; status pengiriman dipisahkan dari hasil fisik yang tidak diketahui. Tidak otomatis memberi status `confirmed_printed` dari event browser; data konfirmasi lama dipertahankan sebagai histori.

## Batas struk digital — D-71

Bagikan/salin/unduh struk pelanggan tidak termasuk UI Berrie. Struk tetap tersedia sebagai pratinjau/cetak/cetak ulang di detail Pesanan/Riwayat, tanpa mengumpulkan nomor pelanggan.

## Hardware dan batas dukungan

PWA memakai dialog cetak sistem. Tidak menjanjikan silent printing, koneksi USB/Bluetooth langsung browser, cash drawer otomatis atau driver universal. Printer dibeli bebas oleh pengguna; dukungan ditentukan pasangan model dan jalur koneksi yang diuji.

| Platform sasaran | Jalur uji awal | Status per 6 Oktober 2026 |
| --- | --- | --- |
| Desktop Windows + Chrome/Edge | Driver OS, printer thermal USB atau jaringan | Belum diuji |
| Desktop macOS + Safari/Chrome | Printer dikenali sistem, USB/jaringan yang didukung | Belum diuji |
| Android + Chrome/PWA | Layanan cetak sistem dengan printer thermal yang kompatibel | Belum diuji |
| iOS/iPadOS + Safari/PWA | Printer/solusi AirPrint yang kompatibel | Belum diuji |

Ini daftar target uji, bukan daftar dukungan yang sudah dijanjikan. Minimum satu jalur thermal berhasil untuk setiap platform yang dipasarkan dengan klaim cetak. Jika suatu platform belum lolos, boleh digunakan untuk alur digital setelah uji fungsional, tetapi jangan dijual dengan klaim cetak platform tersebut. Model printer spesifik ditetapkan dari hasil pengujian hardware nyata, bukan deskripsi marketplace.

Simpan bukti uji model/firmware, perangkat, versi OS/browser, koneksi, lebar, margin, gambar cetakan, offline, reload, batal dialog dan cetak ulang. Uji minimal 20 pasang tiket/struk per kombinasi tanpa isi terpotong/tertukar. Profil dukungan browser diperbarui dari hasil uji, bukan janji seluruh versi.

## Penyempurnaan kasir — arahan pemilik

Menu berupa tabel ringkas per varian: tipe, nama lengkap, saldo stok wajib, promo nyata dan harga akhir terlihat tanpa membuka detail. Alasan tidak bisa dijual ditampilkan pada baris tanpa kolom Tersedia terpisah. Promo katalog SKU nyata mengikuti D-43/file 03; diskon order tetap di total tanpa digabung promo SKU. Pencarian mencakup nama/varian, filter kategori tetap ada, target sentuh ≥44×44 px mulai 360 px. Satu tindakan **Pesanan baru**; pesanan yang masih diisi tidak dibuang. Empty state hanya petunjuk, tanpa tombol duplikat. Pesanan/Riwayat tidak mengulang Buka Kasir; navigasi utama tersedia. Header menunjukkan Kas terbuka/ditutup serta **Tutup kas** saat selesai bertugas. Saat kas belum dibuka, **Buka kas** menjadi tindakan utama sebelum melayani. Notifikasi sukses rutin singkat; keadaan kas tetap terlihat. Hambatan tutup kas memakai nomor pesanan, keadaan/pekerjaan yang perlu dibereskan dan Buka pesanan. Pergantian penanggung jawab memakai serah-terima file 06; tidak ada payroll/absensi.

Penyajian dipilih per item termasuk jumlah dibagi dua, terlihat di ringkasan/tiket; identitas **No. antrean / nama**. Tombol **Bayar nanti** mengonfirmasi batch sekarang. **Bayar** membuka form; **Simpan pembayaran** ikut mengonfirmasi seluruh draft atomik, tanpa langkah konfirmasi pembuatan lagi. Tanpa draft, **Bayar** tidak membuat batch/debit baru.

## Tabel kompak lintas layar — arahan terbaru pemilik

Semua daftar berulang memakai header kolom, baris sejajar dan pemisah tipis; **bukan kartu terpisah per item**, tanpa jarak/padding/kotak besar antarbaris. Form, ringkasan total dan dialog tetap boleh berupa panel. Tabel tidak berarti spreadsheet yang bebas mengedit sel uang/stok: edit harus melalui operasi tervalidasi dan izin yang sama.

| Daftar | Kolom desktop utama |
| --- | --- |
| Menu Kasir | Tipe, Menu (nama/varian), Sisa stok, Diskon, Harga akhir; pilih baris dengan nama jelas, rincian topping saat diperlukan |
| Pesanan | Nomor/ID platform, Channel, Antrean/nama, Waktu/umur, Pengerjaan, Keuangan, Total, aksi |
| Riwayat | Waktu, Nomor/ID platform, Channel, Petugas, Total, Diskon order, Sumber penyelesaian, Refund/pembalikan, aksi |
| Menu & Stok | Menu/varian, Kategori, Tersedia, Sisa/satuan, Harga, aksi edit/ledger |
| Kas/serah-terima | Waktu, Petugas, Jenis, Masuk, Keluar, Alasan, referensi; hitungan/selisih mengikuti pembatasan file 06 |
| Dana platform | Channel/ID, Tagihan, Pembalikan, Biaya, Penyesuaian, Cair, Sisa/status, referensi |
| Persetujuan/audit | Waktu, Peminta, Aktivitas, Objek, Nominal/dampak, Status, aksi/detail |
| Staf & izin | Aktivitas, Izin kasir, Batas bila relevan; daftar staf memakai Nama, Status, aksi |

Kolom Diskon pada katalog menampilkan promo SKU nyata D-43 (tanpa promo 0), bukan alokasi diskon order. Riwayat/laporan memisahkan promo SKU dan diskon order. D-52: sisa stok wajib berupa angka; data lama tanpa hitungan diperbaiki di Menu & Stok sebelum dijual. Harga mengikuti channel terpilih dan diberi label; ketersediaan hanya catatan Berrie.

Pada 360 px, tabel Kasir mempertahankan Menu/varian, Sisa stok dan Rp harga; tipe/promo/alasan tidak dijual masuk sel Menu/rincian baris yang terjangkau. Promo tetap terlihat sebelum memilih/commit; teks header/nama boleh membungkus dan kolom topping/aksi tambahan masuk rincian baris. Pilih menu melalui tombol berlabel dengan target ≥44×44. Selain workspace Pesanan D-78, daftar lainnya menampilkan kolom prioritas dan **Rincian** yang membuka baris detail/drawer; tidak berubah menjadi kartu. Tidak ada scroll horizontal halaman/Kasir. Tabel laporan dengan kolom lengkap boleh scroll dalam region berlabel yang bisa diakses keyboard; ringkasan/filter tetap muat. Header semantik terkait sel, fokus jelas, harga rata kanan, nama lengkap tersedia sebelum commit. Padat berarti mengurangi ruang kosong, bukan mengecilkan teks/target sentuh.

## Layar tambahan dan bukti status

- **Pengaturan → Staf & izin**: kelola identitas/PIN, matriks izin/batas diskon, versi kebijakan dan status diterima perangkat. Tidak meminta PIN owner setiap penjualan biasa.
- **Persetujuan**: inbox owner pada HP; detail ringkasan persis, Setujui/Tolak dan alasan; kasir melihat Belum dikirim/Menunggu/Disetujui/Diotorisasi untuk dijalankan/Sudah dicatat/Ditolak/Kedaluwarsa/Dicabut/Perlu pemeriksaan. Tombol owner tidak mengklaim refund sudah terjadi.
- **Kas → Serah-terima kas**: hitung tanpa ekspektasi awal, selisih sesudah simpan, actor keluar/masuk, pengecualian owner. Hitungan fisik tetap berjejak.
- **Pengaturan → Channel penjualan**: aktifkan platform, akun outlet, harga/pemetaan SKU/topping/tarif. **Kasir** menampilkan channel dan ID wajib bila platform; tanpa login/integrasi aplikasi merchant.
- **Laporan → Dana platform / Perlu diperiksa**: pencocokan manual dan pengawasan. Laporan HP hanya server dengan checkpoint; pencatatan uang tetap pada kasir aktif. Data staf dibatasi file 08.
- Tiket/struk pesanan platform menampilkan channel dan ID eksternal; **Ditagihkan ke platform · Belum cair** bukan LUNAS tunai/rekening. Bukti pembalikan menjelaskan platform yang menangani. Pencatatan susulan tidak auto-print; cetakan manual bertanda **CATATAN SUSULAN — JANGAN DIBUAT LAGI**. Semua aturan SALINAN dan bukti kertas tetap berlaku.

## Acuan preview tablet

Arahan pemilik 7 Oktober 2026: mockup terutama ditinjau sebagai **tablet**, bukan layar iPhone atau desktop lebar. Asumsi awal pelaksana: tablet landscape dengan viewport logis **1024×768 CSS px**; ini acuan layout, bukan klaim model perangkat tertentu. Menu tabel dan keranjang berdampingan dengan sidebar ringkas serta kontrol sentuh. Di desktop, preview default dibatasi pada ukuran acuan tablet dan diberi label di panel preview; jangan otomatis melebar mengikuti monitor. Frame preview hanya alat review, bukan batas ukuran aplikasi produksi.

Aplikasi tetap satu web/PWA responsif: layout ditentukan ruang tersedia, bukan deteksi merek iPhone/iPad. Tablet portrait 768×1024 boleh memakai layout satu panel bila dua panel tidak cukup, tanpa mengecilkan teks atau target sentuh. Mode HP/desktop tetap tersedia untuk pemeriksaan; default review kembali ke tablet landscape. Di layar host lebih sempit, gunakan ukuran yang muat tanpa menskalakan target sentuh menjadi kecil; jangan menyebutnya preview 1024 px bila ruang sebenarnya lebih kecil.

## Acuan desain Sites — D-41

Visual dan alur dievaluasi bersama pada prototipe Sites. Gunakan [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md), aturan visual file 12 dan seluruh aturan layar di atas. Default review tetap tablet landscape 1024×768; uji HP/portrait/desktop. Versi yang disetujui pemilik menjadi acuan UI implementasi operasional, termasuk dialog, status kosong/error dan alur sensitif. Jangan menyalin estetika mockup lokal yang ditolak atau mengganti tabel kompak dengan kartu per entri. Prototipe Kasir D-46–48 sudah disimpan sebagai versi 2, tanpa deployment; [bukti dan batas uji](../berrie-site/REVIEW-HISTORY.md#d46-d48). Belum ada persetujuan visual.

## Penyederhanaan Kasir dan Struk — D-44

- Kas tertutup: satu CTA Buka kas yang dominan, pengantar Buka kas untuk mulai melayani, tanpa Pesanan baru duplikat. Kas terbuka: indikator dan langsung pilih menu; tanpa Pesanan baru di Kasir (D-55). Pergantian petugas sesi terbuka memakai Serah-terima kas; tidak reset sesi.
- Search dan channel pada grid sejajar, tinggi/radius/font/padding sama; pencarian boleh lebih lebar. Channel Toko default aktif; platform mengikuti setting. Urut tipe A–Z, menu A–Z, varian A–Z. Label tipe Normal/Paket/Promo/custom mengikuti D-56; tanpa komponen stok paket. SKU stok 0 mengikuti D-47: angka 0 dengan tint semantik, penjelasan aksesibel dan disabled, tidak dapat dipilih; D-51 menempatkan stok nol hanya di Habis. Saldo positif nonaktif hanya ditampilkan di Menu & Stok.
- Modal pembayaran ringkas sesuai file 05; status pekerjaan/keuangan terpisah tetap pada pesanan, tidak harus mengulang pills di form bayar.
- Modal berjudul **Struk**, pemilih **Cetak untuk**: Pelanggan & dapur (default setelah settlement bila keduanya layak), Pelanggan saja, Dapur saja. Sebelum bayar hanya Dapur saja; pilihan lain disabled. Pratinjau **Untuk pelanggan/Untuk dapur**; pelanggan memuat uang/status, dapur tanpa harga. CTA Cetak struk, atau Cetak ulang — SALINAN bila dokumen sudah pernah dicoba (D-71).
- Dapur hanya batch dikonfirmasi. Bayar tanpa draft baru tidak membuat/cetak dapur otomatis lagi; pelanggan baru pascabayar layak dicetak, dapur ulang hanya SALINAN eksplisit. Detail nomor batch ditampilkan bila diperlukan, bukan dropdown jargon di awal. Pesanan tambahan memuat unit baru saja. Tujuan tidak layak disabled dengan alasan; kasus catatan susulan tetap jangan dibuat lagi.
- D-71: setelah attempt tersimpan, dialog selesai tanpa tombol Kertas sudah keluar/Bagikan struk pelanggan. Cetak ulang — SALINAN tersedia di detail; tanpa klaim kertas berhasil keluar. Kontrol simulasi terpisah dari UI kasir normal. Semua dokumen mengikuti snapshot/antrean lama, dan tidak memberi efek stok/uang.

Token font/ukuran/radius mengikuti DESIGN-SYSTEM.md; kontras/fokus/aksesibilitas file 12 tetap wajib.

## Penerapan visual aktif — D-49/D-53

Ikuti konstruksi dan token [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) serta UX 10.1–10.2: page netral, katalog/keranjang opaque dengan fill putih sejuk solid #FCFCFD D-53, nama/harga primary regular, bentuk sesuai peran, spacing terukur, navigation selected ringan, dan glass navigasi selektif. Nilai radius/segmented/font/spacing lama D-44–46 yang berbeda digantikan D-49. Ukuran 14/18/20/22 dan aturan Kasir D-47–48 tetap.

Toolbar/headings/help diringkas agar menu lebih dominan dan budget row tablet tercapai. Sidebar label panjang utuh, rail tidak membuang state. Konten transaksi/pratinjau struk solid. Panel review seluruh keluarga komponen/state berada di luar menu kasir harian. Review terang/gelap, keyboard, reflow/zoom dan fallback mengikuti AC-109/110/112.

D-49/D-53 diterapkan pada prototipe Kasir; layar lain belum direview lengkap. Versi 2 tetap bukti historis. [Review terkini](../berrie-site/REVIEW-HISTORY.md#d49-d50) memuat bukti terpilih dan batasnya; persetujuan visual belum selesai.

## Feedback visual dan kontrol Kasir — D-47

Ikuti skala per peran yang dipertahankan di DESIGN-SYSTEM.md D-49: isi/nama menu/harga item 14 px/400, panel/label/aksi 14 px/500, judul Kasir 18 px/600, dialog 20 px/600, total utama 22 px/600. Tidak ada font dasar 16 px. Target sentuh/minimum tinggi kontrol mengikuti token aktif D-49; typography kecil tidak mengecilkan hit area.

Kolom Tipe/Menu/Sisa stok/Diskon/Rp harga; tanpa promo 0, harga sel tanpa Rp. Alias tipe dan penyajian menu/varian mengikuti file 03 D-47. Label stok kuantitas nol tidak mengulang Habis di tabel Kasir; D-51/D-52 menahan data tanpa hitungan dan SKU nonaktif di Menu & Stok.

Keranjang langsung menampilkan Bungkus/Makan di tempat dan input No. antrean / nama tanpa kata opsional pada label (nilai wajib sebelum simpan/proses/bayar D-55); tanpa accordion/heading Penyajian & nama (opsional). Grup/input tetap berlabel aksesibel. Pemicu Batalkan/Refund/Koreksi terlihat langsung pada konteks transaksi; form muncul setelah dipilih, izin dan syarat tindakan tetap. Pada konteks relevan yang belum layak, disabled dengan alasan; jangan refund pesanan kosong. Koreksi membuka jenis koreksi yang sah, tidak mengedit histori bebas.

Header memakai satu kontrol berbentuk toggle dengan status Kas terbuka/Kas tertutup, semantik button bernama Buka kas/Tutup kas. Memicu form, bukan switch instan; posisi mengikuti sesi committed dan tidak berubah ketika form baru dibuka/batal/gagal/blocker/hasil belum diketahui. Penutupan mengikuti seluruh file 06. Satu pemicu Buka kas saat tertutup; Pesanan baru sekunder 14 px/500 di detail, tanpa pemicu pada Kasir D-55. Keranjang kosong cukup pilih menu; input belum tersimpan tetap ditahan dengan Simpan dulu. Serah-terima tidak digantikan toggle tutup/buka sesi. Revisi hanya dokumen/prompt, belum perubahan UI.

D-47: toolbar kategori menempatkan Promo sejajar setelah Camilan; kategori single-select, promo toggle tambahan. Katalog adalah tabel, tanpa kartu per menu. Baseline 1024×768/ukuran browser default dengan minimal 20 menu pendek menampilkan ≥8 baris penuh sebelum scroll (target 10), row 44 px/area isi ≥352 px. Header/search/filter/padding diringkas; nama panjang/zoom tumbuh wajar, bukan dipotong demi jumlah baris. Pada HP kategori ringkas+promo muat tanpa scroll horizontal. Jumlah baris aktual perlu bukti, belum diuji.

## Koreksi tampilan terbaru — D-48 (7 Oktober 2026)

Instruksi terbaru pemilik: header **Diskon** saja. Isi kolom Sisa stok, Diskon dan Rp harga hanya angka dengan pemisah ribuan/desimal; tanpa Rp, %, teks, dash, slash atau rentang. Diskon memakai nilai sesuai jenis yang owner atur (misalnya 10 untuk 10% atau 2.000 untuk potongan Rp2.000); jenis/nilai/harga dasar dan efektif dijelaskan pada detail item, bukan menambahkan unit di sel tabel. Nominal total/pembayaran/refund/struk tetap berformat Rp.

Satu baris katalog mewakili satu SKU dengan satu stok/harga yang pasti. SKU bernama sama dibedakan melalui nama varian **inline**; jika nama varian juga sama, tambahkan kode SKU asli. Ini menggantikan penyajian kelompok stok/harga per varian D-47: tidak menjumlahkan stok, tidak mengarang harga atau memilih SKU diam-diam. Subbaris generik/satuan tidak diulang pada satu SKU; varian asli tetap terlihat di detail/keranjang/refund. Filter promo membatasi SKU nyata. D-52 mewajibkan hitungan angka; data lama tanpa stok ditahan untuk perbaikan admin. D-51: stok 0 hanya ada di Habis dengan angka 0/disabled, item nonaktif hanya ada di Menu & Stok. Input numerik menolak huruf dan batas domain tetap memvalidasi angka/uang.

Navigasi kiri tablet/desktop dapat diciutkan menjadi rail ikon dan dibuka kembali melalui tombol berlabel **Ciutkan navigasi/Buka navigasi**, dengan aria-expanded dan fokus keyboard. Menambah ruang katalog tanpa mengubah pesanan, filter, channel atau histori. Ikon navigasi tetap memiliki nama aksesibel; HP mempertahankan navigasi responsif. Tidak ada perubahan stack, scope paket, uang/stok/izin atau otorisasi deployment.

Penerapan prototipe dan bukti terpilih: [review D-47/D-48](../berrie-site/REVIEW-HISTORY.md#d46-d48). Persetujuan visual, UT dan gerbang operasional belum selesai.

## Keranjang pembelian dan tindakan lanjutan — D-51

Dialog item memuat Makan di tempat/Bungkus; card Pesanan baru tanpa Item berikutnya D-72, tetap menampilkan penyajian per baris dan identitas wajib sebelum simpan/proses/bayar. Error identitas dekat input, tidak mengunci input; bisa diisi lalu Bayar lagi. Nama Reguler bawaan disembunyikan bila tidak membedakan SKU; catatan item berlabel langsung terlihat sebelum bayar. Beri diskon dan Catatan sejajar sebagai dua tombol sekunder dengan ikon, fill dan border kontrol; Simpan dulu juga tombol jelas. Bayar nanti dan Bayar tetap terlihat saat ada draft, tanpa copy bantuan rutin; konfirmasi pembuatan/stok tetap sekali. Tidak ada Refund, Koreksi atau tandai penyajian di keranjang Kasir. Detail Pesanan/Riwayat mempertahankan tindakan sah tersebut beserta izin/alasan/audit.

Sesudah commit pembayaran berhasil, Kasir kosong; modal Struk tetap memakai ID/snapshot transaksi asal. Menutup/gagal mencetak tidak mengembalikan order lunas ke keranjang. Paid order belum disajikan tetap di Pesanan aktif; tidak auto-disajikan. Error/gagal/hasil belum diketahui tidak mengosongkan keranjang sebelum ada bukti hasil. Filter Menu hari ini dan kategori mengikuti file 03 D-51.

## Penyelesaian pesanan — D-54

Filter Lunas hanya settlement pada pesanan aktif, sehingga belum disajikan tetap bisa ditemukan; tidak menandai selesai otomatis. Refund tertunda bukan filter; kewajiban pembatalan terpisah tetap pada daftar Semua dan detail/tutup kas. Refund bisa dimulai sesudah pembayaran di Pesanan (unit belum diserahkan) atau Riwayat (unit sudah diserahkan). Form untuk unit belum diserahkan mengharuskan dapur diberi tahu; pembatalan unit dan pencatatan refund dilakukan dalam satu commit sesudah konfirmasi uang. Approval tidak mencatat refund atau uang otomatis.

Keranjang tanpa Lihat di Pesanan/copy Bayar nanti, label No. antrean / nama dan Beri diskon. Tabel Kasir Tipe/Menu/Stok/Diskon/Harga; angka tetap tanpa unit. Bayar dan Struk setelah konfirmasi memakai lebar penuh/minimum 48 px yang sejajar. Riwayat tanpa angka 0 belum disajikan, search dan tanggal/metode berjarak 16 px; filter metode/tanggal terpisah dari filter Pesanan dan bekerja pada tanggal settlement zona toko.

## Revisi tablet dan menu — D-55/D-56

Nama toko satu kali di bawah brand sidebar; topbar hanya judul layar. Katalog #FCFCFD, keranjang solid lavender-soft #E8E7F6; tema gelap grouped. Keranjang dan detail menampilkan ≥4 baris pendek penuh pada 1024×768/default, target sentuh tetap ≥44×44; item panjang tumbuh. Beri diskon/Catatan lebar sesuai isi/minimum 44, bukan full-width. Bayar hitam, Bayar nanti abu-abu. Identitas label No. antrean / nama (wajib). Daftar dan modal penyajian mengikuti file 04 D-55, form Tipe/kategori/varian/topping/channel dan Stok rendah mengikuti file 03 D-56. Root localhost tetap frame 1024×768 termasuk dialog.

## Pengelolaan tabel tablet — D-57–60

Menu & Stok: Menu/Stok/Rekap online dalam satu area. Menu satu rasa/ukuran per row editable, gulir vertikal dengan header tetap/default tablet (D-69); row ≥64 px dan field ≥56 px. Dropdown/kode otomatis/duplikat/tempel/filter sel salah dan satu save. Kolom inti Menu/Rasa/Ukuran/Harga di kiri; kolom tambahan bisa digulir horizontal, konteks nama tetap. Topping/Rincian tombol teks tanpa pill; glyph checkbox tetap target label ≥44. Saldo sekali per grup di tab Stok, stok awal baru di area setup; tidak ada subtotal saldo varian. Dialog item memuat dropdown racikan dengan bawaan Normal, hasil terlihat di keranjang/detail dan kedua tujuan cetak. Pengingat Rekap online header membuka tabel rekap, cutoff terlihat, bukan badge klaim jumlah pesanan. Tutup kas mengingatkan rekap tanpa blocker/eksekusi baru. Cakupan layar kecil/zoom/perangkat fisik tetap perlu diuji; gulir tabel tidak mengecilkan font/target Kasir.

## Penerapan D-61–67

Menu lima pilihan harga per halaman; kolom Status/Menu/Varian/Harga/Kategori, lalu pilihan berharga/channel/Tipe. Nama sticky, tanpa checkbox/bulk. Dua status dengan warna hanya sel status; Hapus menu berkonfirmasi seluruh varian/histori tetap. + Menu modal/Batal/hasil paling atas; Batal perubahan membuang seluruh draft tabel. Varian membuka nama/cara memilih/pilihan + tambahan harga≥0, default pertama berbintang dan harga dasar; Terapkan varian langsung, tanpa preset/pengaturan harga/Lanjut ke harga/Rincian/+ Kombinasi. Diskon navigasi utama sendiri, tidak jadi tab/sub. Tidak ada impor.

Stok satu row/menu: Status/Menu/Harga/Kategori/Stok awal/Stok minimal/Stok sisa. Hanya baseline dan ambang editable; Ubah stok awal membuka modal total aktual/alasan berizin dan Log perubahan stok memuat waktu/actor/before/after. Sisa read-only; baseline reset hanya eksplisit. Rekap mempertahankan Dari/Sampai presisi menit/qty/exclude/histori/koreksi, tiga copy yang ditolak pemilik dihapus. Input56/row64/lima row/frame1024×768, horizontal scroll dan error tumbuh tetap.

Kas: saldo/rincian di kiri; Pergerakan uang laci dengan + Uang masuk/− Uang keluar pada card yang sama, berbeda dari Selesai bertugas di kanan. Dua alur Ganti petugas (toko tetap buka) dan Toko selesai berjualan, masing-masing langkah berurutan dan CTA jelas. Petugas sama langsung tutup kas. Histori uang dan penanggung jawab terpisah. Tampilan staf menjaga hitung buta. Root localhost tetap iframe1024×768; hosted responsif; tidak ada deployment.

## Penerapan D-68

Menu: kolom Hapus paling kiri, Status/Menu/Varian/**Diskon**/Harga/Kategori, lalu pilihan/channel/Tipe. Diskon dropdown pustaka dengan `-`. Aksi **Batal** dan **Simpan perubahan** berdampingan, lebar/tinggi sama, hanya saat draft berubah. Perlu diperbaiki hanya saat jumlah error>0. Log menu dihapus tetap di bawah tabel setelah menu hilang. Modal + Menu mewajibkan kategori dan menyediakan tambah kategori/tipe inline; Pengaturan Kategori menu/Tipe menu mengelola ketiganya.

Stok: harga/rentang rata kiri, baseline/minimal field berbatas dan sisa teks biasa; tidak ada label/tombol Ubah tambahan. Memilih field baseline tetap membuka modal alasan, bukan mengizinkan perubahan saldo tanpa jejak. Batal/Simpan stok minimal hanya ketika nilainya berbeda dari committed, ukuran sama. Semua target≥44, field56, row≥64, lima row dan horizontal scroll tetap.

Diskon: daftar jenis yang dibuat owner, bukan daftar semua SKU. + Diskon membuka nama, Persen/Potongan/Beli X gratis Y dan input terkait. Edit nama melalui field berbatas; hapus tidak tersedia selama dipakai. Kasir menampilkan syarat Beli X gratis Y pada identitas/rincian (kolom angka tetap), qty total termasuk gratis dan total dihitung domain. Card kas menjelaskan sumber angka per baris, metadata pembuka dan perbedaan uang otomatis vs nonpenjualan sesuai file06. Root localhost selalu1024×768 termasuk modal; hosted tetap responsif.


## Penerapan D-69

Menu/Stok/Rekap online memakai viewport tabel bergulir vertikal, header sticky dan seluruh row tersedia; tanpa pagination. Varian menghapus helper/bintang Default, perilaku default pertama tetap. Rekap memakai grid Dari read-only/Sampai tanggal+jam/Waktu sekarang, label dan kontrol sejajar; stack saat sempit tanpa mengecilkan font/target. Modal Diskon memuat jadwal opsional empat field dalam dua grup Mulai/Selesai, zona toko dan status jadwal di daftar. Kas ringkas mengikuti06; modal tutup tetap label input Uang akhir di laci (Rp), daftar blocker dan hasil hitungan. Localhost root tetap iframe1024×768 termasuk dialog.

## Kas dan laporan harian — D-74

Navigasi tablet atas dan HP bawah dipertahankan sesuai design system. Kas memakai card angka kiri dan dua jalur selesai bertugas bertumpuk kanan; aksi/histori mengikuti kolom angka. Laporan mengutamakan Penjualan/Uang diterima/transaksi/rata-rata belanja; refund/gratis sesuai kejadian. Perhitungan dalam disclosure; metode/menu dan Telusuri angka/Perlu diperiksa/Dana platform punya konteks. Dari angka ke pesanan asal, Kembali ke laporan mempertahankan pilihan periode/tab/filter. Tanggal akhir laporan tetap eksklusif dengan label Sampai sebelum tanggal; berbeda dari Riwayat inklusif. Aturan rinci pada06, token pada DESIGN-SYSTEM; AC-153/154.

## Pengelolaan mudah ditemukan — D-75 · 31 Oktober 2026

Pengaturan menempatkan **Toko** pertama dan membukanya setiap masuk lewat navigasi Pengaturan; shortcut status Data & Perangkat tetap menuju konteksnya. Kategori menu/Tipe menu sesudah Toko; Tampilan dipensiunkan, alias berdampingan nama tipe di Tipe menu. Tablet dan HP memakai urutan yang sama, penanda bagian aktif eksplisit.

Menu & Stok memakai bar aksi sticky di atas editor ketika ada perubahan, status terlihat serta Batal/Simpan setara; tab lain mempertahankan draft, keluar ditahan dan reload diperingatkan browser. Tidak ada Keterangan perubahan opsional. Stok baseline tetap modal beralasan, stok minimal tidak mengubah saldo. Rincian Laporan mengikuti D-75/file06, Staf & izin mengikuti08. Target44, input56, tabel gulir/header sticky, tema/Inter D-73/74 tetap. Pengujian keyboard fisik/virtual dan perangkat nyata tidak dibuktikan hanya lewat CSS atau tes domain.

## Kasir padat — D-76

Navigasi Kasir/Pesanan/Riwayat/Kelola toko dipertahankan. Di Kasir hapus breadcrumb Kedai…/Transaksi, judul Kasir berulang dan heading Pilih menu. Katalog mulai dari search/filter, status kas/stok ringkas; dua kolom katalog kiri/pesanan kanan di tablet1024×768. HP360 memakai akses menu/keranjang dan navigasi bawah yang sama. Panel review terpisah sebagai fasilitas prototipe.

Kartu satu grup menu berisi nama/harga, promo/pilihan/ketersediaan bila relevan, tanpa kategori berulang. Ketukan sederhana langsung qty1; berpilihan membuka editor dengan Tambahkan ke pesanan. Feedback/Urungkan dan aturan pemisahan baris mengikuti04. Kepala pesanan memuat identitas, Channel terlihat (Toko statis bila hanya itu aktif), ID platform hanya untuk platform, serta kontrol default penyajian. D-77 menghapus copy terlihat Default penyajian dan Untuk item berikutnya; nama aksesibel tetap. Channel dan nilainya sebaris di atas kontrol. Perubahan channel tetap ditahan jika sudah ada item/confirmed; tidak menghapus atau mengganti harga diam-diam.

Kas tertutup hanya panel Mulai bertugas/Uang awal/Buka kas; kas pemegang lain memerlukan serah-terima. Kas aktif/Kelola kas tidak menyediakan tutup langsung. Detail/cetakan membaca penyajian per item. Fokus terlihat, kontrol≥44×44, nama panjang/teks200% reflow/gulir; kepadatan tidak memotong nama atau menutupi tindakan.

## Tata letak workspace Pesanan — D-78

Tanpa judul halaman Pesanan berulang atau panel besar Pesanan aktif. Langsung tab Aktif/Tersimpan, search dan dua filter ringkas pada area daftar. ≥900px dua kolom sekitar40/60 dengan scroll terpisah; detail awal Pilih pesanan untuk melihat detail. Pilihan memiliki garis/border, teks ✓ Dipilih dan state aksesibel, tidak hanya warna. <900px daftar satu kolom/detail penuh dengan Kembali ke pesanan; region daftar dipertahankan sehingga posisi gulir tidak hilang. Pindah pesanan mereset scroll detail saja. Kontrol vertikal HP/teks200%, nama membungkus, target≥44×44 dan fokus terlihat, tanpa scroll horizontal seluruh halaman.

Komponen detail bersama Pesanan/Riwayat: header identitas/channel + status pengerjaan dan pembayaran terpisah; (1) tagihan/Bayar atau Lanjutkan pesanan + refund tertunda langsung; (2) item per batch/progres/qty requested/Tandai disajikan; (3) tambahan/catatan/Aksi lainnya. Tambahan setelah lunas hanya Pesanan baru. Refund/pembatalan/koreksi/cetak ulang mengikuti operasi/guard existing. Tata letak ini menggantikan halaman detail terpisah tablet dan target empat baris detail lama; tidak menambah status dapur.
