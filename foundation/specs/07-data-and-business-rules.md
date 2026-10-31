# 07 — Data and business rules

**Pesanan aktif D-78:** workspace Aktif/Tersimpan dan detail bersama mengikuti bagian D-78; default Lunas/tabel/halaman detail tablet lama diganti. Kasir D-76/D-77 dan aturan integritas tetap. [Review](../berrie-site/REVIEW-PESANAN-D78.md).

**Acuan Kasir terkini D-76 · 31 Oktober 2026:** tambah langsung menu sederhana/Urungkan, Favorit berurutan tetap, Channel dan default penyajian di kepala pesanan, serta Mulai bertugas. D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal pada D-71/72. Aturan uang, stok, izin, commit, cetak dan pemulihan tetap. [Bukti dan batas lokal](../berrie-site/REVIEW-KASIR-D76.md).

**Penegasan D-73 · 13 Oktober 2026:** angka harga/qty/stok agnostik terhadap satuan fisik. Harga100 × qty200 =20000 sebelum komponen lain; konfirmasi mengurangi200 dari grup, settlement berikutnya tidak mendebit lagi. Batas integer1–999 per baris dan uang integer tetap. Seluruh tambahan harga per pilihan dikalikan qty yang sama; tidak ada faktor satuan/konversi/qty pecahan atau stok resep. Pemilik menentukan arti angka.

## Model data

Semua entitas bisnis memiliki UUID, `store_id`, waktu pencatatan, dan versi schema. Waktu kejadian lokal dan waktu diterima server disimpan terpisah. Field yang relevan menyimpan `device_id`, `device_epoch`, `operation_id`, `local_sequence`, `cash_session_id` dan `revision`.

| Entitas | Isi/relasi utama |
| --- | --- |
| Store, Owner | Identitas, owner tunggal, zona waktu, setting struk dan tarif |
| Device, OfflinePermit | Perangkat aktif, epoch, masa berlaku bertanda tangan dan checkpoint |
| Subscription | Awal trial, periode bayar, tenggang, status; hanya server dapat menerbitkan entitlement |
| Category, Menu, SKU | Kode, nama, harga, status jual, referensi grup stok wajib dan promo SKU per channel/revisi; SKU milik menu |
| Topping, MenuTopping | Harga, tersedia, relasi opsi yang diizinkan |
| StockGroup, StockLedger | ID grup menu, saldo/ambang integer; ledger grup dengan SKU/unit/batch asal bila ada, delta, alasan, saldo sebelum/sesudah dan jejak migrasi |
| MenuVariable, VariableOption, VariableSelection | ID/nama menu, single/multi, kombinasi/gratis, nilai/default; pilihan unit dan definisi tersnapshot; RecipeGroup lama kompatibel |
| OnlineStockRecap, OnlineStockRecapCorrection | Rentang/qty asal immutable, revisi jumlah terkini, delta grup, waktu/actor/approver/alasan/operation ID; checkpoint tidak berubah karena koreksi |
| CashSession, CashEntry | Buka/tutup, modal, event kas nonpenjualan/penyesuaian, snapshot tutup |
| Order | Nomor, sesi, default penyajian untuk item berikutnya, no. antrean/nama, tarif snapshot dan revisi |
| OrderLine, OrderUnit | Snapshot harga dasar/promo SKU/topping/catatan/penyajian makan di tempat atau bungkus dan identitas setiap unit; state operasional |
| KitchenBatch, BatchUnit | Nomor batch, waktu proses, daftar unit immutable |
| Cancellation | Unit, alasan, status sebelumnya, pemberitahuan dapur, refund due terkait |
| Settlement, UnitAllocation | Nilai final order, potongan promo SKU dan alokasi diskon order/pajak/layanan/total per unit |
| Payment | Settlement nonzero dengan penerimaan langsung, satu metode, uang diterima/kembalian bila tunai, referensi manual |
| Refund, RefundUnit | Payment asal, unit, nilai asli, metode pengembalian dan sesi sekarang |
| StockReturn | Unit yang pernah mengurangi stok, qty/nilai delta dan alasan kelayakan |
| MethodAdjustment | Payment asal, metode lama/baru, alasan dan pasangan delta klasifikasi |
| PrintJob, PrintAttempt | Payload snapshot, tujuan tiket/struk, original/salinan, attempt/hasil pengiriman; tidak menganggap attempt sebagai bukti kertas fisik (D-71) |
| AuditEvent | Actor owner/staf, approver bila ada, kebijakan/otorisasi, objek, alasan, sebelum/sesudah, waktu kejadian/pencatatan; append-only |
| Outbox, SyncReceipt | Envelope operasi, urutan, hash, status/retry dan ACK server |
| BackupManifest, RecoveryReview | Cakupan backup, checkpoint/hash/schema dan transaksi konflik pemulihan |

Relasi lintas toko dilarang, termasuk pada foreign key komposit atau pemeriksaan transaksional server. Data katalog boleh diarsipkan; dokumen transaksi, ledger, audit dan receipt tidak dihapus lewat UI operasional.

## Invariants dan keunikan

1. Maksimal satu device epoch aktif dan satu sesi kas terbuka per toko pada server. Perangkat offline lama ditangani sebagai cabang konflik, bukan penulis kedua yang sah.
2. `order_number` unik dalam toko; UUID/operation ID tetap ketika retry.
3. Unit berada pada maksimal satu batch dan mengurangi stok paling banyak sekali. Keunikan ledger `process + unit_id` enforced.
4. Qty pengembalian stok per unit tidak melebihi qty debit asli; cancellation dan refund menggunakan batas bersama.
5. Setiap SKU mempunyai referensi ke satu grup stok menu dengan saldo integer ≥0 (tidak nullable; mode quantity saja). Data lama tanpa hitungan ditahan sampai admin mengisi saldo awal eksplisit; tidak ada penggunaan float untuk uang atau stok.
6. Maksimal satu settlement per order. Settlement nonzero mempunyai tepat satu sumber: Payment penerimaan langsung XOR PlatformReceivable; settlement Rp0 tanpa keduanya. Satu refund moneter atau pembalikan platform per unit sesuai sumbernya; kumulatif tidak melebihi nilai sumber/alokasi asal.
7. Bayar menggabungkan settlement dan konfirmasi unit draft dalam satu command/commit; state keuangan dan pengerjaan tetap terpisah. Debit berasal dari batch baru, paling banyak sekali per unit. Pembayaran unit yang sudah dikonfirmasi tidak membuat batch/debit baru. Membuka/menutup form tidak memberi efek. Cetak tidak mengubah keuangan/stok; sync tidak mengulang efek bisnis.
8. Cash session tertutup tidak menerima event baru. Refund/koreksi masa lalu memakai sesi kini.
9. State, ledger, audit dan outbox satu operasi commit atomik. Jika salah satu gagal, semuanya rollback.
10. Data tersimpan lokal tidak sama dengan ACK server atau backup harian berhasil.

Kunci unik harus ada di IndexedDB dan server sejauh bentuk data memungkinkan; business constraints lintas entitas diperiksa dalam transaksi. Tombol disabled saja tidak cukup.

## Uang, pajak dan alokasi

Uang disimpan integer rupiah (database bigint; kalkulasi integer/decimal aman). Tarif disimpan basis point integer, 100 bp = 1%, rentang 0–10.000. Pembulatan nonnegatif `half-up(n/d) = floor((2n+d)/(2d))`. Batasi input nominal maksimal Rp999.999.999 per field dan qty 1–999 per baris; tolak total yang melampaui batas representasi/validasi, jangan overflow.

Untuk unit tidak dibatalkan sebelum settlement:

```text
gross_i = harga_sku_snapshot + jumlah_harga_topping_snapshot
promo_i = 0, potongan_rupiah_sku, atau half_up(harga_sku_snapshot × promo_bp / 10.000)
P = Σ promo_i
S = Σ gross_i
D = diskon_order_nominal, atau half_up(S × diskon_order_bp / 10.000)
Syarat: P > 0 => D = 0; 0 ≤ promo_i ≤ harga_sku_snapshot
B = S − P − D
T = half_up(B × pajak_bp / 10.000)
L = half_up(B × layanan_bp / 10.000)
G = B + T + L
```

Harga eksklusif pajak/layanan. Keduanya dihitung dari B, bukan pajak atas layanan. Nonaktif berarti tarif efektif nol. Simpan tarif dan label snapshot. Tarif di setting bukan penetapan kewajiban hukum usaha.

Alokasi deterministik per unit menggunakan metode sisa terbesar:

1. Alokasikan D proporsional `gross_i / S`: ambil lantai tiap bagian, bagikan sisa Rp1 menurut sisa pecahan terbesar; seri diurut `unit_id` leksikografis.
2. `base_i = gross_i − promo_i − discount_i`; promo_i potongan SKU langsung pada unit itu, bukan dialokasikan ke SKU lain.
3. Alokasikan T dan L secara terpisah proporsional `base_i / B`, memakai aturan sisa sama. Bila B=0, seluruh alokasi pajak/layanan nol.
4. `total_i = base_i + tax_i + service_i`. Jumlah komponen unit harus sama persis dengan komponen order; diskon total = P + D, dengan komponen promo SKU/diskon order terpisah.

Alokasi dibekukan saat settlement. Refund beberapa kali mengambil total_i unit yang dipilih, tidak menghitung ulang proporsi terhadap sisa order. Dengan demikian refund seluruh unit mengembalikan tepat G tanpa selisih pembulatan.

Contoh: unit A Rp10.000, B Rp20.000, diskon Rp1.000, pajak 10%, layanan 5%. S=30.000; B=29.000; T=2.900; L=1.450; G=33.350. Alokasi A: diskon 333, dasar 9.667, pajak 967, layanan 483, total 11.117. B: diskon 667, dasar 19.333, pajak 1.933, layanan 967, total 22.233. Refund A lalu B = Rp33.350 tepat.

## Kontrak operasi

Setiap command memuat `operation_id`, store/device/epoch, urutan lokal naik, jenis, target, versi yang diharapkan dan payload. UI membuat ID sebelum commit pertama dan memakainya lagi saat retry. Server menyimpan receipt unik `(store_id, operation_id)` plus hash payload. ID sama/payload sama → hasil lama; ID sama/payload berbeda → konflik, jangan overwrite.

API mutasi server memvalidasi izin/perangkat dan menjalankan seluruh efek dalam satu transaksi PostgreSQL. Client tidak mendapat hak menulis tabel finansial langsung. Operasi datang berurutan per device epoch; gap urutan ditahan sampai predecessor tersedia. ACK mengembalikan operation ID, sequence, waktu commit dan checkpoint. Setelah koneksi putus, client mengirim ulang sampai mendapat ACK.

Target error domain: `INSUFFICIENT_STOCK`, `ORDER_CHANGED`, `ALREADY_SETTLED`, `REFUND_LIMIT`, `CASH_SESSION_CLOSED`, `OFFLINE_PERMISSION_EXPIRED`, `DEVICE_REVOKED`, `BACKUP_INVALID`. UI menampilkan tindakan pemulihan dalam bahasa Indonesia, bukan hanya kode.

## Audit, waktu, dan keamanan input

Simpan UTC untuk timestamp dan zona IANA toko untuk tampilan. Jangan gunakan jam client sebagai identitas, urutan sync atau satu-satunya pengaman izin. Perubahan zona toko hanya boleh ketika tidak ada sesi terbuka; laporan lama memakai snapshot zona sesi/event.

Audit mencakup harga/menu, koreksi stok, diskon, pembatalan, refund, kas, koreksi metode, aktivasi/revoke, restore dan perubahan setting. Jangan log PIN, password, token, isi kunci backup atau data autentikasi eksternal.

Export CSV memakai escaping CSV standar dan menetralkan sel teks yang dapat diawali formula (`=`, `+`, `-`, `@`, tab/CR), termasuk setelah whitespace. Kolom numerik sah tetap numerik. Import menolak formula sebagai angka, tidak mengeksekusi HTML, dan tidak mengambil path/URL sebagai instruksi.

## Migrasi

Versi schema lokal/server/backup eksplisit. Migrasi lokal berjalan sebelum kasir diaktifkan, dengan checkpoint dan salinan pra-migrasi. Jangan memperbarui service worker di tengah operasi keuangan. Skema backup lama dimigrasikan di staging melalui jalur yang diuji; versi lebih baru/tidak dikenal ditolak tanpa menyentuh data aktif. Semua perubahan aturan uang wajib mempertahankan snapshot transaksi lama.

## Entitas dan invariants tambahan

| Entitas | Kontrak minimum |
| --- | --- |
| Staff, ActorSession, PermissionPolicy | ID staf tetap, status aktif, autentikasi terpisah; versi kebijakan/izin, scope toko/perangkat/actor, masa berlaku. Verifier/token bukan bagian audit/export/backup |
| ApprovalRequest, ApprovalDecision, ApprovalExecution | ID tetap, peminta/owner, store/device/epoch/sesi/objek/revisi, payload canonical/hash, policy version, alasan, waktu server/expiry, keputusan dan receipt eksekusi satu operation ID |
| CashCustodySegment, CashHandover, CashCountRevision | Penanggung jawab, batas urutan ledger, fisik awal/akhir, selisih, konfirmasi kedua actor atau pengecualian owner; immutable dengan revisi berjejak |
| ChannelAccount, ChannelPrice | Channel dan akun outlet stabil, pemetaan SKU/topping, nama/harga/tarif snapshot; satu stok fisik |
| PlatformReceivable, PlatformReversal | Settlement dan nilai G; pembalikan unit/alokasi asli, bukti platform; terpisah dari refund uang toko |
| PlatformAdjustment, PlatformPayout, PayoutAllocation | Biaya/kredit/debit berjejak; referensi batch unik, dana terverifikasi dan alokasi order/akun; bukan Payment order atau kas laci |

- Envelope bisnis wajib memiliki actor terautentikasi, versi kebijakan, bukti izin yang berlaku dan approval execution bila diperlukan. Nilai `actor_id` dari client saja bukan bukti identitas. Server dan domain lokal memeriksa izin pada setiap jalur termasuk import, bulk action, harga channel dan pemulihan; menyembunyikan tombol tidak cukup.
- Server memisahkan command administrasi akses/keputusan approval dari command efek bisnis. Hanya perangkat kasir aktif menulis order/uang/stok/kas; HP owner hanya administrasi akses/keputusan. Keduanya melewati API transaksional dengan scope ketat dan urutan/versi masing-masing; urutan kebijakan server tidak dipaksakan ke sequence outbox perangkat.
- Unik: `(store, channel, channel_account, external_order_id)`, `(store, channel_account, payout_reference)`, satu execution per approval dan satu operation ID bisnis, satu custody segment aktif per sesi. Receipt terpakai tidak bisa dipakai operasi/payload/actor lain.
- Hash persetujuan mencakup unit, nilai, metode, efek stok/kas, alasan dan revisi relevan; tidak mencakup pernyataan hasil uang yang baru diisi setelah eksekusi. Persetujuan tidak mengganti validasi stok, refund limit, saldo, status atau sesi pada saat commit.
- Commit bisnis mengonsumsi receipt secara lokal bersama event/ledger/audit/outbox; server receipt otorisasi bukan ACK bisnis. Upload memvalidasi receipt, operasi dan invariants secara atomik. Detail crash/expiry/epoch mengikuti file 08.
- Perhitungan diskon batas kasir menggunakan rupiah hasil pembulatan rumus lama; bila batas rupiah dan persen aktif, harus memenuhi keduanya terhadap subtotal terkini. Gratis Rp0 mengikuti izin tersendiri. Ubah subtotal/revisi memicu validasi ulang dan membatalkan approval lama.
- Penjualan platform memakai alokasi G yang sama dengan penjualan langsung. Subsidi platform dicatat sebagai pembiayaan di dalam G, rentang 0..G; bukan pengurang G atau penambah pendapatan di luar G. Harga eksklusif dan pajak/layanan wajib bisa dipetakan sebelum finalisasi.
- Semua ledger channel dan serah-terima termasuk backup/replay/migrasi dan export yang diizinkan. Migrasi data lama memberi actor owner historis, channel Toko, mempertahankan Payment/snapshot/ID lama; jangan merekayasa staf atau persetujuan historis. Sesi lama terbuka memerlukan penetapan penanggung jawab pertama berjejak, bukan menghapus selisih.
- Pembalikan platform dan refund toko menggunakan batas unit yang sama; tidak boleh dua sumber pengembalian untuk satu unit. Penyesuaian biaya tidak mengubah jumlah barang, nilai settlement atau struk asal. Dana cair tidak mendebit stok, membuat tiket, atau menghitung penjualan kedua.

## Kompatibilitas promo SKU — D-43

Snapshot promo_i dibulatkan per unit sebelum dikalikan qty, integer/BigInt dengan half-up di atas; topping tidak ikut didiskon. Contoh SKU Rp20.000 promo 10% plus topping Rp5.000: gross_i=25.000, promo_i=2.000, base_i=23.000 sebelum pajak/layanan. Order tiga unit sama memberi P=6.000. Pajak/layanan dialokasikan berdasarkan base_i metode sisa terbesar lama. Refund/pembalikan memakai total_i asal, bukan promo/harga hari ini.

Perubahan schema lokal/server/backup menyimpan harga dasar, mode/nilai/revisi promo, potongan snapshot per unit dan P/D settlement. Histori sebelum D-43 dipetakan P=0 dan diskon lama sebagai D, tanpa perubahan jumlah/refund/ID. Migrasi staging dan replay tidak membaca katalog terkini untuk menghitung ulang transaksi. Validasi snapshot/rentang/nonpenggabungan wajib di domain, server, restore dan import terkait; tampilan bukan pengaman tunggal.

## Alias tipe tampilan — D-47

Pengaturan alias memetakan ID tipe yang sudah sah ke 1–3 karakter ASCII huruf/angka; trim/uppercase, wajib, unik case-insensitive dan owner pada kasir aktif. Validasi pada batas input/penyimpanan; persistensi setting dan catatan perubahannya atomik sesuai kontrak umum. Alias hanya metadata tampilan; bukan pembuatan tipe bisnis atau pengubahan identitas/snapshot/ledger transaksi. Restore memvalidasi pemetaan terhadap tipe yang sah, mempertahankan data lama bila gagal. Data lama tanpa pemetaan menggunakan default N=Normal. Tidak menambahkan paket atau aturan stok komponennya. Implementasi setting/API/migrasi belum dikerjakan oleh revisi dokumentasi ini.

D-54: predicate Riwayat = saved ∧ settlement ∧ ada unit ∧ semua unit served/cancelled ∧ refund_due=0. Refund langsung atas requested mensyaratkan konfirmasi dapur dan hasil pengembalian uang, lalu cancel+refund+audit atomik tanpa state refund final sebelum uang. Metode refund aktual/alasan/unit dipertahankan dalam jejak, tanpa alasan metode berbeda terpisah. Print pelanggan sebelum settlement ditolak pada batas mutasi.

## Kontrak revisi D-55/D-56

No. antrean/nama wajib nonblank setelah trim, maksimum 80 karakter, pada save/process/settlement; penolakan tidak menulis uang/batch/stok/audit. Data lama tidak diberi identitas fiktif otomatis; isi sebelum melanjutkan commit yang membutuhkan identitas. Pembuatan menu berisi beberapa SKU/relasi topping/tipe/alias dan stock opening memakai satu operasi atomik; validasi seluruh baris sebelum hasil terlihat. Retry ID operasi sama tidak membuat SKU/topping/ledger kedua. Kode SKU unik dan stabil; alias tampilan tipe bukan kunci SKU. Label Paket/Promo/custom tidak mengubah rumus uang, batch/debit/refund maupun struktur komponen stok. Snapshot type asal dipertahankan. Peringatan stok diturunkan dari saldo committed ≤threshold, bukan draft/reservasi; daftar tidak melakukan mutasi bisnis.

## Kontrak tabel/grup/racikan/rekap — D-57–60

StockGroup adalah satu sumber saldo operasional per menu. Tidak menjumlah saldo yang terlihat di beberapa SKU. Simulasi Sites mempertahankan cache stock pada SKU satu grup, setiap mutasi memeriksa kesamaan dan memperbarui seluruh cache atomik; ini bukan schema produksi atau bukti storage siap. ID grup tersimpan pada unit/debit/return. Validasi demand per grup sebelum settlement/batch; pengulangan operation ID tetap receipt/hash sebelumnya. Grup dan kode SKU existing tidak dipindahkan lewat edit biasa.

Tabel menyimpan seluruh baris yang divalidasi dalam satu operasi; perubahan stok existing hanya lewat ledger Tambah/Koreksi beralasan, bukan overwrite kolom setup. Snapshot harga/promo/racikan transaksi lama dipertahankan. Racikan berubah membedakan pengelompokan unit, tanpa penghitungan uang baru.

Rekap online: checkpoint expected from harus sama batas reviewed terakhir, until integer timestamp > from dan ≤ waktu pencatatan sah; referensi grup/qty integer nonnegatif unik, konfirmasi exclude recorded. Atomik ledger grup + recap immutable + checkpoint + audit/outbox/receipt. Tidak ada perubahan uang/order/settlement/payout. Qty 0 mencatat pemeriksaan tanpa debit. Retry/ACK hilang tidak membuat efek kedua; ID sama dengan payload berbeda ditolak. Pencatatan susulan yang overlapping/gap ditahan; koreksi mempertahankan catatan asal, tidak menghapus receipt. Implementasi produksi memvalidasi jam/izin/schema/migrasi/restore server sesuai file 08; simulasi belum membuktikannya.

## Kontrak tambahan — D-61–64

Kombinasi harga memakai pasangan ID variabel dan nilai pilihan yang diurutkan berdasarkan definisi; urutan tap Keju/Jamur tidak membentuk dua SKU. Variabel gratis dikeluarkan dari kunci harga. Kombinasi aktif/tipe unik dan definisi konsisten di seluruh SKU satu menu; unknown option/free text ditolak batas domain. Snapshot unit menyimpan definisi, nama/nilai, cara memilih, harga/promo dan tambahan lama. Snapshot tidak berubah karena edit katalog. Stok tetap satu debit per unit pada grup menu, bukan per pilihan/topping.

Koreksi rekap: revision harus sama revisi terakhir; payload tepat memuat seluruh grup pada rekap asal, qty integer≥0, alasan wajib dan aktivitas Koreksi stok. Validasi seluruh delta terhadap saldo kini dahulu; ledger grup + revisi koreksi + audit(actor/approver) + receipt/outbox dalam satu transaksi. Retry operation ID sama tidak menulis lagi, ID sama/input berbeda ditolak; approval mengikat payload/revisi. Catatan asal/checkpoint/order/cash immutable terhadap koreksi.

Stock_in memakai tambahan>0, stock_count memakai target≥0 dan delta pada saldo commit; stock minimal adalah konfigurasi integer≥0, bukan delta stok. Penghitungan kas mencatat tujuan/revisi, menghentikan mutasi sampai commit handover/close atau cancel; cancel mempertahankan history. Handover mempertahankan session ID/ledger/ekspektasi sesi dan semua selisih segmen. Close hanya dari hitungan akhir dengan blocker kosong. Invariants dan kontrak storage/server di atas tetap; State memori prototipe bukan bukti atomic IndexedDB/API.

## Kontrak revisi — D-67

D-67 mendahului harga kombinasi manual/default kosong D-61 dan stock UI D-62 yang berbeda. Harga single dihitung integer dari harga dasar + tambahan pilihan≥0 lalu disimpan per kombinasi; multi berharga menambah per pilihan dengan snapshot, tanpa stok bahan. Semua0 modifier gratis, default pertama tersnapshot. Batas12/30/500 dan validasi domain tetap. Konversi legacy harus mempertahankan harga/ID/channel/status/promo atau ditahan; tidak ada tebakan matriks nonaditif atau multi kombinasi. Penambahan varian tidak membuka stok kedua.

StockGroup menyimpan baseline integer≥0 dari opening/hitungan/perubahan terakhir selain saldo sisa. Delta penjualan/rekap/return tidak mengubah baseline; penggantian baseline memakai target actual≥0, alasan dan expected balance saat form dibuka. Stale ditahan. Log actor/time/before/after/delta, baseline+saldo+ledger/audit/receipt/outbox atomik; minimal tidak mengubah ledger. Prototype memori menambahkan stockBaseline pada anggota grup dan event log; bukan implementasi storage/server.

DeleteMenu adalah soft delete grup yang terkonfirmasi, aktivitas Arsip menu; semua SKU ditandai archived/unavailable, tidak dihapus fisik. Draft aktif menahan, retry ID sama tidak mengulang; payload tanpa confirmed atau aktivitas salah ditolak. Grid stale tidak boleh menghidupkan kembali tombstone. Histori unit/snapshot/grup/ledger tetap. UI hanya dua status, arsip merupakan detail penyimpanan historis.

## Kontrak pustaka diskon dan promo jumlah — D-68

DiscountDefinition menyimpan ID, nama, mode percent/amount/bogo, value basis point/rupiah atau buy/free integer1..99, revisi dan arsip. Penetapan SKU per channel menyimpan referensi definisi serta snapshot promo/revisi. Perubahan definisi memvalidasi seluruh SKU terkait dalam satu commit; potongan melebihi salah satu harga menggagalkan semuanya. Harga SKU yang diturunkan di bawah potongan aktif juga ditahan. Snapshot Unit menyimpan buy/free, mode/nilai/nama/revisi/harga, potongan aktual; perubahan katalog/definisi tidak menulis ulang Unit lama.

Untuk kelompok draft identik berukuran n, k=X+Y, jumlah kelompok lengkap=floor(n/k). Setiap kelompok lengkap k unit mendapat potongan harga_satuan×Y; sisa unit mendapat0. Bagikan potongan kelompok ke k unit berbobot harga menu melalui **metode sisa terbesar dan tie-break ID unit** yang sama dengan alokasi uang; gunakan BigInt untuk pembagian, hasil integer rupiah. Topping tidak menjadi bobot promo dan tetap utuh. Jumlah potongan unit tepat harga×Y, tanpa float atau kehilangan sisa rupiah. Lanjutkan rumus base_i/tax_i/service_i/total_i lama; refund memakai total_i yang dibekukan. ID unit menetapkan pembagian sisa deterministik, bukan waktu refund.

Kelompok hanya draft dengan SKU/varian, harga/revisi/nama promo, buy/free, pilihan/topping/penyajian/catatan sama. Sebelum save/process/settlement, hitung ulang kelompok draft; setelah confirmed snapshot dibekukan. Batal draft menghitung ulang sisa draft; refund/cancel confirmed tidak mengubah nilai unit lain. Jumlah unit fisik tetap n; debit stok konfirmasi n sekali, retry tidak mengulang. Tidak ada unit hadiah tersembunyi atau pasangan lintas batch confirmed. Pengecekan tidak digabung diskon order berlaku walau jumlah belum cukup.

Kategori wajib pada jalur tambah/edit aktif. Rename kategori/tipe memperbarui katalog saja, penghapusan nama in-use ditahan; snapshot transaksi/kode SKU tetap. Log hapus menu menyimpan identitas objek/nama actor/waktu, bukan objek generik Pengaturan. Sesi kas menyimpan openedAt/openedBy dari commit pembukaan, terpisah dari actor segmen aktif.


## Kontrak waktu diskon — D-69

DiscountDefinition dan snapshot promo pada SKU menambah startsAt/endsAt opsional sebagai epoch ms integer presisi menit. Keduanya ada atau sama-sama kosong; endsAt>startsAt. Input wall clock dikonversi memakai zona IANA toko, bukan zona browser. Batas waktu `[startsAt, endsAt)` diperiksa untuk quote baru pada semua mode; filter Promo/label Beli X gratis Y mengikuti quote efektif. Tanpa window tetap kompatibel.

Perubahan jadwal berjejak/revisi dan seluruh penetapan divalidasi atomik; tidak memerlukan mutasi aktivasi terjadwal atau ledger baru pada batas waktu. Unit mempertahankan snapshot harga/promo/discount asal termasuk sesudah akhir window. Refresh draft eksplisit mengambil quote baru lalu menghitung ulang hanya draft. Ledger uang/stok/idempotensi/alokasi refund mengikuti kontrak lama. Produksi wajib membuktikan sumber waktu tepercaya dan perilaku saat jam perangkat berubah/offline; prototipe hanya jam perangkat dan data memori.

## Lanjut draft dan cetak otomatis — D-72

Perubahan draft tersimpan memakai UUID/nomor/revisi asal dalam payload operasi tetap; hanya unit draft belum dibatch yang boleh diganti, tanpa debit/alokasi/refund/retur yang disisipkan. Pilihan yang berubah tetap melalui validasi input/domain dan aturan snapshot/izin. Simpan ulang atomik; gagal mempertahankan draft committed dan input kerja.

Konfirmasi batch/settlement menulis job cetak logis dalam transaksi bisnis produksi; pengiriman/attempt berlangsung sesudah commit. Process: dapur batch baru. Settle: dapur batch baru lalu pelanggan, tanpa draft hanya pelanggan. Save: tidak ada job/attempt. Retry operation/receipt tidak menjadwalkan ulang dokumen yang sama; replay/sync/reload tidak mencetak ulang otomatis. Ulang eksplisit SALINAN dengan snapshot/tujuan asal, tanpa efek uang/stok/penyajian. Adapter prototipe memori mencatat attempt terpisah; belum membuktikan storage/outbox/printer produksi.

## Kontrak draft/Favorit — D-76

Konfigurasi Favorit adalah daftar unik ID grup menu dalam urutan owner, terpisah dari katalog SKU dan histori transaksi. Validasi ID, urutan dan owner pada batas mutasi; receipt/replay/audit mengikuti Pengaturan. Nonaktif sementara tidak menghapus posisi. Dalam prototipe daftar berada pada `State.settings.favorites` di memori; default berada pada `Order.serving`, penyajian aktual pada setiap `Unit.serving`. Ini bukan migrasi atau persistensi produksi.

Penambahan langsung membuat satu unit melalui quote/makeUnits domain yang sama; penggabungan hanya presentasi atas unit identik, tidak mengubah unit confirmed. Urungkan terikat order+unit draft, memvalidasi belum debited/belum settlement, tanpa ledger stok. Default bukan operasi massal terhadap unit. Tidak ada perubahan rumus, idempotensi commit, alokasi uang, stok grup, snapshot atau model satu penulis.

## Proyeksi workspace Pesanan — D-78

`Order.savedAt` adalah timestamp commit Simpan dulu terakhir, ikut perubahan draft/audit/receipt yang sama; retry receipt tidak memperbaruinya. Data lama tanpa nilai tetap tidak diketahui, tanpa fallback `created` atau settlement. `Batch.time` tetap waktu konfirmasi batch, bukan waktu cetak/pembayaran. Proyeksi kelompok/filter/urutan/progres/detail tidak menulis ledger/order/stock.

Sisa tagihan memakai operasi domain `unpaidBalance`: tanpa settlement gunakan total domain snapshot aktif (termasuk tambahan draft); settlement menyelesaikan satu tagihan penuh, sisa0. Refund due dan saldo platform terpisah, tidak dikurangkan/ditambahkan ke sisa tagihan. Tidak memperkenalkan pembayaran parsial/rumus baru di React. `partitionOrders`, `servingProgress`, `confirmationTime`, `queryOrders` dan `retainedSelection` adalah proyeksi murni; penyelesaian tetap memakai `active`/`completed` existing.
