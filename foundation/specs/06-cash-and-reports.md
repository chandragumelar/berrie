# 06 — Cash and reports

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md).

**Acuan visual D-74 · 13 Oktober 2026:** area Kas maksimum960 px; pada lebar≥900 px breakdown maksimum640 px di kiri, Selesai bertugas di kanan dengan Ganti petugas di atas Tutup toko. Aksi pergerakan, blocker dan histori mengikuti kolom angka. Di bawah900 px seluruhnya satu kolom maksimum640 px rata kiri. Nominal rata kanan pada grid label–nilai yang sama; satu saldo tercatat setelah divider. Pada HP mengikuti lebar tersedia. Definisi sumber angka, hitung buta, izin, ledger dan blocker di bawah tetap.

## Sesi kas

Satu toko mempunyai maksimal satu sesi kas terbuka pada perangkat aktif, dengan satu penanggung jawab laci pada satu waktu dan segmen serah-terima di dalam sesi. Sesi memiliki ID, nomor, waktu buka, modal, waktu tutup, hitungan fisik, ekspektasi, selisih dan alasan. Bisa melewati tengah malam, tetapi tidak otomatis ditutup atau dibuka ulang. Tanggal bisnis sesi adalah tanggal lokal saat dibuka; zona waktunya disimpan sebagai snapshot.

Order wajib terkait sesi terbuka. Order dan kewajiban refund harus dibereskan sebelum sesi itu ditutup. Refund atas penjualan sesi lama dicatat pada sesi refund sekarang dan tetap mereferensikan payment asal.

## Ledger kas

```text
kas_seharusnya = modal_awal
               + penerimaan_penjualan_tunai
               - refund_tunai
               + kas_masuk_nonpenjualan
               - kas_keluar_nonpenjualan
               + penyesuaian_kas_beralasan
selisih = hitung_fisik - kas_seharusnya
```

Kas masuk/keluar di luar penjualan wajib nominal >0, kategori sederhana dan keterangan. Contoh kategori: tambah modal, pengambilan owner, belanja operasional, lainnya. Ini bukan modul pengeluaran akuntansi atau laba. Kas keluar/refund tunai tidak boleh membuat ekspektasi negatif; jika uang fisik berbeda, telusuri dan catat kejadian nyata terlebih dahulu.

Koreksi metode sebelum tutup menghasilkan delta ledger atas klasifikasi tunai/non-tunai dengan referensi payment. Koreksi catatan sesi tertutup dicatat sebagai penyesuaian sekarang, dengan dua kaki klasifikasi metode yang berjumlah nol; kas hanya berubah jika kaki tunai ada. Angka penjualan bruto/neto tidak berubah. Penyesuaian administratif ini dipisahkan dari kas masuk/keluar fisik dan wajib alasan serta referensi bukti.

Saldo ekspektasi dapat berbeda dari fisik; aplikasi tidak mengklaim mengetahui isi laci. Selisih saat tutup disimpan, bukan digunakan untuk memaksa ekspektasi menjadi sama.

## Penutupan

Blokir tutup final bila ada order belum bayar yang tidak batal penuh, unit draft/processed, atau kewajiban refund. Pesanan lunas yang belum disajikan tetap blocker. Draft yang hanya disimpan harus diselesaikan atau dibatalkan dengan alasan.

Print job belum dikonfirmasi dan perubahan belum sync merupakan peringatan, bukan blocker tambahan. Hitungan fisik wajib termasuk Rp0. Selisih bukan nol wajib alasan. Simpan snapshot angka, batas urutan event dan daftar blocker kosong secara atomik. Tidak ada transaksi baru menyelinap di antara validasi dan commit penutupan.

Sesi tertutup immutable. Koreksi setelahnya dicatat pada sesi baru dengan referensi, bukan membuka sesi lama. Ringkasan sesi dapat dicetak dan diexport ketika offline.

## Definisi laporan

Laporan memakai **waktu settlement** untuk penjualan dan **waktu refund** untuk refund. Waktu order dibuat/proses bukan pengakuan penjualan. Sediakan rentang tanggal kalender toko dan filter sesi; keduanya diberi label berbeda. Rentang tanggal berupa awal inklusif, akhir eksklusif. Angka tidak dicampur antara tanggal dan sesi.

| Metrik | Definisi |
| --- | --- |
| Penjualan bruto | Jumlah harga menu+topping unit saat settlement, sebelum diskon, pajak dan layanan |
| Diskon | Jumlah promo SKU + diskon order pada settlement dalam periode; rincian kedua sumber terpisah |
| Penjualan setelah diskon | Bruto − diskon; belum dikurangi refund |
| Pajak / biaya layanan | Komponen settlement dalam periode, ditampilkan terpisah |
| Total tagihan diselesaikan | Penjualan setelah diskon + pajak + layanan |
| Refund uang | Semua uang refund dicatat dalam periode, termasuk asal hari lain |
| Penjualan setelah refund | Penjualan setelah diskon − komponen dasar setelah diskon dari refund periode |
| Pajak / layanan setelah refund | Komponen settlement − komponen refund periode masing-masing |
| Penerimaan neto | Payment periode − refund uang periode; tidak termasuk modal/kas nonpenjualan |
| Transaksi berbayar | Banyak payment berhasil bernilai >0; refund tidak mengurangi jumlah ini |
| Tagihan gratis | Jumlah settlement Rp0; ditampilkan terpisah |
| Rata-rata tagihan berbayar | Total payment ÷ transaksi berbayar; jika nol tampilkan Rp0 |
| Pembatalan | Jumlah order/unit dibatalkan; terpisah dari refund uang |

Penerimaan neto/penjualan setelah refund bisa negatif ketika refund hari ini lebih besar daripada penjualan hari ini. Jangan mengubahnya menjadi nol. Dashboard menampilkan label dasar penjualan dengan jelas agar pajak/layanan tidak dianggap omzet makanan/minuman.

Rincian metode menampilkan penerimaan, refund, neto dan penyesuaian klasifikasi secara terpisah. QRIS/transfer/e-wallet adalah catatan penerimaan, bukan saldo rekening atau laporan settlement penyedia pembayaran. Tidak menghitung MDR/biaya bank otomatis. Pencairan platform dicocokkan manual secara terpisah sesuai bagian di bawah.

Item terlaris: urut qty unit pada settlement dikurangi qty refund yang dicatat pada periode, dengan kolom terjual, direfund, neto dan nilai dasar neto. Pesanan draft/processed belum bayar tidak termasuk penjualan, walaupun stok sudah terpakai. Unit gratis ditampilkan tetapi diberi kolom gratis terpisah. Topping disajikan sebagai rincian, bukan stok bahan.

Stok menipis adalah snapshot saldo terkini seluruh SKU quantity wajib. SKU aktif stok 0 tampil di filter Habis Kasir; nonaktif tetap di Menu & Stok. Saldo stok tidak diturunkan dari laporan penjualan, melainkan ledger Minta dibuat dan perubahan stok.

## Contoh rekonsiliasi

Modal Rp100.000; payment tunai Rp250.000; payment QRIS Rp150.000; refund tunai Rp30.000 dari penjualan kemarin; kas masuk Rp20.000; kas keluar Rp40.000. Kas seharusnya = Rp300.000. Hitung fisik Rp295.000 → selisih −Rp5.000, alasan wajib. Penerimaan neto semua metode = Rp370.000; angka tersebut berbeda dari isi laci karena modal/kas nonpenjualan dan metode bayar.

## Cakupan data dan export

Perangkat aktif menghitung dari lokal, termasuk perubahan belum sync. Perangkat pembaca menggunakan data server dan selalu menampilkan waktu sinkron terakhir serta peringatan mungkin belum lengkap. Jangan menggabungkan dua sumber menjadi dua kali transaksi.

Export CSV mencakup katalog, saldo/ledger stok, order/unit, payment, refund, sesi/ledger kas dan ringkasan laporan. Tanggal, zona, mata uang, ID asal dan definisi kolom harus jelas. Export laporan mengikuti filter aktif; export data penuh memilih cakupan secara eksplisit. CSV dapat dibaca manusia dan bukan sarana restore.

UX: Buka kas adalah langkah sebelum melayani dengan Uang awal aktual. Kas terbuka tetap terlihat; Tutup kas tersedia langsung saat selesai bertugas. Daftar hambatan menyebut pekerjaan dan Buka pesanan; tanpa penyelesaian/refund otomatis; serah-terima penanggung jawab laci mengikuti bagian berikut.

## Penanggung jawab laci dan serah-terima

Owner yang bekerja sendiri tidak perlu setup staf atau serah-terima tambahan. Bila penanggung jawab berganti, gunakan **Serah-terima kas**; ganti identitas operator yang mengambil alih laci wajib melalui alur ini. Autentikasi owner untuk satu persetujuan tidak mengganti penanggung jawab laci.

1. Selesaikan commit yang sedang berjalan, simpan draft dan hentikan sementara mutasi kas selama penghitungan. Pesanan aktif tetap dapat diteruskan setelah serah-terima; blocker tutup toko tidak diberlakukan untuk pergantian staf.
2. Petugas lama mengisi hitungan fisik tanpa melihat ekspektasi lebih dahulu; sesudah disimpan, tampilkan ekspektasi dan selisih, alasan wajib bila berbeda. Petugas baru autentikasi dan mengonfirmasi jumlah yang benar-benar diterima. Bila jumlah yang diakui berbeda, hitung ulang dan simpan revisi berjejak, jangan mengaktifkan dua penanggung jawab.
3. Commit serah-terima atomik membekukan batas urutan ledger, actor keluar/masuk, hitungan/revisi, alasan dan waktu. Kas diterima menjadi baseline fisik segmen baru; ekspektasi ledger sesi toko **tidak direset**. Selisih segmen = fisik akhir − (fisik awal segmen + perubahan kas sejak batas awal); jumlah selisih segmen harus menjelaskan selisih sesi, bukan menghilangkan selisih lama atau menghitungnya dua kali.
4. Tidak membuat kas masuk/keluar karena ganti staf. Perpindahan uang ke/dari owner yang nyata dicatat sebagai event terpisah sesuai izin. Tutup toko tetap memakai seluruh blocker file 06; tutup segmen terakhir bersama tutup sesi, bukan membuat hitungan ganda.

Staf tidak melihat ekspektasi laci berjalan/angka turunan yang membocorkannya melalui laporan atau endpoint sebelum hitungan disimpan; akses laporan penuh tetap owner. Pembatasan ini mengurangi pengarahan hitungan, bukan menjamin staf tidak bisa memperkirakan saldo. Revisi hitungan menyimpan nilai pertama dan semua revisi. Bila petugas lama tidak hadir/lupa PIN, owner dapat mengambil alih dengan alasan dan hitungan fisik, bertanda **Serah-terima tanpa petugas lama**; tidak memalsukan persetujuan staf. Bukan bukti bahwa staf tertentu melakukan fraud.

## Laporan pengawasan

Owner mendapatkan tabel kejadian perlu diperiksa: actor, approver bila ada, aksi, objek, nilai sebelum/sesudah, alasan, waktu kejadian/pencatatan, checkpoint dan status sinkron. Ringkas diskon, gratis, batal setelah dibuat, refund, perubahan harga/metode, koreksi/return stok, kas keluar, pencatatan terlambat, serah-terima berselisih dan perubahan izin. Filter per actor/sesi/channel; tidak memberi vonis fraud otomatis. Laporan HP hanya data server dan menunjukkan keterlambatan; gangguan sinkron bukan bukti kecurangan. Pemeriksaan stok fisik/rekening merchant/tiket tetap diperlukan.

## Pencocokan dana platform manual

Penjualan diakui saat settlement, termasuk PlatformReceivable; pencairan bukan penjualan kedua. Metrik Payment/penerimaan neto/transaksi berbayar lama tetap hanya penerimaan langsung. Tambahkan **Order ditagihkan ke platform**, **Tagihan platform bruto**, **Pembalikan tagihan**, **Biaya/potongan platform**, **Penyesuaian platform**, **Dana cair terverifikasi**, dan **Sisa belum cocok**. Pembalikan unit mengurangi metrik penjualan/item/pajak/layanan pada periode pembalikan, ditampilkan terpisah dari refund uang toko. Subsidi platform bukan diskon toko atau penerimaan tambahan di luar G. Perbandingan channel memakai dasar penjualan sama, bukan membandingkan harga bruto dengan dana cair.

Untuk setiap akun outlet, gunakan ledger saldo dengan rupiah integer:

`saldo_platform = tagihan_G − pembalikan_unit − biaya_platform + penyesuaian_bertanda − pencairan_teralokasi`

Biaya positif, penyesuaian bisa kredit/debit dengan kategori, alasan dan referensi bukti. Nilai negatif berarti kewajiban/selisih ke platform dan tidak dijepit menjadi nol. Data biaya belum diketahui diberi **Belum diperiksa**, bukan asumsi biaya nol yang terkonfirmasi. Estimasi opsional diberi label dan tidak diposting sebagai biaya aktual. Ini pencocokan operasional, bukan laporan laba/akuntansi penuh.

Owner mencatat batch pencairan: channel, akun outlet, referensi eksternal unik, tanggal dana diterima, rekening tujuan berupa label nonrahasia, nilai aktual, daftar order dan alokasi rupiah. Satu batch bisa memuat banyak order; satu order dapat cair bertahap. Total alokasi harus sama dengan nominal batch; jumlah yang belum teridentifikasi ditaruh sebagai dana belum teralokasi, tidak dipaksa ke order. Referensi batch + akun outlet unik, retry tidak menggandakan dana. Pencairan/biaya/revisi tersimpan di perangkat kasir aktif sesuai izin; HP hanya meninjau/menyetujui, bukan menulis ledger.

Pencairan menambah catatan dana bank platform, **tidak** menambah laci, Payment order, atau penjualan. Koreksi memakai event pembalik dan pengganti berreferensi, tanpa mengubah catatan lama. Dua kali alokasi melebihi hak bersih order diblokir/ditandai selisih untuk pemeriksaan eksplisit, bukan diterima sebagai pencairan normal. Saldo belum cair atau biaya belum diperiksa tidak menjadi blocker tutup kas; refund pelanggan/pekerjaan operasional yang belum selesai tetap blocker sebagaimana file 05. Export menambah staf/izin/persetujuan, serah-terima, channel/tagihan/pembalikan/biaya/penyesuaian/pencairan/alokasi tanpa verifier/token/rahasia.

Metrik penjualan/item neto pada tabel dasar diperluas: kurangi komponen pembalikan unit platform pada periode pembalikan, selain refund uang langsung, dengan kolom asal terpisah. Settlement platform Rp0 mengikuti tagihan gratis tanpa PlatformReceivable/Payment; biaya platform bila ada dicatat sebagai penyesuaian akun platform berbukti, bukan payment Rp0.

## Kontrol sesi di Kasir — D-47

Satu kontrol berbentuk toggle disertai teks Kas terbuka/Kas tertutup membuka workflow melalui button berlabel Buka kas/Tutup kas. Posisi/status hanya mengikuti sesi yang committed. Membuka form, batal, gagal, blocker atau hasil belum diketahui tidak mengganti status; tutup tidak pernah satu klik langsung. Uang awal/hitungan fisik/alasan selisih, blocker, izin dan commit atomik tetap seluruh aturan file ini. Pergantian penanggung jawab memakai Serah-terima kas, bukan tutup/buka untuk mereset ledger. Revisi tampilan belum diterapkan pada UI.

## Rekap pemakaian online — D-59

Rekap hanya ledger stok, audit dan checkpoint periode; tidak membuat penjualan, pembayaran, refund, tagihan/pencairan platform atau kas. Laporan menjelaskan cakupan transaksi yang dicatat di Berrie; rekap bukan omzet online. Histori pemakaian menampilkan sumber Online gabungan, rentang dan waktu pencatatan, actor serta qty per menu. Koreksi fisik tidak diatribusikan otomatis sebagai penjualan online. Pengingat rekap pada tutup kas bukan blocker tambahan dan tidak mengeksekusi rekap/penyesuaian otomatis. Batas stok belum mencakup online setelah checkpoint tetap terlihat.

## Kas selama berjualan dan selesai bertugas — D-64

**Uang seharusnya di laci** menjelaskan saldo dari Uang awal + Penjualan tunai − Refund tunai + Uang masuk − Uang keluar +/− Koreksi metode. Hilangkan label tunggal Perubahan sejak buka. Angka pembanding bukan hasil hitung fisik; aturan hitung buta/akses staf tetap. **Pergerakan uang laci** memiliki tindakan **+ Uang masuk** dan **− Uang keluar** untuk top up/modal, belanja atau pengambilan nyata; keperluan/keterangan wajib. Penjualan/refund tetap berasal dari transaksi, tidak dicatat dua kali sebagai kas nonpenjualan. Histori uang tersedia terpisah dari penanggung jawab.

Panel **Selesai bertugas** menunjukkan dua urutan berdasarkan keadaan, bukan dua kewajiban yang selalu dijalankan:

1. Petugas sama dari buka hingga tutup (staf maupun owner): bereskan semua blocker → simpan hitungan uang akhir → lihat selisih/jelaskan bila berbeda → **Simpan penutupan kas**. Tidak perlu serah-terima fiktif.
2. Ganti petugas saat toko tetap buka: petugas lama simpan hitungan buta → petugas baru autentikasi dan mengonfirmasi uang diterima → **Selesaikan serah-terima kas** → lanjut melayani dalam sesi toko yang sama. Petugas terakhir mengikuti alur tutup toko kemudian; tidak menutup sesi untuk pergantian shift.

Langkah berikutnya baru tersedia sesudah hitungan yang sesuai disimpan. Hitungan berjejak memuat tujuan handover/close; hitungan serah-terima tidak dapat dipakai untuk menutup sesi atau sebaliknya. Mutasi kas/pesanan ditahan selama hitungan tersimpan belum diselesaikan. Batal dialog melepaskan penghentian layanan tanpa menghapus nilai pertama/revisi/audit; melayani lagi memerlukan hitungan baru sebelum selesai. Perubahan input hitungan memerlukan simpan revisi. Hitungan sesi tertutup ditolak. Seluruh blocker, alasan selisih, pengambilalihan owner, konfirmasi jumlah diterima dan ledger D-32/file07 tetap; tidak membuat transaksi uang karena perpindahan tanggung jawab.

## Penjelasan uang laci — D-68

Card Uang seharusnya di laci memuat **Dibuka [tanggal, jam zona toko] · [nama actor pembuka]**, bersumber dari commit pembukaan, terpisah dari penanggung jawab laci saat ini. Serah-terima tidak menulis ulang identitas pembuka. Jika metadata lama tidak ada, tampilkan belum tercatat, tanpa mengarang waktu/pelaku.

Breakdown memakai tanda +/− dan penjelasan singkat: Uang awal = uang fisik saat buka; Penjualan tunai = otomatis dari payment tunai setelah kembalian; Refund tunai = otomatis dari pengembalian yang dicatat; Uang masuk = nonpenjualan, misalnya top up; Uang keluar = nonrefund, misalnya belanja/pengambilan owner. Koreksi metode = penyesuaian klasifikasi tunai/nontunai, bukan perpindahan fisik. Bagian Pergerakan uang laci menegaskan pembayaran/refund jangan dicatat ulang. Angka total adalah hasil catatan, bukan klaim isi fisik/omzet. Hitung buta staf, rumus, blocker dan sesi immutable tetap.


## Kas ringkas — D-69

D-69 mendahului copy D-64/D-68 yang berbeda: tanpa Sesi kas berjalan, duplikasi penanggung jawab dan nominal besar di atas rincian. Card **Kas** tetap memuat metadata pembukaan asli, kemudian Uang awal di laci, + Pemasukan tunai, − Pengeluaran refund tunai, + Uang masuk lainnya, − Uang keluar, koreksi bila ada, serta satu **Saldo kas tercatat** pada akhir rincian. Penjelasan per baris dihapus; saldo tercatat bukan klaim uang fisik. Tombol + Uang masuk/− Uang keluar di atas card. Form pergerakan tetap keperluan/alasan wajib dan khusus nonpenjualan/nonrefund.

Selesai bertugas menampilkan judul dan tombol tiap jalur; langkah handover muncul di dialog, tanpa pills/step ketiga/bantuan panjang. Jalur tutup cukup tombol Mulai tutup kas. Dialog tutup dimulai **1 · Periksa rekap stok online** dengan tombol ke Menu & Stok → Rekap online; bukan blocker baru. Pesanan/refund dan aksi penyelesaiannya tetap diperlihatkan serta menahan hitungan/final bila belum beres. **2 · Hitung uang akhir di laci**, input berlabel **Uang akhir di laci (Rp)**; label dipertahankan untuk menghindari input tanpa konteks. Lalu hasil/selisih/alasan dan Simpan penutupan kas. Rumus/izin/hitung buta/serah-terima/sesi immutable tetap. Pengingat header berlabel **Rekap channel online** menuju rekap stok yang sama.

Feedback visual lanjutan D-69: sebelum pembukaan pertama hanya satu panel Kas belum dibuka + CTA; tanpa rincian Rp0/finish/tabel kosong. Kas aktif satu card fullwidth, finish dua jalur berdampingan dan riwayat disclosure tertutup berjumlah. Setelah handover, tampilkan pemegang laci kini hanya jika berbeda dari pembuka, tanpa duplikasi metadata. Sesi tertutup sungguhan tetap memperlihatkan snapshot hasil, berbeda dari belum pernah dibuka.

## Prioritas laporan harian — D-74

Owner memulai dari **Penjualan** (penjualan setelah diskon, sebelum refund/pembalikan dan di luar pajak/layanan), **Uang diterima** (penerimaan langsung neto), jumlah transaksi berbayar dan rata-rata belanja per transaksi berbayar. Refund tidak dijadikan judul utama. Bila ada pengembalian periode ini, tunjukkan nominal, dampak ke Uang diterima dan bahwa Penjualan utama belum dikurangi pengembalian. Penjualan setelah refund/pajak/layanan neto tetap tersedia dalam rincian perhitungan. Gratis dan kolom pengembalian tampil saat relevan; tidak menambah metrik laba/HPP atau integrasi online.

Toolbar memilih sesi yang tersedia atau tanggal kalender toko; rentang awal inklusif/akhir eksklusif tetap. Telusuri penjualan/penerimaan/metode menuju daftar kejadian pembentuk angka lalu pesanan asal; kembali mempertahankan konteks periode/tab/filter. Refund/pembalikan memakai waktu dan sesi kejadiannya serta metode pengembalian, bukan tanggal/metode payment asal. Menu bisa diurut nilai dasar neto atau jumlah neto, memakai snapshot termasuk SKU lama yang sudah diarsipkan; gratis terpisah saat ada. Dana platform merupakan pencocokan seluruh tagihan tersedia dan diberi label cakupan terpisah dari periode pendapatan.

Prototipe memori memakai settlement dan audit refund ber-ID unit; histori tanpa metadata lengkap ditandai belum lengkap, ekspor laporan ditahan. Penyesuaian klasifikasi metode/snapshot audit sebelum-sesudah, seluruh filter sesi historis dan laporan server nyata tetap kewajiban produksi T-14, bukan kelulusan dari UI. CSV laporan mengikuti kejadian/filter aktif; ekspor data contoh penuh di Pengaturan tetap terpisah. Perangkat HP owner hanya contoh server/read-only dan tidak menjalankan ledger platform.

## Penyederhanaan seluruh laporan — D-75 · 31 Oktober 2026

Ringkasan tetap dua angka utama Penjualan (setelah diskon, sebelum pengembalian, di luar pajak/layanan) dan Uang diterima (Payment termasuk pajak/layanan dikurangi refund uang periode). Jumlah transaksi/rata-rata hanya Payment >0, sebelum refund; gratis terpisah. Waktu settlement dan waktu refund masing-masing menentukan periode; pesanan dibuat hari lain diakui saat dibayar. Modal/pergerakan kas dan pencairan platform bukan Payment atau penjualan tambahan.

Menu terjual didahulukan sebelum rincian perhitungan/metode. Urut nilai atau qty tetap memakai neto refund/pembalikan periode sesuai definisi lama; kolom **Nilai setelah pengembalian** eksplisit bila ada, termasuk negatif/asal hari lain. Baris per SKU/pilihan menautkan pesanan yang memuat SKU itu; nominal penelusuran adalah seluruh pesanan, bukan jumlah SKU terpilih. Diskon, refund/pembalikan, gratis dan catatan perubahan ditampilkan sesuai kejadian, tanpa klaim sebab/insight generik/laba.

Tab: Ringkasan, Telusuri angka, Kejadian penting, Dana platform. Kejadian penting memisahkan perubahan/pengecualian dari simpan/proses/penyajian/cetak rutin; filter petugas/channel hanya berlaku pada daftar kejadian. Sesi memakai sesi berjalan atau sesi terakhir bila tertutup; tanggal kalender awal inklusif/akhir eksklusif dan zona terlihat. Ekspor mencakup seluruh periode, bukan filter detail. Dana platform jelas lintas periode, pencocokan semua tagihan yang tersedia. Per hari berupa disclosure tabel dari kejadian yang sama; hari tanpa catatan bukan bukti toko tutup/data lengkap. Perbandingan periode ditunda sampai cakupan dua periode bisa dibuktikan sebanding; memori demo belum memadai. Snapshot koreksi metode/penyesuaian historis/server belum lengkap dan tidak diklaim selesai.

## Pintu masuk bertugas — D-76

Kasir tanpa sesi terbuka memusatkan panel **Mulai bertugas**, input **Uang awal**, tombol **Buka kas**. Tidak ada sakelar kas atau katalog/identitas disabled yang mendominasi. Sukses buka menampilkan workspace. Sesi aktif menampilkan **Kas terbuka · {penanggung jawab}** dan **Kelola kas** menuju Kas, bukan menutup langsung. Petugas berbeda harus menyelesaikan serah-terima yang sama seperti aturan di atas sebelum melayani. Semua saldo, hitung buta, blocker, alasan selisih dan ledger tetap; alur baru tidak membuka sesi pengganti.
