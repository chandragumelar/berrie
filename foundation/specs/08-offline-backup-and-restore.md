# 08 — Offline, backup and restore

**Pesanan aktif D-78:** workspace Aktif/Tersimpan dan detail bersama mengikuti bagian D-78; default Lunas/tabel/halaman detail tablet lama diganti. Kasir D-76/D-77 dan aturan integritas tetap. [Review](../berrie-site/REVIEW-PESANAN-D78.md).

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md).

## Penyimpanan dan akses

IndexedDB menyimpan katalog, order/unit/batch, ledger, settlement/payment/refund, sesi kas, print job, audit dan outbox. Cache aplikasi menyimpan aset yang diperlukan untuk membuka kasir offline. localStorage tidak menjadi sumber utama transaksi atau tempat PIN/password mentah.

Perubahan bisnis disimpan atomik lokal sebelum jaringan/cetak. Jika storage penuh, transaksi gagal atau izin browser bermasalah, tampilkan gagal menyimpan dan hentikan efek eksternal lanjutan. Jangan memberi status sukses. Meminta persistent storage boleh dilakukan bila platform mendukung, tetapi bukan jaminan data tidak akan dihapus OS/pengguna.

Maksimal satu tab menjadi penulis menggunakan lock antar-tab dan pemeriksaan transaksi database; tab lain hanya baca sampai lock diserahkan. Profil/browser lain dianggap perangkat lain. Sinkronisasi berjalan ketika aplikasi aktif; background sync bukan syarat keandalan.

## PIN dan izin offline

- Login pertama, verifikasi email, aktivasi, reset password/PIN dan pindah perangkat wajib online.
- PIN owner enam digit disimpan sebagai verifier bersalt, bukan plaintext. Baseline KDF PBKDF2-HMAC-SHA256 dengan parameter dikalibrasi untuk perangkat minimum; nilai final harus ditinjau keamanan sebelum rilis. PIN pendek tidak setara password kuat atau enkripsi seluruh database.
- Setelah 5 kesalahan PIN berturut-turut, cooldown 30 detik, meningkat dua kali per rangkaian 5 berikutnya sampai 15 menit. Counter persisten; sukses/reset online mengosongkannya. Tidak menghapus data setelah kesalahan PIN.
- Auto-lock setelah 5 menit tidak aktif, langsung ketika owner memilih Kunci, dan setelah kembali dari background >5 menit. Operasi yang sudah commit tetap ada.
- Server menerbitkan izin bertanda tangan terikat store/device/epoch. Masa berlaku `min(verifikasi_online_terakhir + 7 hari, akhir_trial_atau_periode_bayar + 7 hari)`.
- Perbarui otomatis saat online setelah sesi owner dan entitlement diverifikasi; status koneksi saja tidak memperpanjang izin.
- Peringatkan 48 jam dan 24 jam sebelum berakhir, lalu tampilkan hitung mundur. Jam mundur/inkonsistensi terhadap anchor server meminta verifikasi online untuk transaksi baru. Perangkat yang dikuasai pihak lain tetap di luar jaminan anti-tamper PWA.

Setelah izin atau tenggang habis: tidak boleh order baru, draft tambahan, import/edit katalog, atau aktivitas stok umum. Unit yang sudah tersimpan sebelum batas boleh diproses, dibayar, disajikan, dibatalkan/refund; stok boleh dikoreksi beralasan hanya untuk menyelesaikan unit tersebut. Boleh buka sesi kas khusus penyelesaian/refund jika diperlukan, catat kas pendukung nyata, tutup kas, baca, export, backup dan restore. Bedakan mode terbatas ini dari akun terkunci: pemilik tetap harus mengautentikasi diri.

## Matriks kemampuan

| Aksi | Offline dengan izin valid | Setelah izin/tenggang habis |
| --- | --- | --- |
| Buat/tambah order, katalog, stok | Ya | Tidak; pengecualian koreksi penyelesaian di atas |
| Proses, bayar tunai, sajikan order tersimpan | Ya | Ya untuk unit yang sudah ada |
| Non-tunai | Hanya bila keberhasilan eksternal dapat diverifikasi | Sama, hanya penyelesaian lama |
| Refund, kas pendukung, tutup | Ya | Ya |
| Cetak sistem | Pada kombinasi perangkat yang didukung | Ya |
| Export/backup lokal | Ya | Ya |
| Bagikan struk pelanggan | Tidak termasuk D-71 | Tidak termasuk D-71 |
| Sync, login/reset, pindah/restore perangkat | Memerlukan online | Online diperlukan |

## Outbox dan sync

1. Simpan operation envelope bersama perubahan bisnis. Status awal `pending`.
2. Kirim berurutan saat aplikasi terbuka, setelah mutasi, saat koneksi kembali, tombol Coba lagi, atau tutup kas.
3. Retry gangguan sementara dengan jeda 1, 2, 4, 8 detik sampai maksimal 60 detik plus jitter; percobaan tetap dilanjutkan selama aplikasi aktif. Kegagalan auth butuh refresh/login, bukan loop tak terbatas.
4. Server memvalidasi dan commit seluruh operasi lalu memberi ACK. ACK yang hilang menyebabkan resend; receipt idempoten mengembalikan hasil sama.
5. Tampilkan perubahan pending, jumlah order terdampak, checkpoint terakhir ACK dan konflik. Satu order bisa mempunyai banyak perubahan; jangan menyebut jumlah operasi sebagai jumlah transaksi.
6. Penolakan permanen mengarantina operasi dan dependennya, mempertahankan payload lokal. Jangan menghapus transaksi atau menurunkan saldo untuk menyamakan server secara diam-diam.

Perangkat baca menampilkan checkpoint server. HP owner dapat mengirim administrasi akses dan keputusan persetujuan online, tetapi tidak mengirim mutasi bisnis; pengecualian terbatas ini mengikuti bagian persetujuan di bawah. Tidak memakai last-write-wins untuk uang, stok atau sesi kas.

Berakhirnya izin offline tidak membuang operasi yang sudah tersimpan. Setelah owner verifikasi online, perangkat dengan epoch yang masih aktif boleh mengirim backlog; server memvalidasi rantai operasi dan izin asal, bukan menolak semuanya hanya karena waktu upload melewati expiry. Anomali waktu/izin ditahan untuk review tanpa menghapus payload. Epoch yang sudah dicabut selalu mengikuti karantina pemulihan, walaupun izin lama belum habis.

## Backup

Ada tiga informasi berbeda di layar: **Tersimpan di perangkat**, **Sinkron terakhir ke server**, dan **Backup server terakhir**. Ketiganya tidak saling menggantikan.

Backup server dijadwalkan harian dengan retensi 30 hari, disimpan terenkripsi di object storage terpisah dari database operasional dengan kredensial akses berbeda. Baseline object storage cadangan: Cloudflare R2; biaya, lokasi, akses dan job terjadwal perlu validasi sebelum produksi. Backup mencakup dump data aplikasi, schema, checkpoint, konfigurasi pemulihan yang diperlukan dan manifest objek; file objek disalin terpisah. Backup database saja tidak dianggap mencakup objek storage.

Kegagalan satu jadwal memicu notifikasi operator; status pengguna menunjukkan backup terlambat setelah 26 jam sejak keberhasilan terakhir. Restore drill wajib sebelum pilot, setiap perubahan format, dan minimal bulanan saat komersial. Target pemulihan layanan server ≤4 jam adalah target operasional yang perlu diuji; kehilangan potensial server dari backup harian sampai 24 jam dapat dikurangi replay perangkat utuh.

Backup manual kapan saja menghasilkan file `.berriebackup` terenkripsi dari snapshot konsisten lokal, termasuk data belum sync, sesi terbuka, audit dan operation IDs. Header berisi versi format dan parameter dekripsi, bukan rahasia. Payload berisi store ID, checkpoint tiap epoch, cakupan waktu, schema, checksum dan jumlah entitas. Tidak menyimpan password akun, session token, verifier PIN owner/staf, private key izin server, atau service key.

Receipt deduplikasi serta riwayat operasi yang diperlukan replay ikut dicadangkan. Perangkat tidak langsung membuang operasi setelah ACK: simpan bersama histori transaksi selama data toko dipertahankan, sehingga kehilangan database server dapat dipulihkan dari checkpoint tanpa menciptakan ID atau efek baru.

Baseline enkripsi file: AES-256-GCM dengan nonce acak per file dan KDF PBKDF2-HMAC-SHA256 bersalt acak; password backup minimal 12 karakter, dikonfirmasi dua kali. Parameter KDF disimpan pada header dan harus lolos review keamanan/performa. Integritas harus diverifikasi sebelum import. Password tidak dapat dipulihkan oleh Berrie; UI menjelaskan sebelum unduh.

Backup manual lokal memiliki RPO sesuai waktu file dibuat; server sync memiliki RPO sesuai ACK terakhir. Jangan menjanjikan pemulihan data yang tidak ada pada sumber mana pun.

## Pindah perangkat normal

1. Pada perangkat lama, tutup operasi yang sedang commit, online dan tunggu seluruh outbox ACK; download backup disarankan.
2. Owner login ulang online. Server memulai transfer; perangkat lama melepas hak menulis dan server mencabut epoch lama.
3. Perangkat baru mengunduh snapshot dan checkpoint, memvalidasi jumlah/ledger, kemudian server mengaktifkan epoch baru. Gagal aktivasi dapat dicoba ulang lewat transfer ID yang sama.
4. Buat PIN lokal baru. Pesanan/sesi terbuka dapat dilanjutkan sesuai snapshot. Tidak perlu mengubah histori nomor order; order baru memakai epoch baru.

## Perangkat hilang dan restore file

Login/verifikasi owner online → tampilkan kapan data terakhir tersedia → cabut epoch lama → pilih salinan server atau file. File harus cocok dengan store owner dan lolos password, versi, hash, relasi, alokasi uang dan saldo. Restore melalui staging, bukan menimpa database aktif langsung.

- Jika file checkpoint sama dengan server dan mempunyai tambahan operasi valid pada kelanjutan urutan, tampilkan preview replay. Owner memilihnya secara eksplisit; server deduplikasi ID dan memvalidasi seluruh dependensi sebelum aktivasi.
- Jika file lebih lama, jangan menimpa server yang lebih baru. Gunakan server; file dapat dibuka di area pemulihan untuk membandingkan data.
- Jika file/server bercabang atau bukti urutan tidak lengkap, tahan aktivasi dari cabang itu sampai review rekonsiliasi selesai. Tidak ada merge otomatis ledger.
- Sebelum mengganti lokal yang berisi data, buat backup terenkripsi keadaan lama dan minta pilihan sumber yang jelas. Salah password/file rusak tidak mengubah keadaan aktif.
- Restore tidak memperpanjang trial, membawa kembali hak device lama, atau menyalin PIN perangkat asal.

## Perangkat lama muncul lagi

Perangkat lama offline mungkin masih menulis sampai izin habis. Ketika online, server menolak hak mutasinya tetapi menerima unggahan pemulihan ke karantina, terpisah dari ledger resmi. UI menghentikan transaksi baru dan menunjukkan cara export/simpan bukti.

Owner meninjau konflik dari perangkat aktif: cocokkan operation ID/payment nyata, tandai duplikat dengan bukti atau terima sebagai kejadian terlambat. Kas/stock historis tidak ditimpa; kejadian yang diterima dipetakan ke penyesuaian sesi kini dengan referensi sumber, alasan, preview total dan key deduplikasi. Transaksi terlambat yang belum tercatat boleh diposting satu kali dengan penanda waktu kejadian asal dan waktu rekonsiliasi; laporan menampilkan penyesuaian terlambat tersendiri. Unit sudah dibuat tidak boleh membuat tiket masak baru. Setiap cabang dituntaskan sebelum karantina diarsipkan; tidak dihapus otomatis.

## Keamanan dan pemeliharaan

HTTPS wajib. Server memeriksa ownership store dan epoch untuk setiap mutasi; kebijakan database menolak akses lintas toko. Service key hanya di server. Terapkan CSP, sanitasi output dan pembatasan dependensi untuk mengurangi risiko XSS. Enkripsi storage/backup server wajib dikonfigurasi dan diuji; PIN lokal tidak boleh dipasarkan sebagai enkripsi penuh data browser.

Logout membatalkan sesi akses tetapi mempertahankan data lokal. Jika masih pending, tampilkan checkpoint dan opsi backup; reset/penghapusan lokal harus meminta tindakan sadar setelah backup, bukan efek samping logout. Update aplikasi ditawarkan saat operasi sudah selesai; migrasi gagal mengembalikan keadaan sebelumnya atau membuka mode pemulihan tanpa kehilangan ledger.

## Staf, kebijakan izin dan batas pengawasan

Owner mengelola identitas staf (nama + ID tetap, aktif/nonaktif) dan PIN enam digit masing-masing. Staf tidak menerima password/sesi owner atau akses pengelolaan toko. PIN owner dan staf terpisah; verifier bersalt/KDF/cooldown/auto-lock mengikuti pengamanan dasar di atas, rate limit online juga server-side. Profil disediakan/diubah/reset oleh owner terautentikasi secara online; verifier lokal bukan bukti keamanan perangkat yang sudah dikuasai penyerang. Server menerbitkan scope akses actor/device yang terbatas, bukan mempercayai pergantian `actor_id` pada token owner. Validasi desain autentikasi staf dan operasi offline menjadi bagian review V-05/V-09 sebelum rilis.

Staf hanya melihat katalog yang diperlukan, pesanan, histori operasional yang diperlukan dan aksinya sendiri; tidak melihat laporan keuangan penuh, ekspektasi laci sebelum hitung, export penuh, backup, restore, kebijakan atau kredensial owner. Semua batas juga berlaku pada API. Identitas pelaku dipertahankan bila staf dinonaktifkan. Owner tidak bisa menghapus jejak dengan menghapus profil.

Setiap aktivitas pada matriks berikut dapat diset owner menjadi **Boleh kasir**, **Perlu persetujuan owner**, atau **Hanya owner**. Kebijakan berlaku untuk seluruh staf kasir pada MVP; bukan role builder/per-user exception. Keterangan **Hanya owner** berarti dijalankan owner di kasir aktif; HP tidak berubah menjadi kasir. Perlu persetujuan mengizinkan kasir meminta lalu menjalankan tindakan spesifik sesudah disetujui; bukan membuka mode owner.

| Aktivitas yang dapat diatur | Default |
| --- | --- |
| Refund uang; pembalikan tagihan platform | Perlu persetujuan owner |
| Pembatalan setelah diminta dibuat; koreksi penyajian | Perlu persetujuan owner |
| Diskon order | Perlu persetujuan owner; bila Boleh kasir, owner wajib menetapkan batas rupiah/persen; di atas batas perlu persetujuan |
| Penyelesaian gratis Rp0 | Perlu persetujuan owner, terpisah dari batas diskon |
| Koreksi stok (termasuk koreksi rekap online); stock return | Perlu persetujuan owner |
| Stok masuk | Perlu persetujuan owner |
| Kas keluar; kas masuk nonpenjualan; penyesuaian kas | Perlu persetujuan owner |
| Perubahan harga katalog/channel/draft, termasuk import | Perlu persetujuan owner |
| Mengatur/mengaktifkan/menonaktifkan promo SKU | Hanya owner pada perangkat kasir aktif; penggunaan snapshot promo oleh kasir tidak perlu approval ulang per penjualan |
| Koreksi metode pembayaran | Perlu persetujuan owner |
| Arsip SKU | Perlu persetujuan owner |
| Status jual aktif/nonaktif | Boleh kasir |
| Pencatatan pesanan terlambat | Perlu persetujuan owner |
| Biaya/penyesuaian/pencairan platform | Hanya owner |

Penjualan harga berlaku, pembayaran terverifikasi biasa, proses/penyerahan, batal draft beralasan, buka/tutup dan serah-terima kas sesuai prasyarat boleh kasir. Perubahan setting tarif/metode/akun platform, staf/izin, keamanan/perangkat, pemulihan, export dan laporan lengkap tetap **hanya owner**, tidak dapat didelegasikan melalui matriks. Tarif/harga yang sudah ditetapkan tetap dipakai kasir tanpa persetujuan setiap transaksi.

Kebijakan tersimpan server dengan versi monoton dan audit; owner boleh mengubahnya dari HP online atau perangkat kasir saat online. Perangkat kasir harus menerima perubahan sebelum operasi baru saat tersambung. Offline memakai snapshot kebijakan/daftar staf terakhir yang diotorisasi, terikat permit paling lama tujuh hari/expiry entitlement yang sudah berlaku. Perubahan/revoke di HP tidak menjangkau perangkat offline seketika: owner melihat **Belum diterima perangkat kasir** sampai ACK versi. Setelah snapshot kedaluwarsa, staf tidak mendapat perpanjangan akses otomatis; owner menyelesaikan kebutuhan lama sesuai mode terbatas. Backlog sah di bawah versi/permit asal tidak diam-diam dihapus; anomali dikarantina. Risiko keterlambatan pencabutan harus dijelaskan, bukan klaim anti-tamper.

## Persetujuan lokal dan dari HP owner

MVP mencakup inbox **Persetujuan** pada HP owner yang login online; persetujuan tidak membutuhkan aktivasi HP sebagai perangkat kasir. Daftar diperbarui ketika aplikasi terbuka/di-refresh; polling terukur boleh dipakai. Push notification, WhatsApp, SMS dan jaminan notifikasi saat aplikasi tertutup **tidak termasuk**. Kasir bisa menghubungi owner sendiri; aplikasi tidak mengirim pesan eksternal otomatis.

1. Kasir menyiapkan tindakan dan alasan; validasi lokal sebelum pengajuan. Online: kirim/sinkronkan dependensi objek hingga checkpoint ACK, lalu request immutable dengan ID, actor, store/device/epoch/sesi, objek/revisi, payload/hash, policy version dan ringkasan nominal/efek. Tidak boleh meminta owner menyetujui nominal generik atau data yang belum terikat objek. Request tidak membuat efek bisnis atau tiket.
2. Owner melihat peminta, objek, alasan, nilai sebelum/sesudah, dampak stok/kas, waktu/checkpoint dan batas validitas. Autentikasi owner online harus masih sah; minta autentikasi ulang jika verifikasi terakhir >5 menit untuk keputusan sensitif. **Setujui** atau **Tolak** (alasan penolakan wajib). Server memeriksa ownership, scope dan versi; keputusan idempoten, tidak bisa ganda/diubah diam-diam.
3. Request menunggu kedaluwarsa 30 menit sejak dibuat; persetujuan berlaku 15 menit sejak keputusan untuk memperoleh otorisasi eksekusi, memakai waktu server. Owner boleh mencabut persetujuan yang belum digunakan. Perubahan payload/revisi relevan, policy version, actor yang akan mengeksekusi, sesi atau epoch membuat request lama tidak berlaku. Kasir boleh membatalkan permintaan yang belum digunakan. Histori tetap ada.
4. Kasir online mengambil keputusan lalu memilih **Lanjutkan tindakan**. Server secara atomik memeriksa status/expiry/kebijakan/epoch dan mengikat persetujuan sekali pada operation ID bisnis tetap, menerbitkan receipt eksekusi durable. Klaim dan pencabutan bersaing dalam satu transaksi; satu yang menang. Kasir menyimpan receipt untuk operasi yang sama, memvalidasi ulang keadaan lokal, lalu menjalankan pencatatan bisnis atomik. Untuk uang eksternal, otorisasi diperoleh sebelum perpindahan uang dan konfirmasi hasil dicatat sesudahnya; lihat file 05.
5. Setelah receipt diperoleh, jangan menerbitkan operasi pengganti saat timeout/crash. Periksa status server dan catatan lokal dengan ID sama. Receipt bukan bukti uang berpindah atau commit bisnis. Bila commit gagal sebelum uang berpindah, operasi dapat dilanjutkan dengan ID sama jika revisi tetap cocok; bila state berubah, tutup sebagai tidak terlaksana dan minta persetujuan baru. Bila uang telanjur berpindah, wajib jalur pemeriksaan/pemulihan owner dengan bukti, tanpa refund kedua. Receipt yang belum terselesaikan tidak bisa dialihkan ke transaksi lain atau expired lalu digunakan ulang; audit membedakan **Diotorisasi untuk dijalankan**, **Sudah dicatat**, **Tidak terlaksana**, dan **Perlu pemeriksaan**.
6. Hanya perangkat kasir menjalankan efek bisnis; server ACK mengikuti upload operasi biasa. HP menampilkan **Disetujui · Belum dijalankan** atau **Pencatatan belum dikonfirmasi server**, bukan sukses refund saat owner baru menekan Setujui. Receipt tersimpan memungkinkan pemulihan satu operasi walau masa persetujuan kemudian lewat; tidak memberi izin operasi baru. Pergantian epoch selalu mengikuti karantina pemulihan, tidak menghidupkan approval di perangkat baru.

Tanpa koneksi, request remote boleh disiapkan lokal tetapi berlabel **Belum dikirim**; tidak dihitung disetujui. Setelah tersambung, validasi/sinkronkan ulang lalu kirim satu kali. Jika kasir/HP offline pada langkah yang memerlukan server, tindakan menunggu; penjualan lain yang sah tetap berjalan. Setelah receipt durable untuk satu operasi diperoleh, terputusnya jaringan tidak boleh membuat hasil operasi itu hilang atau dimulai ulang; pemulihan mengikuti poin 5, bukan bypass untuk operasi baru.

Owner yang hadir boleh mengotorisasi tindakan spesifik dengan PIN lokal sesuai snapshot izin valid, termasuk offline. Simpan approver dan bukti otorisasi lokal sekali pakai bersama operasi; jangan membagikan PIN ke staf atau mengubah actor staf menjadi owner. Approval HP yang pending untuk tindakan tersebut harus dibatalkan/dideduplikasi dengan operation ID yang sama saat online; dua jalur tidak boleh menjalankan dua kali. Aksi **Hanya owner** tetap memerlukan sesi owner di perangkat aktif, bukan token approval yang dapat dipakai staf.

Server permission/approval history ikut backup server. Backup lokal menyertakan ID/histori yang sudah diterima dan status checkpoint, tetapi tidak membawa token akses atau izin eksekusi yang bisa dihidupkan ulang. Restore mengambil kebijakan/daftar staf terbaru dari server, menetapkan PIN lokal ulang, dan merekonsiliasi receipt/outbox; persetujuan pending/unused dari epoch lama tidak aktif lagi. Snapshot lokal tidak mengembalikan staf yang sudah dicabut. Retensi receipt/audit mengikuti histori bisnis.

Izin dan jejak audit membantu pengawasan; tidak membuktikan kejadian fisik, kejujuran verifikasi manual, atau transaksi yang tidak pernah dimasukkan. Keamanan server tetap melindungi data lintas toko; perangkat lokal yang telah dikuasai pihak lain berada di luar jaminan pencegahan manipulasi.

Bukti historis otorisasi yang diperlukan memvalidasi replay operasi yang sudah commit tetap dicadangkan bersama operation ID/audit (misalnya receipt non-bearer/hash dan keputusan). Yang dikecualikan dari backup adalah kredensial/izin untuk menjalankan operasi baru. Restore dapat membuktikan operasi lama tanpa mengaktifkan kembali izin eksekusi epoch lama.

D-52: hitungan awal data lama memakai izin koreksi stok, alasan dan audit; tidak menciptakan stok dari nilai default. Pemulihan mempertahankan histori lama, menahan SKU tanpa hitungan sebelum penjualan dan meminta admin mengisi angka stok. Ketersediaan/nonaktif tidak meniadakan hitungan stok.

## Revisi menu D-56

Pembuatan tipe baru hanya owner pada kasir aktif. Harga/varian/topping baru mengikuti aktivitas Harga / impor; arsip mengikuti Arsip menu; perbaikan opening data lama mengikuti Koreksi stok, bukan jalur edit harga untuk menghindari izin. Domain/server memvalidasi tipe/alias/SKU/harga channel/stok dan seluruh batch form sebelum commit. Daftar stok rendah berasal dari data lokal committed; HP owner dapat membaca checkpoint server sesuai izin, tanpa menjalankan stock-in dari HP. Peringatan di aplikasi tidak menjanjikan push atau pengiriman eksternal. Prototipe memori bukan implementasi otorisasi/persistensi operasional.

## Izin dan pemulihan revisi D-57–59

Tabel pengelolaan menu dan konfigurasi racikan/topping baru hanya owner pada kasir aktif dalam revisi ini; jalur izin harga/arsip/status/stok terpisah tetap sesuai matriks. Aktivitas tambahan **Rekap stok online** default **Boleh kasir**, owner dapat menggantinya menjadi Perlu persetujuan owner/Hanya owner. Tindakan rekap berizin tetap dari kasir aktif dengan permit valid, satu penulis, receipt, audit/outbox atomik; HP hanya meninjau/approval. Konfigurasi pengingat rekap hanya owner. Offline boleh dengan izin yang sah; setelah expiry tidak membuat rekap stok umum. Approval tidak memajukan checkpoint atau mengurangi saldo sampai eksekusi berhasil.

Backup/restore mencakup grup stok, pilihan racikan/snapshot, recap/rentang/checkpoint dan operation IDs. Data per-SKU lama tidak diubah menjadi stok bersama lewat tebakan nama/penjumlahan; staging, pemeriksaan fisik eksplisit dan audit sebelum aktivasi. CSV/restore yang tidak mempunyai pemetaan grup sah ditahan dan mempertahankan data asal. Data operasional tetap IndexedDB/API; prototype memori bukan implementasi migrasi atau keamanan.

## Izin revisi — D-61–65

Konfigurasi nama/nilai variabel, kombinasi katalog/tipe dan stok minimal hanya owner di kasir aktif. Isi stok memakai Stok masuk; opname dan koreksi histori rekap memakai Koreksi stok dengan default Perlu persetujuan owner. Rekap rutin tetap Rekap stok online/default Boleh kasir. Koreksi wajib alasan; approval mengikat ID/revisi rekap dan semua jumlah. Permintaan/approval tidak mengubah saldo/checkpoint; eksekusi kasir aktif memvalidasi revision/saldo/izin kembali. Offline/expiry/reader/HP mengikuti batas lama; tidak mengizinkan koreksi stok umum setelah permit habis. Audit mencatat actor dan approver; histori asal/revisi/operation IDs masuk backup/restore.

Uang masuk/keluar selalu aktivitas Kas nonpenjualan, tidak dapat dipanggil sebagai Rutin untuk menghindari approval. Penanggung jawab tetap sampai handover berhasil; autentikasi owner sesaat bukan pergantian staf. Hitung akhir dan serah-terima mengikuti file06, termasuk hitung buta staf dan jejak revisi. Tanpa impor katalog tahap ini (D-65); kode kompatibilitas lama tidak menjadi jalur UI alternatif. Server/storage operasional belum dibangun pada prototipe.

## Izin revisi — D-67

Hapus menu memakai Arsip menu/default Perlu persetujuan owner, hanya eksekusi kasir aktif, konfirmasi payload seluruh grup dan tombstone historis; UI tabel tetap owner. Mengubah Stok awal setelah setup adalah Koreksi stok/default persetujuan owner, bukan harga/menuGrid. Expected balance terikat payload approval; perubahan saldo menahan eksekusi. Stok minimal tetap Pengaturan/hanya owner. Baseline/log actor/waktu/before/after/alasan dan tombstone masuk backup/restore; receipt/retry/HP/reader/expiry/invariants tetap. Menghapus label Diarsipkan tidak menghapus histori atau mengubah matriks izin. Prototipe bukan bukti keamanan/backup nyata.

## Pengelolaan D-68

Pustaka diskon, penetapan diskon dalam tabel, dan CRUD kategori/tipe tetap owner pada kasir aktif; pemeriksaan batas input/actor wajib di domain/server, bukan hanya tombol. Pembuatan/edit/hapus definisi serta konfigurasi memakai Pengaturan; tabel Menu memakai Harga / impor yang dikerjakan owner. Hapus menu tetap Arsip menu, stok tetap Koreksi stok. Semua mutasi lokal/ledger/audit/outbox/receipt harus atomik pada implementasi operasional. Hasil belum diketahui pada dialog menyediakan Periksa hasil operasi yang sama; jangan membuat ulang definisi, hapus atau debit stok sebelum hasilnya diperiksa. Prototipe masih memori dan tidak membuktikan kontrak storage/server ini.


D-69: jadwal definisi diskon tetap aktivitas Pengaturan/owner di kasir aktif. Batas waktu dinilai saat quote tanpa penulis/cron cloud tambahan; snapshot lama tidak berubah. Produksi harus memvalidasi sumber waktu tepercaya dan kasus jam perangkat berubah/offline sebelum menyatakan jadwal operasional akurat. Prototipe menggunakan jam perangkat; bukan bukti keamanan waktu.

## Penemuan pengelolaan staf — D-75 · 31 Oktober 2026

Pengaturan → Staf & izin menyediakan Tambah staf, Ubah nama, Reset PIN, Nonaktifkan dan Aktifkan kembali dengan ID tetap. Tidak ada hard delete staf; nama/ID/riwayat/audit dipertahankan. Peran tetap Owner dan Kasir; kebijakan aktivitas berlaku bersama untuk seluruh staf, tanpa role builder/per-user exception. Owner tidak dikelola sebagai staf atau bisa dinonaktifkan melalui editor ini.

Semua administrasi staf/izin memerlukan owner online, baik kasir aktif pemegang hak tulis maupun HP owner untuk administrasi akses terbatas. Penonaktifan menjelaskan efek pada akses baru, histori tetap dan keterlambatan perangkat offline sebelum konfirmasi. Pemegang laci aktif harus serah-terima dahulu sebelum dinonaktifkan. Staf nonaktif tidak dapat dipilih untuk akses/serah-terima baru; operasi lama yang sudah commit tetap mempunyai receipt/histori. Perubahan versi dari HP berstatus belum diterima kasir sampai ACK; tidak ada klaim pencabutan offline seketika.

Prototipe hanya menyimpan identitas, status dan revisi reset PIN demo di memori. PIN contoh tetap123456, tanpa field PIN asli/verifier/token atau klaim autentikasi aman. Produksi tetap wajib PIN terpisah/KDF/permit/ACK server sesuai aturan di atas. Pengelolaan tidak menyentuh saldo/ledger bisnis. Gagal mempertahankan input, unknown diperiksa dari operation ID sama.

## Favorit dan batas simulasi — D-76

Mengatur favorit/urutannya memakai Pengaturan, hanya owner di kasir aktif sesuai matriks. Tidak menambah izin kasir atau mutasi bisnis dari HP owner. Produksi harus menyimpan konfigurasi grup secara tervalidasi/atomik/berjejak dan menyertakannya dalam sync/backup/restore; belum diimplementasikan pada prototipe. Favorit dan default baru hanya memori sesi React, hilang saat reload. Tambah/ubah/Urungkan draft tidak mengurangi stok; semua batas izin, receipt, gagal/unknown, serah-terima dan commit tetap.

## Navigasi workspace Pesanan — D-78

Kelompok, search, filter dan pemilihan/detail hanya state tampilan. Tidak menghasilkan mutasi, approval, receipt atau efek uang/stok/cetak. Aksi detail bersama tablet/HP tetap melewati pemeriksaan izin/actor/approver dan operasi existing. Guard input belum disimpan, gagal mempertahankan input dan unknown memeriksa ID operasi yang sama tetap berlaku; unknown mengunci perpindahan terkait sampai hasil diketahui. Pilihan qty penyajian harus diselesaikan atau dikosongkan sebelum berpindah. Prototipe tetap memori sesi, tanpa klaim penyimpanan IndexedDB/server.
