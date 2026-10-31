# 10 — Acceptance criteria

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md).

Status seluruh skenario saat penyusunan: **belum dijalankan**. Dokumen ini rencana verifikasi, bukan laporan aplikasi lulus. Catat versi aplikasi, device/OS/browser/printer, data awal, langkah, hasil aktual dan bukti untuk setiap eksekusi.

## Data uji bersama

Toko Asia/Jakarta; menu A quantity Rp10.000 stok 1000; menu B quantity Rp20.000 stok 10; topping C Rp5.000 tersedia; pajak/layanan awal mati; modal Rp100.000. Reset fixture antar skenario kecuali dinyatakan berurutan. Tambahkan toko kedua untuk uji isolasi.

## Akun, setup dan katalog

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-01 | Aktivasi online, satu menu, transaksi pertama | <5 menit setelah verifikasi email sampai lunas/diproses/diserahkan pada simulasi UT-01; termasuk aktivasi/PIN/buka kas, tanpa QRIS/printer atau setup opsional wajib |
| AC-02 | Cache siap, putus jaringan, restart aplikasi dan buka PIN | Katalog/riwayat tersedia; tunai berfungsi; password tidak diperlukan offline |
| AC-03 | Salah PIN 5 kali, reload; lalu reset online | Cooldown tetap berlaku; reset tidak menghapus transaksi |
| AC-04 | [Ditunda D-65] Import SKU baru dan update harga existing | Preview benar, ID tetap, stok existing tidak ditimpa |
| AC-05 | [Ditunda D-65] CSV duplikat/negatif/formula/header salah atau commit gagal | Error baris jelas, tidak ada import sebagian, tidak mengeksekusi formula |
| AC-06 | Ganti harga/tarif setelah draft/order dibayar | Snapshot lama tetap; harga draft hanya berubah melalui tindakan eksplisit |
| AC-07 | Varian/topping berbeda, qty 2 | Harga topping dikali qty, catatan berbeda tetap baris terpisah |

## Pesanan, stok dan dapur

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-08 | Simpan dulu B qty 2 | Stok tetap 10; belum ada batch/tiket |
| AC-09 | Proses B qty 2, klik ganda/retry/reload | Satu batch, satu debit 2, stok 8 |
| AC-10 | Proses, bayar, cetak ulang, sync berulang | Stok tetap 8; tidak ada debit tambahan |
| AC-11 | Bayar B qty 2 | Membuka/menutup form tidak memberi efek. Simpan pembayaran berhasil sekaligus settlement dan batch: Lunas/Sudah diminta dibuat, stok 8, belum disajikan; tidak perlu tekan pembuatan lagi |
| AC-12 | Saldo 1, form Bayar A terbuka, B mengonfirmasi SKU sama sebelum commit A | Commit A ditolak seluruhnya tanpa settlement/debit parsial; input bertahan. Jika uang eksternal sudah diterima jangan minta bayar ulang. Paid draft data lama tetap butuh validasi/pemulihan stok atau batal/refund |
| AC-13 | Beberapa baris SKU sama total melebihi saldo | Seluruh batch gagal atomik; tidak ada tiket/debit parsial |
| AC-14 | Batch 1 disajikan, tambah B qty 1, proses | Order aktif lagi, batch 2 TAMBAHAN hanya 1 unit; stok turun 1 |
| AC-15 | Bayar ketika batch tambahan belum disajikan | Lunas tetapi tetap aktif; tutup kas terhalang |
| AC-16 | Tambah setelah lunas | Order baru dengan nomor/payment terpisah; no. antrean/nama bisa disalin lewat Pesanan baru |
| AC-17 | Sajikan sebagian qty 3 | Hanya unit dipilih selesai; unit tersisa tetap pekerjaan aktif |
| AC-18 | Hapus draft, batal processed belum dibuat, batal sudah dibuat | Draft tanpa stock return; layak jual kembali sekali; sudah dibuat default tidak kembali |
| AC-19 | Batal unit lalu refund dengan opsi return | Tidak ada stock return kedua untuk unit yang sama |
| AC-20 | Dua tab menekan proses/bayar bersamaan | Satu penulis/commit sah; tidak ada oversell/payment ganda |
| AC-21 | Arsip SKU saat draft aktif; percobaan mode manual | Arsip ditolak sampai draft selesai; mode manual selalu ditolak D-52; histori debit lama tetap dapat ditelusuri |

## Pembayaran dan perhitungan

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-22 | Tagihan 27.500, tunai 50.000 | Kembalian 22.500; penerimaan kas 27.500 |
| AC-23 | QRIS belum terverifikasi, lalu terverifikasi manual | Tidak bisa lunas pada langkah pertama; satu payment pada langkah kedua |
| AC-24 | Contoh alokasi A/B pada file 07 | Total 33.350; refund A 11.117 dan B 22.233; total komponen persis |
| AC-25 | Refund parsial lalu sisa, ganti tarif sebelum refund | Nilai asal digunakan; tidak melampaui payment; unit tak dapat direfund dua kali |
| AC-26 | Refund QRIS asal melalui tunai hari berikutnya | Kas sesi kini turun; payment/laporan tutup lama tidak ditulis ulang |
| AC-27 | Paid draft data lama/pemulihan dibatalkan | Tanpa stock return; refund due muncul dan menghalangi tutup sampai terpenuhi |
| AC-28 | Diskon 100%, total 0 | Settlement gratis, tanpa payment/kas fiktif; commit ikut konfirmasi draft sekali, lalu tetap perlu sajikan/serahkan |
| AC-29 | Koreksi metode sebelum/selepas tutup | Audit dan delta klasifikasi tercatat; sesi tertutup immutable; bukan penjualan baru |
| AC-30 | Crash setelah commit payment/refund sebelum UI sukses | Reload menunjukkan event tersimpan; retry tidak meminta uang dikirim ulang |

Uji berbasis properti untuk perhitungan: Σalokasi=total, semua komponen nonnegatif, refund bertahap penuh=payment, urutan retry tidak mengubah hasil. Cakup batas pembulatan setengah rupiah, diskon nominal maksimum, tarif 0, dan qty maksimum.

## Kas, laporan dan export

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-31 | Contoh file 06 | Ekspektasi 300.000, fisik 295.000, selisih −5.000; alasan wajib |
| AC-32 | Coba tutup dengan draft, unpaid served, paid unserved, refund due | Setiap kasus diblokir dengan tautan penyelesaian yang benar |
| AC-33 | Tutup offline, semua order selesai | Snapshot tersimpan, tidak dibuka ulang; peringatan sync/backup muncul |
| AC-34 | Sesi melewati tengah malam | Tetap satu sesi; laporan kalender dan sesi dibedakan, tidak menggandakan event |
| AC-35 | Refund hari ini untuk penjualan kemarin, tanpa penjualan baru | Neto hari ini boleh negatif; histori payment kemarin tetap |
| AC-36 | Export seluruh kategori data dan laporan terfilter | Nilai/ID cocok sumber, UTF-8, aman dari formula injection, jelas cakupan |

## Offline, sync, keamanan dan pemulihan

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-37 | Putus jaringan sebelum kirim, saat commit server, setelah ACK hilang | Outbox retry; satu efek bisnis lokal/server; tidak ada kehilangan |
| AC-38 | Browser ditutup saat pending, buka kembali online | Pending dilanjutkan, tidak mengklaim sync selama aplikasi tertutup |
| AC-39 | Disk penuh/abort transaksi lokal saat proses/bayar | Seluruh operasi rollback; tidak ada tiket/sukses palsu |
| AC-40 | Izin tujuh hari habis atau tenggang habis | Order/tambahan baru ditolak; unit lama/refund/tutup/export tetap bisa selesai |
| AC-41 | Jam perangkat dimundurkan | Tidak memperpanjang izin secara diam-diam; verifikasi online diminta untuk order baru |
| AC-42 | Client memalsukan store/epoch/token atau akses toko kedua | Server menolak; tidak ada kebocoran/modifikasi lintas toko |
| AC-43 | Restore backup valid ke perangkat pengganti | Order, stok, kas, audit, ID dan pending sesuai manifest; PIN dibuat baru |
| AC-44 | Salah password, file rusak, schema baru, store salah | Ditolak sebelum swap; data aktif tetap utuh |
| AC-45 | File lama dibanding server baru; file dengan pending kelanjutan | Tidak overwrite server; preview/replay eksplisit dan idempoten |
| AC-46 | Pindah perangkat saat lama offline, lama muncul membawa penjualan | Epoch lama ditolak sebagai penulis; payload karantina utuh; rekonsiliasi tidak menggandakan stok/kas |
| AC-47 | Restore backup server harian, replay perangkat utuh | Checkpoint pulih, operasi lebih baru masuk sekali; backup objek ikut diuji |
| AC-48 | Migrasi schema/update aplikasi gagal | Tidak merusak ledger; mode pemulihan tersedia; tidak update tengah commit |
| AC-49 | Logout/reset dengan pending | Logout tidak menghapus data; reset meminta backup dan tindakan sadar |
| AC-50 | Trial/langganan/retensi | 60 hari, kalender bulanan, reminder/tenggang benar; restore tidak mengulang trial; penghapusan mengikuti notifikasi |

## Cetak dan pengalaman penggunaan

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-51 | Cetak tiket lalu struk pada satu printer | Urutan benar; isi dokumen tidak tertukar; sebelum bayar hanya dapur; pelanggan hanya sesudah settlement |
| AC-52 | Batal dialog/kertas habis/reload saat hasil tidak diketahui | Order tetap tersimpan; retry SALINAN; tidak ada masak/stok/transaksi baru |
| AC-53 | 58/80 mm, nama/catatan panjang, banyak unit | Tidak terpotong; total dan status jelas; setiap jalur dukungan punya bukti nyata |
| AC-54 | Struk pelanggan sesuai D-71 | Tidak ada Bagikan/salin/unduh struk pelanggan; pratinjau/cetak/cetak ulang tetap di detail, tanpa klaim pengiriman atau kertas fisik |
| AC-55 | HP 360px, keyboard desktop, pembaca layar dasar | Aksi utama terjangkau, fokus/label benar, status tidak hanya warna |
| AC-56 | Beban 500 SKU/10.000 order/50 aktif | Target respons file 01 tercapai pada perangkat minimum yang dinyatakan |

## Pemeriksaan UX

Sumber aturan dan peta kemampuan: [12 — UX principles](12-ux-principles.md). AC-57–76 adalah pemeriksaan desain/interaksi yang bisa direproduksi; UT-01–12 pada file 12 menguji kegunaan dengan pengguna baru. Keduanya diperlukan dan seluruhnya **belum dijalankan**. Pengecekan dokumen tidak dianggap bukti aplikasi lulus.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-57 | Aktivasi sampai Kasir tanpa printer, varian/topping, pajak, kategori atau import; isi stok awal wajib | Hanya prasyarat wajib file 02 diminta; kode menu dibuat unik; tersedia Nanti saja untuk kartu pengaturan tambahan; bukan transaksi demo tersembunyi |
| AC-58 | Tutup kartu pengaturan tambahan, lalu cari fitur yang dilewati | Semua fitur tetap bisa ditemukan dari lokasi peta file 12; kartu tidak memaksa muncul tiap transaksi atau menyatakan fitur add-on |
| AC-59 | Buka aplikasi HP/desktop dengan sesi terbuka, lalu baca dari perangkat sekunder | Kasir jadi tujuan perangkat aktif; Pesanan dan jumlah aktif jelas; HP owner membaca laporan server dengan checkpoint dan dapat mengelola izin/keputusan approval online; tidak mengeksekusi efek bisnis |
| AC-60 | Periksa seluruh baris tabel tindakan pada file 12, termasuk campuran draft/processed/refund due | Bayar/Proses/penyajian yang sah tetap terlihat tanpa Tindakan lain; Simpan pembayaran dengan draft sekaligus mengonfirmasi batch, tanpa klik kedua; membuka/membatalkan form tidak memberi efek; tidak ada status lunas=selesai; tombol tidak berpindah di tengah ketukan |
| AC-61 | Selesaikan bayar awal dan akhir untuk Bungkus maupun Makan di tempat | Empat kombinasi dan penyajian campuran menu sama melalui dua pilihan/dua baris dalam satu tagihan bisa dilakukan; default penyajian tidak memaksakan urutan; Bayar hanya mengonfirmasi draft setelah commit final; status kerja/keuangan terpisah pada pesanan, tanpa pills berulang di form bayar |
| AC-62 | Batch lama belum selesai, tambah draft, proses/cetak, lalu tambah sesudah lunas | Qty tiap tahap terlihat, TAMBAHAN hanya unit baru; order setelah lunas baru; petunjuk serah fisik dan SALINAN benar |
| AC-63 | Bayar non-tunai tanpa checkbox/bukti verifikasi, kemudian lengkapi | Tidak lunas sebelum konfirmasi manual; total/metode jelas; satu formulir final tanpa dialog duplikat |
| AC-64 | Kombinasikan lokal sukses/gagal/tidak diketahui, server pending/ACK, payment belum/sudah diverifikasi, print unknown/confirmed | Pesan sesuai bukti masing-masing; status lokal tidak dianggap cloud/payment/kertas; contoh file 12 tidak dipakai membabi buta |
| AC-65 | Error stok pada draft belum bayar dan pada order lunas | Nama/jumlah dibutuhkan/sisa dan status tersimpan jelas; pilihan koreksi nyata atau batal/refund mengikuti status; tidak debit/payment ulang |
| AC-66 | Error ruang lokal, kehilangan respons payment/refund, server menolak, gagal cetak | Input/bukti tidak dibuang; pemeriksaan operasi sama tersedia; tidak meminta uang dikirim ulang atau konfirmasi pembuatan baru; masalah penting persisten |
| AC-67 | Pilih menu/simpan dulu/proses lalu lakukan batal processed/refund/koreksi | Rutinitas tanpa konfirmasi generik; tindakan berisiko menampilkan satu ringkasan unit/nominal/alasan/dampak dan syarat wajib; tanpa Undo generik |
| AC-68 | Tutup kas dengan blocker dan warning sinkron/cetak | Blocker bisnis bernomor dan bisa dibuka; warning tidak menjadi blocker baru; kembali menghitung ulang ekspektasi sebelum konfirmasi |
| AC-69 | Temukan ekspor, backup, restore/pindah, expiry dan konflik lama | Lokasi sesuai peta kemampuan; CSV dibedakan dari backup; sumber/cakupan/dampak terlihat sebelum restore; tidak merge tersembunyi |
| AC-70 | Audit seluruh baris peta cakupan pada file 12 terhadap layar/desain | Setiap kemampuan mempunyai lokasi/pemicu/tindakan yang benar, termasuk koreksi, audit, Rp0, billing dan mode baca; fitur tak hilang karena minimalisme |
| AC-71 | Layar 360/390/768/1280 px, keyboard layar terbuka, teks zoom 200% | Tidak ada scroll horizontal pada kasir atau kontrol tertutup; nama/nominal/error terbaca; target ≥44×44 px dan jarak ≥8 px |
| AC-72 | Keyboard saja dan pembaca layar pada alur jual/bayar/refund/tutup | Nama/label/error terbaca, fokus terlihat/urut/kembali, tidak terperangkap; Enter tidak memicu risiko tak sengaja; semua aksi utama terjangkau |
| AC-73 | Ukur warna teks, batas kontrol/fokus, tampilkan keadaan habis/offline/lunas/error | Target internal teks ≥4,5:1 dan kontrol/fokus ≥3:1; tidak hanya warna/hover; status tetap memiliki teks |
| AC-74 | Tabel menu berkolom tanpa kartu per item, menu 80 karakter, varian mirip, topping/catatan panjang dan daftar panjang | Nama, ketersediaan, saldo jika dicatat, harga terlihat tanpa detail; menu bervarian mengikuti ringkasan per-SKU/rentang harga D-47, varian wajib dipilih sebelum tambah; promo SKU nyata D-43, tanpa promo 0; diskon order di total tanpa digabung promo; target sentuh tetap ≥44×44 px. Nama penuh di keranjang/refund/konfirmasi; harga/qty tidak tertimpa; posisi/filter bertahan |
| AC-75 | Empty state, sukses, offline, printer unknown; aktifkan kurangi gerak | Bahasa file 12 konsisten; Simpan dulu dan No. antrean / nama; Pesanan baru tidak membuang input; Pesanan/Riwayat tanpa Buka Kasir berulang; Buka/Tutup kas mudah ditemukan dan sukses rutin singkat; tidak ada confetti/suara wajib/tour penghalang; respons sukses menunggu commit dan memenuhi AC-56 |
| AC-76 | Jalankan putaran 8 pengguna baru UT-01–12 tanpa arahan klik | Catat hasil per tugas/perangkat, waktu dan kebingungan; target keberhasilan/waktu file 12 dan nol kesalahan kritis terpenuhi; median kemudahan≥6/7; bantuan tidak dihitung berhasil mandiri |

## Izin staf, persetujuan HP, serah-terima dan channel manual

Tambahan berikut belum dijalankan. AC-01–76 mempertahankan ID; skenario lama penerimaan langsung tetap wajib. Fixture tambahan: dua staf, satu owner pada HP terpisah, dua toko, policy versions, request/receipt yang belum/sudah digunakan, channel akun outlet dan batch pencairan.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-77 | Staf memakai identitas/PIN sendiri, mencoba owner API, export dan melihat ekspektasi kas | Audit actor benar; akses ditolak server dan domain, tanpa kredensial owner tersisa; rate limit/lock persisten; laporan penuh hanya owner |
| AC-78 | Uji tiap aktivitas matriks untuk Boleh kasir/Perlu persetujuan/Hanya owner, termasuk CSV/bulk/jalur alternatif | Kebijakan konsisten di UI/domain/server; owner-only tak bisa diubah menjadi approval staf; operasi rutin yang diizinkan tetap berjalan |
| AC-79 | Diskon tepat/di atas batas rupiah/persen, ubah subtotal, gratis 100% | Batas integer diperiksa lagi saat commit; bila dua batas aktif keduanya berlaku; gratis memakai izin tersendiri; approval lama tidak sah pada nilai baru |
| AC-80 | Minta persetujuan refund dari kasir, approve HP, eksekusi kasir | Request/dependensi ACK, ringkasan nilai/actor benar, approval tanpa efek bisnis; HP tak menulis ledger; receipt dan commit satu operasi; persetujuan sebelum uang dipindah |
| AC-81 | Tolak, batalkan, lewat 30 menit pending/15 menit sesudah approve, ubah payload/actor/policy/epoch/sesi | Keputusan/eksekusi ditolak sesuai state/waktu server; histori utuh; tidak ada bypass lewat jam lokal atau token request lain |
| AC-82 | Approve/cabut/claim bersamaan, retry/ganda, crash sebelum/setelah receipt dan sebelum/setelah commit, ACK hilang | Satu receipt/operation/efek; status tidak mengaku uang berpindah; pemulihan operation ID sama; receipt tersisa tak bisa dipakai order lain; uang telanjur pindah tidak diminta ulang |
| AC-83 | Kasir/HP offline, request belum dikirim, approval lokal owner, dua jalur approve | Remote menunggu server tanpa efek; penjualan sah lain berjalan; owner lokal hanya satu aksi; ID sama mencegah ganda; receipt durable yang sudah diperoleh dipulihkan tanpa mengulang operasi |
| AC-84 | Owner ubah izin/nonaktifkan staf ketika kasir offline lalu reconnect/expiry | UI owner menyebut versi belum diterima; snapshot valid terbatas; setelah reconnect perubahan berlaku sebelum operasi baru; backlog sah tidak dihapus; expiry tidak memperpanjang hak staf |
| AC-85 | Ganti staf dengan pesanan aktif, beda hitungan, koreksi hitungan, staf lama absen | Serah-terima atomik, satu penanggung jawab, input pertama dipertahankan; konfirmasi staf baru; pengecualian owner beralasan; pesanan tidak dipaksa selesai |
| AC-86 | Modal 100.000, staf A penerimaan 50.000 fisik 145.000; staf B penerimaan 20.000 fisik akhir 163.000 | Segmen A −5.000, B −2.000, sesi −7.000; ekspektasi sesi 170.000 tidak direset; tanpa kas fiktif; ekspektasi tidak bocor ke staf sebelum hitungan |
| AC-87 | Kejadian sensitif, identitas dinonaktifkan, HP terlambat sync | Histori actor/approver/nilai/versi tetap; filter benar; checkpoint jelas; daftar perlu diperiksa bukan vonis fraud |
| AC-88 | GoFood dan Toko memakai SKU sama, harga berbeda; ID eksternal sama dicatat ulang sesudah batal/reload | Saldo bersama, snapshot harga tepat, ID duplikat ditolak/dibuka kembali; harga missing tidak fallback diam-diam; tidak ada panggilan API platform |
| AC-89 | Verifikasi tagihan platform lalu selesaikan/serahkan; bandingkan pembayaran langsung untuk channel sama | Tepat Payment XOR PlatformReceivable, G dan batch atomik; tagihan tidak menaikkan laci atau penerimaan bank; belum cair tidak memblokir tutup setelah pekerjaan/refund beres |
| AC-90 | Harga 25.000, diskon toko 3.000, biaya aktual 4.000, cair 18.000 | Bruto 25.000, diskon 3.000, tagihan 22.000, biaya 4.000, dana cair 18.000, saldo 0; penjualan bukan 18.000; stok sekali, laci tidak bertambah |
| AC-91 | G=25.000, subsidi platform 5.000, pelanggan menu membayar 20.000, biaya 4.000, cair 21.000 | Subsidi di dalam G, bukan diskon toko atau pendapatan kedua; ongkir platform dikecualikan; saldo 0; komponen pajak tidak dihitung ulang |
| AC-92 | Satu payout untuk banyak order, order cair bertahap, referensi duplikat, dana belum teralokasi/lebih, biaya belum diketahui | Total alokasi + belum teralokasi = batch; deduplikasi; kelebihan jadi selisih perlu pemeriksaan; unknown bukan nol terverifikasi; tidak membuat Payment/penjualan kedua |
| AC-93 | Platform membatalkan setelah dibuat sebelum/sesudah cair; refund belum dikonfirmasi; potongan tak cocok unit | Stok default tidak kembali; pembalikan unit sesuai alokasi dan bukti, tak ada refund tunai toko ganda; kewajiban pelanggan unresolved tetap blocker; saldo negatif/penyesuaian terpisah tidak disembunyikan |
| AC-94 | Pesanan terlambat, stok kurang, stok pernah dikoreksi, sesi asal tertutup | Izin/alasan/waktu asal dicatat, validasi saldo tanpa negatif; rekonsiliasi koreksi berjejak; debit sekali tanpa tiket baru; sesi lama tidak ditulis ulang |
| AC-95 | Migrasi/backup/restore data lama + staf/approval/channel/payout + receipt belum tuntas | Actor owner/channel Toko untuk histori lama; ledger/ID/alokasi utuh; tanpa verifier/token di export/backup; izin terbaru diambil server, epoch lama tidak mengaktifkan approval/staf lama |
| AC-96 | Semua daftar Kasir/Pesanan/Riwayat/Menu & Stok/Kas/Laporan/izin/approval pada 360/390/768/1280 px serta tablet landscape 1024×768 dan portrait 768×1024 | Preview default tablet landscape, katalog–keranjang berdampingan dan sidebar ringkas; mode portrait/HP menyesuaikan ruang tanpa scaling target sentuh. Header/kolom sejajar, tanpa kartu per baris; Kasir tanpa scroll horizontal, detail tambahan terjangkau; angka/status nyata, promo SKU dan diskon order dibedakan sesuai D-43; ≥44×44, keyboard/zoom/nama panjang lolos |
| AC-97 | Jalankan UT-13–17 dengan peserta sesuai file 12 | Hasil aktual per peran/perangkat dicatat, ≥7/8 mandiri dan nol kesalahan kritis, bukan simulasi otomatis menggantikan pengguna |
| AC-98 | Kasir menyiapkan refund lalu uang sudah dipindah sebelum crash/perubahan state | Pemulihan mempertahankan bukti dan operation ID, tidak menyamakan approval dengan transfer; tidak meminta uang dipindah kedua kali; owner menuntaskan konflik tanpa menimpa histori |
| AC-99 | Beralih mode staf/owner, refresh/browser lain, direct API dari HP untuk order/stok/kas | Tidak ada privilege tersisa atau HP jadi penulis kedua; scope server menolak efek bisnis; autentikasi ulang owner >5 menit berlaku; inbox tanpa klaim push/background |
| AC-100 | Rekonsiliasi/export lintas sesi/channel: payout hari lain, reversal, koreksi ledger dan subsidi | Jumlah komponen/ID cocok; penerimaan langsung, penjualan, tagihan dan dana cair terpisah; reversal mengurangi metrik terkait sekali; koreksi immutable; ledger sesi lama tetap |

## Kesetiaan desain Sites — D-41

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-101 | Review prototipe Sites dan bandingkan UI operasional dengan versi yang disetujui pada tablet landscape 1024×768, portrait 768×1024, HP 360/390 px dan desktop 1280 px | Catat versi/sumber, persetujuan pemilik, token/aset/komponen, termasuk palet, font, spacing, bentuk, komposisi dan pasangan kontras DESIGN-SYSTEM.md D-70 dan keadaan dialog/loading/empty/error. UI operasional mempertahankan visual dan alur yang disetujui; adaptasi teknis yang terlihat direview kembali. Tidak ada janji kemiripan persentase. Simulasi Sites tidak meluluskan AC domain/storage/offline/security/printer maupun UT peserta. Status: desain terpilih disetujui pemilik pada12 Oktober2026, sumber lokal/bukti pada [riwayat D-70](../berrie-site/REVIEW-HISTORY.md#d70); perbandingan UI operasional dan cakupan lintas perangkat belum selesai |

## Gerbang rilis

1. **Internal:** seluruh uji domain dan integrasi penyimpanan/sync/refund lolos; nol blocker integritas data, keamanan antar toko atau transaksi uang.
2. **Pilot pemilik:** seluruh AC yang relevan ke konfigurasi pilot lolos; jalur printer pilot dan restore perangkat pengganti dibuktikan sebelum operasional bergantung padanya.
3. **Pilot harian:** minimal 14 hari operasional dan 100 pesanan nyata, termasuk dine-in, bungkus, tambahan, refund, offline dan tutup kas. Kas/stock variance nyata dicatat dan ditelusuri, bukan dipaksa nol. Nol kehilangan/duplikasi akibat sistem.
4. **Komersial:** seluruh AC-01–158 lulus pada scope dukungan yang dipasarkan, termasuk putaran uji pengguna baru UT-01–43; minimal satu jalur cetak per platform yang diklaim; biaya, backup 30 hari, retensi dan billing diverifikasi. Dokumentasikan keterbatasan perangkat dengan jelas. Target UX bukan klaim hasil sampai bukti pengujian tersedia.

Unit/property test untuk uang/state; integration test untuk commit/ACK/crash; end-to-end untuk alur owner; pengujian manual wajib untuk kertas, perangkat, perpindahan uang dan pilot nyata. Dokumen ini sendiri hanya membutuhkan pemeriksaan jumlah file, tautan, kelengkapan dan konsistensi.

## Promo SKU dan penyederhanaan Kasir — D-43/D-44

ID lama tetap berlaku. Kriteria tambahan berikut belum dijalankan; prompt/dokumen bukan bukti fitur.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-102 | SKU Rp20.000, promo 10%, topping Rp5.000, qty 3; bandingkan tanpa promo dan potongan nominal/batas | Per unit potongan 2.000 pada SKU, dasar 23.000; S=75.000, P=6.000, D=0, B=69.000 sebelum pajak/layanan. Tanpa promo 0/harga asal; rentang negatif/melebihi dasar ditolak; half-up per unit dan Σkomponen tepat |
| AC-103 | Promo SKU diubah setelah unit draft/processed/settled; refund parsial dan migrasi/restore data lama | Snapshot tidak diganti otomatis; refresh draft eksplisit diaudit, processed immutable; refund/pembalikan total_i asli, tidak berulang. Data lama P=0, D asal, ID/alokasi tak berubah; backup/replay menyimpan promo |
| AC-104 | Staf mencoba mengatur promo; kasir menjual promo berlaku, order berdiskon ditambah SKU promo dan sebaliknya | Setting hanya owner dan otorisasi seluruh jalur. Penjualan promo tidak minta approval ulang kecuali izin gratis Rp0; P>0 dan D>0 ditolak atomik dengan pesan jelas/input bertahan, tidak diam-diam hapus diskon |
| AC-105 | Promo Toko aktif, channel platform lain, pencarian/filter promo dan laporan | Promo tidak diwariskan diam-diam; filter Promo hanya potongan aktif >0 pada channel itu, label/revisi snapshot jelas; bruto harga dasar, total diskon P+D dengan rincian sumber; subsidi platform tetap bukan diskon toko |
| AC-106 | Kas tertutup/terbuka; operator sama/penanggung jawab berganti; SKU stok 0/1000/dinonaktifkan saldo 20 | Satu CTA awal Buka kas, Pesanan baru setelah terbuka dan ada transaksi; serah-terima sesi terbuka tanpa reset. Toko default; platform mengikuti setting. Tabel tipe/menu/stok/diskon/harga akhir, sort A–Z bertingkat; angka 0/disabled dengan penjelasan aksesibel D-47 dan Tidak dijual sementara bukan saldo fiktif. Search/channel seukuran tinggi; teks penuh dan HP/tablet tetap terjangkau |
| AC-107 | Campuran SKU sama via dua baris; pembayaran tunai kurang/cukup, QRIS aktif/nonaktif/belum diverifikasi | Dua opsi penyajian, satu tagihan, tanpa Campuran. Pembayaran tanpa pills status/shortcut nominal; diterima awal kosong, kembalian label/nominal berjarak. Metode setting, verifikasi wajib non-tunai; stok/settlement sekali dan input gagal bertahan |
| AC-108 | Struk kedua tujuan/masing-masing, batch tambahan, bayar batch lama, hasil cetak tidak diketahui | Judul Struk/tujuan awam; default kedua dokumen jika layak, dapur dahulu. Dapur hanya confirmed/new batch; bayar batch lama tidak auto cetak ulang, ulang eksplisit SALINAN. Pelanggan unpaid jelas bukan bukti bayar; tanpa konfirmasi kertas rutin; dialog selesai setelah attempt tercatat, ulang SALINAN di detail, tanpa klaim fisik; uang/stok tidak berubah |
| AC-109 | Review font, bentuk, state dan komponen bersama pada Kasir serta layar lain ketika dibangun; tablet/HP/desktop, font offline, zoom 200%, keyboard dan reduced motion | Token/konstruksi aktif DESIGN-SYSTEM.md D-70 konsisten. Apple system font pada Apple, Inter dibundel lokal pada OS lain dengan fallback saat aset gagal, tanpa jaringan sebagai prasyarat offline. Angka tabular/rata kanan; item/input 14/400, label/panel/aksi 14/500, Kasir 18/600, dialog 20/600, total 22/600; tanpa font dasar 16 px, judul eksplorasi opsional sesuai token. Semua target ≥44×44 CSS px, kontrol utama minimum 48 px, ukuran relatif/tumbuh. Body/label, spacing, radius bertingkat, ikon Lucide dan baseline konsisten. State default/hover/pressed/focus/selected/disabled/loading/error yang relevan tersedia; error/input bertahan dan target stabil. Panel review di luar alur kasir menunjukkan komponen/state, kontras aktual, reduced motion dan fallback solid. Hasil/versi aktual dicatat; persetujuan visual dan UT tetap terpisah |
| AC-110 | Review pola D-46 dengan token aktif D-49: pola navigasi/settings/overlay, tema terang/gelap, pembesaran teks dan zoom 200% secara terpisah, keyboard layar, reduced motion/transparency, increased contrast/forced colors pada 360/390, 768×1024, 1024×768 dan desktop 1280 | Kasir ringkas/aksi stabil; judul besar-compact hanya konteks yang cocok tanpa duplikasi heading/lompatan target. Grouped settings tetap baris berkolom, seluruh daftar data tabel. Sheet/dialog satu overlay dengan tutup/fokus/pemulihan yang benar; alert proporsional, tab hanya navigasi. Tema mencakup seluruh komponen/state; kontras teks ≥4,5:1 dan batas/fokus penting ≥3:1 pada pasangan aktual termasuk komposit. Font lokal/ukuran relatif/reflow menjaga nominal, error dan aksi tanpa scroll horizontal Kasir; tidak mengklaim Dynamic Type native atau pt=CSS px. Fallback solid/media mempertahankan fungsi. Catat versi sumber/token, implementasi yang diuji, hasil dan kekurangan; screenshot mengikuti otorisasi terbaru. Referensi komunitas tidak menjadi dependensi operasional. AC-101/109 dan UT tetap diperlukan; dokumen/token saja tidak meluluskan UI |

Jalankan regresi AC-22–30/51–55/61–63/74/79/95–96/101 yang terdampak dan property tests komponen promo/pajak/refund, ditambah UT-18 saat uji peserta. Pemeriksaan dokumen tidak meluluskan kriteria tersebut.

## Kepadatan dan feedback Kasir — D-47

| ID | Skenario | Hasil yang wajib |
| --- | --- | --- |
| AC-111 | Review typography/keranjang/tabel/header revisi D-47, beberapa SKU mirip, alias valid/invalid, stok 0/1000/nonaktif, promo/tanpa promo, buka/tutup batal/gagal/blocker, tindakan sensitif dan draft belum tersimpan | Ukuran D-47 dipertahankan dalam DESIGN-SYSTEM.md D-70 tanpa font 16 px; nama menu/harga item 14 px/400, panel/aksi 14 px/500, Kasir 18 px/600, dialog 20 px/600, total 22 px/600. Nama/harga/subtotal tidak bold. Tabel Tipe/Menu/Stok/Diskon/Harga; header Diskon saja, sel stok/diskon/harga hanya angka/pemisah numerik tanpa unit/Rp/%/slash/rentang. Nilai diskon sesuai jenis setting, jenis di detail. Satu SKU per baris dengan varian/kode inline bila perlu; D-52 stok wajib angka, data lama tanpa hitungan ditahan; D-51 stok 0 hanya di Habis dan disabled dengan penjelasan aksesibel. Subbaris generik hilang tanpa kehilangan identitas SKU. Alias owner N default, validasi 1–3 huruf/angka uppercase/unik pada batas penyimpanan; ID/domain/histori/urutan asli tetap, tanpa paket fiktif. Penyajian pada dialog item/keranjang; identitas terlihat. Batal/refund/koreksi langsung terlihat pada detail Pesanan/Riwayat dengan izin/alasan/audit, bukan composer pembelian. Toggle kas button membuka workflow, status hanya sesudah commit, seluruh blocker/serah-terima tetap. D-55: Pesanan baru sekunder di detail, tanpa pemicu pada Kasir dan tidak membuang input. Semua/Habis/Promo tetap; kategori toko dari Pengaturan, tepat satu filter aktif; fixture ≥20 menu pendek pada 1024×768/root default memperlihatkan ≥8 baris penuh sebelum scroll, target 10 (row 44 px, area isi ≥352 px), tanpa kartu per entri. Nama panjang/zoom tumbuh tanpa pemotongan. Jumlah aktual dicatat, bukan mengklaim target. Target ≥44×44, HP tanpa scroll horizontal; keyboard/zoom/teks 200% dan fokus input 14 px Safari/iPhone diperiksa, tanpa mematikan zoom. Bukti actual/version/kekurangan dicatat bersama AC-101/109/110; belum lulus hanya karena dokumen dibuat |

ID lama AC/UT/D/V dipertahankan. Bukti terpilih D-46–48 tidak meluluskan seluruh AC-111; D-49/D-50 mempunyai bukti penerapan prototipe terpilih pada [review terkini](../berrie-site/REVIEW-HISTORY.md#d49-d50), belum kelulusan penuh. Uji peserta tetap UT-01–18, termasuk SKU/promo pada UT-17/18.

Bukti prototipe D-46–48 terpilih ada di [riwayat D-46–48](../berrie-site/REVIEW-HISTORY.md#d46-d48). AC-96 juga memeriksa navigasi dapat diciutkan/dibuka tanpa kehilangan draft/filter/channel. Tidak meluluskan seluruh AC/UT operasional.

## Komposisi dan cakupan design system baru — D-49/D-50

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-112 | Review Kasir dan panel komponen D-49 pada 360/390, 768×1024, 1024×768 dan desktop 1280, terang/gelap, fixture kosong/penuh/panjang/gagal | Page netral, fill putih sejuk solid #FCFCFD D-53 pada surface terang, selected cyan dengan indikator/atribut aksesibel, aksen terarah, nama/harga primary regular dan satu total utama; toolbar/navigation lebih tenang daripada konten. Tidak ada kartu per entri, outline/shadow berulang, latar page pastel penuh di luar surface D-53 atau label navigasi patah sembarang. Baseline, inset, spacing, stroke dan sudut bertingkat sesuai token. Panel di luar alur mencakup button/icon/aksi mengambang, forms lengkap/stepper/toggle, segmented/chip/tag/badge, container/table/navigation, feedback/overlay, glass dan fallback; state relevan diperiksa. Pemicu Keranjang HP berlabel, aksi tablet stabil; FAB/tab bar tidak ditambah sebagai dekorasi. Catat font render, angka row aktual sesuai AC-111, pasangan kontras dan media aksesibilitas. Review pemilik mencatat kekurangan/perbaikan dan keputusan visual sesuai AC-101; tidak memakai skor kemiripan Apple atau meluluskan UT/domain dari penampilan |

D-49/D-50 telah diterapkan pada Kasir; [review terpilih](../berrie-site/REVIEW-HISTORY.md#d49-d50) belum meluluskan seluruh AC-112. Fill solid D-53 diperiksa untuk teks, border dan fokus; selected tetap mudah dibedakan. Kriteria perilaku, integritas dan pilot tetap wajib.

## Revisi Kasir dan stok wajib — D-51/D-52

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-113 | Promo → Minuman → Habis → Semua; kategori tambahan/dihapus; SKU nonaktif | Tepat satu filter aktif, tiga tab tetap selalu ada; Habis hanya stok 0 aktif/disabled; nol tidak muncul di Semua/kategori/Promo, inactive hanya di Menu & Stok. Kategori unik 1–40, nama tab tetap ditolak; menghapus filter tidak menghapus SKU/histori |
| AC-114 | Pisang Reguler tunggal + Cokelat dengan catatan, penyajian berbeda, bayar berhasil/gagal/hasil tidak diketahui | Reguler generik hilang tanpa identitas SKU hilang; catatan/penyajian terbaca sejak draft. Beri diskon/Catatan/Simpan dulu jelas sebagai button; label Bayar nanti/Bayar. Tanpa toggle penyajian/refund/koreksi/serve di composer Kasir. Setelah commit lunas keranjang kosong; Struk tetap transaksi asal. Kegagalan mempertahankan input, hasil tidak diketahui diperiksa dengan ID operasi sama. Penyajian di Pesanan; uang/stok tidak ganda |
| AC-115 | Aktivasi/menu/CSV stok kosong, null, manual, negatif, pecahan, 0, 1000; data lama tanpa stok; retry dan return | Stok wajib integer ≥0 pada setiap SKU; mode quantity saja. Blank/manual ditolak; 0/1000 diterima eksplisit. CSV SKU baru wajib opening_stock, existing kosong dan tidak mengganti saldo. Data lama tidak otomatis menjadi 0/1000; diblokir sampai admin mengisi stok awal berjejak. Draft tanpa debit; konfirmasi debit sekali; settlement batch lama tidak debit ulang; return hanya unit yang pernah mendebit; migrasi/pemulihan gagal mempertahankan data |

## Revisi alur dan daftar — D-53/D-54

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-116 | Kasir lokal tablet 1024×768, Bayar nanti, struk sebelum/sesudah bayar | Root localhost selalu frame 1024×768 termasuk dialog. Surface solid/biru-netral sesuai token D-71. Stok/Harga/Beri diskon/No. antrean / nama; tanpa Lihat di Pesanan/copy bantuan. Bayar/Struk sama lebar/tinggi setelah konfirmasi. Sebelum settlement Dapur saja; tujuan pelanggan/keduanya disabled, cetak pelanggan ditolak domain/API; berbagi struk dihapus D-71; bayar batch lama tanpa cetak/debit dapur kedua otomatis |
| AC-117 | Draft, processed belum bayar, lunas belum disajikan, lunas selesai, refund dari kedua daftar | Pesanan mengikuti workspace D-78/AC-166–172; kewajiban refund terlihat langsung. Riwayat hanya settlement + seluruh pekerjaan selesai + refund due 0, tanpa metadata 0 belum disajikan. Tanggal/metode/search bekerja terpisah dari filter Pesanan dan berjarak 16 px. Refund hanya unit paid eligible; submit disabled/domain menolak sebelum uang dikembalikan. Requested memerlukan dapur diberi tahu dan cancel/refund atomik. Satu alasan refund wajib, tanpa alasan metode berbeda tambahan, metode aktual/unit audit; approval tidak berarti uang kembali. Refund selesai tetap histori, cancel terpisah due tetap aktif/blocker, retry tidak menduplikasi uang/stok |

UT-04/07/09/11 diperbarui tanpa mengganti ID atau mengklaim uji peserta. Kelulusan prototipe terpilih tidak meluluskan API/storage/printer/pilot.

## Revisi tablet dan form menu — D-55/D-56

| ID | Skenario | Hasil yang diharapkan |
| --- | --- | --- |
| AC-118 | Tablet localhost/default, keranjang kosong/4 item pendek/panjang, identitas kosong/whitespace, simpan/proses/bayar dan gagal/retry | Frame 1024×768; satu nama toko sidebar, keranjang lavender-solid/katalog cool-white, 4 baris pendek penuh dan ≥44 target; Diskon/Catatan lebar isi; tanpa Pesanan baru Kasir; Bayar hitam/Bayar nanti abu-abu. Identitas wajib domain sebelum commit; penolakan tidak menulis batch/stok/uang dan input bertahan, retry satu operasi |
| AC-119 | Buka Pesanan baru, pindah filter/detail/kembali, paid requested 4 baris, sajikan satu/sebagian/semua | D-78: Aktif/Tersimpan dan dua filter AND awal Semua, pilihan/filter/search/scroll bertahan saat kembali. Daftar operasional dan detail bersama sesuai AC-166–172. Penyajian awal kosong, Pilih semua hanya requested, tanpa perubahan uang/draft; status dengan teks |
| AC-120 | Menu baru 3 ukuran+harganya+stok+topping, invalid baris akhir, custom tipe bentrok, ulang ID operasi, edit SKU existing/harga channel | Tipe kiri/Kode read-only kanan, N/P/PR/custom alias unik, kode SKU unik otomatis/stabil; kategori dropdown owner, harga platform hanya aktif/eksplisit. Ukuran/rasa flat SKU dengan stok sendiri, topping harga tambahan tanpa ledger. Satu commit atomik seluruh menu/tipe/topping/opening/audit; invalid rollback penuh/retry tidak ganda. Edit mempertahankan saldo/histori/promo/harga channel tersembunyi, jalur izin tetap |
| AC-121 | Saldo di atas/sama/di bawah Stok Minimal/0/archived, draft/konfirmasi/refill/reload | Label Total stok (wajib)/Stok Minimal, default ambang 5, integer ≥0; list per SKU ≤threshold termasuk habis, bukan agregasi/reservasi draft. Notifikasi setelah committed crossing sekali, reset setelah refill melewati batas; daftar dapat dibuka sampai saldo membaik, arsip absen. Copy tidak menjanjikan push/WA/email. Reload prototipe kembali fixture memori; produksi tetap IndexedDB |

Jalankan regresi AC-22–30/51–55/61–63/74/79/95–96/101/109–117 yang terdampak dan UT-01/02/03/04/07/10/17/18 dengan peserta/perangkat sesuai file 12. Review/tes simulasi tidak meluluskan integritas produksi atau pilot.

## Tabel, grup stok, racikan dan online — D-57–60

D-57–60 mendahului layout overlay/stok per pilihan pada AC-120/121 dan interpretasi saldo per-SKU pada AC-115; ID lama tetap untuk histori/regresi yang masih berlaku. Kriteria integritas lain tidak dikurangi.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-122 | Isi 3 rasa di tabel, dropdown, duplikat/tempel, Tab/Enter, bulk harga/kategori, invalid sel terakhir, gagal/hasil belum diketahui | Satu pilihan per row; error per sel/filter, input lintas halaman/tab dan gagal bertahan; satu commit katalog/audit/opening, retry sekali; SKU/kode/harga snapshot lama stabil |
| AC-123 | 3 rasa stok bersama50, kebutuhan dua rasa stok1, refill/koreksi/return, tambah varian, legacy dan restore | Satu saldo/ambang/group ID; 2 rasa memakai2 stok atomik, kekurangan menolak uang/batch/ledger penuh; tambahan varian tanpa opening kedua; return ke grup asal sekali; legacy tidak dijumlah/migrasi diam-diam |
| AC-124 | Es/Gula preset/custom, normal/less, beberapa racikan sama SKU, edit katalog, keranjang dan tiket | Tepat satu opsi per kelompok, bawaan sah; gratis/tanpa stok tambahan, snapshot membedakan baris dan tetap saat edit; terbaca keranjang/detail/tiket/struk; invalid pilihan ditolak |
| AC-125 | Aktifkan rekap, antrean reda, qty8/0/kurang, rentang ulang/masa depan, izin/failure/retry/tutup kas | Cutoff/pengingat terlihat; grup50→42 tanpa order/uang, zero memeriksa periode; exclude recorded wajib; stock/recap/checkpoint/audit atomik, rentang/receipt mencegah debit ganda; kegagalan input/batas tetap; merchant manual, tidak mengklaim realtime/omzet online |
| AC-126 | Menu localhost/default1024×768, paging/search, fokus/input, topping/rincian | Lima row pendek penuh per halaman, row≥64 dan input≥56; target≥44/font14, tombol topping/rincian tanpa pill; nama saat horizontal scroll dan input lintas paging bertahan. Konten/error panjang tumbuh, HP/zoom diperiksa tersendiri |

Bukti prototipe terpilih dicatat di review D-57–60; belum otomatis AC/UT/pilot lulus.

## Menu/stok/rekap/kas terkini — D-61–65

D-61 memperbarui kolom Rasa/Ukuran/racikan tetap pada AC-120/122/124; D-62/63 memperinci AC-123/125; D-64 memperinci penutupan/serah-terima lama. AC-04/05 dan cabang impor pada AC lain ditunda D-65, ID dipertahankan; cabang selain impor tetap. Tidak meluluskan pilot hanya karena gerbang impor ditunda.

| ID | Skenario | Hasil yang harus terbukti |
| --- | --- | --- |
| AC-127 | + Menu pada tablet1024×768, setup/error baru, 0/1/6 variabel bernama, blank dan multi Keju+Jamur | Tabel minimum378 tidak menyusut, row≥64/input≥56/target≥44; menu-first +Varian/name/options/daftar harga dalam dialog D-66 ditemukan, dropdown saja saat jual, `-` sah; lima row/paging/input lintas tab, tanpa impor |
| AC-128 | Dua harga kombinasi, pilihan belum punya harga, free modifier, snapshot/catalog berubah | Kunci kanonis multi, satu harga per kombinasi/tipe, free dikecualikan dari kunci, pilihan unavailable ditahan/input tetap; dialog hanya variabel menu, snapshot nama/definisi/harga tetap; stok bersama/debit/return sekali dan error grid rollback |
| AC-129 | Saldo10, Isi stok4, opname9/0, ambang diubah, salah baris/izin/race/retry | Hasil14 lalu9/0, delta ledger pada saldo commit; saldo read-only/input tindakan jelas; draft kedua mode terpisah, ambang tidak mengubah stok; izin stok/alasan/atomic/receipt tetap |
| AC-130 | Rekap8 koreksi3 lalu5; saldo kurang, payload/revisi/approval stale, writer/HP/expiry, retry | Kontrol baru sampai menit, input online jelas; stok delta+5 lalu−2, asal/rentang/checkpoint/order/cash tetap; actor/approver/alasan/before/after berjejak dan dapat dibaca; default Koreksi stok membutuhkan owner, seluruh error rollback, operasi sama sekali |
| AC-131 | Petugas sama langsung tutup; pergantian shift; selisih beberapa segmen, uang keluar/top up, cancel/revisi/blocker | Breakdown menjelaskan ekspektasi dan Uang masuk/keluar terpisah dari Selesai bertugas; same actor tanpa handover, shift mempertahankan sesi/ledger/ekspektasi; tujuan hitungan berbeda, tahap berikut setelah simpan, mutasi berhenti selama count, cancel menjaga jejak; hitungan buta/izin/selisih/blocker/closed immutable tetap |

Bukti prototype terpilih berada pada review D-61–65. Uji storage/server/approval online nyata, printer/restore/performa perangkat dan UT-22–25 masih diperlukan; target bukan status lulus.

## Penemuan menu, varian dan diskon — D-66

D-66 mendahului alur + Kombinasi/Rincian dan urutan kolom lama pada AC-122/126/127; aturan bisnis AC-128/129 tetap.

| ID | Skenario | Hasil yang harus terbukti |
| --- | --- | --- |
| AC-132 | Tablet root1024×768, + Menu/batal/tambah/simpan, copy Varian, dua ukuran/harga dan topping bersama, hapus pilihan harga, Diskon, stok opname | Modal terlihat dan punya Batal tanpa perubahan; menu baru pertama/fokus nama dan tetap terlihat sesudah commit, Batal tambah menu hanya grup baru. Kolom Status/Menu/Varian/Harga/Kategori lalu sisanya; lima row≥64/input≥56. Copy persis feedback D-66. Tanpa + Kombinasi/Rincian; harga tunggal otomatis, multi dipilih bersama, harga baru eksplisit dan lama/ID/snapshot/stok dipertahankan, SKU removed arsip. Batas30 tidak membuat subset eksponensial; penggabungan harga berbeda ditahan. Diskon submenu sendiri, form tanpa opname; opname dan ledger tab Stok. Draft/error tidak hilang pada gagal simpan |

Pemeriksaan prototipe terpilih pada review D-66; belum bukti UT-26, storage/server/offline/printer/pilot.

## Revisi Menu & Stok — D-67

D-67 mendahului checkbox/bulk/status arsip, langkah harga/preset/default dan sub Diskon pada AC-122/126/127/128/132, serta kegiatan Isi stok/opname terpisah pada AC-129. ID dan histori lama tetap; pemetaan terkini berikut.

| ID | Skenario | Hasil yang harus terbukti |
| --- | --- | --- |
| AC-133 | Tablet root1024×768, edit/Batal, dua status, Hapus/Batal/konfirmasi/draft/retry, varian0/3000/multi/default dan legacy | Hanya sel status hijau/merah + label; tanpa checkbox/Diarsipkan/bulk. Batal mengembalikan committed termasuk input lintas halaman; hapus tidak satu klik, semua varian tersembunyi namun histori/ledger/ID tetap, draft/stale/izin ditahan. + Varian tombol jelas, default pertama berbintang; harga dasar5000 +0/3000 =5000/8000. Tanpa preset/pengaturan harga/copy lama/Lanjut ke harga. Multi menjumlah tambahan, snapshot/promo/stock debit tetap;0/negatif/pecahan/batas30 diuji. Legacy tidak aditif/konflik status/promo/channel ditahan. Diskon navigasi utama, lima row64/input56, error/input bertahan |
| AC-134 | Tabel stok grup10, perubahan total14 lalu opname9/0, debit/return/rekap, minimal, alasan kosong/race/failure/retry | Satu row/menu dengan tujuh kolom diminta, hanya baseline/minimal editable. Modal beralasan menetapkan total aktual, delta+4/−5; baseline tetap saat jual, sisa berubah. Log waktu/pelaku/before/after/alasan; race/izin/HP/reader/expiry/duplikasi ditahan, transaksi atomik. Minimal tidak mengubah saldo/ledger; Batal/gagal input tetap. Tiga copy rekap dihapus, Dari/Sampai/exclude/history/checkpoint/qty/stock-only tetap |

Review prototipe D-67 mencatat bukti terpilih; bukan kelulusan penuh AC/UT/storage/server/printer/pilot.

## Katalog, diskon dan penjelasan kas — D-68

D-68 memperbarui kategori opsional, Batal perubahan, lokasi hapus, label Ubah dan daftar diskon per SKU pada AC lama tanpa mengganti ID.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-135 | Menu/Stok bersih, edit/revert/Batal/gagal, error0/error>0, tablet1024×768, hapus/Batal/konfirmasi | Hapus paling kiri; Batal dan Simpan hanya saat berbeda dari committed, dimensi sama; revert menyembunyikan. Error filter hanya>0. Stok harga rata kiri, field editable berbatas tanpa Ubah, sisa teks. Log hapus tetap terbaca berisi menu/tanggal/jam/actor; seluruh varian arsip, histori/ledger tetap |
| AC-136 | + Menu/aktivasi tanpa kategori, tambah nama inline, Batal menu, CRUD kategori/tipe, rename/used delete/stale/failure | Kategori wajib, tanpa Tanpa kategori; tambah inline, konfigurasi yang tersimpan tetap walau Batal Menu; tambah/edit/hapus tersedia, used delete ditahan, rename tidak mengubah snapshot/kode; invalid/izin/stale menolak seluruh commit, input gagal bertahan |
| AC-137 | Definisi10%/potongan10000/Beli1gratis1/Beli2gratis3, assignment per channel/`-`, edit/hapus digunakan, harga turun | Pustaka ber-ID/revisi/nama unik, dropdown di samping Varian; channel terpisah; persen basis point/potongan integer; potongan>harga menahan seluruh commit; snapshot unit lama tetap; hapus used ditahan |
| AC-138 | Qty1..16, X/Y1..99, sisa ganjil, harga10001/topping5000, tambah draft identik, beda pilihan/batch, batal, refund parsial, retry/stock | Kelompok lengkap membayar X dari X+Y, sisa penuh; rupiah/alokasi tepat, topping utuh, qty fisik/debit penuh sekali; unit confirmed tidak dihitung ulang; refund total_i asal, tanpa return otomatis; konflik diskon order ditahan termasuk qty belum cukup, input/error tidak hilang |
| AC-139 | Buka kas owner/staf, handover, bayar tunai/kembalian/refund/top up/belanja/koreksi | Waktu zona toko dan actor buka sesuai commit, tidak tertimpa handover; sumber angka diberi label ringkas D-69, tidak catat payment/refund dua kali; ekspektasi tetap berbeda dari fisik, akses buta staf dan seluruh blocker tetap |

Tes/browser prototipe adalah bukti terpilih. UT peserta, IndexedDB/API/offline, keamanan, printer, restore dan gerbang pilot tetap belum terbukti.


D-69 mendahului syarat pagination/bintang/copy lama pada AC-123/127/132–134/139; ID lama tetap dan integritasnya tidak berubah.

## Jadwal dan penyederhanaan UI — D-69

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-140 | Jadwal kosong/lengkap/parsial/terbalik, zona browser berbeda, persen/potongan/BOGO sebelum/tepat mulai/tepat selesai, edit/hapus jadwal, retry | Empat field dan zona toko; semua atau kosong; invalid ditolak atomik/input bertahan; mulai inklusif/akhir eksklusif, filter/label/harga ikut efektif. Channel terpisah; snapshot item lama tetap, refresh draft eksplisit saja. Offline/jam perangkat tepercaya produksi belum dibuktikan |
| AC-141 | Menu/Stok/Rekap tablet1024×768, gulir akhir/search/edit lintas tab, Varian, rekap date/time dan Waktu sekarang,360px/zoom | Tanpa pagination Menu/Stok/Rekap, seluruh row terakses/header sticky, row≥64/input≥56; state bertahan. Tanpa helper/bintang Default visual, default pertama tetap. Dari checkpoint read-only, label sejajar/grid adaptif, waktu zona toko presisi menit |
| AC-142 | Kas buka/handover/masuk/keluar/blocker/tutup/staf | Belum pernah buka kas: satu panel/CTA tanpa tabel nol; aktif satu card penuh/finish pendek dan riwayat disclosure. Kas tanpa copy/nominal duplikat; satu saldo tercatat bawah rincian, label D-69 dan tombol pergerakan di atas. Dua jalur finish tetap, tanpa pills/bantuan. Step1 rekap bertautan tanpa blocker tambahan; daftar blocker nyata tetap; input Uang akhir di laci (Rp)/hasil/selisih/alasan dan commit tetap. Izin/hitung buta tidak bocor |

AC-140–142 adalah kriteria, bukan klaim lulus operasional/UT/pilot.

## Satu UI terpilih — D-70

D-70 mendahului kriteria visual lama tentang palet/font/sidebar/tabel katalog/pembayaran dialog/struk otomatis/empat baris; ID dan seluruh pemeriksaan integritas tetap dipertahankan.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-143 | Buka localhost tanpa parameter desain, tambah SKU/default/racikan/qty/penyajian, Bayar/Kembali/gagal/retry, Bayar nanti dan temukan administrasi | Hanya desain terpilih, tanpa switch/cabang/asset UI lama atau backup baru. Tablet1024×768 termasuk dialog;8 kartu pendek dan3 baris pesanan normal terlihat/default. D-71: ketuk menu membuka modal, Tambahkan ke pesanan wajib, tanpa Atur; qty langsung; jumlah confirmed/detail terbaca. D-72: penyajian hanya di modal, item lama tetap. Identitas wajib; Bayar satu panel/Tunai/QRIS/Uang pas; Kembali tanpa commit. Gagal mempertahankan input, unknown diperiksa lewat operasi sama; D-71: save/process/settle yang sukses mengosongkan draft, notifikasi/Lihat pesanan, Struk di detail tanpa dialog otomatis. Debit/settlement/izin tetap sekali. Inter lokal/token D-71 pada seluruh layar; seluruh tujuan kelola toko tetap dapat ditemukan. Persetujuan visual tidak meluluskan produksi/UT/pilot |

## Revisi Kasir/Riwayat dan sistem visual — D-71

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-144 | Ketuk kartu/default/racikan/batal/keyboard, edit unit, ganti penyajian | Ketuk hanya membuka modal, tanpa Atur; Tambahkan wajib. Default terisi, opsi relevan, CTA terjangkau. Satu judul Pesanan baru; D-72 tanpa Item berikutnya di card; penyajian di modal, dine-in kiri/bungkus kanan, item lama tetap. Tanpa copy bantuan/harga per unit; racikan12px/total panel22px. Copy katalog yang dihapus tidak muncul |
| AC-145 | Simpan dulu/Bayar nanti/Tunai/QRIS, gagal/pending/unknown/periksa operasi sama | Hanya sukses commit mengosongkan Kasir, notifikasi spesifik + Lihat pesanan menuju order asal. Tidak ada hasil sukses menetap/dialog struk otomatis. Input/identitas bertahan pada gagal/unknown, operasi/debit tetap sekali. Copy bayar dihapus; Catatan non-tunai, verifikasi tetap wajib |
| AC-146 | Cetak kedua tujuan/tunggal, sebelum bayar, gagal/unknown/ulang/late | Tanpa Kertas sudah keluar/Bagikan/salin/unduh pelanggan. Setelah attempt tercatat dialog selesai tanpa klaim fisik; error/unknown penyimpanan tidak ditutup. Reopen detail dapat ulang SALINAN dengan snapshot/batch asal. Dokumen belum layak ditolak. Uang/stok/status penyajian tidak berubah |
| AC-147 | Riwayat awal–akhir/satu hari/terbalik/kosong, batas tengah malam/zona browser beda/metode/search; visual seluruh layar | Default hari ini zona toko; kedua hari inklusif, rentang terbalik error, search/metode dikombinasikan. Inter lokal/tema biru-netral/komponen D-71 lintas layar,8 kartu/3 baris tablet pendek,360px/zoom/fokus/kontras/target44 tetap. Tidak ada cabang Jira-vs-lama atau crypto |

Kontrak di atas belum kelulusan aplikasi operasional/UT/pilot. Bukti prototipe dicatat terpisah di review/tasks.

## Cetak otomatis dan lanjut draft — D-72

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-148 | Simpan dulu, Bayar nanti, bayar langsung/batch lama/tambahan, gagal/unknown/retry dan cetak ulang tiap tujuan | Simpan tanpa cetak/debit. Setelah commit: process hanya dapur batch baru; settle dapur batch baru lalu pelanggan, tanpa draft hanya pelanggan. Gagal/unknown belum terselesaikan tidak mencetak; periksa operasi sama tidak menggandakan uang/stok/attempt. Ulang pelanggan/dapur/keduanya yang layak SALINAN, dapur lama hanya atas aksi ulang eksplisit. Gagal cetak mempertahankan transaksi committed, tanpa klaim fisik |
| AC-149 | Bayar tanpa identitas → isi identitas → Bayar; modal menu, metadata, Pesanan/Riwayat | Error identitas dekat field/aria-describedby/aria-invalid, fokus input, input tetap editable dan error hilang saat dikoreksi. Copy bantuan/harga per unit/toggle card dihapus. Racikan seperti penyajian12px, total panel22px; copy daftar dihapus dan nominal Riwayat rata kiri. Modal tetap target44/CTA terjangkau |
| AC-150 | Simpan draft → layani pelanggan lain → Pesanan/Tersimpan/detail/Edit pesanan → tambah/hapus/edit → simpan/proses/bayar; gagal/retry | Kembali ke Kasir dengan nomor/identitas/snapshot asal; edit menu/qty/pilihan/penyajian/catatan tersedia. Draft kerja dipertahankan pada gagal, draft committed tidak ditimpa sebelum commit. Simpan tanpa cetak/debit, konfirmasi mengurangi sekali. Cegah menimpa input pesanan lain. Confirmed/lunas tidak dapat diganti melalui patch draft |

AC-148–150 melanjutkan AC-143–147; tanpa dialog Struk otomatis tetap berlaku, percobaan cetak berjalan otomatis sesudah commit. Tidak meluluskan printer fisik, API/storage/UT/pilot.

## Form menu agnostik dan fondasi visual — D-73

D-73 mendahului form varian setelah menu ditambahkan, asumsi satu gelas=1 unit serta radius/font seragam pada kriteria terdahulu; ID dan pemeriksaan integritas tetap.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-151 | Tambah menu tanpa varian, single tambahan0/5000, varian semua0, multi berharga, Batal/error/save/stale; harga100 qty200 dan stok1000 | Varian opsional dalam form yang sama, Harga/Harga dasar sesuai konteks, preview akhir domain, footer terjangkau. Batal tidak menambah draft; error mempertahankan input/fokus. Row baru paling atas, stok awal satu ledger grup1000; harga/ID/promo existing tetap. Tanpa mode satuan/volume/konversi.100×200=20000 sebelum komponen lain, tambahan per qty; draftstock1000, konfirmasi800, replay/settlement tetap800. Qty integer1–999, negatif/pecahan/stok kurang ditahan |
| AC-152 | Seluruh komponen shared, Kas tablet1024×768/360px/teks200%/terang/gelap/keyboard | Token D-73: Inter berfitur, heading24/20/16, body14; kontrol6/kartu8/modal12, ikon16/chevron12/stroke1.5; state/kontras/fokus/target44. Kas maksimum640 rata kiri, nominal rata kanan pada grid yang sama, satu saldo tercatat. Form gulir/footer tidak menutupi field/fokus.8 kartu pendek/3 baris normal tablet tetap. Tidak mengubah hitung buta/izin/blocker/ledger. Audit mencatat beda aset/font/ikon/pola POS dari ADS, tanpa klaim identik Jira |

Bukti prototipe terpilih pada review D-73; belum kelulusan AC operasional, UT peserta, printer atau pilot.

## Kas tablet dan laporan harian — D-74

D-74 mengganti batas seluruh workspace640 px pada AC-152, bukan batas breakdown/izin/hitung buta/integritasnya.

| ID | Skenario | Hasil wajib |
| --- | --- | --- |
| AC-153 | Kas tablet1024×768, portrait768, HP360, teks200%; tutup dengan blocker, serah-terima/batal/staf | Breakdown≤640 kiri dan finish bertumpuk kanan sejajar atas; workspace≤960/gap24 pada≥900. Sempit satu kolom tanpa overflow/target mengecil. Navigasi tablet atas/HP bawah tetap. Aksi/riwayat mengikuti angka; blocker, hitung buta, saldo satu kali, ledger tetap |
| AC-154 | Laporan tanpa refund; refund hari/sesi lain/metode berbeda; platform/gratis/promo/pajak/layanan; tanggal zona toko, rentang terbalik, telusur/menu/export/owner | Fokus Penjualan setelah diskon sebelum pengembalian dan Uang diterima neto/transaksi berbayar/rata-rata; pengembalian/gratis kontekstual, dasar jelas. Filter bekerja pada settlement vs kejadian refund; negatif dipertahankan, promo/order terpisah, pembalikan platform bukan uang toko. Menu snapshot/urut nilai atau qty neto; telusur ke transaksi/kembali mempertahankan konteks. CSV filter aktif/event bertanda/aman formula. Metadata tidak lengkap diberi batas/ekspor ditahan, dana platform berlabel cakupan sendiri, staf/HP mengikuti izin. Koreksi klasifikasi dan data server perlu bukti produksi |

Bukti prototipe pada review D-74; belum kelulusan AC operasional/UT peserta/pilot.

## Editor, laporan dan pengaturan — D-75 · 31 Oktober 2026

| ID | Kriteria tambahan |
| --- | --- |
| AC-155 | Menu/Stok panjang: bar aksi sticky di atas editor dengan status belum disimpan dan Batal/Simpan setara; tidak menutupi baris terakhir/navigasi/keyboard/fokus. Revert menyembunyikan aksi, tab mempertahankan draft, keluar ditahan dan reload diperingatkan; gagal mempertahankan input, unknown memeriksa operasi sama. Tanpa keterangan opsional; audit otomatis/alasan koreksi wajib tetap. |
| AC-156 | Audit seluruh laporan: dua headline/metrik sesuai06, neto/refund/diskon/gratis/lintas periode jelas, menu urut nilai/qty dan telusur asal, perubahan/pengecualian kontekstual, perhitungan/metode disclosure. Tanggal/sesi/ekspor/platform berbeda cakupan eksplisit; tabel per hari merekonsiliasi periode dan tidak mengarang kelengkapan/perbandingan/laba/kausalitas. |
| AC-157 | Toko pertama/default setiap membuka Pengaturan; alias di Tipe menu dengan label Nama singkat (alias), tanpa Tampilan terpisah. Validasi alias/rename atomik, ID/kode SKU dan snapshot historis tidak berubah. Urutan dan konteks tablet/HP konsisten. |
| AC-158 | Owner online dapat tambah/ubah nama/reset PIN/nonaktif/aktifkan staf dengan ID tetap; role Kasir dan izin aktivitas bersama, tanpa role baru/hard delete. Konfirmasi dampak/revoke offline/holder laci jelas. Penolakan offline/staf/reader/owner-target, validasi/replay/unknown diuji; HP hanya administrasi akses, saldo dan histori tidak berubah. Simulasi PIN tidak diklaim autentikasi produksi. |

Bukti terpilih pada review D-75 tidak otomatis meluluskan AC operasional, UT peserta atau pilot.

## Kasir terpadu — D-76

| ID | Kriteria dan bukti yang dibutuhkan |
| --- | --- |
| AC-159 | Kasir tanpa breadcrumb/judul berulang/heading Pilih menu; search/filter langsung, status ringkas, dua kolom tablet, HP360 dan teks200%/nama panjang/fokus/target44×44 diperiksa langsung; Panel review tetap di luar navigasi produk. |
| AC-160 | Menu sederhana satu SKU tanpa pilihan aktif menambah draft qty1 tanpa modal. Pilihan tetap editor/Tambahkan ke pesanan tanpa efek sebelumnya. Ketukan berulang hanya menggabungkan unit identik, memisahkan catatan/pilihan/penyajian/snapshot/channel/status. Qty inline dan editor baris tetap; confirmed tidak berubah. |
| AC-161 | Feedback nama ditambahkan/Urungkan menghapus satu penambahan yang diwakili, satu kali; receipt order+unit. Commit sukses menghapus kesempatan, confirmed/lunas tidak dapat diurungkan; busy/unknown terkunci, gagal mempertahankan input. Draft/undo tidak mendebit stok; konfirmasi/settlement/replay debit tepat sekali. |
| AC-162 | Favorit sebelum Semua; owner memilih grup dan Naik/Turun lewat keyboard. Urutan stabil lintas stok/harga/penjualan/search, habis tetap berlabel Habis/disabled, nonaktif tersembunyi. Masuk memilih Favorit jika ada aktif, selain itu Semua. Search dalam filter; kosong menawarkan Lihat semua menu. |
| AC-163 | Channel terlihat di kepala pesanan, awal Toko/statis bila tunggal, ID platform kondisional; guard item/confirmed/harga/identitas tetap. Default Bungkus pesanan baru; Makan di tempat kiri/Bungkus kanan; D-77 tanpa copy terlihat Default penyajian/Untuk item berikutnya, Channel dan nilainya sebaris. Default tidak mengubah item lama; penambahan/editor baru mengikuti default, pengecualian per item/pemisahan baris/detail/cetak tetap unit. |
| AC-164 | Kas tertutup → Mulai bertugas/Uang awal/Buka kas, tanpa katalog disabled/identitas. Sukses → workspace/status penanggung jawab/Kelola kas. Tutup hanya Kas dengan hitung akhir/blocker; pemegang lain melalui serah-terima, tanpa reset ledger/sesi baru. |

Bukti prototipe pada review D-76; bukan kelulusan storage/keamanan/UT peserta/printer/pilot. Regresi AC-101/109/110/143/147/148–150 dan aturan uang/stok tetap.

## Penyederhanaan copy kepala pesanan — D-77

| ID | Kriteria |
| --- | --- |
| AC-165 | Kepala pesanan tidak menampilkan judul Default penyajian atau bantuan Untuk item berikutnya. Label Channel dan nilai/pemilihnya sebaris, kontrol penyajian di bawah. Nama aksesibel tetap, target44×44 dan perilaku D-76/AC-163 tidak berubah. |

## Workspace Pesanan — D-78

D-78 memperbarui bagian UI AC-117/119, bukan aturan penyelesaian/integritasnya. Regresi Kasir AC-159–165 tetap.

| ID | Kriteria |
| --- | --- |
| AC-166 | Aktif/Tersimpan tidak duplikasi, confirmed dengan tambahan draft tetap Aktif; lunas requested/belum bayar served/refund tertunda tetap ada; Riwayat hanya completed existing. Badge navigasi jumlah kedua kelompok, badge kelompok sebelum filter. |
| AC-167 | Awal Aktif/Semua/Semua; pengerjaan requested vs semua confirmed nonbatal served, draft/cancelled dikecualikan; pembayaran mengikuti settlement domain; AND/search nomor-identitas-ID platform dalam kelompok; ganti kelompok reset. Tiga empty state dibedakan; hasil kosong memiliki Reset pencarian dan filter. |
| AC-168 | Pending dulu urut konfirmasi tertua yang masih requested, lainnya konfirmasi pertama; saved draft terakhir descending; ID pembeda akhir. Missing/invalid timestamp terakhir dalam kelompok, Waktu tidak tersedia tanpa fallback created/payment. Clock tes dikendalikan; batch tambahan, perubahan batch pending dan tanpa ambang terlambat diperiksa. |
| AC-169 | Entri identitas/channel/platform, ringkasan≤2 baris +N grouped rows, served/(served+requested), status bayar dan sisa tagihan dari domain. Refund/kewajiban terpisah; pending menampilkan waktu tunggu. Draft hanya total/waktu simpan tanpa progres/waktu dapur. |
| AC-170 | Tablet1024×768/≥900 daftar40-detail60 dengan scroll independen dan placeholder awal; <900/HP360 detail penuh/Kembali ke pesanan menjaga kelompok/filter/search/scroll. Tanpa judul/panel besar/kolom Buka rincian. Selection berindikator selain warna, keyboard/fokus/44×44/teks200%/nama panjang tanpa overflow halaman. |
| AC-171 | Detail bersama: tagihan dan Bayar; item/batch/penyajian campuran dengan pilihan qty kosong dan disabled sampai dipilih, Pilih semua eksplisit; tambahan/pendukung. Bayar/serve independen/no debit ulang. Lanjutkan draft ID/nomor/identitas tetap. Aksi lainnya relevan/berizin, refund due langsung beserta penyelesaian; alasan/konfirmasi/actor/approver/receipt/cetak tetap. |
| AC-172 | Aksi sukses update list/detail dari satu state, selection keluar filter/completed dikosongkan dan notice hasil tanpa auto-select tetangga; kembali Riwayat menjaga konteks. Input/qty belum selesai diberi guard; gagal mempertahankan input, unknown memeriksa operasi sama lalu update sekali. Pilih/filter/navigasi tanpa mutasi bisnis. |

Bukti prototipe terpilih pada review D-78; tidak meluluskan storage/keamanan/UT peserta/printer/pilot.
