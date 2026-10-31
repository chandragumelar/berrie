# 02 — User flows

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md).

**Acuan tambahan D-73 · 13 Oktober 2026:** Tambah menu menampung varian opsional sebelum Tambahkan ke tabel, lalu Simpan perubahan. Owner menentukan arti harga/qty/stok. Harga100 dan Jumlah200 menghasilkan Rp20.000 tanpa pilihan satuan atau konversi. Qty/stok tetap integer dan aturan debit sekali berlaku. Kas memakai kolom maksimum640 px; fondasi visual mengikuti DESIGN-SYSTEM D-73.

**Alur Kasir D-72 · 12 Oktober 2026:** visual Jira/Inter D-71 tetap. Penyajian hanya di modal item, default Bungkus; tanpa Item berikutnya di card. Modal tanpa copy bantuan/harga per unit, hasil racikan 12px seperti penyajian dan total panel 22px. Identitas kosong diberi error dekat input, tetap bisa dikoreksi. Setelah commit, Bayar nanti otomatis mencoba dapur; pembayaran dengan draft baru mencoba dapur lalu pelanggan, pembayaran batch lama hanya pelanggan. Simpan dulu tanpa cetak/debit; detail draft menyediakan Edit pesanan ke Kasir dengan identitas/nomor tetap. Cetak ulang memilih pelanggan/dapur/keduanya yang layak, SALINAN; attempt bukan bukti kertas. Kasir kosong/notifikasi/Lihat pesanan hanya sesudah sukses; gagal/unknown mempertahankan input dan operasi sama. Riwayat tetap rentang inklusif zona toko, nominal rata kiri. D-72 mendahului uraian D-71 yang berbeda; uang/stok/izin/snapshot/gerbang rilis tetap. [Design system](../DESIGN-SYSTEM.md), [review lokal](../berrie-site/REVIEW-KASIR-D71.md).

Penerapan UX mengikuti [12 — UX principles](12-ux-principles.md), terutama lapisan informasi, tindakan per keadaan dan contoh pesan. Langkah di bawah mempertahankan seluruh prasyarat dan efek bisnis; informasi opsional ditunda, bukan dihapus.

## 1. Aktivasi pertama

1. Online: daftar/login owner dan verifikasi email.
2. Buat toko, isi nama; zona waktu default Asia/Jakarta dengan pilihan zona Indonesia lain. Alamat/kontak struk opsional.
3. Aktifkan browser ini sebagai kasir utama. Bila ada kasir lain, masuk alur pindah perangkat pada [08](08-offline-backup-and-restore.md).
4. Buat dan konfirmasi PIN enam digit. Unduh data awal, cache aplikasi, dan izin offline.
5. Tambah minimal satu menu melalui nama, harga rupiah dan stok awal integer ≥0; kode dibuat unik oleh aplikasi. Kategori, varian, topping dan ambang stok berada di pengaturan menu opsional. QRIS/transfer/e-wallet awalnya nonaktif; tunai sudah tersedia.
6. Buka Kasir; minta **Buka kas** dengan input **Uang awal** aktual, termasuk Rp0. Jangan mengisi modal dari perkiraan/saldo lama.
7. Tawarkan kartu nonmodal **Atur kebutuhan lain** dengan Printer, Metode pembayaran, Menu & Stok dan **Nanti saja**. Printer, pajak/layanan, topping, ambang stok dan import bukan syarat mencoba transaksi. Uji printer tetap tersedia dari Pengaturan; tampilkan status kesiapan offline dan cetak terpisah.

Layar selesai setup baru menyebut **Siap offline** setelah cache, database, PIN, dan izin offline tersedia. Kegagalan setup tidak mengaktifkan toko kedua atau mengulang awal trial.

## 2. Mulai hari

Buka aplikasi → pilih identitas owner/staf dan masukkan PIN → tampilkan izin offline, data tertunda dan sesi kas. Bila penanggung jawab laci berganti, lakukan serah-terima sebelum melayani. Jika sesi sebelumnya masih terbuka, lanjutkan sesi itu; jangan otomatis membuat sesi baru saat tengah malam. Bila tidak ada sesi terbuka, masukkan modal dan buka kas. Uang awal berasal dari hitungan fisik, bukan otomatis saldo sesi sebelumnya.

Tujuan sesudah buka kunci adalah Kasir, dengan akses **Pesanan** dan jumlah aktif selalu terlihat. Ringkasan laporan tidak menyela alur. Tindakan tetap pada lokasi stabil sesuai tabel keadaan di file 12; pengguna tidak perlu memilih mode bayar-awal/bayar-akhir pada setup.

## 3. Bungkus, bayar di awal

1. Kas belum dibuka: **Buka kas**, isi **Uang awal** aktual. Kas terbuka terlihat di header; **Tutup kas** tetap tersedia saat selesai bertugas.
2. **Pesanan baru** membuka pesanan kosong. Jika pesanan masih diisi dan belum disimpan, tahan perpindahan dengan petunjuk **Simpan dulu**; jangan buang input. Keranjang kosong cukup menyebut pilih menu.
3. Ketuk kartu menu/varian membuka modal dengan default terisi; item masuk keranjang hanya setelah **Tambahkan ke pesanan**. Tanpa ikon Atur. Harga akhir Rp, promo dan stok rendah terlihat; promo nyata diatur owner sesuai file 03/D-43. Diskon order terlihat di rincian total untuk pesanan tanpa promo SKU.
4. Pilih penyajian item: Bungkus atau Makan di tempat. Untuk menu sama yang dibagi, tambahkan sebagai dua baris dengan qty/penyajian masing-masing; tidak ada opsi Campuran. Identitas **No. antrean / nama (wajib)** diisi sebelum simpan/proses/bayar. Semua tetap satu tagihan.
5. **Bayar** mengganti panel pesanan di layar Kasir → uang diterima/kembalian atau verifikasi manual non-tunai. Copy “Saat disimpan, item baru juga diminta dibuat.” dihapus; efek commit tetap sama. QRIS/non-tunai memakai label **Catatan**.
6. **Simpan pembayaran** → validasi ulang → satu commit settlement dan konfirmasi draft/batch/stok. Lunas dan Sudah diminta dibuat tetap badge terpisah. Kasir tidak perlu menekan Minta dibuat lagi. Membuka atau membatalkan layar bayar tidak memberi efek.
7. Sesudah commit di Kasir, tampilkan empty state Pesanan baru dan notifikasi **Pembayaran tersimpan** dengan **Lihat pesanan**. Dapur lalu pelanggan otomatis dicoba cetak setelah commit, tanpa dialog otomatis atau kartu hasil yang menetap. Cetak ulang tersedia di detail. Gagal cetak tidak membatalkan pencatatan. Keranjang Kasir kembali kosong setelah pembayaran berhasil; lanjutkan penyajian dari Pesanan → detail. Sajikan/serahkan unit sesuai penyajian yang tercatat; setelah seluruh unit diterima dan keuangan selesai baru pesanan keluar dari aktif.
8. Jika stok berubah sebelum commit, tolak seluruh operasi tanpa debit/settlement sebagian. Input tetap ada. Jika uang sudah diterima/terverifikasi di luar aplikasi, periksa catatan dan stok sebelum retry, jangan meminta pembayaran kedua.

## 4. Makan di tempat, bayar di akhir

1. Pilih Makan di tempat pada dialog item; **No. antrean / nama (wajib)**, misalnya `12 / Rani`. Item lain boleh bungkus dalam order yang sama.
2. Simpan dulu bila pelanggan belum selesai memesan; setelah berhasil, Kasir kosong dan notifikasi **Draft tersimpan** membuka draft yang sama lewat **Lihat pesanan**. Dari Pesanan → Tersimpan → ketuk pesanan → **Lanjutkan pesanan**, kembali ke Kasir untuk tambah/hapus menu, ubah qty/pilihan/penyajian/catatan, lalu Simpan dulu/Bayar nanti/Bayar. Nomor dan identitas tetap; Simpan dulu tidak mencetak atau mengurangi stok.
3. **Bayar nanti** (konfirmasi batch), → batch pertama dan stok berkurang; Tiket dapur otomatis dicoba setelah commit tanpa dialog otomatis. Kasir kembali kosong, notifikasi **Pesanan diminta dibuat** dengan **Lihat pesanan**. Buka detail order yang sama untuk **Bayar** kapan pelanggan ingin membayar. Cetak tidak meminta konfirmasi kertas.
4. Kasir menyerahkan tiket secara fisik. Sebelum bayar hanya tiket dapur; tujuan pelanggan/keduanya disabled.
5. Tandai penyajian sesuai unit yang sudah keluar; tetap aktif karena belum bayar.
6. Gunakan **Tambah item** selama belum lunas. Draft tambahan tampil terpisah dari batch lama; **Bayar nanti** berikutnya hanya memproses draft tambahan dan membuat tiket **TAMBAHAN**. Tombol penyajian tetap tersedia pada detail Pesanan untuk unit batch lama yang masih diproses.
7. Saat pelanggan membayar, tampilkan seluruh unit tidak dibatalkan beserta diskon/pajak/layanan. Satu metode menyelesaikan seluruh tagihan; bila ada draft tambahan, Simpan pembayaran sekaligus mengonfirmasi batch tambahan saja.
8. Struk pelanggan otomatis dicoba setelah pembayaran; dapur lama tidak diulang. Cetak ulang tersedia dari detail. Jika tambahan belum disajikan, pesanan tetap aktif.

## 5. Tambahan setelah lunas

Tombol **Pesanan baru** membuat order baru dan menawarkan salin tipe, no. antrean/nama serta referensi pesanan asal. Nomor, pembayaran dan stoknya terpisah. Tidak ada edit tagihan asal atau penggabungan bill.

## 6. Gangguan cetak

Pesanan yang sudah tersimpan tetap diproses walaupun dialog dibatalkan, koneksi printer gagal atau kertas habis. Tidak meminta konfirmasi kertas rutin. Kasir dapat membuka detail Pesanan dan memilih **Cetak ulang — SALINAN**. Jika hasil sebelumnya tidak jelas, konfirmasi ke dapur agar salinan tidak dimasak dua kali. Selama printer bermasalah, kasir dapat menyerahkan catatan manual sesuai isi tiket. D-71 tidak menambahkan tombol penanganan manual; data manual lama tetap historis.

Detail pesanan mempertahankan status tersimpan/diproses dan tindakan **Cetak ulang — SALINAN**; error pengiriman cetak nyata tetap ditampilkan bila diketahui. Tidak mengarahkan pengguna ke Minta dibuat lagi. Tanpa printer yang siap, panel tetap menyediakan isi tiket dan penanganan manual, tanpa klaim tiket telah keluar. Jalan pintas Atur printer kembali ke pesanan yang sama.

## 7. Pembatalan

- Draft belum bayar: hapus unit; tidak ada perubahan stok. Pembatalan seluruh order yang sudah disimpan tetap menyimpan jejak alasan.
- Sudah diproses belum bayar: pilih unit, alasan, konfirmasi telah memberi tahu dapur; pilih apakah stok masih layak dikembalikan. Simpan pembatalan dan pergerakan stok secara atomik; tagihan diperbarui.
- Sudah lunas: pilih unit dan alasan. Jika pekerjaan perlu dihentikan, batalkan operasional dan beri tahu dapur. Catat kewajiban refund; jangan otomatis menganggap uang sudah dikembalikan.
- Makanan sudah disajikan: refund bisa dilakukan, tetapi status penyajian historis tetap disajikan. Pengembalian stok default tidak; pilihan layak jual dicatat terpisah.

## 8. Refund

Buka transaksi asal → pilih unit yang belum direfund → lihat nilai asli termasuk porsi diskon/pajak/layanan → pilih metode/keputusan stok → dapatkan persetujuan dan otorisasi eksekusi bila izin mewajibkan → lakukan pengembalian uang di luar Berrie → konfirmasi uang sudah dikembalikan → simpan refund dengan operation ID tetap. Untuk tagihan platform, gunakan pembalikan terverifikasi melalui platform sesuai file 05, bukan refund tunai toko. Untuk tunai, sesi kas harus terbuka dan nominal dibebankan pada sesi sekarang. Refund dari penjualan hari lalu tidak mengubah tutup kas lama.

Pemicu **Refund** ada pada detail transaksi di Pesanan/Riwayat. Satu formulir memperlihatkan unit, nominal, alasan, metode dan keputusan stok, lalu pernyataan **Uang sudah saya kembalikan**. Tidak ada dialog konfirmasi identik sesudah ringkasan final. Pembatalan processed menggunakan ringkasan serupa dengan syarat **Dapur sudah diberi tahu**; jangan menawarkan Undo generik.

Jika perpindahan uang sudah dilakukan tetapi penyimpanan gagal, tampilkan peringatan untuk memeriksa transaksi asal sebelum mengulangi pengembalian. Retry penyimpanan memakai ID yang sama; tidak meminta owner mengirim uang kedua kali.

## 9. Tutup kas

1. Buka Tutup kas. Owner boleh membaca ringkasan; untuk staf, ekspektasi dan rincian yang membocorkannya belum ditampilkan sebelum hitungan fisik disimpan.
2. Tampilkan semua order belum bayar, unit belum diproses/disajikan, dan kewajiban refund. Selesaikan atau batalkan dengan benar. Draft tersimpan juga harus dibereskan.
3. Isi dan simpan hitungan fisik, baru tampilkan ekspektasi/selisih kepada staf. Bila selisih bukan nol, alasan wajib; revisi mempertahankan hitungan pertama; selisih tidak membuat kas masuk/keluar otomatis.
4. Konfirmasi tutup kas; angka dan daftar event penutupan dibekukan. Sesi tertutup tidak dapat dibuka ulang.
5. Coba sync; offline tidak menghalangi penutupan lokal setelah semua blocker selesai. Tampilkan perubahan belum terkirim dan pengingat unduh backup.

Setiap blocker berupa baris bernomor pesanan, alasan dan tombol Buka pesanan. Kembali dari penyelesaian mempertahankan hitungan fisik yang belum disimpan tetapi menghitung ulang ekspektasi dan meminta pemeriksaan kembali sebelum tutup final. Peringatan cetak/sync dipisahkan dari blocker bisnis; tidak dibuat gate tutup kas baru.

## 10. Pulih atau pindah perangkat

Login online → verifikasi owner → lihat perangkat aktif dan cakupan backup → sinkronkan/nonaktifkan perangkat lama jika tersedia → validasi sumber pemulihan di staging → owner memilih sumber secara eksplisit → aktifkan perangkat baru. Pesanan aktif dan sesi kas ikut pulih sesuai checkpoint; transaksi dari perangkat lama setelah checkpoint ditahan untuk review, bukan digabung diam-diam.

Masuk dari **Pengaturan → Data & Perangkat**. Sebelum konfirmasi, tampilkan sumber, waktu/cakupan, perubahan yang tidak tercakup dan dampak perangkat lama. Error validasi menyatakan data aktif belum berubah. Jangan mereduksi pemulihan menjadi tombol sekali tekan tanpa pemeriksaan yang diwajibkan file 08.

## 11. Pengawasan staf dan persetujuan HP

Setup staf/izin opsional setelah onboarding minimum: owner membuka **Pengaturan → Staf & izin**, membuat identitas/PIN staf dan memilih izin per aktivitas serta batas diskon. Owner dari HP online boleh mengatur izin; status **Belum diterima perangkat kasir** tetap terlihat sampai versi diterima. HP tidak perlu menjadi kasir aktif.

Kasir membuka tindakan sensitif → melengkapi objek/nilai/alasan → **Minta persetujuan owner** → status Belum dikirim/Menunggu. Owner membuka **Persetujuan** di HP, memeriksa ringkasan dan Setujui/Tolak → kasir mengambil keputusan online → **Lanjutkan tindakan** → validasi/receipt → konfirmasi dan commit di kasir aktif. Status **Disetujui** tidak sama dengan **Sudah dicatat**. Kedaluwarsa, ditolak, dicabut, input berubah, hasil tak diketahui dan perangkat berganti mengikuti file 08. Tidak ada notifikasi eksternal otomatis; owner melihat inbox ketika aplikasi dibuka/refresh. Owner yang hadir bisa mengotorisasi satu tindakan dengan PIN lokal, tanpa membuka akses umum staf.

## 12. Serah-terima laci

Staf lama memilih **Serah-terima kas**, simpan draft → hitung fisik tanpa angka acuan → simpan lalu lihat selisih/alasan → staf baru autentikasi dan konfirmasi jumlah → commit serah-terima → lanjutkan pesanan yang masih terbuka. Hitungan ulang berjejak; saldo ledger toko tidak direset. Jika staf lama tidak hadir, owner melakukan pengambilalihan beralasan. Detail rumus dan batas mutasi saat menghitung mengikuti file 06.

## 13. Pesanan dan pencairan platform manual

Aktifkan channel dan harga/pemetaan SKU → kasir periksa aplikasi merchant → pilih channel/ID eksternal → pilih item dari stok bersama → buat batch atau **Catat tagihan platform** bila tanggungan platform sudah terverifikasi → serahkan ke kurir/pelanggan. Pembayaran langsung ke toko hanya dicatat bila benar-benar terjadi. Berrie tidak menerima pesanan atau mengganti ketersediaan di aplikasi merchant. **Sudah dibuat sebelum dicatat** memakai alur beralasan tanpa tiket masak baru pada file 04.

Owner/petugas berizin kemudian membuka **Laporan → Dana platform** pada kasir aktif, mencocokkan order/biaya/subsidi/pembalikan dengan laporan merchant, mencatat batch dana yang benar-benar cair dan alokasinya. Saldo belum cocok terlihat; pencairan tidak membuat penjualan kedua atau isi laci bertambah. HP owner dapat meninjau/menyetujui, bukan memasukkan ledger. Dana belum cair tidak menghalangi tutup kas; kewajiban refund/pekerjaan yang belum selesai tetap mengikuti file 05/06.

## Langkah pertama dan struk — D-44

Kas tertutup: satu CTA **Buka kas**, bantuan **Buka kas untuk mulai melayani**; Pesanan baru belum ditampilkan dan tidak menjadi alias buka kas. Setelah berhasil, Kas terbuka dan kasir mulai dengan memilih menu; tanpa Pesanan baru di Kasir. Penanggung jawab berbeda pada sesi terbuka memakai Serah-terima kas, tanpa membuka sesi baru/reset. Petugas sama dapat melanjutkan tanpa serah-terima ulang.

Modal **Struk** memakai tujuan Pelanggan & dapur (default setelah bayar bila keduanya layak), Pelanggan saja atau Dapur saja. Urutan dapur dahulu pada printer yang sama. Dokumen dapur hanya unit yang sudah dikonfirmasi; saat bayar batch yang sudah dicoba cetaknya, otomatis hanya struk pelanggan, bukan ulang dapur. Cetak ulang eksplisit SALINAN, tanpa debit stok/pembuatan kedua. Aturan rinci file 09 tetap berlaku.

## Penerapan feedback Kasir — D-47

Pesanan baru mengganti label Pelanggan baru dan tersedia di detail pesanan; D-55 menghapusnya dari header/keranjang Kasir; keranjang kosong mulai langsung dari pilih menu. Input yang belum tersimpan tidak dibuang. Header kas berbentuk toggle membuka form Buka kas/Tutup kas; tampilan status hanya berubah setelah commit, semua blocker dan serah-terima file 06 tetap. Penyajian dipilih dalam dialog item dan hasilnya terlihat per baris; identitas tetap di keranjang. Batal/refund/koreksi pembayaran berada di detail Pesanan/Riwayat, tanpa pemicu di keranjang pembelian. Draft diedit lewat ketukan item/hapus baris. Tabel/alias/pemilih SKU mengikuti 03/09; typography D-47 dipertahankan dalam DESIGN-SYSTEM.md D-49. Revisi baru dokumentasi/prompt.

D-54: Bayar nanti hanya menyediakan Dapur saja sampai settlement. Refund pada order lunas sebelum diserahkan meminta konfirmasi dapur; pembatalan dan refund commit bersama sesudah uang dikembalikan. Submit Catat refund disabled sebelum konfirmasi uang; persetujuan owner disiapkan terpisah sebelum perpindahan uang. Riwayat hanya order dengan settlement, seluruh pekerjaan selesai dan refund due nol.

## Revisi alur D-55/D-56

Kasir mulai langsung dengan mengetuk menu, tidak mempunyai button Pesanan baru saat kosong maupun berisi. Pesanan baru untuk berpindah dari order tersimpan tetap di detail; draft belum disimpan tidak dibuang. Isi antrean atau nama sebelum Simpan dulu, Bayar nanti dan Simpan pembayaran; validasi domain menahan commit dengan input tetap. Bayar menjadi aksi hitam utama; Bayar nanti abu-abu tetap langsung terlihat.

Menu & Stok → Menu baru: Nama → Tipe (dropdown, + Tambah tipe inline)/Kode otomatis → Kategori dropdown dari Pengaturan → harga/stok. Pilihan ukuran/rasa opsional menambah baris nama/harga/stok per SKU dalam satu form; topping opsional memilih topping existing atau menambah nama/harga tambahan. Satu Simpan menu menyimpan seluruh baris atomik. Harga platform hanya untuk channel aktif. Stok Minimal dan daftar Peringatan stok mengikuti file 03; pengisian saldo existing tetap Tambah/Koreksi stok.

## Revisi setup dan online — D-57–60

Owner membuka Menu & Stok → Menu, mengisi satu rasa/ukuran per baris melalui tabel; tambah/duplikat/tempel dan dropdown langsung di sel. Isi stok awal serta Stok Minimal sekali per menu. Periksa sel bertanda error, Simpan perubahan atomik; gulir vertikal dengan target input56 px dan header tetap (D-69). Pengisian stok berjalan melalui tab Stok: Tambah stok atau Hasil hitung fisik beralasan, satu commit seluruh baris. Racikan Es/Gula diatur pada tabel, dipilih di dialog item dan terlihat di keranjang/tiket tanpa harga tambahan.

Online stok saja: owner mengaktifkan Rekap online → pengingat menetap → setelah antrean reda kasir membuka rekap, periksa batas waktu terakhir, isi akhir periode dan jumlah per menu → pastikan tidak termasuk pesanan yang sudah dicatat → Simpan rekap online. Saldo/histori/batas periode berubah atomik; transaksi/omzet/kas tidak dibuat. Sebelum rekap saldo belum mencakup pemakaian setelah batas terakhir. Tutup kas menampilkan pengingat, tidak otomatis merekap. Jalur platform rinci §13 tetap opsional, bukan syarat setup/default Toko atau rekap stok saja.

## Alur terkini — D-61–67

Setup menu: **+ Menu → modal Tambah menu → nama/kategori/tipe/harga/varian opsional/stok awal → Tambahkan ke tabel**. **Batal** menutup form tanpa menambah draft; menu baru muncul di baris pertama halaman pertama, fokus nama dan tetap terlihat setelah Simpan perubahan. Sebelum commit, **Batal tambah menu** membatalkan grup baru saja. Pada baris menu, **+ Varian / N varian → nama/cara memilih/pilihan + tambahan harga≥0 → Terapkan varian → Simpan perubahan**. Harga dasar + tambahan;0 tidak mengubah harga. Pilihan pertama default berbintang. Tanpa preset/pengaturan harga/langkah harga/checkbox. Batal perubahan mengembalikan seluruh draft; status Dijual/Tidak dijual memakai warna hanya di sel. Hapus menu → dialog nama/dampak → Batal atau Ya, hapus menu; histori tetap dan draft aktif ditahan. Kasir hanya melihat varian menu terkait, tanpa impor.

Stok baru diisi saat setup. Tab Stok satu row per menu: status/nama/harga/kategori read-only, Stok awal membuka modal total aktual baru + alasan → Simpan stok berizin Koreksi stok → log tanggal/jam/pelaku/before/after. Stok minimal dapat diedit owner tanpa mengubah saldo; Stok sisa read-only. Stok awal adalah baseline terakhir, bukan tambahan. Rekap memasukkan qty sampai menit; koreksi memakai alasan/izin Koreksi stok dan delta sekali.

Toko tanpa pergantian petugas: Buka kas → layanan/Uang masuk atau keluar bila nyata → bereskan pesanan/refund → hitungan akhir → tutup kas. Toko berganti petugas: Buka kas → layanan → hitungan serah-terima → autentikasi/konfirmasi penerima → lanjut sesi yang sama → petugas terakhir bereskan/hitung/tutup. Tidak ada serah-terima wajib ketika petugas tetap sama. Lihat aturan lengkap file03/06/08; status kas mengikuti commit.

Histori D-67 (alur diganti D-68): Diskon katalog dibuka melalui navigasi utama **Diskon**, sejajar Menu & Stok. Pilih menu → Atur diskon → Simpan diskon. Stok opname memakai **Stok → Ubah stok awal**; jejak stok dibaca di tab Stok. Promo SKU/channel, tambahan multi, snapshot dan diskon order mengikuti file03/07.

## Alur revisi D-68

**Diskon → + Diskon → nama/jenis/nilai atau Beli X gratis Y → Simpan diskon**. **Menu & Stok → Menu → dropdown Diskon di samping Varian → pilih jenis atau `-` → Simpan perubahan**. Mengubah definisi memperbarui penawaran berikutnya pada menu terkait, tanpa mengganti snapshot order. Kasir memasukkan jumlah total termasuk unit gratis; detail item menjelaskan syarat dan total aktual. Setelah konfirmasi, kelompok promo dibekukan; refund satu unit mengikuti alokasi pembayaran asal file07.

Pada modal + Menu, kategori wajib; tambah kategori/tipe lewat input di tempat bila belum ada. Nama konfigurasi yang sudah disimpan tetap ada walau modal Menu dibatalkan. Pengaturan menyediakan tambah/edit/hapus kategori dan tipe; hapus hanya yang tidak dipakai menu aktif. Menu dan ambang stok menampilkan pasangan **Batal / Simpan** hanya saat ada perubahan nyata, ukuran sama. Hapus paling kiri, konfirmasi dan log tanggal/jam/pelaku tetap. Stok awal dipilih langsung melalui field berbatas tanpa kata Ubah; modal total aktual+alasan tidak dihilangkan. Rincian uang laci dan metadata buka mengikuti file06.


## Alur ringkas D-69

Diskon → + Diskon → nama/jenis/nilai → jadwal opsional mulai–selesai zona toko → Simpan diskon → tetapkan melalui Menu. Kosong tanpa jadwal; window lengkap valid menyalakan/mematikan quote baru otomatis, snapshot lama tetap. Menu/Stok/Rekap digulir tanpa pagination. Varian tanpa bantuan/bintang visual. Kas → tombol pergerakan di atas card Kas atau Mulai tutup kas → Periksa rekap stok online (tautan, bukan blocker) → bereskan blocker nyata → simpan hitungan akhir → hasil/selisih/alasan → Simpan penutupan kas.

## Kasir terpadu — D-76

Kas tertutup → **Mulai bertugas** → isi Uang awal aktual (Rp0 sah) → **Buka kas**. Sebelum sukses, fokus panel awal tanpa katalog disabled atau identitas pesanan. Kas milik petugas lain → serah-terima file06, tanpa sesi/ledger baru. Kas aktif menunjukkan Kas terbuka, penanggung jawab dan **Kelola kas**; tutup tetap di layar Kas dengan hitung akhir/blocker.

Masuk Kasir memilih Favorit bila ada grup favorit aktif, selain itu Semua. Cari hanya di filter aktif. Tetapkan Channel (awal Toko), identitas wajib dan kontrol penyajian berikutnya di kepala pesanan. D-77: Channel dan nilainya sebaris; tanpa judul Default penyajian atau bantuan Untuk item berikutnya. Default selalu Bungkus untuk pesanan baru; Makan di tempat kiri/Bungkus kanan. Ganti default tidak mengubah unit lama, termasuk draft.

Ketuk menu sederhana menambah satu unit draft dengan quote/promo/channel/default saat ketuk; feedback **{nama menu} ditambahkan** / **Urungkan**. Menu berpilihan membuka editor tanpa menambah apa pun sampai **Tambahkan ke pesanan**. Ketuk baris draft untuk catatan/penyajian/pilihan yang sah; qty inline tetap. Item berbeda penyajian/catatan/pilihan/snapshot tidak digabung. Unit confirmed tidak ikut diubah. Bayar nanti/Bayar/Simpan dulu/Simpan pembayaran, cetak setelah commit serta gagal/unknown tetap D-72/file05/08.

## Workspace Pesanan — D-78

Navigasi utama → Aktif dengan kedua filter Semua → cari/filter dalam daftar → ketuk pesanan → tagihan/Bayar dan item/penyajian terpisah. Tablet≥900 menampilkan daftar kiri/detail kanan tanpa auto-select awal. HP membuka detail penuh; Kembali ke pesanan mempertahankan kelompok/filter/search/scroll. Ganti pilihan tidak mereset daftar; input penyajian harus diselesaikan/dikosongkan dahulu. Commit memperbarui kedua area dari state sama; jika selected keluar dari hasil atau selesai, kosongkan pilihan dan beritahu hasil tanpa memilih pengganti. Dari Riwayat kembali tetap ke Riwayat.

Tersimpan → Lanjutkan pesanan → editor Kasir untuk ID/nomor/identitas yang sama → Simpan dulu/Bayar nanti/Bayar sesuai kebutuhan, tanpa duplikasi. Draft tetap tanpa debit. Pembayaran tidak menandai disajikan; penyerahan Bungkus ditandai dari bagian penyajian.
