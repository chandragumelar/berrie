# 12 — UX principles

**Pesanan aktif D-78:** workspace Aktif/Tersimpan dan detail bersama mengikuti bagian D-78; default Lunas/tabel/halaman detail tablet lama diganti. Kasir D-76/D-77 dan aturan integritas tetap. [Review](../berrie-site/REVIEW-PESANAN-D78.md).

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md).

**Revisi terkini D-75 · 31 Oktober 2026:** editor/laporan/pengaturan mengikuti bagian D-75 di akhir; arah D-73/74 dan alur D-72 tetap. UT-01–43 masih rencana peserta.

**Acuan D-73 · 13 Oktober 2026:** antarmuka menyediakan wadah harga/qty/stok agnostik, tanpa menebak satuan usaha. Varian opsional dan dampak harga berada dalam form menu yang sama; preview memakai rumus domain. Kas mengelompokkan label/nominal dalam kolom terbatas. Seluruh fondasi visual ditinjau terhadap dokumentasi resmi Atlassian, token aktif pada DESIGN-SYSTEM D-73; prototipe lama bukan patokan estetika. Alur D-72 tetap kecuali yang diganti eksplisit.

**Alur Kasir D-72 · 12 Oktober 2026:** visual Jira/Inter D-71 tetap. Penyajian hanya di modal item, default Bungkus; tanpa Item berikutnya di card. Modal tanpa copy bantuan/harga per unit, hasil racikan 12px seperti penyajian dan total panel 22px. Identitas kosong diberi error dekat input, tetap bisa dikoreksi. Setelah commit, Bayar nanti otomatis mencoba dapur; pembayaran dengan draft baru mencoba dapur lalu pelanggan, pembayaran batch lama hanya pelanggan. Simpan dulu tanpa cetak/debit; detail draft menyediakan Edit pesanan ke Kasir dengan identitas/nomor tetap. Cetak ulang memilih pelanggan/dapur/keduanya yang layak, SALINAN; attempt bukan bukti kertas. Kasir kosong/notifikasi/Lihat pesanan hanya sesudah sukses; gagal/unknown mempertahankan input dan operasi sama. Riwayat tetap rentang inklusif zona toko, nominal rata kiri. D-72 mendahului uraian D-71 yang berbeda; uang/stok/izin/snapshot/gerbang rilis tetap. [Design system](../DESIGN-SYSTEM.md), [review lokal](../berrie-site/REVIEW-KASIR-D71.md).

Status: acuan pembangunan dan target uji; **belum ada hasil pengujian UX**. Dokumen ini menambahkan cara menyajikan seluruh kemampuan yang sudah disetujui. Aturan bisnis tetap mengikuti [01](01-product-scope.md) sampai [08](08-offline-backup-and-restore.md); penerapan layar ada di [09](09-screens-and-hardware.md), alur di [02](02-user-flows.md), dan pemeriksaan di [10](10-acceptance-criteria.md).

Tujuan Berrie: pengguna baru memahami langkah berikutnya, dapat berjualan dengan percaya diri, dan ingin merekomendasikan pengalaman tersebut. Viral adalah aspirasi, bukan hasil, target konversi, atau alasan menambahkan referral, promosi, dan ajakan berbagi pemasaran.

Pemilik telah mencoba banyak POS dan sering merasa bingung saat mulai menggunakannya. Kemudahan dipelajari menjadi pembeda utama Berrie, sambil tetap mencakup seluruh kemampuan yang disetujui. Kesan menarik datang dari kejelasan, kecepatan, tampilan rapi dan rasa percaya diri saat berjualan; dekorasi atau animasi tidak boleh mengganggu pekerjaan. Ini kebutuhan pemilik, bukan hasil uji pengguna baru.

## 1. Lengkap, ditampilkan saat diperlukan

Sederhana berarti mengurangi keputusan yang harus dipikirkan bersamaan. Kemampuan tidak boleh dihapus, dikunci di balik paket baru, atau hanya dapat ditemukan melalui tutorial.

| Lapisan | Langsung terlihat / cara membuka | Ketentuan |
| --- | --- | --- |
| Pekerjaan sekarang | Pencarian/menu, tipe pesanan, keranjang/total, dua status, tindakan relevan, Pesanan aktif, status simpan/koneksi | Jangan sembunyikan total, pekerjaan tertunda, atau alternatif bayar awal/akhir |
| Rincian sesuai konteks | **Tambah catatan**, **Tambah diskon**, **No. antrean / nama (wajib)**, varian/topping yang memang tersedia, rincian batch | Pemicu berupa teks, bukan hanya ikon atau hover; pilihan yang sudah terpakai selalu terlihat |
| Pengelolaan | Menu & Stok, Kas, Laporan, Pengaturan melalui navigasi tetap | Tersedia sejak awal; tidak perlu menyelesaikan checklist onboarding untuk membukanya |
| Pengecualian/risiko | Pembatalan, refund, koreksi, pindah/pulihkan data | Ditemukan dari objek terkait; dampak dan langkah berikutnya jelas sebelum commit |

Satu judul dan satu penekanan visual utama per area. Tindakan sekunder penting tetap tombol berlabel. Menu **Tindakan lain** boleh memuat koreksi atau pembatalan yang jarang dipakai, tetapi tidak menampung Bayar, Minta dibuat, atau pekerjaan penyajian yang masih diperlukan. Error yang menghalangi tindakan muncul di dekat penyebabnya, bukan hanya di halaman Pengaturan.

## 2. Aktivasi minimum menuju transaksi pertama

| Tahap | Wajib | Tidak perlu diselesaikan saat ini |
| --- | --- | --- |
| Akses online | Daftar/login, verifikasi email, aktivasi satu toko/perangkat, PIN owner | Instal PWA ke layar utama bukan syarat transaksi browser |
| Toko | Nama toko; zona Asia/Jakarta terlihat dengan aksi Ubah | Alamat/kontak struk dan pengaturan tampilan cetak |
| Menu pertama | Nama, harga dan stok awal wajib ≥0 | Kategori, varian, topping, ambang stok, import katalog |
| Mulai kasir | Buka kas, isi **Uang awal** aktual, termasuk Rp0 | QRIS/transfer/e-wallet, pajak, biaya layanan, printer |
| Penjualan | Pilih menu, periksa pesanan, proses dan bayar dalam urutan pilihan; tandai penyajian/penyerahan nyata | Tidak perlu tur semua layar sebelum berjualan |

Tampilkan tahap pendek **Akun → Toko → Menu pertama → Kasir**. Setelah email terverifikasi, lanjutkan tahap yang belum selesai; jangan mengulang input yang sudah tersimpan. Menu pertama meminta nama, harga dan stok awal wajib ≥0; kode dibuat aplikasi. Stok awal satu saldo menu D-58, pilihan/racikan opsional; tanpa mode stok tidak dihitung.

Cache aplikasi, data lokal, dan izin offline dipersiapkan dalam alur aktivasi yang sama. Status **Siap offline** baru muncul setelah prasyarat [08](08-offline-backup-and-restore.md) terpenuhi. Jika belum siap, tampilkan penyebab dan Coba lagi; jangan menyatakan perangkat siap berjualan tanpa internet. Kegagalan persiapan yang menghalangi penyimpanan/aktivasi tetap blocker sesuai aturan lama.

Sesudah menu pertama, buka Kasir dengan menu milik pengguna. Kartu nonmodal **Atur kebutuhan lain** menawarkan **Printer**, **Metode pembayaran**, dan **Menu & Stok**, serta **Nanti saja**. Kartu yang ditutup bisa ditemukan kembali lewat Pengaturan; tidak muncul ulang setiap transaksi. Tidak ada tour wajib atau layar kosong berisi checklist panjang.

Tanpa printer, pengguna tetap bisa bertransaksi. Tampilkan **Printer belum siap** pada area tiket, tampilkan isi tiket dan penanganan manual yang sudah diizinkan di file 02; jangan mengaku tiket tercetak atau dikirim elektronik. Percobaan kasir pada aplikasi operasional tetap transaksi nyata. Tidak membuat mode demo, transaksi contoh, atau penghapusan histori baru; uji kegunaan menggunakan lingkungan uji terpisah.

## 3. Navigasi dan penemuan fitur

Setelah buka kunci/aktivasi, **Kasir** menjadi tujuan utama pada perangkat kasir aktif. Permintaan buka kas tampil di konteks Kasir bila sesi belum ada. Jangan mengganti halaman awal dengan dashboard laporan. HP owner membuka laporan dengan label **Hanya lihat · Data server terakhir …** serta akses Persetujuan dan Staf & izin online. Pengecualian administrasi akses tidak membuat HP menjadi kasir kedua.

- Desktop/tablet lebar: sidebar tetap, kelompok kerja **Kasir, Pesanan, Riwayat**; pengelolaan **Menu & Stok, Kas, Laporan, Pengaturan**.
- HP: tab **Kasir, Pesanan, Riwayat, Lainnya**. Lainnya menampilkan Menu & Stok, Kas, Laporan, Pengaturan sebagai daftar berlabel, bukan kumpulan ikon tanpa nama.
- **Pesanan** selalu menampilkan jumlah pesanan aktif; jumlah termasuk lunas belum disajikan, tambahan belum selesai, belum bayar, dan refund tertunda. Ringkasan detail menjelaskan sebab aktif, tidak hanya angka.
- Kembali dari detail pesanan mempertahankan pencarian/filter/posisi antrean; kembali ke Kasir mempertahankan draft tersimpan. Kesalahan simpan tidak boleh ditutupi navigasi yang tampak berhasil.
- **Pengaturan → Data & Perangkat** adalah lokasi tetap status sinkron, backup dan pemulihan. Banner status menjadi jalan pintas ke lokasi yang sama, bukan layar lain dengan informasi berbeda.
- Pengaturan memakai bagian berlabel **Toko**, **Metode pembayaran**, **Pajak & biaya layanan**, **Printer**, **Data & Perangkat**, **Akun & keamanan**, **Staf & izin**, **Channel penjualan**, **Langganan**. Pengaturan tambahan maksimal satu bagian setelah membuka Pengaturan.

Teks bantuan ditempatkan dekat pilihan yang membutuhkan penjelasan. Bantuan tidak menjadi satu-satunya cara menemukan fitur. Katalog kosong menawarkan Tambah menu; hasil pencarian kosong menawarkan Hapus pencarian; laporan kosong menjelaskan belum ada pembayaran pada periode itu, bukan meminta pengguna mengulang setup.

## 4. Tindakan mengikuti keadaan pesanan

Tampilkan status pengerjaan dan pembayaran terpisah di header detail dan baris tabel antrean; keranjang hanya pada pesanan yang masih dibeli. **Lunas** tidak pernah diberi arti makanan selesai. Penyajian Makan di tempat/Bungkus terlihat per item; campuran tetap satu tagihan dan tidak menentukan urutan pembayaran. Default hanya untuk item berikutnya.

| Keadaan | Penekanan utama | Alternatif yang tetap terlihat tanpa menu tersembunyi |
| --- | --- | --- |
| Keranjang kosong | Pilih menu / Tambah menu jika katalog kosong | Penyajian per item, Pesanan aktif |
| Ada draft, belum bayar | **Bayar** | **Bayar nanti**, **Simpan dulu** (belum diminta dibuat), catatan/diskon |
| Data lama/pemulihan lunas, ada unit belum diminta dibuat | **Minta dibuat** | Lihat pembayaran, struk; **Pesanan baru** untuk tambahan |
| Ada unit diproses, belum bayar, tanpa draft | **Bayar** | **Tandai disajikan** / **Tandai diserahkan**, **Tambah item**, cetakan |
| Ada unit diproses, lunas | **Tandai disajikan** / **Tandai diserahkan** | Cetakan, Pesanan baru |
| Ada draft tambahan dan batch lama belum selesai | **Bayar** jika belum lunas | **Bayar nanti**; **Tandai disajikan/diserahkan** untuk unit processed; rincian jumlah tiap tahap |
| Semua disajikan, belum bayar | **Bayar** | Tambah item, tiket dapur; struk pelanggan sesudah bayar |
| Ada refund tertunda | **Refund** pada panel kewajiban | Pekerjaan dapur yang masih diperlukan tetap tampil; jika juga ada draft/processed, tombolnya tidak digantikan panel refund |
| Semua pekerjaan dan keuangan selesai | **Pesanan baru** | Lihat/cetak struk, refund yang masih memenuhi syarat di detail transaksi |
| Batal penuh tanpa kewajiban tersisa | **Pesanan baru** | Lihat alasan dan histori; tidak ada tombol bayar/proses untuk unit batal |

Tabel menentukan pilihan yang sah. **Bayar nanti** mengonfirmasi batch tanpa pembayaran. **Bayar** membuka ringkasan; **Simpan pembayaran** adalah konfirmasi final dan sekaligus konfirmasi draft/batch dalam satu commit, tanpa tekan Minta dibuat lagi. Membuka/menutup form tidak memberi efek. Jika tidak ada draft, **Bayar** hanya mencatat settlement tanpa batch/stok kedua. Status keuangan dan pengerjaan tetap terpisah. **Simpan dulu** berarti pesanan belum diminta dibuat, belum mengurangi stok dan tidak mencetak. D-72: detail draft mempunyai **Lanjutkan pesanan** untuk melanjutkan di Kasir dengan nomor/identitas tetap; Simpan dulu kembali memberi kesempatan melayani antrean berikutnya. Gunakan satu tindakan **Pesanan baru**; jika input belum disimpan, tahan dan bantu Simpan dulu. Empty state hanya petunjuk.

Bar tindakan memiliki lokasi stabil: pemrosesan dan pembayaran di keranjang, penyajian di detail Pesanan. Saat status berubah, perbarui label/ketersediaan pada slot tersebut setelah interaksi selesai; jangan memindahkan tombol berisiko ke bawah jari yang masih mengetuk. HP boleh menumpuk tombol agar seluruh tindakan relevan terlihat; penyajian/refund/koreksi pembayaran hanya pada detail Pesanan/Riwayat. Tidak memaksa semuanya muat dalam satu baris kecil.

Penyajian membuka daftar unit processed dengan pilihan jumlah; draft tidak ikut terpilih. Tambahan sebelum lunas ditandai **Belum diminta dibuat** sampai dikonfirmasi, lalu tampil **TAMBAHAN · Batch 2**. Cetak ulang memakai **Cetak ulang — SALINAN**. Teks dekat tiket: **Ambil tiket dari printer kasir, lalu serahkan ke dapur.**

## 5. Default dan pengaktifan bertahap

| Default yang dipertahankan | Cara menemukan/mengubah | Saat fitur mulai memengaruhi layar |
| --- | --- | --- |
| Bungkus untuk item berikutnya; no. antrean/nama kosong | Dialog item → penyajian; keranjang → hasil per baris dan No. antrean / nama (wajib) | Campuran terlihat per baris di ringkasan/tiket; identitas wajib sebelum simpan/proses/bayar |
| Semua menu/SKU | Menu & Stok → menu/varian | Stok awal wajib diisi; tambah/koreksi stok berjejak. Data lama tanpa hitungan ditahan sampai admin mengisinya |
| Tanpa varian/topping/kategori | Menu & Stok → edit menu → Varian/Topping/Kategori; Pengaturan → Kategori menu untuk tab toko | Varian yang wajib dipilih tampil saat menu diketuk; topping opsional tidak dicentang otomatis |
| Tunai aktif; non-tunai nonaktif | Pengaturan → Metode pembayaran; tautan Atur metode di layar bayar | Metode diaktifkan menjadi pilihan bayar; tidak tersirat terintegrasi otomatis |
| Pajak/layanan mati, tarif 0%; tanpa diskon | Pengaturan → Pajak & biaya layanan; Tambah diskon pada order | Setelah terpakai, nilai/label tampil sebelum commit dan pada struk; tidak disembunyikan dalam rincian tertutup |
| Promo SKU tidak aktif | Menu & Stok → Diskon → Atur diskon (owner); tabel Kasir/filter Promo | Potongan dan harga akhir terlihat bila aktif; tanpa promo —; setting tidak wajib saat onboarding |
| Printer belum siap | Pengaturan → Printer; Atur printer dari panel Struk | Lebar58/80 mm dan uji cetak; tidak menjadi gate akses Kasir |
| Refund tidak mengembalikan stok | Pilihan eksplisit pada pembatalan/refund | Tampilkan syarat layak jual dan status pengembalian sebelumnya |

Mengaktifkan fitur bukan membeli add-on. Tampilkan label **Opsional** pada input opsional, bukan tanda wajib palsu. Pilihan yang berpengaruh pada nilai transaksi tidak boleh diam-diam diwarisi dari order pelanggan sebelumnya. Snapshot harga/tarif dan default metode refund tetap mengikuti file 03–05.

## 6. Bahasa dan contoh pesan

Gunakan kalimat pendek, subjek jelas, nominal dan nama menu konkret. Hindari istilah teknis `settlement`, `ACK`, `outbox`, `epoch`, dan `mutation` pada alur kasir. Istilah tersebut tetap boleh ada pada rincian teknis dukungan. Jangan menyalahkan pengguna atau memakai pesan bercanda saat uang/data bermasalah.

| Makna | Label konsisten di UI |
| --- | --- |
| Membuka sesi | **Buka kas**, input **Uang awal**; bantuan Uang tunai yang ada di laci saat mulai |
| Menambah ke order belum lunas | **Tambah item**; sesudah lunas **Pesanan baru** |
| Menyimpan sebelum dibuat | **Simpan dulu**; bantuan Belum diminta dibuat; stok belum berkurang |
| Konfirmasi pembuatan | **Bayar nanti**; pada pemulihan paid draft **Minta dibuat**. Bantuan ambil struk untuk dapur lalu serahkan ke dapur, tanpa klaim dapur sedang memasak |
| Membuka/menyimpan pembayaran | **Bayar** dengan maupun tanpa draft / **Simpan pembayaran**; pembayaran berhasil ikut mengonfirmasi draft |
| Penyajian / bungkus | **Tandai disajikan** / **Tandai diserahkan** |
| Pengembalian uang manual | Pemicu **Refund**, konfirmasi **Catat refund**; uang sudah dikembalikan wajib |
| Retry kertas / data | **Cetak ulang — SALINAN** / **Coba sinkron lagi**; jangan satu tombol Coba lagi untuk keduanya |
| Cadangan dan pemulihan | **Unduh backup**, **Pulihkan data**; export tetap **Ekspor CSV** |

| Keadaan dan prasyarat | Contoh pesan | Langkah yang tersedia |
| --- | --- | --- |
| Belum ada menu | **Belum ada menu. Tambahkan nama dan harga untuk mulai jualan.** | Tambah menu |
| Tidak ada pesanan aktif | **Belum ada pesanan aktif. Pilih Kasir untuk melayani pelanggan.** | Navigasi utama, tanpa tombol Buka Kasir berulang |
| Draft commit berhasil | **Pesanan 0042 tersimpan di perangkat. Disimpan dulu; stok belum berkurang.** | Bayar nanti; Bayar |
| Payment commit berhasil | **Pembayaran Rp25.000 tercatat. Pesanan lunas, makanan belum disajikan.** | Tindakan sesuai status kerja, tanpa klaim transfer otomatis |
| Offline, local commit berhasil, izin valid | **Pesanan tersimpan di perangkat. Offline · 3 pesanan belum terkirim ke server.** | Tetap berjualan; detail perubahan dan waktu sync terakhir |
| Izin offline habis | **Hubungkan internet untuk membuat pesanan baru. Pesanan yang sudah tersimpan tetap bisa diselesaikan.** | Verifikasi online, buka pesanan lama; aturan file 08 tetap berlaku |
| Cetak gagal/hasil belum diketahui sesudah proses commit | **Pesanan tersimpan dan sudah diproses. Perintah cetak belum berhasil dikirim. Periksa printer sebelum mencetak ulang.** | Cetak ulang — SALINAN di detail, tanpa konfirmasi kertas rutin |
| Non-tunai belum diverifikasi | **Pembayaran belum terverifikasi. Pesanan tetap belum bayar. Periksa pembayaran melalui layanan usaha Anda.** | Kembali ke pesanan; verifikasi manual sebelum Simpan pembayaran |
| Stok kurang sebelum proses, draft sudah tersimpan | **Es Kopi Besar tersisa 1, pesanan membutuhkan 2. Draft tersimpan; pesanan belum diproses dan stok belum berubah.** | Ubah jumlah atau buka stok untuk koreksi nyata beralasan |
| Stok kurang pada order lunas | **Pembayaran sudah tercatat. Es Kopi Besar belum bisa diproses karena stok kurang.** | Tambah/koreksi stok nyata atau batalkan unit dan catat refund |
| Local commit terbukti gagal | **Perubahan belum tersimpan. Periksa ruang penyimpanan, lalu coba simpan lagi.** | Pertahankan input; retry operasi yang sama, tanpa efek cetak baru |
| Hasil commit belum diketahui setelah terputus/crash | **Status penyimpanan sedang diperiksa. Jangan ulangi penerimaan atau pengembalian uang.** | Periksa transaksi/operasi yang sama; jangan tampilkan sukses atau gagal pasti sebelum diketahui |
| ACK server belum diterima | **Catatan tersimpan di perangkat, belum terkirim. Sambungkan internet dan coba kirim lagi. Jangan hapus data browser.** | Coba sinkron lagi, Unduh backup |
| Refund dicatat gagal setelah uang diberikan | **Uang mungkin sudah dikembalikan, tetapi catatannya belum terkonfirmasi. Periksa transaksi ini sebelum mengembalikan uang lagi.** | Buka transaksi; retry pencatatan, bukan transfer ulang |
| Backup rusak / password salah | **Backup belum bisa dibuka. Data saat ini tidak berubah. Periksa file atau password.** | Pilih file / masukkan ulang password |

Angka/status pada pesan harus berasal dari keadaan nyata. Contoh draft tersimpan tidak dipakai jika penyimpanannya gagal. Pesan sukses rutin boleh singkat, tetapi status penting tetap ada pada objeknya; error uang/data tidak hilang hanya karena waktu toast habis.

## 7. Empat hasil yang tidak boleh dicampur

| Hasil | Bukti yang diperlukan | Tampilan dan pemulihan |
| --- | --- | --- |
| Tersimpan di perangkat | Commit lokal berhasil | Status per order; jika gagal pertahankan input dan tampilkan kegagalan; jangan lanjut efek cetak |
| Tersinkron ke server | ACK server untuk perubahan terkait | Waktu/jumlah tertunda; retry sync tidak mengulang transaksi bisnis |
| Pembayaran diterima | Kasir menerima tunai atau memverifikasi keberhasilan non-tunai secara manual; pencatatan lokal sukses untuk badge Lunas | Pemeriksaan eksternal dan penyimpanan catatan dibedakan; retry catatan tidak berarti meminta uang lagi |
| Kertas tercetak | Konfirmasi manusia memeriksa hasil fisik | Dialog ditutup hanya berarti hasil belum pasti; retry SALINAN, cek dengan dapur |

**Backup server terakhir** tetap informasi kelima tersendiri di Data & Perangkat, bukan sinonim sinkron. Tampilkan sumber, waktu/cakupan, jumlah perubahan yang belum tercakup dan status backup terlambat sesuai file 08. Tanda Online sendiri bukan bukti semua data sudah dicadangkan.

Error memakai urutan **apa yang terjadi → data/uang/pekerjaan mana yang sudah tersimpan → langkah aman berikutnya**. Jangan menawarkan reset data browser sebagai solusi umum. Bila hak perangkat dicabut atau konflik restore terjadi, tampilkan mode baca/pemulihan dan cara menyimpan bukti; jangan membuat transaksi ulang atau merge diam-diam.

## 8. Pengamanan tanpa dialog berulang

| Kelompok | Interaksi |
| --- | --- |
| Pilih menu, cari, buka detail, edit draft belum lunas | Umpan balik langsung, validasi inline; tanpa dialog Apakah Anda yakin? |
| Minta dibuat | Ringkasan item terlihat sebelum tombol ditekan, tombol menunggu selama commit; tanpa konfirmasi tambahan rutin. Efek stok/dapur dijelaskan dekat tombol |
| Pembayaran | Satu formulir dengan total, metode, uang diterima/kembalian atau checkbox verifikasi; tombol Simpan pembayaran adalah konfirmasi final, bukan diikuti dialog identik |
| Sajikan sebagian/semua | Daftar dan jumlah unit processed terlihat, aksi eksplisit; tidak menyentuh draft atau status bayar |
| Batal processed, refund, koreksi stok/metode | Satu ringkasan dengan unit/nominal, alasan, dampak kas/stok dan persyaratan dapur/uang; tombol bernama tindakan, bukan Ya |
| Tutup kas | Ringkasan + blocker + fisik/selisih dan alasan; satu konfirmasi final setelah syarat lengkap |
| Restore, pindah perangkat, reset lokal | Validasi sumber, cakupan data, backup keadaan lama dan pilihan eksplisit sesuai file 08; tahap keselamatan tidak dipangkas demi target sedikit klik |

Dialog boleh ditutup tanpa efek sebelum commit. Enter tidak boleh mengeksekusi refund/restore/tutup kas hanya karena pengguna selesai mengetik; fokus tidak otomatis ditempatkan pada tombol berisiko. Loading mencegah ketukan ganda, tetapi integritas tetap ditangani aturan idempoten. Jangan menyediakan Undo generik untuk pembayaran, proses dapur, stock return atau refund. Koreksi memakai alur audit yang sudah disetujui.

## 9. Desktop, HP dan aksesibilitas

- Baseline 360 px dipertahankan; konten kasir tidak memerlukan scroll horizontal. Uji juga 390 px, tablet 768 px dan desktop 1280 px. Saat ruang tidak cukup, gunakan layout HP, bukan mengecilkan target tombol.
- Desktop: katalog dan keranjang berdampingan; total/tindakan mengikuti keranjang. HP: tombol **Keranjang · 3 item · Rp45.000** tetap terlihat; detail keranjang membuka ringkasan lengkap dan tindakan relevan. Keyboard layar tidak menutup input aktif, error, total atau tombol simpan.
- Nilai px adalah ekuivalen dasar pada root 16 px; implementasi memakai ukuran relatif dan kontrol minimum yang tumbuh sesuai D-46. D-47: teks utama/input/label/tombol/panel 14 px, Kasir 18 px, dialog 20 px dan nominal total utama 22 px; bobot sesuai peran, tanpa font 16 px. Line-height isi sekitar 1,5, judul/nominal 1,25. Zoom pengguna tetap dihormati; jangan mengecilkan teks saat ruang sempit. Target sentuh minimal 44×44 px, jarak antar target minimal 8 px. Ini target desain internal; uji pada perangkat nyata.
- Target kontras internal: teks ≥4,5:1 terhadap latar, batas kontrol/fokus penting ≥3:1. Ukur pasangan warna aktual termasuk disabled/error; jangan mengklaim sertifikasi aksesibilitas dari angka ini saja.
- Semua aksi utama dapat diakses Tab/Shift+Tab dan Enter/Space pada kontrol yang tepat. Fokus terlihat dan urut sesuai tampilan; Escape menutup overlay sebelum commit dan mengembalikan fokus. Tidak memerlukan shortcut tersembunyi agar cepat; shortcut tambahan hanya jika terlihat di UI dan tidak bertabrakan input.
- Pembaca layar mendapatkan nama tombol, status terpilih, error terkait field dan pengumuman hasil simpan tanpa memindahkan fokus otomatis. Badge/icon memiliki teks, misalnya **Habis**, **Belum bayar**, **Refund tertunda**.
- Nama menu 80 karakter membungkus tanpa menghilangkan pembeda varian. Baris tabel katalog boleh membungkus; nama penuh harus tersedia lewat ketukan/fokus sebelum commit; keranjang, pilihan refund dan ringkasan konfirmasi menampilkan nama penuh. Catatan panjang membungkus, tidak menimpa harga/jumlah.
- Zoom teks 200% tidak menyembunyikan nominal, label, pesan error atau aksi. Tabel laporan boleh memakai area scroll berlabel, tetapi ringkasan dan filter tetap terbaca. Informasi penting tidak hanya melalui warna, hover, animasi atau tooltip.

## 10. Karakter visual dan respons

Berrie memakai bahasa visual mendekati aplikasi Apple: konten dominan, permukaan netral, aksen seperlunya, grouping dari ruang, dan kontrol yang halus serta konsisten. [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) adalah satu sumber token/konstruksi aktif D-49/D-53; jangan membuat sistem font/spacing/shape berbeda per layar. Tampilan prototipe sebelumnya ditolak sebagai arah estetika; fondasi baru diterapkan pada prototipe Kasir, dengan permukaan putih sejuk solid D-53. Persetujuan visual dan UT peserta tetap belum selesai.

| Karakter | Konsekuensi UX |
| --- | --- |
| Ramah | Teks sopan dan langsung; petunjuk pendek di tempat yang membutuhkan |
| Rapi | Nama/harga item primary dan regular, angka tabular, label/nominal terpisah, satu total utama |
| Modern | Bentuk mengikuti fungsi, sudut bertingkat selaras, state sentuh/fokus jelas; konten solid dan material navigasi selektif |
| Konsisten | Page/surface/text/status semantik, komponen bersama dan state yang sama lintas layar |
| Terasa cepat | Press feedback segera, Menyimpan saat commit, sukses setelah bukti; input bertahan ketika gagal |
| Nyaman dipakai | Ritme ruang rapat namun cukup untuk sentuh, posisi tindakan stabil, konteks/scroll tetap |

Target respons aktual tetap file 01: p95 tambah item ≤200 ms dan simpan/proses/bayar ≤1 detik. Durasi animasi bukan hasil pengukuran kinerja.

### 10.1 Komponen dan hierarki — D-71

Inter lokal/OFL pada seluruh OS dengan fallback sistem; tanpa CDN sebagai prasyarat offline. Body14/400, nama kartu14/600, panel17/600, halaman26/600, dialog22/600, total panel pesanan22/600 (D-72), total dialog28/600; metadata racikan12/400 seperti penyajian. Nilai lengkap/peran dan konstruksi D-71 pada design system. Arah Jira mencakup font/ikon/komponen/ruang/state, dengan target sentuh Berrie.


Satu aksi primer per langkah, alternatif sah tetap langsung terlihat. Outline/badge hanya jika berguna. Form memiliki label tetap, helper/error terkait field dan input yang bertahan; button/icon/stepper/clear field punya target ≥44×44 CSS px. Tinggi utama minimum 48 px, label panjang menumbuhkan kontrol. Gap 8 px untuk target mandiri; segmented/stepper/row tabel tetap kelompok tersambung dengan target masing-masing.

Penyajian memakai segmented dua pilihan setara, bukan dua tombol outline terpisah. Chip memilih filter; tag/badge membawa metadata/status, bukan bentuk semua nilai. Checkbox/radio memilih nilai; toggle mengubah setting biner langsung. Kontrol kas berbentuk toggle tetap button pembuka workflow; status mengikuti commit.

Daftar administrasi tetap tabel; katalog Kasir memakai kartu D-71. Container mengelompokkan area kerja, tidak berulang untuk tiap blok kecil. Nama dan harga primary, bantuan secondary; susunan/spacing membedakan hierarki sebelum menambah bold/warna. Penyajian/identitas dan pemicu batal/refund/koreksi tetap terlihat sesuai kondisi/izin.

Lucide SVG lokal satu keluarga, proporsi/stroke konsisten dan nama aksesibel. Aksi ambigu memakai label. Ikon Lucide stroke1.5/ujung datar dengan label mengikuti konstruksi Berrie terinspirasi Jira. Referensi resmi dan konstruksi ada pada design system; histori riset tetap di register keputusan.

### 10.2 Pola, tema, material, dan reflow

- Kasir memakai navigasi horizontal tablet, katalog kiri dan keranjang kanan. Brand/metadata tidak mengambil area utama. Large title hanya pada konteks eksplorasi luas; satu heading semantik.
- Pengaturan memakai grouped rows label–nilai/kontrol. Chevron berarti detail, toggle berarti setting biner. Tidak menambahkan tab bar/FAB hanya demi kemiripan Apple; pada HP pemicu Keranjang berlabel menjaga konteks.
- Sheet untuk tugas singkat di HP, dialog/panel pada tablet; form panjang dapat memenuhi layar. Satu overlay aktif, fokus terkelola, close/batal eksplisit dan keyboard tidak menutup tugas. Selama commit/hasil belum diketahui, penutupan tidak memotong pemulihan file 08.
- Alert proporsional risiko, validasi inline tanpa alert rutin. State selected/disabled/loading/error terbaca pada kedua tema dengan label/indikator selain warna. Tema mengikuti sistem dan memakai token semantik.
- Konten uang/tabel/form transaksi selalu solid. Glass hanya navigasi yang mengambang, tanpa material bertumpuk, dengan fallback solid. Reduced motion/transparency, increased contrast/forced colors mempertahankan fungsi/fokus/seleksi.
- Root 100%, rem, target minimum dan reflow mendukung pembesaran teks/zoom 200% secara terpisah. Tidak mengklaim Dynamic Type native atau pt=CSS px. Input 14 px diperiksa di Safari/iPhone tanpa mematikan zoom.

AC-101 memerlukan persetujuan visual, AC-109/110 penerapan komponen/aksesibilitas, AC-111 perilaku/kepadatan Kasir, dan AC-112 komposisi/cakupan sistem baru. Dokumen/token tidak meluluskan UI atau UT.

### 10.3 Observasi pada UT yang sudah ada

Saat UT-01/10/17/18 dijalankan, catat font yang dirender, tema, ukuran teks, keterbacaan menu/varian/harga, penemuan filter/dua urutan bayar, dan label/kontrol yang membingungkan. Gunakan perangkat/konteks nyata peserta; jangan memberi tutorial pola Apple. ID, jumlah peserta, target waktu/keberhasilan, dan nol kesalahan kritis tetap. Tidak membuat skor kemiripan Apple atau menganggap persetujuan estetika sebagai hasil tugas pengguna.

## 11. Peta cakupan kemampuan

Setiap baris wajib mempunyai jalur yang dapat diuji. Tautan [03](03-menu-and-availability.md)–[08](08-offline-backup-and-restore.md) tetap sumber aturan, termasuk pembatasannya. Fitur server tanpa tindakan owner dipetakan ke tampilan status, bukan dibuat menjadi tombol operasional baru.

| Fitur | Lokasi UI | Kapan terlihat | Tindakan utama | Rujukan |
| --- | --- | --- | --- | --- |
| Daftar/login, verifikasi email, aktivasi toko/perangkat | Aktivasi | Pengguna/perangkat baru | Masuk, Verifikasi, Aktifkan perangkat | [02](02-user-flows.md), [08](08-offline-backup-and-restore.md) |
| PIN, kunci, cooldown, lupa PIN/password, logout | Buka kunci; Pengaturan → Akun & keamanan | Saat terkunci atau dibuka owner | Buka kunci, Pulihkan akses online, Kunci, Keluar | [08](08-offline-backup-and-restore.md) |
| Identitas toko, zona, alamat/kontak struk | Setup; Pengaturan → Toko | Nama/zona saat setup; detail opsional kemudian | Simpan toko | [02](02-user-flows.md), [07](07-data-and-business-rules.md) |
| Menu/kategori, kode, harga, arsip | Menu & Stok → Menu | Pengelolaan; katalog kosong memberi pintasan | Tambah/Edit/Arsipkan menu | [03](03-menu-and-availability.md) |
| Varian, topping, relasi/ketersediaannya | Edit menu; pemilih item Kasir | Saat dikelola; saat memilih menu yang punya opsi | Pilih varian, Tambah topping | [03](03-menu-and-availability.md) |
| Import CSV, preview/error | Menu & Stok → Impor CSV | Saat dipilih, tanpa wajib onboarding | Pilih file, Periksa, Impor | [03](03-menu-and-availability.md) |
| Status jual dan stok wajib per SKU | Edit menu → Stok awal; Menu & Stok → status jual | Stok angka wajib, status jual terpisah | Hentikan penjualan, Jual kembali, Tambah stok, Koreksi stok | [03](03-menu-and-availability.md) |
| Stok awal, produksi/masuk, koreksi, ambang | Menu & Stok → Stok | Semua SKU; saldo wajib angka | Tambah stok, Koreksi stok | [03](03-menu-and-availability.md) |
| Stok menipis/habis, saldo dan ledger | Menu & Stok; Laporan | Saat ada data; indikasi habis juga di katalog | Lihat perubahan, Kelola stok | [03](03-menu-and-availability.md), [06](06-cash-and-reports.md) |
| Cari/pilih menu, keranjang, qty, hapus draft | Kasir → Keranjang | Selalu saat berjualan | Pilih menu, Ubah jumlah, Hapus item draft | [02](02-user-flows.md), [04](04-orders-and-dine-in.md) |
| Dine-in/bungkus, no. antrean/nama, catatan item/order | Kasir → Keranjang/detail item | Penyajian dan identitas wajib terlihat langsung; catatan opsional selalu ada | Pilih penyajian, Isi no. antrean/nama, Tambah catatan | [03](03-menu-and-availability.md), [04](04-orders-and-dine-in.md) |
| Simpan/buka draft, nomor order, antrean/filter | Kasir; Pesanan | Draft dan order aktif | Simpan dulu, Buka pesanan | [04](04-orders-and-dine-in.md) |
| Proses batch, debit stok, cetakan untuk dapur | Detail order → tindakan dan Struk | Ada draft yang sah; hasil setelah commit | Minta dibuat, Ambil/serahkan struk untuk dapur | [04](04-orders-and-dine-in.md) |
| Tambahan sebelum lunas, TAMBAHAN | Detail order | Order belum lunas | Tambah item, Minta dibuat | [04](04-orders-and-dine-in.md) |
| Tambahan setelah lunas, salin identitas | Detail order lunas | Setelah settlement | Pesanan baru | [04](04-orders-and-dine-in.md) |
| Penyajian parsial/semua dan koreksi salah tanda | Detail batch; Tindakan lain untuk koreksi | Unit processed / syarat koreksi terpenuhi | Tandai disajikan/diserahkan, Koreksi penyajian | [04](04-orders-and-dine-in.md) |
| Bayar awal/akhir, tunai, diterima/kembalian | Keranjang/detail → Bayar | Tagihan belum selesai | Simpan pembayaran | [05](05-payments-and-refunds.md) |
| QRIS/transfer/e-wallet manual, referensi | Pengaturan → Metode pembayaran; Bayar | Pengelolaan; pilihan aktif pada pembayaran | Aktifkan metode, Verifikasi manual, Simpan pembayaran | [05](05-payments-and-refunds.md) |
| Promo SKU opsional nominal/persen, snapshot dan filter promo | Menu & Stok → Diskon → Atur diskon; Kasir → Promo | Owner mengatur; kasir melihat/menggunakan promo berlaku; tanpa penggabungan diskon order | Atur promo, Cari menu promo | [03](03-menu-and-availability.md), [07](07-data-and-business-rules.md) |
| Diskon order nominal/persen, alasan; tagihan gratis | Keranjang → Tambah diskon; Bayar | Sebelum lunas dan tanpa promo SKU; gratis saat total Rp0 | Terapkan diskon, Selesaikan tagihan Rp0 beralasan | [05](05-payments-and-refunds.md), [07](07-data-and-business-rules.md) |
| Pajak/layanan, snapshot dan rincian total | Pengaturan → Pajak & biaya layanan; Keranjang/Bayar/struk | Pengaturan opsional; rincian wajib ketika terpakai | Atur tarif, Periksa rincian | [05](05-payments-and-refunds.md), [07](07-data-and-business-rules.md) |
| Batal draft/processed/paid, alasan dan pemberitahuan dapur | Detail item/order → Tindakan lain | Sesuai status unit | Batalkan item/pesanan | [04](04-orders-and-dine-in.md) |
| Refund seluruh/sebagian unit, due, metode, bukti | Detail order/Riwayat; panel Refund tertunda | Payment eligible atau kewajiban pending | Refund | [05](05-payments-and-refunds.md) |
| Stock return terpisah dan cegah dua kali | Form pembatalan/refund | Unit eligible; alasan disabled bila sudah kembali | Pilih pengembalian stok layak jual | [03](03-menu-and-availability.md), [05](05-payments-and-refunds.md) |
| Koreksi metode dan penyesuaian sesi kini | Riwayat → detail → Tindakan lain; Kas | Saat owner meminta koreksi | Koreksi metode, Catat penyesuaian | [05](05-payments-and-refunds.md), [06](06-cash-and-reports.md) |
| Satu printer 58/80 mm, uji koneksi dan batas dukungan | Pengaturan → Printer | Opsional; pintasan saat tiket belum siap | Atur printer, Uji cetak | [09](09-screens-and-hardware.md) |
| Antrean cetak dapur/pelanggan, BELUM BAYAR/LUNAS, SALINAN, gagal cetak | Detail order → Struk; Riwayat | Sesudah dokumen tersedia | Cetak, Konfirmasi hasil, Cetak ulang — SALINAN | [04](04-orders-and-dine-in.md), [09](09-screens-and-hardware.md) |
| Struk/cetak ulang | Detail order/Riwayat → Struk | Dokumen tersedia, attempt bukan bukti kertas keluar | Cetak struk / Cetak ulang — SALINAN | [09](09-screens-and-hardware.md) |
| Pencarian histori, detail payment/refund/audit | Riwayat → detail; objek menu/stok/kas terkait | Saat dicari/dibuka | Cari transaksi, Lihat riwayat perubahan | [05](05-payments-and-refunds.md), [07](07-data-and-business-rules.md) |
| Uang awal, sesi berjalan, kas masuk/keluar | Kas; prompt awal Kasir | Awal sesi atau pengelolaan kas | Buka kas, Catat uang masuk/keluar | [06](06-cash-and-reports.md) |
| Tutup, blocker, hitung fisik/selisih, histori dan cetak | Kas → Tutup kas/Riwayat kas | Saat tutup; histori selalu tersedia | Selesaikan pesanan terkait, Tutup kas, Cetak ringkasan | [06](06-cash-and-reports.md) |
| Seluruh metrik penjualan/refund/diskon/pajak/layanan/gratis, metode, terlaris, kas dan koreksi | Laporan → ringkasan/rincian | Diminta pengguna, bukan layar awal | Filter tanggal/sesi, Lihat rincian | [06](06-cash-and-reports.md) |
| Ekspor katalog, stok/ledger, order/unit, payment/refund, kas/laporan | Menu & Stok dan Laporan → Ekspor; Data & Perangkat → Ekspor data | Owner sesuai akses, termasuk mode langganan terbatas; tidak tersedia bagi staf | Pilih cakupan, Ekspor CSV | [06](06-cash-and-reports.md), [07](07-data-and-business-rules.md) |
| Kesiapan offline, simpan lokal, retry sync, jumlah pending | Banner → Data & Perangkat; status order | Selalu tersedia; masalah diberi penekanan | Lihat status, Coba sinkron lagi | [08](08-offline-backup-and-restore.md) |
| Izin offline, expiry, mode terbatas | Banner dan Data & Perangkat | Menjelang/habis izin; rincian kapan pun | Verifikasi online, Selesaikan pesanan lama | [08](08-offline-backup-and-restore.md) |
| Perangkat aktif, tab penulis, perangkat baca | Pengaturan → Data & Perangkat; banner mode | Sesuai peran/tab | Lihat perangkat, Beralih melalui alur sah; HP owner dengan pengecualian keputusan persetujuan/administrasi akses online; tanpa efek bisnis | [08](08-offline-backup-and-restore.md) |
| Backup harian/status terlambat, backup manual terenkripsi | Data & Perangkat → Backup; pengingat tutup offline | Waktu/status tersedia; peringatan sesuai kondisi | Unduh backup, Lihat cakupan | [08](08-offline-backup-and-restore.md) |
| Restore server/file, pindah/hilang, validasi/staging, cakupan | Data & Perangkat → Pulihkan/Pindah perangkat | Dipilih owner secara online | Pilih sumber, Periksa cakupan, Pulihkan data | [08](08-offline-backup-and-restore.md) |
| Konflik perangkat lama, karantina/review/penyesuaian | Data & Perangkat → Perlu ditinjau | Hanya jika ada konflik | Periksa bukti, Tandai duplikat/Terima kejadian sesuai aturan | [08](08-offline-backup-and-restore.md) |
| Update/migrasi gagal, reset lokal terlindungi | Data & Perangkat; layar pemulihan | Update aman atau gangguan; reset saat diminta | Perbarui, Buka pemulihan, Cadangkan sebelum reset | [07](07-data-and-business-rules.md), [08](08-offline-backup-and-restore.md) |
| Trial, harga, billing manual, tenggang, retensi/notifikasi | Pengaturan → Langganan; banner saat perlu | Rincian kapan pun; pengingat sesuai jadwal | Lihat cara bayar/status, Ekspor/backup sebelum penghentian | [01](01-product-scope.md), [08](08-offline-backup-and-restore.md) |
| Identitas staf, PIN, izin aktivitas dan batas diskon | Pengaturan → Staf & izin; Buka kunci | Opsional untuk owner sendiri; wajib sebelum staf melayani | Kelola staf, Atur izin, Pilih petugas | [08](08-offline-backup-and-restore.md) |
| Persetujuan lokal/HP, keputusan dan pemulihan | Form tindakan; Persetujuan owner | Ketika kebijakan mewajibkan | Minta persetujuan, Setujui/Tolak, Lanjutkan tindakan, Periksa hasil | [05](05-payments-and-refunds.md), [08](08-offline-backup-and-restore.md) |
| Serah-terima/hitungan/revisi dan pengambilalihan owner | Kas → Serah-terima kas | Penanggung jawab laci berganti | Hitung, Simpan hitungan, Konfirmasi penerimaan | [06](06-cash-and-reports.md) |
| Channel, harga, ID eksternal dan pencatatan susulan | Pengaturan → Channel penjualan; Kasir | Channel diaktifkan | Pilih channel, Catat ID, Catat tagihan platform | [03](03-menu-and-availability.md)–[05](05-payments-and-refunds.md) |
| Pembalikan/biaya/subsidi/pencairan manual | Detail order; Laporan → Dana platform | Ada transaksi platform | Periksa bukti, Catat pembalikan, Cocokkan dana | [05](05-payments-and-refunds.md), [06](06-cash-and-reports.md) |
| Pengawasan kejadian dan keterlambatan sinkron | Laporan → Perlu diperiksa | Owner meninjau | Filter actor/aksi/sesi/channel, Buka bukti | [06](06-cash-and-reports.md) |

## 12. Rencana uji kegunaan pengguna baru

Uji setelah prototipe/alur yang relevan tersedia; **seluruh angka berikut target, bukan hasil**. Tiap putaran memakai 8 calon pengguna baru Berrie dari usaha F&B: 4 dengan pengalaman POS dan 4 minim pengalaman, dibagi merata antara HP dan desktop. Jalankan tugas pada perangkat yang biasa mereka pakai. Setelah revisi besar, rekrut peserta baru agar pengenalan layar dari putaran lama tidak menyamarkan kebingungan.

Gunakan toko/data serta uang simulasi di lingkungan uji. Berikan tujuan dan situasi, bukan label tombol, screenshot berpanah atau langkah klik. Moderator tidak mendemokan alur. Bila peserta meminta bantuan, tanyakan netral apa yang sedang dicari; instruksi penyelesaian dicatat sebagai bantuan dan tugas tidak dihitung berhasil mandiri. Hentikan tindakan yang berpotensi merusak data/uang nyata. Sesudah batas waktu, catat belum selesai; bantuan lanjutan berguna untuk diagnosis, bukan mengubah skor.

| ID | Tugas yang dibacakan sebagai situasi | Target selesai mandiri | Batas waktu | Kesalahan kritis yang diamati |
| --- | --- | --- | --- | --- |
| UT-01 | Email sudah terverifikasi. Siapkan toko dengan satu minuman Rp10.000, uang awal Rp0; pelanggan bungkus membayar pas di awal dan minuman siap diserahkan. Printer belum tersedia. | ≥7/8; order pertama lunas, langsung diminta dibuat sesudah Simpan pembayaran dan diserahkan; tidak ada tekan pembuatan kedua atau setup opsional | <5 menit | Mengira perlu printer/stok/pajak dulu; payment/proses ganda atau status selesai salah |
| UT-02 | Pelanggan sebagian makan di tempat dan sebagian bungkus, termasuk menu sama dibagi dua; ingin bayar sesudah makan. Catat satu order, periksa penyajian per item/tiket, minta dibuat, sajikan/serahkan lalu terima uang. | ≥7/8 | ≤3 menit | Terpaksa bayar di awal, mengira lunas=disajikan, tiket dianggap terkirim elektronik |
| UT-03 | Pesanan lama sudah disajikan tetapi belum dibayar; pelanggan menambah satu minuman. Sesudah lunas ia memesan lagi. | ≥7/8 | ≤3 menit | Tiket tambahan memuat ulang batch lama; edit bill lunas; pekerjaan tambahan hilang |
| UT-04 | Bayar nanti hanya menyediakan dapur; printer berhenti sesudah pesanan diproses, periksa keadaan dan keluarkan tiket pengganti. | ≥7/8 | ≤2 menit | Memproses/membayar ulang; menganggap dialog selesai=kertas keluar; salinan dimasak dua kali |
| UT-05 | Pelanggan mengaku sudah membayar QRIS, tetapi layanan usaha belum menunjukkan keberhasilan; kemudian bukti keberhasilan tersedia. | 8/8 tidak menandai lunas sebelum verifikasi; ≥7/8 menyelesaikan pencatatan mandiri | ≤2 menit, di luar jeda simulasi bukti | Lunas sebelum verifikasi; meminta pembayaran kedua karena sync/cetak gagal |
| UT-06 | Menu stok 1 diminta 2; pada variasi fixture kedua, pesanan sudah dibayar tetapi stok tidak cukup saat proses. | ≥7/8 menangani kedua keadaan | ≤3 menit | Memaksa negatif/koreksi fiktif; payment asal hilang; tidak memahami opsi batal/refund |
| UT-07 | Batalkan satu item yang belum dibuat, lalu kembalikan uang satu item layak refund dari transaksi yang dibayar; jelaskan keputusan stok. Coba submit sebelum konfirmasi uang (harus disabled); metode berbeda tanpa field alasan tambahan, unit belum diserahkan meminta konfirmasi dapur. | ≥7/8 | ≤4 menit | Refund dianggap transfer otomatis; stok kembali dua kali; membatalkan unit sudah disajikan |
| UT-08 | Internet terputus: catat penjualan tunai, buka lagi, lalu sambungkan jaringan dan periksa data. | ≥7/8; dapat menjelaskan mana lokal/server/cetak | ≤3 menit | Membuat transaksi ulang/hapus data; menyebut lokal sudah backup server |
| UT-09 | Akhiri hari dengan satu pesanan lunas belum disajikan, satu belum bayar, dan refund tertunda; sesudah dibereskan hitung fisik berselisih. | ≥7/8 | ≤4 menit | Melewati blocker; menutup tanpa memahami selisih; menyamakan hitungan secara fiktif |
| UT-10 | Tambahkan varian/topping, isi stok awal wajib pada menu baru dan lakukan koreksi fisik beralasan, lalu temukan pengaturan pajak dan metode bayar. | ≥7/8 menemukan tiap lokasi tanpa bantuan | ≤4 menit | Menganggap fitur hilang/berbayar tambahan; mengubah transaksi lama |
| UT-11 | Temukan penjualan kemarin yang lunas dan diserahkan, struknya, laporan periode dan file CSV; pesanan belum selesai tetap di Pesanan, filter tanggal/metode Riwayat tidak berubah oleh filter Pesanan. | ≥7/8 | ≤3 menit | Mengira laporan omzet=sisa laci; cetak ulang membuat penjualan baru |
| UT-12 | Simpan backup; pada perangkat pengganti periksa sumber pemulihan yang lebih lama sebelum memilih langkah. | ≥7/8 | ≤4 menit, di luar transfer file | Menimpa data baru, menyamakan CSV=backup, mengira perubahan belum dicadangkan pasti pulih |

UT-01 diukur dari layar setelah email dinyatakan terverifikasi sampai order pertama lunas, diproses dan diserahkan secara simulasi. Waktu mencakup aktivasi perangkat/PIN, nama/zona, satu menu, buka kas dan operasi transaksi. Waktu tunggu email sebelum titik awal dan pemasangan printer dicatat terpisah, tidak dimasukkan; loading aplikasi setelah mulai tetap dihitung. Durasi penyajian fisik disimulasikan tersedia, bukan mengukur memasak. Target checkout ≤30 detik pengguna terlatih pada file 01 adalah pengukuran terpisah, bukan target pemula.

Gunakan fixture terpisah untuk tiap tugas sehingga gagal satu tugas tidak menghilangkan kesempatan tugas berikutnya. UT-01 selalu pertama; urutan tugas berikutnya diseimbangkan antar peserta. Sesi boleh dibagi dua dengan istirahat; catat urutan dan pengalaman dari tugas sebelumnya. Laporkan keberhasilan/waktu per tugas, tingkat pengalaman dan perangkat, bukan rata-rata gabungan yang menyembunyikan kegagalan HP.

Catatan observasi minimal: ID peserta anonim, versi, perangkat, tugas/fixture, waktu mulai/akhir, berhasil mandiri/berbantuan/gagal, salah tap, mundur layar, permintaan bantuan, lokasi tersendat >10 detik, dugaan peserta dan kutipan singkat. Bedakan dugaan pengamat dari ucapan peserta. Simpan contoh kebingungan **mencari Bayar di menu**, **mengira Lunas berarti dapur selesai**, bukan hanya skor kepuasan.

Setelah tiap tugas tanyakan **Seberapa mudah tugas tadi?** skala 1–7; target median ≥6. Setelah sesi tanyakan hal paling membingungkan, kepercayaan terhadap status transaksi, dan alasan mau/tidak merekomendasikan. Jawaban rekomendasi adalah temuan kualitatif, bukan bukti viral. Skor nyaman tidak menutupi kesalahan uang/data.

Kriteria tindak lanjut: nol kesalahan kritis lintas seluruh tugas pada putaran validasi; satu kesalahan kritis mengharuskan perbaikan dan uji ulang alur terdampak. Target ≥7/8 berarti jumlah peserta, bukan klaim persentase populasi. Tugas di bawah target dianalisis dari rekaman kebingungan, direvisi lalu diuji dengan peserta baru. Belum boleh menyatakan target tercapai sebelum hasil aktual dicatat.

## Arahan desain kasir terbaru

Daftar menu ringkas per varian dengan tipe, nama, stok nyata yang dicatat, promo dan harga akhir; alasan tidak dijual pada baris. Promo SKU nyata D-43 tampil di tabel; diskon order tetap di rincian total untuk pesanan tanpa promo SKU. Gunakan bahasa sehari-hari dan huruf terbaca untuk kasir baru/lebih tua. **Pesanan baru** satu pemicu; **No. antrean / nama** identitas wajib sebelum simpan/proses/bayar tanpa sistem meja. Status kerja UI: **Disimpan dulu / Belum diminta dibuat**, **Sudah diminta dibuat**, **Belum disajikan / diserahkan**; tidak mengklaim dapur sedang memasak. Navigasi Pesanan/Riwayat tidak mengulang Buka Kasir. **Buka kas** didahulukan sebelum melayani; **Kas terbuka** tetap terlihat, **Tutup kas** mudah ditemukan saat selesai bertugas, blocker tetap seluruh aturan file 06. Semua keputusan ini berasal dari feedback pemilik, bukan hasil uji pengguna.

## Arahan tabel, izin dan channel — 7 Oktober 2026

Tabel kompak file 09 menggantikan bentuk kartu per entri di Kasir, Pesanan, Riwayat, Menu & Stok, Kas, Laporan dan daftar pengaturan. Tabel Kasir D-44 memisahkan tipe, menu, saldo, promo SKU nyata dan harga akhir; alasan tidak dijual berada pada baris tanpa kolom ketersediaan terpisah. Form dan ringkasan boleh panel. Ini berlaku desktop/HP dengan kolom prioritas dan rincian baris; target sentuh/teks/zoom tetap berlaku. D-43 menambahkan promo SKU katalog; tabel tetap tidak menyediakan edit sel uang/stok bebas.

Staf melihat label izin dan cara meminta persetujuan tanpa formulir berulang. Owner memilih kebijakan sekali, lalu konfirmasi hanya saat kasus yang diwajibkan muncul. Jelaskan **Menunggu owner; belum ada uang/stok yang berubah**, **Disetujui; lanjutkan di kasir**, dan **Hasil belum diketahui; periksa catatan sebelum mengembalikan uang lagi** sesuai bukti. Permintaan yang gagal terkirim mempertahankan input. Penolakan/kedaluwarsa tidak mengeksekusi apa pun.

Channel dan identitas staf tidak memperpanjang onboarding owner yang bekerja sendiri. Pencairan bukan urusan kasir pada tiap pesanan: tampilkan status ringkas, rincian pencocokan di Laporan. **Belum cair** tidak dilabeli **Belum bayar pelanggan**; **Disetujui** tidak dilabeli **Refund berhasil**. Pengingat ketersediaan platform menyebut tindakan manual, bukan indikator sinkron palsu.

## Uji kegunaan tambahan

UT-01–12 dipertahankan. UT-13–17 memakai 8 peserta dengan peran owner/kasir bergantian dan perangkat HP owner terpisah untuk simulasi; durasi boleh dibagi sesi. Semua target belum diuji; waktu tunggu keputusan/jaringan dicatat terpisah, tidak menyembunyikan waktu kerja pengguna.

| ID | Situasi | Target mandiri | Batas waktu | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-13 | Owner mengatur diskon boleh kasir sampai batas; kasir meminta diskon di atas batas, owner menyetujui dari HP | ≥7/8; 8/8 tidak mengeksekusi sebelum izin | ≤4 menit di luar tunggu | PIN dibagikan; Setujui dianggap sudah mengubah transaksi; akses lain terbuka |
| UT-14 | Persetujuan ditolak/kedaluwarsa, jaringan putus, atau nilai berubah setelah persetujuan | ≥7/8 memahami status dan mengajukan ulang bila perlu | ≤3 menit | Bypass offline, refund kedua, memakai persetujuan lama |
| UT-15 | Ganti penanggung jawab laci dengan selisih sementara pesanan masih aktif | ≥7/8 | ≤4 menit | Memalsukan hitungan, menghapus selisih, menutup/membatalkan pesanan agar bisa ganti staf |
| UT-16 | Catat order platform, percobaan ID duplikat, lalu cocokkan potongan dan dana cair hari berikutnya | ≥7/8 | ≤5 menit | Stok/penjualan dua kali, dana belum cair dianggap isi laci, ketersediaan platform dianggap otomatis |
| UT-17 | Cari menu/varian stok menipis dan histori berdiskon melalui tabel pada HP/desktop | ≥7/8 | ≤2 menit | Salah varian/harga, promo yang tidak berasal dari setting/snapshot, kolom penting/aksi tidak terjangkau |

UT-13/14 juga mencakup uang belum dikembalikan meskipun approval sudah ada; UT-16 mencakup pembalikan platform setelah makanan dibuat dan pencatatan susulan tanpa tiket baru. Nol kesalahan kritis tetap syarat validasi. Hasil otomatis mockup tidak menggantikan tugas peserta.

## Prioritas review tablet

Mockup default memakai tablet landscape 1024×768 CSS px sesuai file 09: sidebar ringkas, tabel menu dan keranjang berdampingan, nyaman disentuh. Satu aplikasi responsif tetap menyesuaikan ruang iPhone, tablet portrait dan desktop. Baseline aksesibilitas 360 px tidak berarti tampilan review utama harus seperti HP. Tambahkan pemeriksaan 1024×768 dan 768×1024 ke ukuran uji yang sudah ada; hasil belum diukur.

## Workflow desain Sites — D-41

Buat satu prototipe interaktif yang menangani visual dan alur bersama, dengan kualitas visual yang dimaksudkan untuk UI akhir. Semua aturan UX/UT di atas tetap berlaku. Prototipe aktif berada di Sites; mockup lokal M-01/M-02 sudah dipensiunkan, histori pengujian pada tasks. Sites tidak otomatis menjamin hasil estetika; iterasi berdasarkan feedback pemilik tetap bagian pekerjaan.

Saat desain disetujui, catat versi/sumber Site, token warna/tipografi/jarak, aset, komponen dan keadaan layar. Pakai kembali UI tersebut untuk implementasi operasional sejauh kompatibel dengan stack final. Periksa kesetiaan visual dan alur pada ukuran tablet, HP dan desktop serta keadaan error/loading/empty sesuai AC-101. UT-17 tetap pengujian kegunaan tabel dengan peserta, bukan digantikan persetujuan visual atau tes otomatis. Jangan menandai UT lulus hanya karena demo Sites berfungsi.

## Palet aktif — D-49/D-53

HEX palet dan pemetaan page/surface/text/fill mengikuti [design system](../DESIGN-SYSTEM.md). Page netral, permukaan terang putih sejuk solid, pilihan aktif cyan, warna status selektif; kontras/status diperiksa menurut bagian 9. D-49 mengganti pemetaan visual D-42/44–46 yang berbeda; D-47–48 tetap untuk ukuran item, tabel dan perilaku Kasir. Bukti versi 1/2 tetap historis; penerapan baru Kasir mempunyai [bukti terpilih](../berrie-site/REVIEW-HISTORY.md#d49-d50), belum disetujui.

## Penyederhanaan Kasir dan promo — D-43/D-44

Arah token tipografi/font sistem, angka tabular, radius/bentuk/ikon mengikuti [design system](../DESIGN-SYSTEM.md). Font mengikuti D-49 dengan karakter menyerupai Apple; skala D-47: isi/input 14 px, judul Kasir 18 px, dialog 20 px, total utama 22 px; tanpa unduhan font eksternal saat membuka Kasir; Inter dibundel lokal. Gaya tenang/modern tidak mengurangi kontras atau target sentuh.

Kas tertutup hanya Buka kas sebagai CTA mulai melayani, sesudah berhasil langsung pilih menu; ganti penanggung jawab sesi terbuka melalui Serah-terima kas. Toko menggantikan label Langsung, platform hanya setelah konfigurasi. Tabel Kasir **Tipe, Menu, Stok, Diskon, Harga**, urut tipe/nama/varian A–Z. Normal/Paket/Promo/custom adalah label tipe D-56; tanpa komponen paket. Search/channel sejajar; D-51/D-52: stok wajib angka; stok 0 hanya di Habis dengan disabled dan penjelasan aksesibel. SKU nonaktif dan data lama tanpa hitungan hanya ada di Menu & Stok. Filter Promo membantu kasir menemukan promo yang benar-benar diatur owner; tanpa promo 0. Harga akhir sebelum topping/pajak/layanan; bukan tagihan final order.

Hapus opsi Campuran, pertahankan dua baris beda penyajian dalam satu tagihan. Status kerja/keuangan tetap terpisah pada order, tanpa pills berulang di pembayaran. Form bayar tanpa shortcut Uang pas/nominal, kembalian berjarak, metode dari setting dengan verifikasi non-tunai. Modal Struk memakai tujuan pelanggan/dapur/keduanya, default keduanya jika layak; tidak otomatis mencetak ulang dapur lama saat bayar. Konfirmasi fisik dan pemulihan cetak muncul sesuai kondisi, kontrol demo dipisah. Aturan uang/stok/refund tidak dipangkas demi tampilan.

### Uji kegunaan promo tambahan

| ID | Situasi | Target mandiri | Batas waktu | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-18 | Owner mengaktifkan promo SKU 10%; pelanggan bertanya menu promo, kasir menemukannya, menjualnya dengan topping lalu menelusuri nilai refund asli | ≥7/8 menemukan dan menjual dengan benar; 8/8 tidak mengarang/menggabung diskon | ≤3 menit di luar waktu refund nyata | Mengira harga katalog sudah termasuk topping/pajak, memotong topping, promo ganda, refund dengan promo hari ini |

UT-18 memakai fixture promo/tanpa promo, satu toko contoh dan uang simulasi, metode peserta tanpa panduan seperti UT lama. Target belum diuji; persetujuan visual tidak meluluskan UT.

## Kepadatan dan tindakan terbuka — D-47

Arahan terbaru mengutamakan nama menu/harga item kecil dan regular di tabel maupun keranjang. Hierarki dan pengecualian ukuran dipertahankan pada DESIGN-SYSTEM.md D-49; histori perubahan skala ada pada register D-47. Teks dasar 14 px, tanpa font 16 px; 600 hanya judul halaman/dialog dan nominal total. Target sentuh tidak mengecil. Input 14 px diuji pada Safari/iPhone tanpa mematikan zoom; pembesaran pengguna tetap dihormati.

Tidak mengulang ukuran/satuan generik pada daftar utama; jangan menyembunyikan identitas SKU saat memilih/konfirmasi/refund. Alias tipe dan stok per varian mengikuti file 03. Sisa stok kuantitas 0 hanya angka di Kasir, dengan disabled dan penjelasan aksesibel; SKU nonaktif hanya ada di Menu & Stok; data lama tanpa hitungan ditahan sampai admin mengisi stok. Header Harga tanpa Rp; sel katalog tetap angka rupiah; total/pembayaran/struk/refund tetap format rupiah lengkap.

Penyajian dipilih pada dialog item; hasil per baris dan identitas langsung terlihat di keranjang. Catatan item berlabel terlihat sebelum bayar. Pemicu Batalkan/Refund/Koreksi tersedia pada detail Pesanan/Riwayat sesuai kondisi, form terbuka sesuai permintaan. Keranjang Kasir untuk pembelian tidak memuat refund/koreksi pembayaran atau tindakan penyajian. Izin/alasan/audit tetap (D-51).

Pesanan baru berarti transaksi baru, bukan database pelanggan; gaya sekunder di detail. D-55 menghapus pemicu pada Kasir. Keranjang kosong mulai dengan pilih menu. Header kas berbentuk toggle tetapi merupakan button pembuka workflow; status mengikuti commit, bukan animasi atau klik. Seluruh blocker tutup kas dan serah-terima tetap berlaku. AC-111 menambah bukti, UT-01–18 tetap; belum ada uji peserta/revisi kode.

Pada Kasir tablet, Semua/kategori/Habis/Promo sejajar sebagai satu pilihan filter. Tidak ada gabungan kategori+Promo. Semua/Habis/Promo tetap, kategori toko dari Pengaturan. Pada HP satu pemilih Filter menu yang memuat pilihan sama. Inactive dikeluarkan dari Menu hari ini; stok 0 aktif hanya di Habis (D-51). Baseline 1024×768/root default dengan ≥20 menu bernama pendek: minimal 8 baris penuh terlihat sebelum scroll, target 10; row 44 px dan viewport isi tabel ≥352 px. Ringkas header/padding/filter, jangan mengecilkan target atau memotong nama panjang/pembesaran teks. Catat hasil aktual; target bukan bukti pengukuran.

## Koreksi tampilan terbaru — D-48 (7 Oktober 2026)

Instruksi terbaru pemilik: header **Diskon** saja. Isi kolom Stok, Diskon dan Harga hanya angka dengan pemisah ribuan/desimal; tanpa Rp, %, teks, dash, slash atau rentang. Diskon memakai nilai sesuai jenis yang owner atur (misalnya 10 untuk 10% atau 2.000 untuk potongan Rp2.000); jenis/nilai/harga dasar dan efektif dijelaskan pada detail item, bukan menambahkan unit di sel tabel. Nominal total/pembayaran/refund/struk tetap berformat Rp.

Satu baris katalog mewakili satu SKU dengan satu stok/harga yang pasti. SKU bernama sama dibedakan melalui nama varian **inline**; jika nama varian juga sama, tambahkan kode SKU asli. Ini menggantikan penyajian kelompok stok/harga per varian D-47: tidak menjumlahkan stok, tidak mengarang harga atau memilih SKU diam-diam. Subbaris generik/satuan tidak diulang pada satu SKU; varian pembeda tetap terlihat di detail/keranjang/refund; Reguler bawaan tunggal disembunyikan tanpa mengubah identitas SKU. Filter promo membatasi SKU nyata. D-52 mewajibkan stok angka. D-51: kuantitas 0 hanya di Habis dengan angka 0/disabled; nonaktif dan data lama tanpa hitungan berada di Menu & Stok untuk pengelolaan/perbaikan. Input numerik menolak huruf dan batas domain tetap memvalidasi angka/uang.

Navigasi kiri tablet/desktop dapat diciutkan menjadi rail ikon dan dibuka kembali melalui tombol berlabel **Ciutkan navigasi/Buka navigasi**, dengan aria-expanded dan fokus keyboard. Menambah ruang katalog tanpa mengubah pesanan, filter, channel atau histori. Ikon navigasi tetap memiliki nama aksesibel; HP mempertahankan navigasi responsif. Tidak ada perubahan stack, scope paket, uang/stok/izin atau otorisasi deployment.

Penerapan prototipe dan bukti terpilih: [review D-47/D-48](../berrie-site/REVIEW-HISTORY.md#d46-d48). Persetujuan visual, UT dan gerbang operasional belum selesai.

## Revisi keranjang pembelian — D-51

Tabel keadaan bagian 4 berlaku untuk detail pesanan bila terdapat pekerjaan/keuangan lanjutan. Kasir menampilkan draft/pesanan yang sedang dibeli: Bayar nanti, Bayar, Simpan dulu serta Diskon order/Catatan sebagai tombol jelas. Bayar nanti tetap konfirmasi pembuatan; bantuan maknanya tampil dekat tombol. Keranjang hanya memuat hasil penyajian dari dialog item, tanpa pemilih order tambahan. Klik item draft mengedit qty/penyajian/topping/catatan; hapus baris tidak mendebit stok.

Pembayaran terkonfirmasi menyiapkan keranjang kosong. Struk tetap milik transaksi asal dan gagal cetak tidak mengembalikan transaksi lunas sebagai pembelian aktif. Hasil belum diketahui/gagal simpan mempertahankan order dan input sampai operasi yang sama diperiksa. Penyajian/refund/koreksi di Pesanan/Riwayat, tanpa menyamakan Lunas dengan Disajikan.

UT-01/02/03/05 juga mengamati perpindahan ke keranjang kosong tanpa hilangnya transaksi/tiket dan menemukan penyajian di Pesanan. UT-17/18 mengamati satu filter aktif, Semua/Habis/Promo tetap, kategori toko dari Pengaturan, inactive tidak muncul di Kasir, varian pembeda dan catatan draft dibaca kembali sebelum bayar. ID/target peserta dipertahankan; belum ada uji peserta baru.

D-78 menggantikan UI D-55: Pesanan memakai kelompok Aktif/Tersimpan, filter pengerjaan/pembayaran AND awal Semua dan ketuk entri membuka detail bersama; refund tertunda tetap terlihat langsung. Riwayat hanya order yang settlement dan pekerjaan selesai, refund due 0; refund selesai tetap historis. Pemicu Refund tersedia pada order dibayar, konfirmasi Catat refund memerlukan uang sudah dikembalikan. Unit belum diserahkan dibatalkan atomik bersama refund sesudah dapur diberi tahu. Satu alasan refund wajib; tanpa alasan metode berbeda terpisah, izin/audit tetap. Kewajiban dari pembatalan terpisah bukan refund yang sudah dicatat dan tetap blocker.

## Revisi UI dan menu — D-55/D-56

Identitas wajib diisi sebelum simpan/proses/bayar, dengan pesan dekat keranjang dan input bertahan. Tidak ada Pesanan baru di header/keranjang Kasir. Empat item pendek penuh menjadi target tablet keranjang/detail; kurangi struktur/ruang kosong tanpa mengecilkan target sentuh/font, nama panjang tetap membungkus. Status penyerahan merah/hijau selalu disertai teks; tanpa nomor kiriman berulang. Default Pesanan Lunas; draft tetap mempunyai status yang jujur.

Form menu satu overlay: Tipe/Kode otomatis sejajar, kategori dropdown owner, opsional ukuran/rasa dengan harga/stok per baris, topping opsional bernama/harga tambahan; satu simpan atomik. Kasir tetap tap SKU ukuran yang tepat dari tabel, topping di dialog item, tanpa wizard konfigurasi kedua. Peringatan Stok Minimal di aplikasi, copy menjelaskan batas ≤ambang dan tidak mengesankan push eksternal. UT-01/02/03/04/07/10/17/18 tetap ID/peserta/target; tambahkan observasi identitas blank, workspace Aktif/Semua, detail tindakan berikutnya, pembuatan tiga ukuran+topping/harga, tipe bentrok dan peringatan threshold. Bukti prototipe tidak meluluskan UT peserta.

## Pengisian tabel dan rekap — D-57–60

Owner memikirkan baris menu dan pilihan, bukan struktur SKU/receipt. Tabel langsung edit memakai dropdown, error dekat sel, duplikat dan bulk; kode otomatis. Menu satu rasa/ukuran per row, stok satu saldo seluruh pilihan. Lima row per halaman tablet dengan input56/row64, topping/rincian plain; posisi/input bertahan saat berpindah. Racikan Es/Gula pilihan kasir gratis, bawaan Normal dan hasil terbaca. Rekap online dilakukan setelah antrean reda dengan pengingat cutoff; jangan menyamarkan saldo yang belum dikurangi online sebagai realtime. Tutorial/checklist atau konfirmasi simpan berulang tidak ditambahkan.

| ID | Situasi | Target mandiri | Batas waktu | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-19 | Owner membuat Milkshake 3 rasa dari tabel, harga berbeda dan stok bersama50; menemukan/memperbaiki satu error harga | ≥7/8 selesai tanpa bantuan; 8/8 memahami stok50 tidak menjadi150 | ≤5 menit | Mengisi stok setiap rasa, menyimpan sebagian tabel gagal, hilang input |
| UT-20 | Kasir memilih less ice/less sugar, membaca keranjang dan tiket, menu racikan diubah sesudah order | ≥7/8 memilih/membaca benar; 8/8 harga/stok tidak bertambah karena racikan | ≤2 menit | Racikan hilang/tertukar atau dianggap varian stok |
| UT-21 | Setelah antrean online reda, kasir merekap Milkshake8 dari50 sampai cutoff baru, menghindari order yang sudah dicatat | ≥7/8 merekap mandiri; 8/8 tidak debit ganda/mengira omzet ikut dicatat | ≤3 menit di luar pengumpulan jumlah | Periode ulang, double count, saldo sebelum rekap dianggap realtime |

Target peserta belum diukur; tes domain/browser prototipe bukan UT peserta atau gerbang pilot.

## Penemuan variabel dan kegiatan berbeda — D-61–65

D-66: mulai dari + Menu dalam modal yang punya Batal. Hasil terlihat di atas; batal penambahan tidak membuang perubahan menu lain. Gunakan istilah Varian, nama/pilihan dengan copy ringkas lalu daftar harga di dialog yang sama. Daftar pilihan tunggal otomatis, harga baru wajib diisi; multi memilih topping bersama secara eksplisit melalui Harga untuk pilihan lain. Jangan mengharuskan owner menambah baris + Kombinasi atau mencari hapus di ujung tabel. Harga yang sudah ada dan SKU dipertahankan; penggabungan pilihan dengan harga berbeda ditahan agar tidak memilih harga diam-diam. Blank `-` tetap sah dan hanya harga tersimpan dapat dijual. Diskon terpisah dari Menu; Stok opname pada tab Stok, tanpa Rincian di tabel Menu. Area tabel tetap tidak menyusut.

Label stok menjelaskan tindakan, bukan angka ambigu Jumlah: Isi stok/Tambah sebanyak vs Stok opname/Hasil hitung fisik. Stok tercatat adalah hasil catatan; stok minimal adalah batas peringatan. Field yang dapat diisi mempunyai border/fokus/placeholder terlihat. Kas memiliki tindakan uang selama berjualan terpisah dari Selesai bertugas; pengguna memilih keadaan ganti petugas atau toko tutup, lalu mengikuti urutan. Tidak mewajibkan handover saat actor sama. Koreksi rekap menjelaskan perubahan stok dan asal/revisi; approval default owner tetap, bukan silent overwrite.

| ID | Situasi | Target mandiri | Batas waktu | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-22 | Owner membuat Pizza tanpa variabel lalu ukuran cup/custom enam variabel; topping Keju+Jamur dan dua harga kombinasi | ≥7/8 setup tanpa bantuan; 8/8 memahami hanya variabel yang dibuat muncul di Kasir | ≤6 menit | Harga salah, mencari rename tersembunyi, mengira pilihan teks bebas atau stok per topping |
| UT-23 | Tambah4 pada stok10 lalu opname fisik9, ubah batas peringatan | ≥7/8 memilih kegiatan mandiri; 8/8 saldo14 lalu9 dan threshold tidak mengubah saldo | ≤3 menit | Menganggap hasil fisik sebagai tambahan atau mengedit saldo tanpa jejak |
| UT-24 | Rekap8 keliru, koreksi3 dengan approval owner dan baca histori | ≥7/8 menemukan field/koreksi mandiri; 8/8 memahami stok kembali5 dan catatan asal tetap | ≤3 menit di luar waktu approval | Debit ulang, overwrite asal, koreksi tanpa owner atau mengira omzet ikut berubah |
| UT-25 | Staf sama hingga tutup vs berganti shift lalu toko tutup; uang keluar untuk belanja | ≥7/8 menemukan jalur mandiri; 8/8 tidak handover fiktif/reset kas | ≤4 menit per skenario | Melayani dengan dua penanggung jawab, menutup sesi saat ganti shift, melewati hitung/blocker |

Target peserta belum diukur. Pedoman tambahan UI/UX Pro Max dipakai sebagai referensi kontekstual/error recovery/touch target, bukan mengganti design system Berrie; skill tidak dipasang lokal. Browser/tes prototipe bukan UT peserta.

| ID | Situasi | Target mandiri | Batas waktu | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-26 | Owner batal + Menu, membuat menu lalu dua pilihan harga, topping multi, menemukan Diskon dan Stok opname | ≥7/8 selesai tanpa bantuan; 8/8 tidak mengira batal menambah stok atau daftar harga menyimpan langsung | ≤6 menit | Draft tersembunyi, harga otomatis salah, stok awal ganda, opname dicari di Rincian |

UT-26 adalah target baru D-66, belum diukur pada peserta. UT-22 tetap dan memakai label/alur Varian terbaru.

## Pengelolaan langsung — D-67

D-67 mendahului default topping tidak terpilih, checkbox/bulk, harga manual kombinasi, stok dua kegiatan dan sub Diskon yang berbeda di atas. Status hanya Dijual/Tidak dijual dengan label+warna pada sel, tanpa mewarnai row. Hapus menu berlabel dan dialog nama/dampak/Batal/konfirmasi final, histori tetap. Batal perubahan dekat Simpan perubahan, membuang draft saja. + Varian jelas sebagai button; nama/cara memilih/pilihan dengan tambahan≥0 satu modal, pertama default berbintang. Tanpa preset/pengaturan harga/wizard harga. Diskon sejajar pengelolaan utama.

Stok unik per menu; saldo acuan dan sisa dibedakan. Ubah stok awal meminta total aktual baru, bukan tambahan, serta alasan; log tanggal/jam/pelaku terlihat. Minimal konfigurasi saja. Tiga bantuan rekap yang diminta dihapus; rentang dan pengecualian order Berrie tetap jelas. Target44/font14/row64/input56/lima row tetap.

| ID | Situasi | Target mandiri | Batas waktu | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-27 | Owner edit lalu batal, bedakan dua status, batal/konfirmasi hapus, atur varian0/3000/default dan buka Diskon | ≥7/8 selesai mandiri;8/8 memahami hapus seluruh varian/histori tetap dan tambahan harga | ≤6 menit | Hapus tak sengaja, default/harga salah, Batal ikut menghapus histori |
| UT-28 | Owner membaca baseline/sisa per menu, mengubah total stok aktual dengan alasan, baca log dan edit minimal | ≥7/8 mandiri;8/8 membedakan total target dari tambahan dan minimal dari saldo | ≤3 menit | Saldo menjadi tambahan ganda, tanpa alasan/pelaku, sisa diedit bebas |

UT-27/28 dan revisi UT-22/23/26 belum diukur pada peserta; prototype/browser bukan hasil UT.

## Edit yang terbaca dan diskon yang dapat dipakai ulang — D-68

Hindari aksi mati ketika tidak ada perubahan: pasangan Batal/Simpan hanya saat draft berbeda, lebar/tinggi setara. Bingkai/fokus konsisten menyatakan dapat diedit; teks tanpa bingkai menyatakan baca saja. Field baseline boleh membuka dialog beralasan, tanpa label Ubah tambahan. Hapus di kolom paling kiri dengan nama aksesibel/konfirmasi; log tetap dapat ditemukan. Error filter tidak memenuhi toolbar ketika0.

Kategori wajib; tambah kategori/tipe di tempat, kelola tambah/edit/hapus di Pengaturan, lindungi nama yang masih dipakai. Jelaskan bahwa nama konfigurasi yang sudah ditambahkan tetap tersimpan walau modal menu dibatalkan. Pustaka diskon terpisah dari penetapan menu; `-` berarti tanpa diskon. **Beli X gratis Y** menghindari ambiguitas buy2get3: X dibayar, Y tambahan, qty total mencakup keduanya. Tampilkan total nyata, topping seluruhnya dan alokasi refund; jangan menyebut satu unit gratis berharga nol bila refund dibagi merata. Penjelasan kas ditempatkan dekat sumber angkanya, bukan istilah agregat yang harus ditebak.

| ID | Situasi | Target mandiri | Batas waktu | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-29 | Owner edit/revert/Batal Menu/Stok, menambah kategori inline, rename/hapus, membaca log hapus | ≥7/8 mandiri;8/8 paham hanya perubahan nyata perlu disimpan dan kategori wajib | ≤5 menit | Menghapus nama yang dipakai, kehilangan input, mengira hapus menghapus histori |
| UT-30 | Owner buat persen/potongan/Beli2gratis3 dan sematkan menu; kasir qty5/6, topping/refund parsial, jelaskan sumber saldo kas | ≥7/8 mandiri;8/8 paham qty5 bayar menu2, qty6 bayar menu3 dan topping seluruh unit; tidak mencatat payment lagi sebagai Uang masuk | ≤6 menit | Jumlah gratis/uang/stok salah, mengira ekspektasi adalah hasil hitung fisik |

Target belum diukur pada peserta; pemeriksaan prototipe bukan kelulusan UT atau pilot.


## Copy ringkas dan periode sejajar — D-69

Hilangkan penjelasan teknis dari modal Diskon/Varian, duplikasi saldo/actor dan bantuan panjang Kas. Label bermakna serta error yang dapat ditindaklanjuti tetap. Input hitungan akhir berlabel Uang akhir di laci (Rp); saldo tercatat muncul satu kali setelah breakdown. Bintang/Default visual dihapus, default pertama tetap. Menu/Stok/Rekap gulir vertikal/header sticky tanpa pagination. Periode Rekap: Dari berlabel/read-only; Sampai tanggal+jam; Waktu sekarang sejajar bawah kontrol, stack saat ruang sempit. Jadwal Diskon opsional empat field/zona toko/status Terjadwal/Aktif/Selesai; tanpa copy contoh panjang.

| ID | Tugas | Target (belum diukur) | Waktu target | Risiko |
| --- | --- | --- | --- | --- |
| UT-31 | Buat Beli1gratis1 dengan jadwal, tetapkan menu, cek sebelum/sesudah batas dan item lama | ≥7/8 mandiri;8/8 paham jumlah diterima2/bayar1 dan jadwal untuk item baru | ≤5 menit | Zona/batas salah, item lama berubah diam-diam |
| UT-32 | Gulir/edit Menu/Stok, isi cutoff rekap, baca Kas, catat uang nonpenjualan dan tutup | ≥7/8 mandiri;8/8 membedakan saldo tercatat dari hitungan dan tidak catat payment dua kali | ≤6 menit | Input hilang, cutoff salah, blocker/label hitungan tak dipahami |

## Evaluasi desain terpilih — D-70

UT-02/03/05/17/18/20 memakai katalog kartu dan pembayaran panel D-70; tujuan ketepatan uang/varian/stok/verifikasi/racikan tetap, penyebutan tabel Kasir lama diganti katalog. UT-17 tetap memakai tabel untuk administrasi/histori yang sesuai. Semua peserta/target lama tetap; persetujuan pemilik bukan hasil peserta.

| ID | Skenario | Target peserta | Batas waktu | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-33 | Kasir memilih menu/default dan racikan, mengubah jumlah/penyajian, membuka/kembali pembayaran, menghadapi gagal/unknown, lalu selesai dan menemukan struk/pesanan/kelola toko | ≥7/8 mandiri;8/8 tidak mengulang penerimaan uang/debit; belum diuji | ≤3 menit di luar tunggu/gangguan | Salah varian/racikan/jumlah, mengubah penyajian lama tanpa sengaja, mengira buka form sudah bayar, tidak menemukan struk/penyajian, mengulang transaksi saat hasil belum diketahui |

## Evaluasi D-71

UT-33 dan UT-02/03/05/17/18/20 mengikuti modal menu wajib dan empty/notifikasi D-71. UT-04 tetap menguji pemulihan printer/SALINAN tanpa konfirmasi kertas rutin; hasil fisik tidak disimpulkan dari dialog selesai. Target peserta belum diukur.

| ID | Tugas | Target peserta | Waktu target | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-34 | Tambahkan3 menu dari modal, campur penyajian, Simpan dulu/Bayar nanti/bayar, temukan pesanan/struk asal | ≥7/8 mandiri;8/8 tidak mengulang uang/stok atau mengubah item lama; belum diuji | ≤3 menit di luar gangguan | Mengira ketuk kartu sudah menambah, salah default/jumlah, kehilangan draft/asal sesudah kosong, mengulang pembayaran saat unknown |
| UT-35 | Temukan transaksi dalam rentang termasuk hari akhir; cetak/ulang SALINAN tanpa konfirmasi kertas | ≥7/8 mandiri;8/8 memahami batas hari dan tidak meminta pembuatan kedua; belum diuji | ≤2 menit di luar tunggu printer | Salah tanggal/zona, mengira attempt bukti fisik, salinan dibuat sebagai makanan baru |

## Evaluasi D-72

| ID | Tugas | Target peserta | Waktu target | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-36 | Simpan pesanan pelanggan yang pergi sebentar, layani berikutnya, buka Tersimpan/Lanjutkan pesanan, tambah/edit menu lalu bayar; perbaiki identitas kosong dan ulang cetak per tujuan | ≥7/8 mandiri;8/8 tidak menggandakan uang/stok/pembuatan; belum diuji | ≤3 menit di luar tunggu/gangguan | Kehilangan draft, mengedit pesanan lain, input terkunci, mengira Simpan dulu meminta dibuat, mengulang dapur otomatis atau menganggap attempt bukti kertas |

UT-04/34/35 mengikuti cetak otomatis D-72 dan ulang SALINAN; target peserta tetap belum diukur.

## Evaluasi D-73

Agnostik berarti owner menentukan arti angka, sedangkan antarmuka mempertahankan label harga/jumlah/stok yang konsisten. Jangan menambah mode khusus usaha atau meminta kasir memasukkan volume selain Jumlah. Perubahan harga dan pilihan terlihat sebelum menu ditambahkan; field varian hanya muncul ketika diminta. Angka dan label Kas berdekatan dalam satu kolom, bukan dua ujung layar.

| ID | Tugas | Target peserta (belum diukur) | Waktu target | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-37 | Owner buat menu tanpa varian, ukuran beda harga, pilihan gratis; buat harga100 dan kasir masukkan200 | ≥7/8 mandiri;8/8 memahami harga/qty/stok memakai angka konsisten | ≤5 menit di luar gangguan | Mengira harga100 adalah harga200, konversi diam-diam, stok/total salah, kehilangan input |
| UT-38 | Temukan nilai tiap sumber Kas dan saldo tercatat pada tablet/HP/teks besar; mulai alur tutup/serah-terima | ≥7/8 mandiri;8/8 membedakan tercatat dari hitungan fisik | ≤3 menit di luar hitung fisik | Salah memasangkan label–nominal, saldo bocor saat hitung buta, salah jalur selesai atau blocker diabaikan |

UT-33–36 tetap memakai alur D-72; perubahan fondasi visual mengikuti DESIGN-SYSTEM D-73. Pemeriksaan pelaksana bukan hasil peserta.

## Evaluasi laporan dan Kas D-74

Utamakan pertanyaan harian pemilik: berapa penjualan, berapa uang diterima, berapa transaksi dan menu penyumbang penjualan. Pengecualian refund/gratis baru menonjol saat ada. Rincian tetap dapat ditelusuri tanpa menjadikan semua definisi keuangan paragraf di atas angka. UT-38 mengikuti finish di kanan pada tablet dan di bawah pada HP; navigasi tablet atas/HP bawah tetap.

| ID | Tugas | Target peserta (belum diukur) | Waktu target | Kesalahan kritis |
| --- | --- | --- | --- | --- |
| UT-39 | Owner baca hasil penjualan biasa, bedakan dari uang diterima/laba/laci; urut menu berdasarkan pendapatan/jumlah; telusur angka hingga pesanan asal dan kembali; periksa refund lintas hari hanya ketika ada | ≥7/8 mandiri;8/8 tidak menyamakan omzet dengan laba/laci atau mengira pencairan penjualan baru | ≤4 menit di luar gangguan | Salah periode/metode refund, menganggap rekap stok online omzet, hilang konteks/tidak menemukan sumber, tuduhan fraud otomatis |

Definisi uang pada06; target bukan hasil pengukuran. Rujukan terkini D-01–74/AC-01–154/UT-01–39.

## Pengelolaan, laporan dan akses — D-75 · 31 Oktober 2026

Aksi editor muncul bersama status belum disimpan dan tetap terjangkau di atas tabel. Hindari footer fixed yang bersaing dengan navigasi/keyboard; alokasikan ruang di layout dan scroll-padding untuk fokus. Kegagalan tidak menutup input; hasil unknown ditelusuri sebelum operasi baru. Pindah tab mempertahankan kerja, keluar ditahan dan reload memakai peringatan browser.

Ringkasan laporan menjawab penjualan, penerimaan, transaksi/rata-rata, menu terjual dan kejadian penting sebelum rincian perhitungan/metode. Angka yang memakai dasar berbeda dilabeli; refund lintas periode/qty neto/angka negatif tetap jujur. Catatan harian terbatas pada data tercatat; perbandingan belum ditampilkan bila cakupan sebanding tidak bisa dibuktikan. Toko menjadi pengaturan pertama/default; alias bergabung dengan tipe. Staf mempunyai aksi berlabel, konsekuensi penonaktifan sebelum konfirmasi, tanpa membuat role baru.

| ID | Skenario peserta tambahan | Bukti yang dicari |
| --- | --- | --- |
| UT-40 | Edit daftar Menu/Stok panjang, scroll, pindah tab, simpan gagal/unknown dan coba keluar | Aksi/status ditemukan, fokus/input dan baris terakhir terjangkau di tablet/HP, tidak kehilangan draft/duplikasi |
| UT-41 | Jelaskan Penjualan/Uang diterima/rata-rata, urut menu, telusuri refund hari lain serta catatan harian | Dasar metrik dan batas periode dipahami, kembali ke laporan mempertahankan konteks, tanpa menyimpulkan laba/kausalitas |
| UT-42 | Buka Pengaturan, ubah alias tipe dan kembali membuka Pengaturan | Toko pertama/default, alias ditemukan pada tipe yang tepat, kode/histori tetap |
| UT-43 | Tambah/ubah/nonaktif/aktifkan staf, atur izin bersama dan coba saat offline | Peran Kasir/kebijakan bersama/dampak/pencabutan tertunda dipahami, histori tetap; tidak menafsirkan simulasi PIN sebagai autentikasi produksi |

UT-40–43 masih rencana uji, bukan hasil peserta.

## Kasir rutin dan pengecualian — D-76

Tampilkan pilihan ketika diperlukan: sederhana langsung bertambah, menu berpilihan menunggu Tambahkan ke pesanan. Feedback singkat dapat diurungkan hanya sebelum commit terkait. Favorit adalah ingatan posisi milik owner, bukan rekomendasi otomatis. Default penyajian jelas hanya untuk item berikutnya; hasil per item selalu terlihat. Mulai bertugas memusatkan langkah pembukaan laci sebelum menampilkan workspace. Navigasi/visual Inter biru-netral/target44×44 tetap.

| ID | Tugas peserta | Pengamatan |
| --- | --- | --- |
| UT-44 | Mulai kas tertutup, buka dengan Uang awal, tambah sederhana/Urungkan, tambah berpilihan lalu bayar | Memahami kapan item masuk, Urungkan satu penambahan, tidak mencari toggle/konfirmasi tambahan; gagal/unknown mempertahankan input. |
| UT-45 | Owner pilih/urutkan Favorit lewat keyboard; kasir cari di Favorit dengan satu menu habis | Posisi stabil dan Habis dipahami, bisa Lihat semua menu, pilihan tetap editor. |
| UT-46 | Tambah Bungkus, ganti default Makan di tempat, tambah menu sama, ubah satu item lalu bayar | Memahami perubahan penyajian hanya untuk penambahan berikutnya walau tanpa copy bantuan D-77, item lama tetap dan baris terpisah; membaca detail/cetakan campuran dengan benar. Ulang HP360/teks200%/nama panjang/keyboard. |

UT-44–46 adalah rencana peserta; pemeriksaan pelaksana pada review tidak menggantikannya.

## Pesanan sebagai pekerjaan aktif — D-78

Pilih pekerjaan dahulu, baca kewajiban lalu lakukan tindakan sesuai bagian. Status pengerjaan dan pembayaran harus selalu dapat dibedakan; Lunas belum disajikan dan Disajikan belum bayar sama-sama mudah ditemukan. Jumlah kelompok tidak berubah karena search/filter. Tidak ada otomatis memilih tetangga setelah aksi karena berisiko mengerjakan pelanggan salah. Input penyajian dimulai kosong dan perpindahan ditahan sampai diselesaikan/dikosongkan. Lanjutkan pesanan mempertahankan identitas draft yang sama. Riwayat tetap konteks transaksi selesai.

| ID | Tugas peserta | Pengamatan (belum diuji peserta) |
| --- | --- | --- |
| UT-47 | Temukan lunas belum disajikan, disajikan belum bayar, refund tertunda dan draft tersimpan; gabungkan filter/search lalu reset/ganti kelompok | Memahami dua dimensi status, tidak kehilangan kewajiban atau mengira badge jumlah hasil filter |
| UT-48 | Tablet/HP daftar panjang, buka/ganti detail/kembali, nama panjang/teks200%/keyboard; pilih qty lalu coba berpindah | Konteks/scroll/fokus terjaga, guard dipahami, indikator pilihan jelas, tombol terjangkau |
| UT-49 | Lanjutkan draft, bayar dan sajikan terpisah; selesaikan aksi yang mengeluarkan selected dari filter, gagal/unknown | ID/identitas tetap, tidak memilih order pengganti, input bertahan dan tidak menggandakan uang/stok/cetak |

UT-47–49 adalah rencana peserta; review pelaksana bukan kelulusan UT.
