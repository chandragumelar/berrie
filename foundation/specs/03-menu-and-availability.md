# 03 — Menu and availability

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md).

**Acuan D-73 · 13 Oktober 2026:** harga/qty/stok agnostik; varian opsional bisa disusun dalam form Tambah menu yang sama. Fondasi visual mengikuti DESIGN-SYSTEM D-73. Alur D-72 dan invariants yang tidak diganti tetap berlaku.

**Alur Kasir D-72 · 12 Oktober 2026:** visual Jira/Inter D-71 tetap. Penyajian hanya di modal item, default Bungkus; tanpa Item berikutnya di card. Modal tanpa copy bantuan/harga per unit, hasil racikan 12px seperti penyajian dan total panel 22px. Identitas kosong diberi error dekat input, tetap bisa dikoreksi. Setelah commit, Bayar nanti otomatis mencoba dapur; pembayaran dengan draft baru mencoba dapur lalu pelanggan, pembayaran batch lama hanya pelanggan. Simpan dulu tanpa cetak/debit; detail draft menyediakan Edit pesanan ke Kasir dengan identitas/nomor tetap. Cetak ulang memilih pelanggan/dapur/keduanya yang layak, SALINAN; attempt bukan bukti kertas. Kasir kosong/notifikasi/Lihat pesanan hanya sesudah sukses; gagal/unknown mempertahankan input dan operasi sama. Riwayat tetap rentang inklusif zona toko, nominal rata kiri. D-72 mendahului uraian D-71 yang berbeda; uang/stok/izin/snapshot/gerbang rilis tetap. [Design system](../DESIGN-SYSTEM.md), [review lokal](../berrie-site/REVIEW-KASIR-D71.md).

## Struktur katalog

- Menu memiliki ID tetap, kode unik dalam toko, nama, kategori wajib, status aktif dan catatan deskripsi opsional.
- D-61: variabel dibuat/dinamai owner; seluruh pilihan berupa dropdown tunggal/multi dan boleh kosong `-`. Harga SKU mewakili kombinasi tersimpan, bukan kolom Rasa/Ukuran yang selalu wajib. Menu tanpa variabel memiliki satu SKU internal. Menu tanpa varian memiliki satu SKU internal. Label bawaan Reguler tidak ditampilkan pada keranjang/struk bila tidak membedakan pilihan; varian nyata dan kode pembeda SKU tetap disimpan/ditampilkan bila diperlukan. Menu bervarian memiliki daftar SKU datar, misalnya Kecil/Besar; pemilihan tepat satu varian wajib.
- Harga dasar dan jenis produk Normal disimpan pada SKU; stok wajib mengacu ke satu grup stok menu D-58; jenis produk berbeda dari kategori Makanan/Minuman. D-56 menambahkan label tipe Normal/Paket/Promo/custom; Paket adalah label SKU mandiri, tanpa komponen stok gabungan. Harga channel disimpan terpisah dengan referensi SKU yang sama. Satu saldo menu dipakai semua rasa/ukuran; tidak ada saldo varian tambahan atau penjumlahan saldo tampilan.
- D-61: Topping adalah contoh nama variabel, dapat dipilih beberapa sekaligus; harga menu baru ditetapkan per kombinasi. Data topping lama berharga tambahan tetap dapat dibaca/diedit tanpa menulis ulang snapshot transaksi. Tidak ada ledger kuantitas topping atau stok resep.
- Harga menu/SKU >Rp0; topping boleh Rp0. Semua harga bilangan bulat rupiah. Kuantitas penjualan/stok berupa bilangan bulat, tanpa porsi pecahan.
- Nama menu/varian/topping maksimal 80 karakter, kategori 40, kode 40; catatan item 200 dan pesanan 500. Teks diperlakukan sebagai teks biasa dan di-escape pada layar/cetakan.

Contoh: Es Kopi → Kecil Rp15.000, Besar Rp20.000; topping Extra Shot Rp5.000; catatan Tanpa gula. Dua gelas dengan topping/catatan berbeda menjadi baris terpisah. Pada satu baris qty 2, pilihan topping berlaku untuk kedua unit dan harganya dikalikan dua.

## Filter Kasir dan kategori — D-51

Menu hari ini hanya memuat SKU aktif (`available=true`) yang tidak diarsipkan. Item Tidak dijual sementara/inactive tetap dikelola di Menu & Stok, tanpa muncul di Semua, kategori, Habis atau Promo.

Semua, Habis dan Promo selalu tersedia dan tidak dapat diubah menjadi kategori toko. Hanya satu filter aktif; memilih kategori menggantikan Promo/Habis dan sebaliknya. Semua/kategori/Promo mengecualikan stok kuantitas 0; Habis hanya memuat SKU aktif berstok 0, tetap disabled dan tidak dijual. Data lama tanpa hitungan stok tidak dapat dijual dan tidak muncul di Kasir sampai admin mengisi jumlah awal di Menu & Stok. Promo hanya SKU aktif berpotongan >0 pada channel terpilih, dengan stok masih dapat dijual. Search diterapkan dalam filter terpilih.

D-68: setiap menu wajib berkategori. Daftar kategori dibuat/diedit/dihapus owner lewat Pengaturan → Kategori menu; nama 1–40 karakter, unik tanpa membedakan kapital, tidak memakai nama tab tetap. Toko baru tidak otomatis mempunyai Minuman/Makanan/Camilan. Kategori pada toko contoh adalah konfigurasi contoh, bukan tab bawaan. Kategori yang masih dipakai menu aktif tidak boleh dihapus; pindahkan menu terlebih dahulu. Ganti nama memperbarui katalog, tanpa mengubah snapshot pesanan. Kategori yang tidak dipakai boleh dihapus dengan konfirmasi; SKU/riwayat tidak dihapus. Kategori SKU diatur di Menu & Stok.

## Pengeditan dan snapshot

Menu baru default aktif; stok awal wajib diisi berupa integer ≥0, termasuk 0. Arsipkan menu yang tidak dipakai; SKU yang pernah direferensikan transaksi tidak dihapus fisik. Mengubah nama/harga/topping tidak mengubah snapshot di pesanan yang sudah disimpan. UI boleh menawarkan **Gunakan harga terbaru** hanya untuk unit draft belum dibayar; penerapannya eksplisit dan diaudit.

Menu atau topping yang kemudian habis/diarsipkan menghalangi pembayaran awal atau pemrosesan unit draft terkait. Unit yang sudah diproses tidak berubah. Harga draft lama tetap terlihat; validasi harga/ketersediaan bukan penggantian harga diam-diam.

Mengubah daftar varian membuat/mengarsipkan SKU, bukan memindahkan stok antarsku otomatis. Pengarsipan SKU diblokir jika masih ada unit draft aktif yang mereferensikannya; owner menyelesaikan atau membatalkan unit itu dulu. Riwayat unit processed dan debit stok asal tetap dipertahankan.

## Stok wajib dihitung — D-52

| Mode | Saat tersedia | Saat Minta dibuat | Pengembalian |
| --- | --- | --- | --- |
| Kuantitas | Saldo ≥qty yang akan diproses, menu aktif | Ledger negatif persis qty batch | Ledger positif eksplisit, maksimum qty pernah dikurangi yang belum kembali |

Semua SKU mengacu ke grup stok kuantitas menu yang sama untuk seluruh pilihannya (D-58). D-73: pemilik menentukan arti angka harga, qty dan stok; aplikasi tidak meminta satuan tampilan/mode jual. Ambang menipis bilangan bulat ≥0; default5. Saldo0 = habis;1 sampai ambang = menipis. Tidak ada override stok negatif. Menonaktifkan penjualan sementara dilakukan lewat status jual aktif/nonaktif tanpa menghilangkan saldo.

Stok awal wajib diisi admin (0 sah; misalnya 1000 juga sah) dan dicatat sebagai ledger `opening`. Tambah stok hasil produksi/pembelian melalui `stock_in` dengan kuantitas >0 dan keterangan. Koreksi memakai jumlah fisik target ≥0; aplikasi menghitung delta terhadap saldo saat commit, alasan wajib. Stok tidak direset ketika ganti hari atau buka kas.

Tidak ada pilihan Manual/tidak dihitung, termasuk aktivasi, edit dan CSV. Saldo wajib integer ≥0; status nonaktif tetap mempertahankan saldo. Data lama `null`/hilang tidak otomatis diubah menjadi 0 atau 1000: minta admin menghitung dan mengisi stok awal secara eksplisit sebelum menjual, catat saldo awal/audit dan pertahankan ledger/histori lama. Unit lama yang tidak pernah mendebit tidak boleh menghasilkan stock return. Pemulihan yang gagal mempertahankan sumber/data aktif; transaksi lama tidak dihapus untuk memperbaiki stok.

## Validasi dan race

Draft dan membuka form pembayaran **tidak mereservasi stok**. Pada bayar dulu, commit Simpan pembayaran memvalidasi kebutuhan seluruh unit draft dan mengonfirmasi batch atomik bersama settlement; stok berkurang saat batch dikonfirmasi. Contoh saldo 1: form pembayaran A terbuka, B mengonfirmasi 1 unit lebih dulu. Commit A ditolak tanpa settlement atau debit baru; input bertahan. Jika uang sudah diterima/terverifikasi di luar aplikasi, jangan meminta pembayaran ulang. Pesanan lunas dengan draft dari data lama/pemulihan tetap memerlukan validasi stok sebelum konfirmasi pembuatan; tidak boleh negatif atau menghapus pembayaran asal.

Saat satu batch berisi beberapa baris SKU sama, agregasikan kebutuhan semua baris sebelum membandingkan saldo. Seluruh batch berhasil atau seluruhnya gagal. Dua klik/tab tidak boleh lolos membaca saldo lama: transaksi database dan kunci penulis mengendalikan perubahan, bukan hanya tombol disabled.

## Import CSV — ditunda pada tahap ini (D-65)

Tidak ada tombol atau alur impor pada tahap ini. Kontrak berikut dipertahankan sebagai referensi kompatibilitas lama, bukan kemampuan aktif atau gerbang rilis tahap ini. Evaluasi ulang pemetaan variabel D-61 sebelum mengaktifkan impor kembali.

Template UTF-8, separator koma, header tetap:

```csv
menu_code,menu_name,category,variant_code,variant_name,price,stock_mode,available,opening_stock,low_stock_threshold
KOPI,Es Kopi,Minuman,KECIL,Kecil,15000,quantity,true,20,5
KOPI,Es Kopi,Minuman,BESAR,Besar,20000,quantity,true,20,5
TEH,Es Teh,Minuman,,,5000,quantity,true,1000,5
```

- Satu baris per SKU; menu tanpa varian mengosongkan kedua kolom varian. Dalam satu menu tidak boleh bercampur baris tanpa varian dan bervarian.
- `menu_code` dan `variant_code` menjadi kunci pencocokan, case-insensitive setelah trim; ID internal tetap. Nama/category baris satu menu harus sama.
- `price` rupiah digit tanpa pemisah ribuan; `stock_mode` wajib `quantity`; `manual` ditolak; boolean `true`/`false`.
- SKU baru wajib mengisi opening_stock, termasuk 0. SKU existing tidak boleh mengubah stok lewat import: kolom opening_stock harus kosong. Koreksi dilakukan melalui ledger stok.
- Import memperbarui nama, kategori, harga, dan ketersediaan secara eksplisit melalui preview; hitungan awal data lama yang belum valid harus diperbaiki lewat layar menu, bukan CSV. Tidak ada penghapusan karena suatu baris absen.
- Topping, relasi topping, gambar dan histori tidak diimport dalam MVP. Atur topping dari layar menu.
- Batas satu import 2.000 baris/2 MB. Parse dulu, tampilkan baru/diubah/error per baris, lalu satu commit atomik. Jika ada error, jangan tulis sebagian. Retry commit memakai ID import yang sama.
- Validasi kode duplikat, angka negatif/pecahan, field wajib, header tak dikenal dan konflik struktur. Sediakan error yang bisa disalin; file asal tidak disimpan ke server otomatis.

Export katalog menyertakan ID/kode dan struktur yang dapat dipetakan ke template. Export stok terpisah berisi saldo serta ledger. File [07](07-data-and-business-rules.md) mengatur keamanan CSV.

## Katalog channel dan pembatasan perubahan

Channel tetap: **Toko, GoFood, GrabFood, ShopeeFood**. Toko aktif secara default; platform nonaktif sampai owner mengatur dan mengaktifkannya. Owner mengaktifkan yang dipakai, menetapkan satu identitas akun outlet per platform untuk toko ini, nama tampilan dan harga SKU/topping channel. Identitas akun outlet tidak boleh dibuat ulang untuk melewati pemeriksaan duplikat. Tanpa konfigurasi harga channel, minta pengisian/persetujuan eksplisit; jangan diam-diam memakai harga toko. Snapshot order menyimpan sumber harga. Perubahan channel/harga hanya sebelum ada batch atau settlement; sesudah itu gunakan pembatalan dan order pengganti berreferensi, bukan edit historis.

Satu grup stok menu memiliki satu saldo lintas rasa/ukuran/channel. Jangan menggandakan SKU hanya karena nama/harga platform berbeda. Ketersediaan eksternal tetap diperbarui manual oleh pengguna, dengan pengingat **Perbarui juga di aplikasi platform**; tidak ada klaim stok tersinkron. Saldo 0 di Berrie tidak menutup menu platform. Saldo tidak cukup pada pesanan eksternal tetap ditolak; lakukan hitung/koreksi nyata sesuai izin, jangan override negatif.

Harga katalog/channel, stok masuk, koreksi/stock return, perubahan mode/arsip dan ketersediaan tunduk pada izin file 08, termasuk lewat CSV atau jalur alternatif. Harga efektif draft dan nominal koreksi yang membutuhkan persetujuan terikat pada nilai/revisi saat diminta. Promo SKU nyata mengikuti D-43 di bawah; diskon order tidak disamarkan sebagai promo SKU. Paket online di luar pemetaan komponen yang eksplisit tidak dipaksakan masuk sebagai satu SKU baru atau menu nominal bebas.

## Promo SKU — D-43 (7 Oktober 2026)

Pemilik meminta diskon pada SKU saat setup/edit katalog agar kasir bisa menjawab menu mana yang sedang promo. Ini mengubah batas lama diskon order saja. D-68 memperbarui cara pengaturan: owner membuat jenis diskon di navigasi **Diskon**, lalu memilihnya pada dropdown **Diskon** di samping Varian pada tabel Menu. `-` berarti tanpa diskon. Jenisnya Persen, Potongan rupiah, atau Beli X gratis Y; nama diskon wajib. Penetapan/perubahan berjejak. Alur Edit SKU → Promo D-43 adalah histori. Satu promo aktif per SKU per channel; Toko tidak otomatis diwariskan ke platform. Persen 0–100%, paling banyak dua desimal, disimpan basis point; potongan integer 0..harga dasar. D-69: jadwal mulai–selesai opsional per definisi diskon, presisi menit dalam zona toko. Tanpa jadwal, langsung berlaku setelah ditetapkan pada menu; dengan jadwal, berlaku mulai inklusif dan selesai eksklusif. Lengkapi kedua tanggal/jam; selesai harus sesudah mulai. Mesin kampanye/jadwal berulang belum ditambahkan. Promo memotong harga SKU per unit, bukan topping. D-56 menyediakan label tipe Normal/Paket/Promo/custom. Label Promo tidak otomatis memberi diskon, label Paket tidak menciptakan komponen paket.

Detail sederhana yang dipilih untuk revisi ini: promo SKU tidak digabung diskon order dalam satu pesanan. Jika snapshot promo unit aktif menghasilkan potongan >0, diskon order harus 0. Jangan menghapus diskon/promo otomatis saat menambah item; tolak konflik dengan petunjuk perbaikan dan pertahankan input. Alur gratis tetap mengikuti izin/alasan file 05/08.

Snapshot unit menyimpan harga dasar channel, promo/revisi, mode/nilai, potongan rupiah per unit dan harga setelah promo. Katalog yang diubah tidak mengganti unit lama diam-diam. **Gunakan harga terbaru** hanya draft belum dibayar secara eksplisit dan diaudit, termasuk perubahan promo. Processed/settled tidak berubah. Promo boleh diubah saat toko berjalan, tetapi unit lama menggunakan snapshotnya; perubahan total/revisi membatalkan approval lama sesuai file 08. Kasir menggunakan harga/promo yang sudah ditetapkan tanpa approval tiap transaksi; pengaturan promo hanya owner pada kasir aktif. CSV lama tetap dapat digunakan dan tidak mengubah promo existing; promo SKU baru default tidak ada. Export katalog yang kompatibel template tetap memakai header lama; nilai promo diekspor sebagai rincian terpisah berreferensi ID SKU/channel/revisi, bukan kolom yang diam-diam diterima importer. CSV import promo belum ditambahkan. Rumus, laporan, refund dan migrasi mengikuti 07/06.

Di tabel Kasir, Diskon memakai data promo sebenarnya (contoh 10% atau Rp2.000), tanpa promo **0**; kolom **Harga** berisi harga SKU setelah promo tanpa prefiks Rp per sel, sebelum topping/pajak/layanan. Filter **Promo** hanya menampilkan promo aktif dengan potongan >0 untuk channel dipilih. Nilai promo tidak menjamin SKU bisa dijual; ketersediaan tetap divalidasi.

## Penyajian katalog dan alias tipe — D-47

Daftar Kasir memakai satu baris per SKU. Nama varian inline bila menu bernama sama, dan kode SKU bila varian juga sama. Tidak mengulang subbaris generik/satuan atau menghapus identitas varian. Tidak ada stok agregat/harga rentang/default diam-diam. Keranjang, detail, snapshot dan refund mempertahankan identitas SKU sebenarnya.

D-48 mendahului penyajian kolom D-47: stok, diskon dan harga sel hanya angka/pemisah numerik, tanpa Rp/%/teks/dash/slash/rentang. Header Diskon saja; nilai sesuai jenis promo owner, jenis persen/rupiah tersedia di detail. D-52: semua SKU wajib stok angka; data lama tanpa hitungan ditahan di Menu & Stok untuk perbaikan eksplisit. Stok kuantitas 0 tetap disabled dengan penjelasan aksesibel; saldo positif yang dihentikan hanya ada di Menu & Stok sesuai D-51. Promo dan rumus bisnis tidak berubah.

Owner pada kasir aktif mengatur alias tampilan melalui Pengaturan → Tipe menu → Nama singkat (alias); default N=Normal, P=Paket, PR=Promo (D-56). Alias 1–3 karakter ASCII huruf/angka, trim/uppercase, wajib dan unik case-insensitive; validasi juga di batas penyimpanan, bukan UI saja. Alias dipetakan ke ID tipe asli, tidak mengubah domain/snapshot historis atau urutan tipe asli A–Z. Nama lengkap tersedia untuk aksesibilitas/legenda. P=Paket adalah label katalog mandiri D-56; pengaturan alias tidak membuat tipe/komponen stok baru. Tipe baru dibuat owner melalui dropdown form menu. Snapshot transaksi tetap menyimpan identitas tipe asli, bukan hanya alias yang berubah.

## Form menu, tipe dan peringatan — D-56 (8 Oktober 2026)

Tipe terpisah dari ukuran/rasa SKU. Normal/Paket/Promo tersedia sebagai label katalog; owner dapat + Tambah tipe dari dropdown dengan nama 1–40 huruf/angka/spasi/tanda titik/&/strip, unik tanpa membedakan kapital. Tipe di kiri, Kode unik read-only di kanan menampilkan alias tipe otomatis. Huruf pertama uppercase digunakan jika belum dipakai; jika bentrok gunakan prefix 2–3 karakter atau huruf pertama+angka 2–99 (maksimum 3 karakter), bukan kode duplikat. N/P/PR bawaan. Kode SKU tetap unik otomatis alias-sequence seperti N-001/N-002; kode/ID lama tidak diganti ketika edit tipe. Nama tipe asli dan snapshot disimpan terpisah dari alias. Tanpa bundle/komponen stok; jadwal diskon mengikuti D-69.

Kategori dropdown mengambil daftar owner pada Pengaturan, dengan Tanpa kategori; kategori lama yang dihapus boleh dipertahankan pada SKU asal. Harga platform hanya muncul jika channel diaktifkan owner; setiap channel aktif memerlukan harga eksplisit per SKU, tanpa fallback harga toko. Channel tanpa harga tidak dapat dijual, dengan petunjuk Isi harga channel di Menu & Stok.

Menu ini punya pilihan ukuran / rasa membuka daftar datar 1–30 nama pilihan (wajib unik), harga Toko/channel aktif dan Total stok (wajib integer ≥0) masing-masing. Tambah ukuran/rasa dalam form yang sama; tidak ada matriks kombinasi. Tambah varian/ukuran dari detail SKU membuka form dengan identitas menu asal; stok pilihan baru wajib eksplisit. Topping section terpisah: pilih existing atau buat nama 1–80 dan tambahan harga integer ≥0; nama topping baru unik. Topping dipilih kasir di dialog item dan harga ditambah per unit, tanpa ledger bahan. Seluruh SKU baru/topping/alias/stock opening/audit commit atomik dan retry tidak mengulang. Edit satu SKU existing mempertahankan saldo/histori/promo; perubahan saldo melalui Tambah/Koreksi stok.

Label form: Total stok (wajib), Stok Minimal. Ambang default 5, integer ≥0; saldo ≤ambang termasuk 0 masuk Peringatan stok. Copy: Peringatan muncul saat stok mencapai angka ini atau lebih rendah. Notifikasi di aplikasi setelah commit saat melintasi batas, tanpa pengulangan setiap render; sesudah isi stok melewati ambang dapat muncul lagi pada crossing berikutnya. Daftar selalu tersedia lewat Stok rendah dan mengecualikan arsip; tampil per SKU, tidak dijumlah antarukuran/channel. Bukan push/WhatsApp/email atau stok platform tersinkron.

## Pengelolaan tabel, stok bersama dan racikan — D-57–60 (8 Oktober 2026)

D-61/62 memperbarui kolom tetap/racikan bawaan dan pengisian stok di bawah; stok bersama dan invariants D-58 tetap. D-65 menunda impor. Urutan tempel lama yang mengunci Rasa/Ukuran tidak lagi dipakai; paste biasa satu sel tetap tersedia. Harga/kategori banyak baris dan navigasi keyboard tetap.

Instruksi pemilik terbaru mendahului form overlay/per-SKU D-56. Menu & Stok memiliki tab Menu, Stok dan Rekap online. Tabel Menu dapat diedit langsung, satu pilihan rasa/ukuran per baris: Milkshake Coklat/Pisang/Vanilla = tiga baris. Nama dan grup menu menghubungkan stok; varian tetap harga/identitas jual tersendiri. Kolom inti Menu/Rasa/Ukuran/Harga sebelum kolom tambahan Kategori/Tipe/Racikan/Topping/Status/Aksi. Dropdown kategori/status/racikan, daftar tipe dengan custom, Tab/Enter, tempel TSV multiline, duplikat pilihan, pilihan banyak baris untuk kategori/harga, filter error sel, input bertahan dan satu Simpan perubahan. Kode SKU stabil/otomatis. Perubahan tabel dikerjakan owner pada kasir aktif; jalur izin lama untuk tindakan terpisah tetap berlaku. Batas 500 baris tabel, 30 pilihan per menu; error menggagalkan seluruh commit.

D-69 mengganti pagination D-60: Menu dan Stok memakai gulir vertikal dalam tabel dengan header tetap, row minimum 64 px, input/select minimum 56 px pada tablet1024×768; font14/400 dan target minimum lama tetap. Search/filter dan gulir mengakses seluruh daftar; input lintas gulir/tab dipertahankan. Topping/Rincian berupa tombol teks tanpa pill. Nama menu/checkbox tetap saat scroll horizontal. Target Kasir ≥8 menu tidak berubah.

D-58: satu grup stok ber-ID tetap per menu, termasuk satu stok awal dan Stok Minimal. Seluruh rasa/ukuran memakai saldo itu; satu gelas Regular atau Large masing-masing memakai satu unit, tanpa stok bahan/resep/rasa terpisah. Contoh stok Milkshake 50, Coklat 1 + Pisang 1 mengurangi saldo menjadi 48 satu kali; setiap tampilan varian menunjukkan saldo bersama, bukan stok yang boleh dijumlah. Konfirmasi mengagregasikan kebutuhan grup seluruh baris sebelum debit, rollback bila kurang. Penambahan pilihan tidak menambah stok awal lagi. Tambah/Koreksi stok bekerja pada grup, bukan SKU; return memakai grup asal snapshot dan batas debit unit lama. Stok minimal/peringatan satu per grup. Arsip pilihan tidak menghapus grup/ledger/histori. Pemindahan grup atau migrasi saldo per-varian lama memerlukan staging dan hitungan fisik berjejak, tidak otomatis menjumlah/menimpa; kegagalan mempertahankan data asal.

Racikan D-58 adalah kelompok pilihan seperti Es (Normal/Less ice/Tanpa es) dan Gula (Normal/Less sugar/Tanpa gula). Preset Es & gula dan Atur sendiri tersedia pada tabel; 0–8 kelompok, masing-masing 2–12 opsi unik, nama/opsi maks. 40 karakter, bawaan sah. Kasir memilih satu per kelompok, bawaan Normal pada preset. Racikan tanpa tambahan harga/debit terpisah; berbeda dari rasa/ukuran berharga dan topping berharga ≥0. Snapshot pilihan melekat pada unit, membedakan baris keranjang dan terbaca pada tiket/struk; edit katalog tidak mengubah snapshot lama. Kuantitas topping/bundle/BOGO belum ditambahkan.

D-59: default transaksi Toko. Online memakai rekap pemakaian stok gabungan setelah antrean reda, tanpa menyalin order/harga/rasa/topping/pelanggan dan tanpa settlement/Payment/pencairan baru. Owner mengaktifkan pengingat; kasir berizin mengisi jumlah per grup menu pada rentang dari batas rekap terakhir sampai waktu yang dipilih (tidak boleh masa depan). Rentang berikutnya mulai tepat dari batas terakhir; hasil gagal tidak memajukan batas. Batas rentang secara data (from, until]; rekap awal mulai waktu pengaktifan yang terlihat. Koreksi hitungan fisik bukan bukti online terjual.

Jumlah rekap harus mengecualikan semua pesanan yang sudah dicatat di Berrie; konfirmasi ini wajib. Tidak membuat order online rinci dari rekap yang sama di kemudian hari; telusuri koreksi/ledger dengan referensi jika diperlukan. Seluruh grup divalidasi cukup dan didebit atomik satu operasi; retry receipt tidak menggandakan debit. Qty 0 berarti sudah diperiksa tanpa pemakaian, tetap mencatat periode. Histori memuat periode, waktu catat, actor, menu/qty dan operation ID. Saldo bisa terlalu tinggi sebelum rekap, ditulis jelas pada tab, pemicu Rekap online menetap di header dan pengingat tutup kas. Pengingat bukan bukti jumlah/order online atau blocker tutup kas tambahan. Ketersediaan merchant tetap manual. Jalur platform rinci lama tetap opsional bagi toko yang sudah memakai, wajib mengecualikan datanya dari rekap; setup harga/akun platform tidak dibutuhkan untuk rekap stok saja.

CSV mempertahankan grup stok, saldo, racikan dan identitas rasa/ukuran SKU existing. Perubahan nama existing atau penambahan pilihan ke menu existing memakai tabel Menu, agar hubungan stok tidak ditebak dari nama. Menu baru dengan beberapa baris variant_code pada menu_code sama wajib menuliskan saldo awal/minimal yang sama pada semua baris; importer membukukan satu saldo awal grup, bukan menjumlahkannya. Ketidaksamaan menahan seluruh impor.

## Menu dan varian fleksibel — D-61/D-66/D-67

**+ Menu** membuka satu form nama → kategori/tipe → harga dan **Varian** opsional → stok awal/minimal (D-73). Tanpa varian label **Harga (Rp)**; setelah menambah varian **Harga dasar (Rp)** dengan nama/cara memilih/pilihan/tambahan langsung pada form yang sama dan preview **Harga akhir**. Tambahan0 mempertahankan harga; varian tidak wajib dibuat setelah menu disimpan. Batal menutup tanpa menambah draft. Tambahkan ke tabel menaruh semua row hasil varian paling atas; Simpan perubahan mengommit, **Batal** mengembalikan seluruh draft tabel ke data committed terbaru. Batal tambah menu hanya membuang grup baru. Tabel memiliki dua status **Dijual** dan **Tidak dijual**; sel status saja hijau/merah dan label selalu terbaca. Tidak dijual tetap terlihat untuk diedit, tidak tampil di Kasir. Checkbox/edit massal dipensiunkan; edit langsung per row. Nama/kategori/harga tetap dapat diisi langsung, kode/SKU stabil.

**Hapus menu** melalui ikon tong sampah berlabel aksesibel di samping nama pada row membuka konfirmasi nama serta dampak seluruh varian. Batal tidak mengubah data; **Ya, hapus menu** soft delete seluruh grup, menyembunyikannya dari daftar aktif Menu/Stok/Kasir. Simpan/batalkan draft tabel dahulu sebelum hapus. Draft pesanan yang memakai menu harus dituntaskan atau dibatalkan. ID, stok, histori pesanan/snapshot dan ledger tidak dihapus; status Diarsipkan tidak menjadi pilihan jual ketiga. Izin mengikuti Arsip menu; tidak ada purge.

**+ Varian / N varian** adalah tombol jelas berfill/border. Modal langsung berisi nama, cara memilih Satu pilihan/Beberapa pilihan, pilihan dan **Tambahan (Rp)** di samping setiap pilihan; tidak ada preset Rasa/Ukuran/Topping, copy menu tanpa varian, pengaturan harga atau Lanjut ke harga. Harga dasar menu >0; tambahan per pilihan integer≥0, 0 berarti tidak mengubah harga. Harga dasar + jumlah tambahan pilihan adalah harga sebelum promo/pajak/layanan. **Pilihan 1** otomatis default bertanda bintang; jika dihapus, pilihan berikut menjadi pertama/default. Nama/nilai unik, batas12 variabel/30 opsi/40 karakter tetap. Terapkan varian memperbarui draft tabel, belum commit.

Pilihan tunggal yang mempunyai tambahan menghasilkan row kombinasi harga (≤30 aktif/menu); pilihan semua0 menjadi modifier gratis tanpa row SKU tambahan. Multi berharga menjadi tambahan per pilihan yang dipilih, tanpa daftar subset atau stok bahan; promo SKU tidak memotong tambahan multi. `-` tetap kosong; single berharga kosong tidak mempunyai SKU dan ditahan. Multi dapat dikosongkan. Kasir hanya melihat varian menu itu, dengan default pertama; pilihan/definisi/harga disnapshot, edit katalog tidak menulis ulang pesanan lama. Harga dan SKU existing dipertahankan bila dapat direpresentasikan; harga legacy nonaditif/multi kombinasi atau channel berselisih berbeda ditahan dengan pesan, bukan dikonversi diam-diam. Penggabungan pilihan dengan status/promo/tipe/kategori berbeda juga ditahan. SKU yang tidak lagi dipakai menjadi tombstone historis, tidak terlihat sebagai baris aktif.

Kolom Status/Menu/Varian/Harga/Kategori lalu pilihan berharga/channel/Tipe; lima row≥64/input≥56, nama sticky saat scroll, tanpa checkbox/Rincian/+Kombinasi. Konten/error boleh tumbuh. Diskon adalah tujuan navigasi utama sejajar Menu & Stok, bukan sub/menu tab. Aturan promo SKU/channel dan larangan gabung diskon order tetap.

## Tabel stok dan saldo acuan — D-62/D-67

Stok satu grup menu D-58. Tabel Stok satu row per ID grup/nama menu, bukan per SKU: **Status, Menu, Harga, Kategori, Stok awal, Stok minimal, Stok sisa**. Harga read-only berupa satu angka atau rentang min–maks jika varian berbeda; status Dijual bila ada varian aktif dijual. Ini ringkasan administrasi, tidak mengganti satu harga/SKU pada Kasir. Hanya Stok awal dan Stok minimal dapat diedit.

**Stok awal** adalah saldo acuan dari setup, hasil opname atau perubahan terakhir; tetap sampai perubahan eksplisit berikutnya. Penjualan/rekap/return mengubah **Stok sisa**, bukan menulis ulang stok awal. Ubah stok awal membuka modal total stok aktual baru≥0 (bukan tambahan), preview saldo saat dibuka dan alasan wajib. Simpan menghitung delta target−saldo kini dan menetapkan baseline serta saldo; race saldo berubah sejak form dibuka menahan simpan, bukan menimpa. Catat waktu/tanggal, actor, alasan, before/after dan delta pada log. Aktivitas Koreksi stok/default persetujuan owner, idempotensi/atomic tetap. Batal/gagal tidak mengubah saldo dan gagal mempertahankan input. Stok opname memakai alur Ubah stok awal; tab Isi stok/Stok opname lama dipensiunkan.

Stok minimal integer≥0 adalah konfigurasi owner/batas peringatan saja. Batal perubahan mengembalikan draft ambang; Simpan stok minimal tidak membuat delta stok. Status/menu/harga/kategori/sisa read-only pada Stok. Log perubahan stok dapat dibaca di tab ini, termasuk tanggal/jam/pelaku. Data lama tanpa hitungan tetap ditahan sesuai D-52.

## Koreksi rekap online — D-63

Tanggal/jam akhir memakai presisi menit, tanpa detik pada kontrol baru; checkpoint lama yang mempunyai detik tetap dipertahankan dan akhir baru harus lebih besar darinya serta tidak melewati sekarang. **Jumlah terpakai online** memakai field berbatas nyata, placeholder Isi jumlah dan label aksesibel. Kosong dihitung0; preview sisa bukan perubahan stok sebelum simpan.

Histori mempunyai **Koreksi**. Isi jumlah yang benar untuk menu asal, preview perubahan stok, alasan wajib; mengikuti aktivitas Koreksi stok/default persetujuan owner, bukan izin rekap rutin. Catatan asal/rentang/checkpoint tidak ditimpa. Revisi mencatat actor/approver pada audit, waktu, alasan, nilai sebelum/sesudah dan operation ID. Delta stok = jumlah sebelumnya − jumlah yang benar, diterapkan atomik sekali terhadap saldo grup kini. Koreksi berikutnya dibandingkan dengan revisi terakhir. Tidak menambah pesanan/omzet/kas. Saldo tidak boleh negatif; grup historis/arsip tetap ditelusuri. Approval dibatalkan bila isi atau revisi asal berubah. Histori dapat dibaca sebagai catatan asal dan perubahan, bukan hanya angka akhir.

D-66 (histori; alur/harga/navigasi diperbarui D-67 di atas): istilah UI **Varian** mengganti Variabel; struktur domain variabel fleksibel tetap. Copy editor: “Tambahkan pilihan yang dimiliki menu ini” dan “Contoh: Ukuran cup (Kecil, Besar). Topping (Susu, Cokelat). Ice (Normal, Less Ice)”. Diskon katalog mempunyai subbagian sendiri di bawah Menu & Stok; aturan promo SKU/channel dan batas penggabungan diskon tetap. Stok opname hanya di tab Stok; ledger dibaca di sana. Menu baru ditaruh paling atas setelah modal diterapkan dan sesudah save; batal modal tidak menambah baris atau stok.

D-67: tiga bantuan rekap “Stok belum mencakup pemakaian online setelah …”, “Hanya stok; tidak menambah omzet atau kas. Kosong dihitung 0.” dan “Ketersediaan di aplikasi merchant tetap diatur di sana.” dihapus dari UI. Dari/Sampai, pengecualian pesanan Berrie, histori/koreksi/pengingat tetap; rekap tetap stok saja tanpa omzet/kas dan merchant tetap manual.

## Pengelolaan katalog dan pustaka diskon — D-68

Hapus menu berada di kolom paling kiri. Konfirmasi tetap mengarsipkan seluruh grup dan menulis log nama menu, tanggal, jam, actor serta alasan; log tetap terbaca setelah baris hilang. Aksi **Batal** dan **Simpan perubahan** hanya muncul ketika draft berbeda dari committed, berdampingan dengan ukuran sama. Mengembalikan isi semula menyembunyikan aksi. Filter **Perlu diperbaiki · N** hanya muncul jika ada sel salah; memperbaiki semua error mengembalikan daftar biasa. Input gagal tetap ada. Katalog berubah selama draft diedit menahan save agar kategori/harga/diskon/stok terbaru tidak tertimpa.

Kategori wajib pada tambah/edit menu dan aktivasi; tanpa opsi Tanpa kategori. `+ Tambah kategori…` atau `+ Tambah tipe…` membuka input di tempat beserta Batal/Tambahkan. Penambahan nama adalah simpan konfigurasi terpisah; Batal form Menu tidak menghapus nama konfigurasi yang sudah ditambahkan. Pengaturan Kategori menu/Tipe menu menyediakan tambah, edit nama dan hapus berkonfirmasi. Hapus yang masih dipakai menu aktif ditahan; rename memperbarui katalog/alias tipe tanpa mengubah kode SKU/snapshot unit lama. Tipe awal menu baru mengikuti pilihan pertama yang tersedia.

Pustaka diskon mempunyai ID/revisi tetap, nama unik tanpa membedakan kapital, Persen >0..100% (maksimal dua desimal), Potongan integer >0 yang tidak boleh melebihi harga SKU pada channel tujuan, dan **Beli X gratis Y** (X/Y integer1..99). Edit definisi memperbarui penawaran berikutnya pada SKU terkait; snapshot pesanan lama tetap. Hapus diskon yang masih disematkan pada SKU aktif ditahan; lepas ke `-` dahulu. Satu definisi dapat dipakai banyak SKU. Toko dan platform tetap diatur eksplisit per channel, tanpa pewarisan otomatis; channel aktif mempunyai dropdown diskonnya sendiri di sebelah harga channel.

Beli X gratis Y berarti menerima X+Y unit dengan membayar harga menu X unit. Contoh Beli2 gratis3: qty5 pada form, bayar menu2. Jumlah yang dimasukkan mencakup unit gratis; tidak menambah unit tersembunyi. Berlaku berulang untuk kelompok lengkap SKU/varian, harga/revisi promo, topping, pilihan, penyajian dan catatan yang sama pada draft pesanan yang sama. Sisa unit bayar penuh. Tambahan draft identik bisa bergabung; unit yang sudah dikonfirmasi tidak dihitung ulang atau digabung ke batch berikutnya. Topping seluruh unit dibayar penuh. Stok terpakai seluruh unit saat konfirmasi, tanpa debit saat draft; promo tidak digabung diskon order, termasuk sebelum jumlah memenuhi syarat.

Diskon jumlah dialokasikan ke seluruh unit kelompok dengan rumus file07; refund memakai alokasi asal, bukan satu unit gratis bernilai nol. Batal unit draft menghitung ulang kelompok draft yang tersisa; batal/refund unit confirmed mempertahankan snapshot. Kasir menampilkan Beli X gratis Y di nama/rincian, harga satuan normal dan kolom Diskon0 sebelum jumlah diketahui; total item/keranjang menunjukkan potongan aktual. Tanpa bundling menu berbeda, stok bahan atau gateway; jadwal diskon mengikuti D-69.


## Jadwal diskon dan tabel kontinu — D-69 (10 Oktober 2026)

Modal + Diskon menyediakan Nama/Jenis/nilai dan jadwal opsional berupa Tanggal mulai, Jam mulai, Tanggal selesai, Jam selesai; zona toko terlihat. Hapus jadwal mengembalikan berlaku tanpa rentang. Tanpa contoh/copy teknis tambahan. Jadwal melekat pada definisi reusable dan seluruh penetapan channel, tetap hanya menu/channel yang dipilih. Status Terjadwal/Aktif/Selesai dan rentang terlihat pada pustaka. Jam perangkat salah dapat memengaruhi prototipe; validasi waktu tepercaya/offline produksi tetap perlu dibuktikan.

Diskon mulai/berakhir untuk quote item baru; snapshot item yang sudah dipilih tidak berubah otomatis. Perbarui harga draft adalah tindakan eksplisit beralasan yang memakai quote saat itu; confirmed tidak berubah. Definisi boleh disimpan dengan rentang lampau untuk audit/edit; tidak otomatis berlaku lagi. Validasi nominal terhadap harga tetap berlaku termasuk definisi terjadwal. Tidak ada tugas cloud/deployment untuk mengaktifkan jadwal; eligibility dinilai saat quote. Tanpa jadwal berulang/ulang tahun otomatis.

Menu/Stok/Rekap online mengakses seluruh row melalui gulir vertikal, tanpa Sebelumnya/Berikutnya; header sticky, state lintas gulir/tab tetap. Varian menghapus bantuan panjang dan bintang/Default visual; pilihan pertama tetap default sesuai domain D-67. Rekap: Dari read-only checkpoint, Sampai tanggal+jam terpisah, Waktu sekarang sejajar input; semua mengikuti zona toko dan presisi menit. Tidak mengubah aturan ledger/cutoff/koreksi.

## Harga dan jumlah agnostik — D-73

Owner menentukan arti harga per angka qty; aplikasi menyediakan harga rupiah, jumlah dan stok numerik tanpa mode ml/gelas/berat atau konversi satuan. Harga100 × qty200 = Rp20.000 sebelum promo/pajak/layanan/tambahan. Pemilik dapat menamai menu Kopi / ml; nama bukan aturan perhitungan. Qty tetap integer1–999 per baris; pecahan tidak ditambahkan.

Menu tanpa varian memakai satu harga. Varian semua tambahan0 tidak mengubah harga; single berharga dan multi berharga mengikuti D-67. Harga dan seluruh tambahan berlaku per qty: qty200 juga mengalikan tambahan per pilihan bila ada. Stok memakai angka yang sama:1000 →800 sesudah konfirmasi qty200; draft tidak mendebit dan settlement batch confirmed tidak mendebit lagi. Semua varian tetap berbagi satu saldo tanpa faktor konversi; arti angka saldo harus konsisten menurut owner. D-73 mendahului asumsi lama “satu gelas selalu satu unit” dan pengaturan satuan tampilan, tanpa stok resep/konversi/pecahan.

## Editor dan alias terpadu — D-75 · 31 Oktober 2026

Menu dan Stok minimal menampilkan bar aksi sticky di atas area editor hanya saat nilainya berbeda dari committed: status tertulis belum disimpan, Batal dan Simpan dengan ukuran setara. Bar berada dalam alur layout dan mempunyai ruang gulir fokus; tidak menindih baris terakhir, navigasi HP atau keyboard. Berpindah tab mempertahankan draft dan penanda masing-masing; keluar dari pengelolaan ditahan sampai simpan/batal. Reload/menutup tab memakai peringatan browser ketika draft ada, bukan klaim persistensi. Gagal mempertahankan input; hasil unknown diperiksa dari operasi sama, input/aksi mutasi terkunci. Tidak ada field Keterangan perubahan opsional pada editor Menu; alasan audit rutin dibuat otomatis. Koreksi stok tetap meminta alasan wajib.

Alias dipindah dari Pengaturan → Tampilan ke **Pengaturan → Tipe menu**, berdampingan dengan nama tipe sebagai **Nama singkat (alias)**. Tab Tampilan terpisah dihapus. Validasi alias 1–3 huruf/angka ASCII, uppercase/unik tetap; perubahan nama/alias satu baris atomik, tidak mengganti ID/kode SKU atau snapshot transaksi. CRUD kategori/tipe dan batas izin D-68 tetap.

## Favorit dan katalog cepat — D-76

Filter **Favorit** sebelum Semua; Semua/Habis/Promo dan kategori owner tetap. Favorit berupa daftar ID grup menu berurutan milik toko, bukan SKU, tanpa pengurutan otomatis menurut penjualan/harga/stok. Owner mengatur di Menu & Stok → Favorit: pilih menu, **Naik/Turun** memakai tombol keyboard, hapus favorit tanpa menghapus menu. Satu kartu per grup; menu berpilihan tetap editor. Menu tidak dijual/nonaktif/diarsipkan tidak muncul di Kasir; kehabisan stok tidak mengubah posisi favorit, tampil **Habis**, tidak dapat ditambahkan. Menonaktifkan sementara tidak menghapus urutan tersimpan.

Pencarian membatasi filter aktif. Favorit kosong/tidak cocok memberi penjelasan dan **Lihat semua menu**. Nama/harga utama, kategori berulang di kartu dihilangkan; promo, pilihan, stok rendah/habis tetap terlihat. Nama panjang tumbuh tanpa mengecilkan target44×44.

Menu sederhana mempunyai satu SKU yang bisa dijual dan tidak mempunyai pilihan aktif yang perlu dipilih/ditampilkan. Label kombinasi tetap tunggal (misalnya Botol pada satu SKU) bukan pilihan interaktif. Pilihan racikan/topping aktif atau lebih dari satu SKU yang dapat dijual memerlukan editor. Harga/promo/channel tetap memakai quote domain; nilai lama tidak diperbarui diam-diam.
