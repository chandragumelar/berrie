# Berrie — Tahapan kerja

**D-78:** workspace Pesanan selesai di prototipe lokal; [review dan bukti](berrie-site/REVIEW-PESANAN-D78.md). D-77 dan D-78 telah merged; baseline fondasi GitHub saat ini `d306011`. Penguatan T-02 dilakukan pada branch terpisah; tidak ada versi layanan atau deployment baru.

Terakhir diperbarui: **1 November 2026**. Dokumen ini melacak pelaksanaan, bukan mengganti keputusan produk. Sumber kebenaran: [spesifikasi](specs/README.md); urutan pembangunan mengikuti [file 01](specs/01-product-scope.md), gerbang kelulusan mengikuti [file 10](specs/10-acceptance-criteria.md).

## Posisi sekarang

- **Checkpoint D-77 (historis; PR sudah merged menurut pemilik pada sesi D-78):** copy Default penyajian/Untuk item berikutnya dihapus, Channel/nilai sebaris. Commit/push checkpoint prototipe diotorisasi pemilik; merge oleh pemilik. Repo GitHub tujuan kosong, baseline lama menjadi main dan revisi di branch terpisah; root spesifikasi belum berada dalam Git. Commit `26563163bcd61f09fb8e55a52ba2dce80ee4782f` berhasil dipush ke [feat/cashier-d77](https://github.com/chandragumelar/berrie/tree/feat/cashier-d77); baseline main tetap `e3226843507cd6bdfbe86715324a33774e3233cf`. Remote refs diverifikasi. [PR#1](https://github.com/chandragumelar/berrie/pull/1) dibuat atas instruksi pemilik, feat/cashier-d77 → main; merge kemudian dinyatakan selesai oleh pemilik. Typecheck/lint tanpa warning/137 tes/build/diff staged/310 tautan lokal lulus; Chrome tablet menunjukkan Channel Toko sebaris dan kedua copy hilang. Working tree prototipe bersih; tanpa merge/deploy.

- **D-76 lokal:** revisi Kasir terpadu sesuai instruksi pemilik; [review D-76](berrie-site/REVIEW-KASIR-D76.md) memuat implementasi, bukti pemeriksaan aktual dan batas. Typecheck/lint tanpa warning/137 tes/build lulus; tablet1024×768, HP360, teks200%, nama panjang dan keyboard representatif diperiksa; tiga baris normal lengkap pada tablet. Favorit/default memori sesi, tanpa backend/persistensi produksi. Keputusan D-01–76, AC-01–164, UT-01–46; tidak meluluskan UT peserta/pilot. Pekerjaan lokal terdahulu dipertahankan, tanpa commit/push/versi layanan/deployment.


- **Audit ADS 31 Oktober 2026:** perbaikan komponen bersama dan pemeriksaan kode lulus. Lanjutan Safari memeriksa layar tablet1024×768/HP360, teks200%, gelap dan state representatif; panah select/header tabel/navigasi HP200%/pesan guard diperbaiki dan diuji ulang. Lanjutan page zoom200% Safari terkonfirmasi dan dipulihkan100%, preview tablet kembali terlihat. Audit pelaksana pada cakupan representatif selesai; bukan kelulusan seluruh AC visual. [Temuan, cakupan sumber, bukti dan sisa verifikasi](berrie-site/REVIEW-ADS-2026-10-31.md). Tidak mengubah keputusan produk atau kelulusan AC/UT.

- **D-75 lokal:** aksi editor Menu/Stok sticky dan status draft/guard keluar; laporan ringkas dengan dasar/refund/periode eksplisit dan catatan harian; alias di Tipe menu, Toko pertama/default; staf CRUD tanpa hard delete dan izin bersama owner online. [Review D-75](berrie-site/REVIEW-ADMIN-LAPORAN-D75.md). Bukti lanjutan Safari tablet/HP ada pada review audit ADS; page zoom200% telah diperiksa, cakupan menyeluruh tetap dibatasi, bukan kelulusan seluruh UI/UT. Semua perubahan lokal, belum commit/simpan versi layanan/deployment.

- **D-74 lokal:** Kas angka kiri/finish bertumpuk kanan pada tablet; laporan mengutamakan Penjualan/Uang diterima/transaksi/rata-rata, refund kontekstual, menu urut nilai/qty dan telusur ke pesanan. Navigasi atas tablet/bawah HP dipertahankan. [Bukti D-74](berrie-site/REVIEW-KAS-LAPORAN-D74.md). D-73 lainnya tetap; tanpa deployment.

- **D-73: harga/qty agnostik, form menu dengan varian opsional, Kas maksimum640 px dan fondasi visual berdasarkan Atlassian diterapkan lokal.** Alur/cetak/edit draft D-72 tetap. Katalog kiri–pesanan kanan/navigasi horizontal tetap; Inter, komponen, ikon dan state bersama diperbarui. [Review terkini](berrie-site/REVIEW-MENU-KAS-D73.md) memuat bukti dan batas. D-70 menjadi riwayat; latest layanan yang terakhir dikonfirmasi tetap12, tanpa simpan versi/deployment baru.
- Keputusan terkini **D-01–78**, pekerjaan validasi **V-01–10**, kriteria **AC-01–172**, uji peserta **UT-01–49**. Persetujuan dokumen tidak meluluskan kriteria.
- [Prototipe Sites](berrie-site/README.md) memakai data memori; [review versi 1](berrie-site/REVIEW-HISTORY.md#d43-d45) dan [review versi 2](berrie-site/REVIEW-HISTORY.md#d46-d48) membatasi klaim pada simulasi masing-masing versi. Mockup M-01/M-02 dipensiunkan pada 8 Oktober 2026; hasil lama tetap historis, tidak menjadi dependensi proyek aktif.
- GitHub `main` memuat prototipe pada root dan checkpoint fondasi di `foundation/` (merge PR #3 `d306011`); scaffold T-01 tersedia, T-02/T-03 masih berjalan. Kedua aplikasi tetap terpisah.
- Bukti terpilih prototipe bukan kelulusan AC operasional atau UT peserta; printer fisik, keamanan, performa perangkat, restore drill dan pilot belum dibuktikan. Tidak ada blocker untuk persiapan kode lokal; kebutuhan eksternal dicatat di bawah.

## Patokan untuk melanjutkan

Mulai dari posisi sekarang di dokumen ini, [review Pesanan D-78](berrie-site/REVIEW-PESANAN-D78.md), [review Kasir D-76](berrie-site/REVIEW-KASIR-D76.md), [audit ADS dan batas verifikasi](berrie-site/REVIEW-ADS-2026-10-31.md), [review D-75](berrie-site/REVIEW-ADMIN-LAPORAN-D75.md), [review D-74](berrie-site/REVIEW-KAS-LAPORAN-D74.md), [review D-73](berrie-site/REVIEW-MENU-KAS-D73.md), [indeks spesifikasi](specs/README.md) dan [design system](DESIGN-SYSTEM.md). Prototipe berada di root repo GitHub dan fondasi operasional di `foundation/`; perubahan prototipe hingga D-78 telah merged, belum disimpan sebagai versi layanan Sites baru. Versi layanan terakhir yang tercatat adalah **12 / D-69**, commit `e3226843507cd6bdfbe86715324a33774e3233cf`; jangan memuat versi itu untuk menimpa perubahan lokal terbaru. Pemeriksaan layanan tidak diulang saat perapihan dokumen ini.

Contoh prompt lanjutan: “Lanjut proyek Berrie dari state lokal D-76. Baca tasks.md bagian Posisi sekarang, berrie-site/REVIEW-KASIR-D76.md, specs/README.md dan DESIGN-SYSTEM.md. Pertahankan perubahan lokal; tanpa deployment.” Tambahkan pekerjaan yang ingin dikerjakan setelahnya.

## Cara memakai status dan dependensi

| Status | Arti |
| --- | --- |
| Selesai | Kriteria selesai terpenuhi dan bukti dicatat; persetujuan spesifikasi tidak berarti aplikasi lulus |
| Siap | Bisa mulai, dependensi wajib terpenuhi |
| Menunggu | Belum mulai karena dependensi pekerjaan belum selesai |
| Dikerjakan | Sedang dikerjakan; catat bagian yang belum selesai |
| Terblokir | Tidak bisa maju karena kendala konkret; wajib merujuk ID blocker |

Dependensi T-xx/G-xx adalah prasyarat wajib untuk menuntaskan baris tersebut. Persiapan yang tidak bergantung pada hasilnya boleh dimulai lebih awal. Tahapan tidak menunda pengujian: tes domain/integrasi dibuat bersama implementasi, kemudian diuji menyeluruh pada tahap 4. Semua pekerjaan teknis ditangani pelaksana; keterlibatan owner/operator/peserta ditandai pada kebutuhan eksternal.

Rujukan AC pada tabel menunjuk [AC-01–172](specs/10-acceptance-criteria.md); rentang bersifat inklusif. UT menunjuk [UT-01–49](specs/12-ux-principles.md). Satu AC dapat muncul di beberapa pekerjaan karena memerlukan bukti lintas lapisan. Rujukan bukan klaim lulus.

## Mockup sebelum implementasi operasional

| ID | Pekerjaan | Status | Bukti dan pekerjaan tersisa |
| --- | --- | --- | --- |
| M-01 | Mockup Tahap 1 — alur harian inti | Dipensiunkan — 8 Oktober 2026 | Preview dan petunjuk (histori M-01/M-02; folder dipensiunkan): kasir, pembayaran, pesanan/batch, kas dan fixture gangguan tersambung. 6 Oktober 2026: typecheck/lint/build lulus; 15 tes logika dan 16 tes browser lulus; feedback kasir diterapkan: daftar varian, penyajian campuran, Bayar dulu ikut konfirmasi batch, copy awam, satu Pelanggan baru dan alur kas. Pemeriksaan visual diserahkan kepada pemilik sesuai instruksi sesi; hasil belum dicatat. Tidak memenuhi tugas operasional atau kelulusan AC/UT |

## Tahap 0 — Baseline dan pelacakan

| ID | Pekerjaan | Status | Dependensi | Kriteria selesai | Rujukan AC |
| --- | --- | --- | --- | --- | --- |
| T-00 | Baseline spesifikasi dan daftar kerja | Selesai | — | Baseline disetujui; tahapan, dependensi, posisi sekarang, blocker dan pemetaan AC tersedia di dokumen ini. Bukti: file spesifikasi dan pemeriksaan dokumentasi 6 Oktober 2026 | Tidak ada uji aplikasi; acuan seluruh AC |

## Tahap 1 — Fondasi domain, penyimpanan, akun dan kas lokal

Acuan: [01 — scope](specs/01-product-scope.md), [07 — data/uang](specs/07-data-and-business-rules.md), [08 — offline/keamanan](specs/08-offline-backup-and-restore.md), [12 — UX](specs/12-ux-principles.md).

| ID | Pekerjaan | Status | Dependensi | Kriteria selesai | Rujukan AC |
| --- | --- | --- | --- | --- | --- |
| T-01 | Scaffold dan tooling | Selesai | T-00 | React/TypeScript strict/Vite disiapkan; versi dikunci; struktur domain, storage, jaringan, cetak dan UI terpisah; contoh env tanpa rahasia; dev/build/typecheck/lint/test tersedia, didokumentasikan dan diverifikasi; status tooling di AGENTS.md diperbarui; Git lokal disiapkan tanpa publikasi | Pendukung seluruh AC; belum membuktikan perilaku |
| T-02 | Uang, unit pesanan dan invariants domain | Berjalan | T-01 | Tipe/validasi batas input, integer rupiah/basis point, pembulatan dan alokasi deterministik, snapshot, batas qty/nominal serta aturan settlement/refund tersedia; unit/property tests mencakup contoh 33.350 dan konservasi total/refund, promo SKU per unit tanpa topping/penggabungan order | AC-06–07, AC-24–25, AC-28, AC-102–105 |
| T-03 | Penyimpanan atomik dan satu penulis | Berjalan | T-01 | Skema Dexie berversi; state/ledger/audit/outbox/receipt commit bersama; operation ID tetap; uniqueness dan lock antar-tab diuji; abort/ruang penuh/crash tidak menghasilkan efek parsial; kontrak migrasi dan pemulihan awal tersedia | AC-09–10, AC-20, AC-30, AC-39, AC-48 |
| T-04 | Akun, perangkat aktif, PIN dan izin offline | Menunggu | T-02, T-03 | Auth/verifikasi/aktivasi/reset online, epoch, permit bertanda tangan, auto-lock/cooldown persisten dan anti-jam-mundur tersedia; batas akses setelah expiry serta logout tanpa hapus data diuji; HP owner boleh administrasi akses/approval online, tanpa efek bisnis; kebijakan isolasi server diuji dengan dua toko | AC-02–03, AC-40–42, AC-49–50, AC-59 |
| T-05 | Inti pesanan dan sesi kas lokal | Menunggu | T-02, T-03 | ID/nomor order, draft/unit/batch, status bayar/kerja terpisah, satu sesi kas, uang awal/masuk/keluar dan ledger tersedia sebagai operasi domain; draft tidak mendebit stok, sesi tertutup immutable; fixture bersama siap | AC-08, AC-11, AC-17, AC-31–34 |
| T-06 | Kerangka UI dan persiapan PWA offline | Menunggu | T-03 | Komponen/token/font/spacing mengikuti design system aktif D-73; Kasir sebagai layar utama, navigasi HP/desktop, komponen form/dialog/status/error dan cache aplikasi tersedia; layout mulai 360 px; fokus/label/target sentuh diuji; kesiapan offline hanya dinyatakan dari pemeriksaan prasyarat nyata | AC-02, AC-55, AC-59, AC-64, AC-71–75, AC-109; AC-110–112 |

T-04 membangun fondasi entitlement yang diperlukan izin offline; alur penagihan operator lengkap tetap pada tahap 5. Integrasi layanan nyata mengikuti kebutuhan B-01, sedangkan kode dan tes lokal dapat disiapkan lebih dahulu.

## Tahap 2 — Katalog sampai penyelesaian transaksi

Acuan: [02 — alur](specs/02-user-flows.md), [03 — katalog/stok](specs/03-menu-and-availability.md), [04 — pesanan](specs/04-orders-and-dine-in.md), [05 — pembayaran/refund](specs/05-payments-and-refunds.md), [06 — kas](specs/06-cash-and-reports.md), [12 — UX](specs/12-ux-principles.md).

| ID | Pekerjaan | Status | Dependensi | Kriteria selesai | Rujukan AC |
| --- | --- | --- | --- | --- | --- |
| T-07 | Katalog, stok dan import CSV | Menunggu | T-02–06 | Menu/kategori/SKU/varian/topping/catatan, arsip, stok kuantitas wajib D-52, stok masuk/koreksi/ambang dan ledger tersedia; legacy tanpa hitungan ditahan sampai admin mengisi saldo awal berjejak; import preview/validasi/commit atomik tanpa menimpa stok existing; snapshot lama terjaga; promo SKU opsional nominal/persen per channel, aktif manual dan setting owner; alias tipe owner/tampilan D-47 | AC-04–07, AC-21, AC-58, AC-65, AC-74, AC-102–106; AC-110–111, AC-113, AC-115 |
| T-08 | Onboarding minimum dan checkout | Menunggu | T-04–07 | Akun → toko → menu pertama + stok awal wajib → buka kas → Kasir tersambung; setup opsional dapat dilewati/ditemukan lagi; cari menu, keranjang, simpan/buka draft, dua penyajian per item/baris berbeda dalam satu tagihan, no. antrean/nama, promo SKU/filter tunggal Semua/Habis/Promo dan kategori Pengaturan, diskon order tanpa penggabungan dan tarif berfungsi; satu Buka kas awal/Serah-terima sesuai keadaan, Toko default, tabel/revisi UI D-47; kedua urutan bayar/proses tetap terlihat; catatan draft terbaca, Reguler generik hilang, Bayar nanti/Bayar/Simpan dulu jelas; lunas mengosongkan composer, struk transaksi asal; input bertahan saat gagal | AC-01, AC-06–08, AC-57–61, AC-67, AC-70, AC-75; UT-01, UT-10, UT-18; AC-106–107; AC-110–111, AC-113–115 |
| T-09 | Proses batch, stok, antrean dan penyajian | Menunggu | T-08 | Minta dibuat mendebit stok sekali secara atomik; Bayar ikut mengonfirmasi draft atomik; paid draft data lama divalidasi ulang; tambahan hanya batch baru; setelah lunas menjadi order baru; sajikan sebagian/koreksi dari Pesanan/detail sesuai aturan; antrean/filter/status dan error stok menunjukkan pekerjaan tersisa | AC-09–17, AC-20, AC-60–62, AC-65; UT-02–03, UT-06; AC-114–115 |
| T-10 | Pembayaran dan koreksi metode | Menunggu | T-09 | Form bayar ringkas D-44, input diterima kosong dan metode setting; tunai/kembalian, non-tunai terverifikasi manual, bayar awal/akhir dan tagihan Rp0 berfungsi; settlement membekukan alokasi; retry/crash tidak menggandakan payment; koreksi beralasan menjaga audit dan sesi tertutup | AC-11, AC-22–24, AC-28–30, AC-61, AC-63–64, AC-66–67; UT-05; AC-102–104, AC-107, AC-114 |
| T-11 | Pembatalan, refund dan stock return | Menunggu | T-10 | Batal draft/processed/paid mengikuti status unit; refund penuh per unit memakai alokasi asal termasuk potongan promo SKU; refund due terlacak; perpindahan uang manual dan pencatatannya jelas; stock return terpisah dan paling banyak sekali; refund sesi kini tidak mengubah sesi lama | AC-18–19, AC-25–27, AC-30, AC-35, AC-66–67; UT-07; AC-103 |
| T-12 | Tutup kas dan riwayat operasional | Menunggu | T-11 | Semua blocker bisnis tutup kas tampil dengan tautan penyelesaian; ekspektasi dihitung ulang, fisik/selisih/alasan dicatat; snapshot tutup immutable dan offline; warning sync/backup tidak menjadi blocker bisnis baru; histori order/kas/payment/refund/audit dapat ditelusuri | AC-26–27, AC-29, AC-31–35, AC-68; UT-09; AC-110–111 |

## Tahap 3 — Cetak, laporan, sinkronisasi dan pemulihan ujung ke ujung

Acuan: [06 — laporan/export](specs/06-cash-and-reports.md), [07 — kontrak operasi](specs/07-data-and-business-rules.md), [08 — sync/backup/restore](specs/08-offline-backup-and-restore.md), [09 — cetak/perangkat](specs/09-screens-and-hardware.md).

| ID | Pekerjaan | Status | Dependensi | Kriteria selesai | Rujukan AC |
| --- | --- | --- | --- | --- | --- |
| T-13 | Struk pelanggan/dapur dan berbagi teks | Menunggu | T-12 | Modal Struk dengan tujuan keduanya default bila layak; satu antrean printer, dapur sebelum pelanggan, tanpa auto-reprint batch lama ketika bayar; format 58/80 mm, TAMBAHAN/BELUM BAYAR/LUNAS/SALINAN dan ringkasan kas tersedia; job setelah commit, hasil unknown/konfirmasi manusia, tidak auto-reprint saat reload; teks WhatsApp dibuat offline dan dikirim manual. Kelulusan hardware wajib T-19 | AC-10, AC-51–54, AC-62, AC-64, AC-66; UT-04, UT-11; AC-108 |
| T-14 | Laporan dan seluruh ekspor CSV | Menunggu | T-12 | Metrik sesuai file 06 termasuk promo SKU/diskon order terpisah, filter kalender/sesi, refund lintas hari, gratis, koreksi dan penyesuaian ditampilkan benar; semua kategori export cocok sumber/ID, UTF-8 dan aman formula injection; cakupan jelas; CSV tidak dilabeli backup | AC-29, AC-34–36, AC-69–70; UT-11; AC-105 |
| T-15 | API mutasi dan sync idempoten | Menunggu | T-12 | Semua command melewati satu API transaksional dengan otorisasi/invariants; receipt/hash, urutan/gap, ACK/checkpoint, retry dan backlog setelah expiry diuji; penolakan permanen mengarantina payload/dependen; UI membedakan lokal/server/backup; perangkat baca memakai laporan server | AC-10, AC-37–42, AC-59, AC-64, AC-66, AC-69; UT-08 |
| T-16 | Backup manual dan server | Menunggu | T-14, T-15 | File terenkripsi dari snapshot konsisten mencakup pending/audit/receipt tanpa rahasia akses; manifest/checksum/schema/KDF tervalidasi; backup server harian terenkripsi ke R2 terpisah beserta objek, retensi 30 hari, notifikasi kegagalan dan status terlambat >26 jam tersedia; cakupan ditampilkan. Bukti pemulihan wajib T-20 | AC-43–44, AC-47, AC-64, AC-69; UT-12 |
| T-17 | Restore, pindah perangkat dan rekonsiliasi | Menunggu | T-16 | Validasi/staging sebelum swap termasuk snapshot promo/kompatibilitas histori lama P=0, backup keadaan lama, stok lama tanpa hitungan ditahan sampai admin mengisi saldo awal, preview sumber/replay eksplisit, PIN baru, transfer ID dan epoch berlaku; file lama tidak overwrite server; perangkat lama dikarantina, bukti dipertahankan dan penyesuaian sesi kini deduplikasi; tidak mencetak ulang pekerjaan dapur | AC-43–47, AC-49, AC-69; UT-12; AC-103, AC-115 |

## Tahap 4 — Ketahanan, verifikasi dan pilot nyata

Acuan: [10 — acceptance dan gerbang](specs/10-acceptance-criteria.md), [11 — V-01–10](specs/11-decisions-and-open-questions.md), [12 — uji pengguna](specs/12-ux-principles.md). Uji awal boleh dilakukan lebih cepat; tabel berikut menuntaskan bukti untuk versi yang akan dipakai.

| ID | Pekerjaan | Status | Dependensi | Kriteria selesai | Rujukan AC |
| --- | --- | --- | --- | --- | --- |
| T-18 | Offline, crash, race, migrasi dan keamanan | Menunggu | T-13–17 | Fault injection sebelum/sesudah commit dan ACK, storage abort/penuh, restart/two-tab, izin/jam, isolasi dua toko, lifecycle token, KDF, CSP dan update/migrasi gagal diuji; tidak ada kehilangan/duplikasi atau rahasia bocor; recovery menjaga ledger; temuan diperbaiki dan regression test lulus; bukti V-05 tersedia | AC-02–03, AC-09–10, AC-20, AC-30, AC-37–42, AC-44–50, AC-64–66 |
| T-19 | Perangkat, printer, aksesibilitas dan performa | Menunggu | T-18 | Matriks device/OS/browser/printer/koneksi berisi hasil fisik 58/80 mm pada scope yang diklaim; uji layout 360/390/768/1280, zoom/keyboard/pembaca layar/kontras; dataset 500 SKU/10.000 histori/50 aktif memenuhi target p95 dan checkout terlatih ≤30 detik; dukungan/keterbatasan diterbitkan; V-02/V-03 terbukti | AC-51–56, AC-71–75, AC-96, AC-101, AC-106–109; AC-110–112 |
| T-20 | Restore drill dan operasi backup | Menunggu | T-18 | Restore database dan objek ke lingkungan terpisah serta perangkat pengganti, replay tepat sekali dan kegagalan sumber dibuktikan; durasi/RPO aktual dicatat terhadap target pemulihan ≤4 jam; prosedur dapat diulang, jadwal drill bulanan/perubahan format ditetapkan; V-04 terbukti | AC-43–48, AC-69 |
| T-21 | Audit cakupan UI dan uji pengguna baru | Menunggu | T-19, T-20 | Seluruh peta kemampuan file 12 terjangkau; putaran 8 peserta sesuai komposisi UT dijalankan tanpa arahan klik, hasil per tugas/perangkat dicatat; target keberhasilan/waktu, nol kesalahan kritis dan median kemudahan ≥6/7 terbukti; perbaikan diuji ulang dengan peserta baru sesuai aturan | AC-01, AC-57–76, AC-102–109; UT-01–18; bagian UX V-08; AC-110–112 |
| T-22 | Pilot harian owner | Menunggu | G-02 | Minimal 14 hari operasional dan 100 pesanan nyata mencakup dine-in, bungkus, tambahan, refund, offline dan tutup kas; selisih kas/stok ditelusuri, nol kehilangan/duplikasi akibat sistem; masalah dan tindak lanjut tercatat; bagian operasional V-08 terbukti | AC relevan konfigurasi pilot; gerbang pilot harian file 10 |

## Tahap 5 — Operasi komersial dan rilis

Acuan: [01 — paket/akses](specs/01-product-scope.md), [08 — retensi/pemulihan](specs/08-offline-backup-and-restore.md), [10 — gerbang komersial](specs/10-acceptance-criteria.md), [11 — validasi operasional](specs/11-decisions-and-open-questions.md).

| ID | Pekerjaan | Status | Dependensi | Kriteria selesai | Rujukan AC |
| --- | --- | --- | --- | --- | --- |
| T-23 | Penagihan manual, entitlement dan retensi | Menunggu | T-22 | Trial 60 hari, kalender/anchor bulanan, harga Rp50.000, reminder dan tenggang tujuh hari diuji; operator memverifikasi transfer dan mengaudit entitlement; restore tidak reset trial; retensi minimal 90 hari dan notifikasi 30/7 hari sebelum hapus diterapkan tanpa penghapusan prematur; rekening/petunjuk/kanal bantuan V-06 tersedia | AC-40–41, AC-50, AC-69–70 |
| T-24 | Biaya, observabilitas dan panduan dukungan | Menunggu | T-23, T-21 | V-01 dituntaskan dengan biaya aktual auth/database/API/hosting/egress/email/backup dan region/paket; pantau error, pending/karantina dan backup tanpa rahasia; panduan perangkat, offline, cetak, pemulihan, insiden dan bantuan teruji; bukti retensi backup 30 hari tersedia | AC-37–38, AC-43–50, AC-53, AC-64, AC-66, AC-69; gerbang komersial |
| T-25 | Verifikasi kandidat rilis dan publikasi terotorisasi | Menunggu | G-04 | Versi kandidat, konfigurasi, hasil pemeriksaan dan keterbatasan dukungan dibekukan; rencana deploy/rollback/pemulihan konkret siap; publikasi hanya setelah otorisasi yang sesuai; pemeriksaan pascadeploy dicatat | Seluruh AC-01–158 sesuai scope dukungan; gerbang komersial |

Monitoring backup dan pengamanan dasar tidak menunggu tahap 5: keduanya dibangun pada T-15–18. T-24 menuntaskan kesiapan operasi komersial. Perhitungan biaya/region V-01 dimulai sebelum provisioning; aktivasi layanan bukan efek otomatis dari persetujuan spesifikasi.

## Gerbang selesai

| ID | Gerbang | Status | Dependensi | Bukti wajib untuk lulus |
| --- | --- | --- | --- | --- |
| G-01 | Internal | Menunggu | T-18 | Semua uji domain dan integrasi storage/sync/refund lulus; nol blocker integritas data, isolasi toko atau uang; tautan hasil aktual tersedia |
| G-02 | Boleh mulai pilot owner | Menunggu | G-01, T-19, T-20 | Seluruh AC relevan konfigurasi pilot lulus, daftar relevansi/alasan pengecualian tertulis tanpa menghapus scope MVP; printer pilot dan restore perangkat pengganti terbukti; kebutuhan layanan/perangkat terselesaikan dan V-07 selesai bila tarif diaktifkan |
| G-03 | Pilot harian lulus | Menunggu | T-22 | Bukti 14 hari/100 pesanan dan seluruh variasi wajib; selisih nyata ditelusuri; nol transaksi hilang/ganda akibat sistem |
| G-04 | Layak rilis komersial | Menunggu | G-03, T-21, T-24 | Seluruh AC-01–158 dan UT-01–43 lulus pada scope yang dipasarkan; minimal satu jalur cetak per platform yang diklaim; biaya, backup 30 hari, billing dan retensi terbukti; tidak ada blocker rilis tersisa |

Lulus gerbang bukan izin otomatis membeli layanan, mengubah data produksi, atau memublikasikan aplikasi. Otorisasi tindakan tersebut diperiksa saat hasil konkret siap ditinjau. Jadwal kalender belum ditetapkan; durasi pilot dan bukti backup tidak boleh dipersingkat menjadi hasil simulasi.

## Blocker dan kebutuhan eksternal

**Blocker aktif untuk langkah berikutnya: tidak ada.** Daftar ini adalah kebutuhan pada tahap mendatang, bukan alasan menahan T-01 atau membuka ulang vendor/scope. Jika benar-benar menghentikan pekerjaan, ubah status tugas menjadi Terblokir dan catat bukti kendalanya.

| ID | Status saat ini | Dampak / tugas terkait | Cara menuntaskan dan pihak yang diperlukan |
| --- | --- | --- | --- |
| B-01 | Belum diverifikasi | Integrasi layanan nyata T-04/T-15/T-16, G-02 dan T-24/T-25 memerlukan akses serta konfigurasi layanan | Pelaksana memeriksa region/paket/biaya vendor final (V-01), menyiapkan konfigurasi tanpa rahasia dan usulan konkret; owner menyediakan akses/otorisasi provisioning, pembelian atau publikasi bila belum ada. Kode dan tes lokal tetap berjalan |
| B-02 | Bukti perangkat belum tersedia | T-19/G-02; klaim dukungan printer/platform belum bisa dibuat | Owner menyediakan perangkat/printer pilot; pelaksana mencatat model, koneksi, OS/browser dan menguji kertas nyata (V-02/V-03) |
| B-03 | Bukti pemulihan/keamanan belum tersedia | T-18/T-20 dan gerbang pilot/rilis | Pelaksana menyediakan lingkungan drill, dump/objek uji, review keamanan/KDF dan bukti replay/durasi (V-04/V-05); temuan ditutup sebelum gerbang terkait |
| B-04 | Peserta dan waktu operasional belum dijadwalkan | T-21/T-22, G-03/G-04 | Owner + pelaksana menjadwalkan 8 peserta baru sesuai UT dan pilot 14 hari/100 pesanan (V-08); bukti tidak dapat digantikan tes otomatis |
| B-05 | Kebutuhan operator belum tersedia di folder | T-23; sebelum penagihan pertama | Operator Berrie menyiapkan rekening, petunjuk bukti bayar, kanal bantuan dan alur verifikasi/audit (V-06); tidak memakai rekening atau data pembayaran rekaan |
| B-06 | Kondisional, belum diverifikasi | Aktivasi pajak/layanan usaha pilot | Owner memastikan label/tarif sesuai usaha (V-07) sebelum mengaktifkan; default tetap mati 0%, sehingga tidak menghalangi transaksi tanpa tarif |

Tidak ada konflik keputusan produk yang teridentifikasi dalam penyusunan daftar ini. Kendala konkret baru harus mencantumkan file/aturan terdampak, akibat, rekomendasi dan pekerjaan yang masih bisa dilanjutkan.

## Aturan pembaruan dan bukti

1. Pertahankan ID T/G/B serta AC/UT/D/V yang sudah dirujuk. Saat memecah tugas, gunakan turunan seperti T-09a dan tetap pertahankan induknya.
2. Perbarui **Posisi sekarang**, status tugas dan blocker setelah satu bagian kerja selesai atau ada kendala baru; jangan menghitung persentase dari jumlah file/layar.
3. Sebelum menandai Selesai, catat tanggal, versi/commit bila tersedia, perubahan, perintah/uji yang benar-benar dijalankan, hasil aktual, lokasi bukti dan keterbatasan. Mockup tidak memenuhi kriteria fitur operasional.
4. Catat eksekusi AC per ID: versi, device/OS/browser/printer bila relevan, fixture/data awal, langkah, hasil diharapkan/aktual, lulus/gagal/belum diuji dan bukti. UT memakai catatan per peserta/tugas dari file 12. Lampirkan hasil berikutnya di folder `evidence/` saat bukti pertama dibuat; folder itu belum tersedia sekarang.
5. Perubahan implementasi yang berdampak pada hasil uji membatalkan bukti terkait sampai diverifikasi ulang. AC lintas fitur baru lulus setelah seluruh jalurnya diuji, bukan karena satu task selesai.
6. Jika keputusan produk berubah atas instruksi owner, selaraskan spesifikasi, register keputusan, AC/UT, design system bila relevan dan status pekerjaan pada pekerjaan yang sama; daftar tugas tidak boleh diam-diam mengubahnya.


## Catatan pelaksanaan

| Tanggal | Pekerjaan | Hasil aktual | Batas bukti |
| --- | --- | --- | --- |
| 2026-10-06 | T-00 — susun pelacakan | Inventaris folder dan baseline ditinjau; tasks.md dibuat; tautan lokal, ID/dependensi tugas, cakupan AC-01–76 serta rujukan UT/V diperiksa | Dokumentasi saja; aplikasi, AC, UT, layanan dan hardware belum diuji; tidak ada build/test aplikasi yang tersedia |
| 2026-10-06 | M-01 — mockup Tahap 1 | React/TS strict/Vite lokal; sembilan tes logika, sebelas tes browser, typecheck/lint/build lulus; alur dan keterbatasan terdokumentasi di mockup/README.md | State memori/simulasi, Chrome headless macOS; visual oleh pemilik; bukan AC/UT aplikasi, integritas produksi atau uji hardware |
| 2026-10-06 | M-01 — revisi feedback kasir | Daftar per varian, penyajian campuran satu tagihan, No. antrean / nama, Simpan dulu, Bayar dulu + batch atomik simulasi, alur kas dan navigasi diselaraskan. D-27 direvisi; D-31–33 ditambahkan; AC/UT dan konteks diperbarui. 15 tes logika, 16 tes browser serta typecheck/lint/build lulus | Pemeriksaan struktur/keyboard/alur browser pada 360/390/768/1280 px; tanpa screenshot; review visual pemilik belum dicatat. Bukan aplikasi operasional atau bukti pilot |

| 2026-10-07 | M-01 — akses preview HTTP Wi-Fi | Fallback UUID untuk HTTP LAN; typecheck/lint/build, 15 tes logika dan 17 tes browser lulus. URL LAN HTTP 200; layar kasir tampil pada Chrome headless 390×844 tanpa page error ketika randomUUID tidak tersedia | Regresi AC-07–17/UT-02–06 sebatas mockup; iPhone fisik belum diuji; tanpa screenshot |

## Pekerjaan tambahan keputusan D-34–39

ID induk dan urutan tahap tetap. Semua baris operasional di bawah **Menunggu**, bukan selesai karena spesifikasi disetujui; prototipe dapat disimulasikan tanpa mengklaim keamanan server.

| ID | Pekerjaan | Status | Dependensi | Hasil wajib / cakupan |
| --- | --- | --- | --- | --- |
| M-02 | Perbaikan mockup tabel, izin/approval, serah-terima dan channel | Dipensiunkan — 8 Oktober 2026 | Histori M-01; spesifikasi revisi | Hasil/cara mencoba (histori M-01/M-02; folder dipensiunkan): frame tablet, tabel, dua staf/owner, izin/approval/receipt, serah-terima −7.000, empat channel, tagihan/biaya/subsidi/payout/refund manual contoh. Bukti otomatis M-02 dicatat di README; bukan kelulusan AC produksi atau UT peserta |
| T-04a | Identitas staf, scope akses, kebijakan offline/versioning | Menunggu | T-04 | AC-77–79,84,99; V-05/V-09; semua jalur termasuk API/import diperiksa |
| T-05a | Model channel/tagihan dan custody segment | Menunggu | T-05 | AC-85–86,88–94,100; invariants file 07 dan rumus file 06 |
| T-12a | Alur izin lokal, serah-terima dan platform manual | Menunggu | T-04a,T-05a,T-12 | AC-78–79,83,85–94,98; tanpa integrasi otomatis |
| T-15a | Approval HP online dan receipt satu operasi | Menunggu | T-04a,T-12a,T-15 | AC-80–84,98–99; keputusan bukan efek bisnis; crash/replay/expiry diuji |
| T-14a | Pengawasan dan pencocokan dana platform | Menunggu | T-12a,T-14 | AC-87,90–93,100; checkpoint, alokasi dan export tanpa rahasia |
| T-17a | Migrasi/backup/restore scope tambahan | Menunggu | T-14a,T-15a,T-17 | AC-95; tidak menghidupkan staf/approval epoch lama |
| T-18a | Verifikasi keamanan dan perilaku scope baru | Menunggu | T-17a,T-18 | AC-77–95,98–100; V-09–10; uji nyata dua perangkat dan fault injection |
| T-21a | Tabel responsif dan UT tambahan | Menunggu | T-18a,T-21 | AC-96–97; UT-13–17; hasil per peserta/perangkat |

G-01 juga memerlukan T-18a; G-02 memakai bukti scope staf/channel bila diaktifkan pada pilot; G-04 juga memerlukan T-21a dan seluruh AC-01–109/UT-01–18. T-19 mencakup layout tabel; T-20 mencakup restore entitas baru; V-09–10 wajib sebelum klaim terkait. B-01 mencakup akses layanan approval Berrie, bukan partner GoFood/ShopeeFood. Contoh laporan merchant yang disamarkan diperlukan untuk V-10; tanpa data itu gunakan fixture berlabel, jangan klaim validasi format nyata.

7 Oktober 2026: dokumen scope/alur/domain/izin/UX/acceptance, konteks, panduan agen dan brief mockup diperbarui; kode aplikasi/mockup tidak diubah. Pemeriksaan dokumentasi dicatat setelah validasi; hasil tes mockup 6 Oktober tetap bukti versi lama, bukan bukti revisi ini.

Hasil pemeriksaan dokumentasi 7 Oktober 2026: 18 file Markdown (17 diperbarui dan 1 prompt baru), 146 tautan lokal valid, struktur kolom tabel konsisten, ID AC-01–100/UT-01–17/D-01–40/V-01–10 lengkap tanpa duplikat. Pemeriksaan pencarian aturan lama dilakukan untuk akses perangkat, staf, shift, Payment dan bentuk daftar. Tidak menjalankan build/test aplikasi karena kode tidak diubah; tidak ada klaim AC/UT lulus.

Arahan lanjutan 7 Oktober 2026: D-40/AC-96 menetapkan default review M-02 berupa tablet landscape 1024×768 CSS px. Pada saat arahan dicatat, prompt dan brief diselaraskan; kode preview belum diubah. Implementasi M-02 berikutnya telah menerapkan frame tersebut. Verifikasi tambahan tablet portrait 768×1024 tetap wajib.


## Hasil pelaksanaan M-02 — 7 Oktober 2026

Mockup lokal tersambung: preview default tablet landscape 1024×768, pemilih HP/portrait/desktop, tabel kompak semua daftar, owner/Rani/Budi dan matriks izin, surface HP owner terpisah dengan request/receipt satu operasi, serah-terima beserta revisi/selisih −7.000, channel manual/stok bersama, ID platform lintas sesi, tagihan/biaya/subsidi/pembalikan/payout/alokasi, serta refund/stock return contoh. Alur lama tetap diregresi. Domain simulasi tambahan terpisah dari React di `mockup/src/simulation.ts`. Cara mencoba, skenario, pemetaan AC/UT dan batas (histori M-01/M-02; folder dipensiunkan).

Hasil aktual: `npm run typecheck`, `npm run lint`, `npm test` (33 tes), `npm run build`, `npm run test:browser` (33 tes) **lulus**. Browser Chrome lokal headless; pemeriksaan otomatis 360/390/768/1280 px + 1024×768 dan 768×1024, keyboard/overflow/ukuran teks/target kontrol serta pemilih preview. README/tasks dan tautan lokal diselaraskan; tidak ada perubahan spesifikasi, layanan, akun produksi, pesan eksternal atau deployment. Git lokal masih belum tersedia.

Status M-02 tetap Dikerjakan karena review visual oleh pemilik belum dicatat, mengikuti pola M-01. Implementasi dalam cakupan sesi dan pemeriksaan otomatis telah selesai. Semua AC-77–100/UT-13–17 hanya dipetakan ke bukti mockup; **AC produksi dan UT peserta belum lulus/dijalankan**. Auth/PIN/verifier/permit, storage persisten/lock, API/receipt server, jaringan/sync, backup/restore, printer, export, uji fisik/keamanan/merchant nyata tetap pekerjaan T-xx/V-xx. Refund sebagian dan editor katalog/channel lengkap belum dibuat; tidak ada tombol sukses palsu untuk area tersebut.

## M-03 — Sites untuk visual dan alur (7 Oktober 2026)

| ID | Pekerjaan | Status | Bukti / kriteria selesai |
| --- | --- | --- | --- |
| M-03 | Satu prototipe Sites sebagai acuan visual akhir dan evaluasi alur | Dikerjakan — D-71 diterapkan lokal; arah/alur disetujui, render akhir dan cakupan review lengkap belum dinilai | [Spesifikasi](specs/README.md), [design system](DESIGN-SYSTEM.md), [prototipe lokal](berrie-site/README.md), [review versi 2](berrie-site/REVIEW-HISTORY.md#d46-d48). Acuan aktif [review D-71](berrie-site/REVIEW-KASIR-D71.md); bukti D-43–70 digabung pada [riwayat review](berrie-site/REVIEW-HISTORY.md). Tuntaskan review render akhir/lintas perangkat dan perbandingan UI operasional pada AC-101; persetujuan arah/alur tidak meluluskan UT/pilot. Simpan tanpa deployment sampai diotorisasi |

Pada saat keputusan D-41 dicatat, M-01/M-02 dipertahankan sebagai referensi perilaku/regresi. Folder tersebut kemudian dipensiunkan pada 8 Oktober 2026; hasil lama di bagian ini tetap historis. T-06 serta pekerjaan UI berikutnya memakai kembali UI Sites yang disetujui, dengan adaptasi stack final dan pemeriksaan kesetiaan. Fondasi domain/storage tetap urutan file 01; Sites tidak menyelesaikan T-01–T-25. Gerbang aktif kini mencakup AC-01–112, UT-01–18.

Perubahan sesi ini hanya dokumentasi. Pemeriksaan tautan lokal, paket dan konsistensi D-41/AC-101 dilakukan; tidak menjalankan tes aplikasi karena kode tidak berubah.

## Revisi palet M-03 — D-42 (7 Oktober 2026)

[Design system](DESIGN-SYSTEM.md), brief, spesifikasi UX/layar, register keputusan, AC-101 dan konteks diselaraskan dengan referensi ResearchRabbit About Us. Paket Sites diperbarui berisi token palet dan spesifikasi penuh. Pemeriksaan aktual: tampilan/computed styles referensi, kontras pasangan token utama dan tautan lokal. Pada saat pencatatan palet, Site belum dibangun dan kode mockup tidak diubah. Status terkini prototipe lokal/revisi Kasir dicatat di bawah. Review visual dan kontras semua keadaan UI menunggu implementasi.

## Penyelarasan dokumentasi Kasir — D-43/D-44 (7 Oktober 2026)

Pada saat pencatatan D-43/D-44, prototipe Sites masih parsial dan belum direvisi. Kini D-43–48 sudah diterapkan/disimpan (lihat posisi sekarang); visual belum disetujui. Arahan revisi Kasir kini berada pada [spesifikasi](specs/README.md) dan [design system](DESIGN-SYSTEM.md). T-02/T-07/T-08/T-10/T-11/T-13/T-14/T-17/T-19/T-21 dipetakan ke AC-102–109/UT-18, status implementasi tetap Menunggu. D-01–45/V-01–10/AC-01–109/UT-01–18 adalah rujukan pada pencatatan tersebut; catatan hasil uji terdahulu di atas dipertahankan sebagai histori versi lama.

Pekerjaan sesi ini hanya dokumentasi: aturan aktif, peta fitur, status/tugas, brief, panduan agen dan paket Sites diselaraskan. Tidak ada perubahan kode aplikasi, tes aplikasi atau deployment. Pemeriksaan dokumen mencakup tautan lokal, struktur tabel, ID dan kesamaan salinan paket; hasil aktual dilaporkan setelah pemeriksaan selesai. AC/UT tetap belum diluluskan.

UX Principles bagian 9/10.1 dan Design System menetapkan font/komponen global; T-06/T-19/T-21 memuat AC-109. Implementasi revisi Sites saat ini tetap Kasir dahulu, tanpa menyatakan layar lain sudah diperbaiki.

Hasil pemeriksaan aktual dokumentasi D-43/D-44: 24 dokumen Markdown proyek diperiksa, 192 tautan lokal valid, struktur kolom tabel konsisten. D-01–44/V-01–10/AC-01–109/UT-01–18 lengkap dan unik; paket berisi 15 sumber yang sama persis dengan file asal. Pencarian terarah tidak menemukan larangan diskon SKU atau label modal Tiket & struk yang masih aktif pada spesifikasi/brief. Arsip mockup tetap merekam versi lamanya. Tidak menjalankan tes aplikasi karena pekerjaan ini tidak mengubah kode; AC/UT tetap belum lulus.

## Adaptasi visual Apple — D-45 (7 Oktober 2026)

Riset sumber resmi dan token komponen konkret dicatat pada [Design System](DESIGN-SYSTEM.md), diselaraskan dengan UX Principles 10.1, aturan layar, keputusan D-45, AC-109, brief/prompt Sites dan paket. T-06/T-19/T-21 memeriksa komponen serta state/fallback; Pada saat pencatatan tersebut, M-03 masih menunggu revisi Kasir; status kode kini ada di Posisi sekarang, persetujuan visual tetap belum selesai. Font sistem lokal, Lucide, tombol kapsul/ikon bulat, sudut selaras dan material navigasi selektif adalah arahan adaptasi; kode tidak diubah dan tidak ada deployment.

Hasil pemeriksaan aktual D-45: 24 dokumen Markdown proyek diperiksa; 199 tautan lokal valid, 757 baris tabel konsisten, D-01–45/V-01–10/AC-01–109/UT-01–18 lengkap dan unik. Paket berisi 15 sumber yang identik dengan file asal. Pencarian terarah memastikan token radius lama 12/16 seragam tidak lagi menjadi aturan aktif pada design system/UX/brief/prompt/AC. Tes aplikasi tidak dijalankan karena kode tidak diubah; review visual/AC/UT tetap belum diluluskan.

## Pembersihan repo dan peta acuan — 7 Oktober 2026

Pada pembersihan terdahulu, arahan pemilik adalah merapikan pemetaan sebelum menghapus berkas tidak terpakai. Saat itu AGENTS dibuat mempunyai satu peta peran file yang membedakan sumber spesifikasi/token, prompt proyek baru, prompt revisi, paket hasil generasi, kode dan bukti historis. Histori D-34–47 tidak diulang sebagai sederet arahan tambahan di AGENTS.

Prompt M-02 lama dihapus; hasilnya tetap pada mockup/README.md dan kode/tes. Handoff lama yang menduplikasi petunjuk/hasil README dihapus. Catatan simpan Sites digabung ke berrie-site/REVIEW-HISTORY.md#d43-d45 dengan ID versi/commit/bukti tetap. Komponen starter tanpa jalur import aplikasi, ikon placeholder, helper ID tanpa pemakai, contoh D1 terpisah serta .DS_Store dihapus setelah audit rujukan/dependensi. Konfigurasi/runtime/dependensi, kode mockup dan gambar review historis dipertahankan. Salinan pemulihan file yang dihapus ada di luar proyek, /private/tmp/berrie-cleanup-20261007.zip.

Pada pembersihan terdahulu, lampiran hasil generasi diperiksa terhadap 15 sumber asli; lampiran bukan sumber kebenaran kedua. Status lama yang keliru tentang implementasi D-43–45/Git diperbaiki. Pembersihan tersebut tidak menerapkan D-46/D-47 ke UI, tidak menyimpan versi baru atau melakukan deployment. Hasil pemeriksaan tugas itu dicatat setelah verifikasi.

Hasil aktual pembersihan: 58 file obsolete/tanpa pemakai dan 6 .DS_Store dihapus; 49 di antaranya komponen UI starter tanpa jalur import aplikasi. Dua belas komponen UI yang terpakai tetap. Peta AGENTS mempunyai 27 entri unik, seluruh dokumen sumber proyek terpetakan; 23 dokumen Markdown (di luar lisensi vendor) diperiksa dan 235 tautan lokal valid, tanpa rujukan ke file yang dihapus. Paket sesuai 15 sumber melalui --check. Sites: typecheck/lint lulus, 24 tes domain lulus/0 gagal dan build selesai. git diff --check lulus. Tidak menjalankan browser/tes mockup ulang karena UI/domain/mockup tidak diubah; tidak ada bukti baru AC/UT operasional atau approval visual. Tidak ada commit/push/simpan versi Sites/deployment.

## Revisi implementasi Kasir — D-46–48

Font 14/18/20/22 per peran, tabel padat, angka murni sesuai feedback terbaru, alias tipe, keranjang/tindakan terbuka, toggle workflow kas dan navigasi kiri yang dapat diciutkan diterapkan. [Bukti terpilih](berrie-site/REVIEW-HISTORY.md#d46-d48) mencatat hasil browser dan batasnya. Simpan tanpa deployment; belum memenuhi gerbang T/AC/UT operasional.

Akses Sites yang sempat mengembalikan project not found sudah pulih. Revisi D-46–48 berhasil disimpan sebagai versi 2 pada proyek yang sama, tanpa deployment atau screenshot baru. Build/packaging lulus; verifikasi layanan menunjukkan latest_version_number=2 dan current_live_url=null. Visual belum disetujui. Identitas versi/sumber dan batas uji ada pada [review Kasir — Penyimpanan versi 2](berrie-site/REVIEW-HISTORY.md#penyimpanan-versi-2).

## Perapihan dokumen sumber — 7 Oktober 2026

Atas instruksi pemilik, dokumen konteks, dua prompt Sites, lampiran hasil generasi dan catatan simpan terpisah dihapus. Script pembuat lampiran yang hanya bergantung pada dokumen tersebut ikut dihapus. Mapping, tautan dan instruksi aktif kini langsung mengarah ke spesifikasi, design system, petunjuk prototipe dan review yang dipertahankan.

Isi penting yang belum mempunyai tempat di sumber utama dipindahkan: asal/batas/sinyal riset ke file 01, pengalaman serta tujuan UX pemilik ke file 12, referensi teknis PWA/Bluetooth/pencetakan/AirPrint beserta tanggal pemeriksaan lama ke file 11, dan identitas versi 2/commit/checksum/hasil layanan ke review D-46–48. Scope, keputusan D/V, kriteria AC/UT dan hasil uji terdahulu tetap dipertahankan. Catatan pelaksanaan di atas merekam pekerjaan terdahulu; penyebutan konteks/prompt/lampiran di dalam histori bukan instruksi untuk membuatnya kembali.

Hasil aktual: 5 dokumen dan 1 script pembuat lampiran dihapus; 11 dokumen diperbarui. Pemeriksaan 20 dokumen Markdown sumber menemukan 236 tautan lokal valid, termasuk anchor yang digunakan, dan struktur kolom tabel konsisten. Pencarian pada sumber proyek tidak menemukan nama/rujukan ke berkas yang dihapus. Seluruh baris register D-01–48/V-01–10/AC-01–111/UT-01–18 identik dengan sebelum perapihan; peta AGENTS mencakup seluruh dokumen sumber yang tersisa. git diff --check pada berrie-site lulus. Tidak menjalankan tes aplikasi karena perubahan hanya dokumentasi dan penghapusan generator yang tidak lagi digunakan; tidak ada commit, penyimpanan versi Sites, deployment, screenshot atau klaim kelulusan AC/UT baru.

## Penulisan ulang design system — D-49 (7 Oktober 2026)

Seluruh isi DESIGN-SYSTEM.md diganti dari nol atas instruksi pemilik. Dokumen aktif kini memuat HEX palet/tint, page/surface/text/fill dua tema, Apple system font + padanan Inter lokal, body/label, spacing scale, shape/elevasi, konstruksi komponen/state, material navigasi/fallback, dan resep komposisi Kasir. Histori/referensi situs palet tetap hanya di register keputusan. UX/aturan layar/indeks/panduan agen dan AC-101/109–112 diselaraskan; UT-01–18 mempertahankan target/ID, observasi font/tema/keterbacaan diperbarui.

Penerapan M-03 D-49 belum dilakukan; arah estetika prototipe versi 2 ditolak. Tugas ini tidak mengubah kode/domain/config, mengunduh font ke proyek, membuat versi Sites/screenshot baru, atau memublikasikan. Review D-43–48 tetap bukti historis. Pemeriksaan aktual: 16 HEX palet/tint cocok dengan CSS rujukan; 96 pasangan token solid terang/gelap memenuhi target (minimum teks 4,545:1, batas/fokus 3,202:1). Ini pemeriksaan token, belum material komposit/UI. 20 dokumen diperiksa: 231 tautan lokal, 3 anchor dan 86 tabel valid; D-01–49/AC-01–112 unik/lengkap dan 18 ID UT utuh. Pemeriksaan whitespace/diff lulus; AC UI, UT dan gerbang pilot belum lulus.


## Penerapan design system Kasir — D-49/D-50 (7 Oktober 2026)

Prototipe proyek Sites yang sama memakai page netral, sidebar 200 px/rail 64 px, radius group 16 px, font Apple system/Inter lokal, skala 14/18/20/22, kontrol/state bersama, stepper dan textarea, serta panel review terpisah. Atas feedback pemilik, putih surface terang diganti gradient bubblegum horizontal lavender–cyan lembut–mint; pilihan aktif tetap cyan #61DCE2. Token/specs/register/AC/UX diselaraskan dalam pekerjaan yang sama.

[Bukti dan batas](berrie-site/REVIEW-HISTORY.md#d49-d50): tablet 1024×768, fixture 21 SKU menampilkan 8 baris penuh; domain 31 tes lulus, pemeriksaan browser untuk pembayaran/error/tema/ukuran teks/nama panjang dan reflow terpilih. Target ideal 10, audit media aksesibilitas penuh, Safari/iPhone, UT peserta dan persetujuan visual masih menunggu. Aplikasi operasional belum dibangun. Typecheck, lint, build dan packaging akhir lulus.

Layanan mengonfirmasi versi **3**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_9205eb944b8c8191aaff097c8d1c7894`, sumber commit `9a429f1149ffaef03ed855bdd460a470bf37c6bb`. Arsip: `sha256:f62f8fa8faa2767d5e0ed7332fd55dd134a815d3eed8c1d088ee49e61f4a6b2b`, 62 berkas, 2.344.960 byte. `deployment_id=null`; pembacaan ulang proyek menunjukkan `latest_version_number=3`, `current_live_url=null`, `current_preview_url=null`. Tanpa deployment atau screenshot baru. Identitas pascasimpan dicatat di tasks root ini; sumber anak Sites tetap bersih setelah push. Preview localhost tetap terbuka pada tablet 1024×768.

## Revisi Kasir D-51/D-52 dan simpan versi 4 — 7 Oktober 2026

Instruksi pemilik diterapkan pada proyek Sites yang sama: filter tunggal/tab tetap + kategori Pengaturan, Habis stok 0, inactive hanya Menu & Stok; dialog penyajian item, Reguler generik hilang, catatan draft terlihat, button Diskon/Catatan/Simpan dulu jelas, Bayar nanti/Bayar pendek; refund/koreksi/penyajian di Pesanan/detail. Settlement Kasir mengosongkan composer tetapi mempertahankan struk order asal. Stok selalu quantity wajib pada form/aktivasi/CSV; contoh 1000, legacy null ditahan sampai hitungan awal eksplisit, seluruh unit baru mendebit sekali. Spesifikasi/register/AC/UT/design system dan pemetaan T-07–10/17 diperbarui. Status operasional tetap Menunggu.

Hasil: 38 tes domain/katalog/filter lulus, 0 gagal; typecheck/lint/build dan git diff --check lulus. Browser DOM/computed tablet 1024×768: 10 baris penuh, gradient bubblegum dan cyan tetap, Promo→Minuman satu pilihan, Habis 0 disabled, inactive absen. Form stok kosong ditolak/1000 diterima. Catatan draft, checkout Rp32.000, Bayar nanti, struk asal, penyajian Pesanan dan recovery hasil tidak diketahui diuji; recovery Es Teh 1000→999 satu kali. Baseline 360 px dan teks 200% tanpa overflow horizontal terpilih. Batas lengkap pada [review](berrie-site/REVIEW-HISTORY.md#d51-d52); tanpa screenshot baru, belum UT peserta/pilot/IndexedDB/migrasi/printer/backup nyata.

Layanan mengonfirmasi versi **4**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_f30c0512c6ac81919757ef5d855883a2`, commit `1b2d799c05af361625a72cb15f821c77d853ded6`. Arsip `sha256:2b5566c1007d0f224d054afb5d0b8863a7be7789994ad936187cf4f6e86b0738`, 62 berkas, 2.355.200 byte. `deployment_id=null`; get_site mengonfirmasi latest_version_number=4/current_live_url=null/current_preview_url=null. Identitas pascasimpan ada di tasks root, checkout Sites bersih. Preview localhost dipertahankan pada tablet 1024×768/100%.

Pemeriksaan dokumentasi final: 21 dokumen, 245 tautan lokal valid, 896 baris tabel konsisten; register D-01–52/AC-01–115/UT-01–18 lengkap dan unik. HTTP localhost 200 setelah build; server PID 13947 tetap melayani port 4173.

## Pemensiunan mockup lokal — 8 Oktober 2026

Atas instruksi pemilik, `mockup/` dihapus setelah pemeriksaan tidak menemukan import/dependensi runtime/config dari Sites. Prototipe aktif hanya `berrie-site/`. Skenario, aturan dan kriteria operasional tetap pada specs; hasil pengujian M-01/M-02 di atas tetap catatan versi lama, bukan bukti seluruh suite sudah dipindahkan ke Sites. ID lama tidak dihapus. Rujukan aktif/tautan dan status M-01/M-02 diperbarui; review Sites yang merekam keadaan sebelum penghapusan tetap historis.

Folder lama beserta dependensi/build/keluaran tes dihapus: total 3.507 berkas / 115.418.061 byte. Cadangan yang sempat dibuat juga dihapus atas instruksi lanjutan pemilik; tidak ada arsip mockup tersimpan.

Tidak mengubah kode UI/domain atau konfigurasi runtime Sites; versi layanan tetap 4 tanpa deployment. README Sites berubah lokal saja; tidak melakukan commit/push/simpan versi baru. Pemeriksaan dokumentasi dan diff dijalankan; tes aplikasi tidak diulang untuk penghapusan prototipe yang tidak menjadi dependensi aplikasi aktif.

Pemeriksaan akhir: folder mockup dan cadangannya tidak ada; 21 dokumen/239 tautan lokal valid/894 baris tabel konsisten; ID D-01–52/AC-01–115/UT-01–18 tetap lengkap dan unik; git diff --check Sites lulus (hanya README berubah lokal).

## Revisi Kasir/Pesanan/Riwayat — D-53/D-54 (8 Oktober 2026)

Instruksi pemilik diterapkan pada proyek Sites yang sama: permukaan solid #FCFCFD/cyan aktif, label dan tombol keranjang, dapur saja sebelum settlement, Buka rincian jelas, filter Semua/Tersimpan/Lunas/Belum bayar tanpa Refund tertunda. Riwayat hanya pekerjaan/settlement selesai dan due 0. Refund paid dari kedua daftar hanya sesudah uang dikembalikan; requested cancel atomik sesudah dapur diberi tahu, satu alasan tanpa field metode berbeda. Refund histori sesi lama memakai kas kini tanpa mengubah settlement/sesi asal. Localhost frame 1024×768; hosted tetap responsif. D-53/D-54, AC-116/117 dan UT-04/07/09/11 beserta sumber terdampak diselaraskan. T-08–13/19/21 tetap Menunggu untuk implementasi operasional.

43 tes domain/katalog/filter lulus, 0 gagal. Bukti browser/computed dan batas pada [review](berrie-site/REVIEW-HISTORY.md#d53-d54). Checkbox refund hanya pernyataan kasir, bukan verifikasi dana otomatis. Filter kalender native belum diuji UI karena otomasi input tidak mendukungnya. Tidak ada deployment atau kelulusan AC/UT peserta/pilot baru.

Pemeriksaan final lokal: typecheck/lint/build dan git diff --check lulus; 43 tes lulus. Register D-01–54/AC-01–117/UT-01–18 lengkap dan unik. Tautan lokal diperiksa tanpa kehilangan rujukan; skema sites-project historis adalah tautan aplikasi. Browser preview tetap 1024×768, 9 baris penuh dan tanpa overflow horizontal di workspace. Bukti visual sementara di /private/tmp/berrie-kasir-d53-d54.png, bukan thumbnail deployment.

Layanan mengonfirmasi versi **5**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_0daa9286af3c8191b152cf64dedaf91d`, commit `b4a1c6a6ec5731a7fa382e2eaecd0d719e102d83`. Arsip `sha256:dbf73e7941d88155788efb320ae1da290babac96980203df323d127f15a8bc53`, 62 berkas, 2.355.200 byte. `deployment_id=null`; get_site mengonfirmasi latest_version_number=5/current_live_url=null/current_preview_url=null. Checkout Sites bersih; spesifikasi/design system/tasks root tetap lokal di luar Git Sites. 245 tautan lokal valid dan ID register lengkap/unik. Preview localhost tetap berjalan; tab tablet dipertahankan.

## Revisi D-55/D-56 — 8 Oktober 2026

Feedback pemilik diterapkan pada Sites yang sama: satu nama toko, keranjang lavender/empat item/aksi kompak/identitas wajib/Bayar primer/tanpa Pesanan baru Kasir; Pesanan default Lunas/tabel dan modal penyajian ringkas/detail empat item/highlight penyerahan. MenuEditor Tipe/custom/Kode otomatis/kategori owner/channel aktif, ukuran/rasa flat harga/stok dan topping satu simpan atomik. Peringatan stok di aplikasi pada crossing ≤threshold, tanpa push/WA/email. Spesifikasi/register D-55/56, AC-118–121, UX/UT, design system dan AGENTS diselaraskan. Status implementasi operasional T-07–13/17/19/21 tetap Menunggu.

51 tes domain/katalog/filter, typecheck dan lint lulus. Bukti browser terpilih dan batas pada [review D-55/D-56](berrie-site/REVIEW-HISTORY.md#d55-d56): empat keranjang (53 px/baris), empat detail (57 px/baris), no overflow workspace 1024, tabel default Lunas, tiga ukuran+topping Rp23.000, custom Premium/PRE, peringatan stok6→5, channel GoFood muncul setelah aktif. Katalog 9 baris penuh. Bukan UT peserta/operasional/pilot. Pemeriksaan build/packaging dan identitas layanan dicatat setelah hasil aktual; belum deployment.

Pemeriksaan final: typecheck/lint/build/packaging dan git diff --check lulus; 51 tes lulus. 23 dokumen/252 tautan lokal valid; register D-01–56/AC-01–121 lengkap dan unik. Layanan mengonfirmasi versi **6**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_333669993f108191b62ee2e16d4f7a36`, commit `6626a6b4fbef61349ff01a98404d556cb0009eac`. Arsip `sha256:ddf930cbb3efa85af872c907b23a356129873be8dc52b524ad5786a52e333d45`, 62 berkas, 2.385.920 byte. `deployment_id=null`; pembacaan ulang get_site latest_version_number=6/current_live_url=null/current_preview_url=null. Tidak mengubah akses atau deployment. Checkout Sites bersih; spesifikasi/design system/tasks root tetap lokal di luar Git Sites. Preview localhost 1024×768 dipertahankan.

## Revisi Menu & Stok — D-57–60 (8 Oktober 2026)

Instruksi pemilik diterapkan pada prototipe Sites yang sama: input tabel satu rasa/ukuran per baris, tiga Milkshake terpisah, harga berbeda, pilihan banyak baris/duplikat/tempel TSV, error sel dan draft lintas tab. Stok awal/minimal satu saldo grup menu, checkout menggabungkan kebutuhan lintas rasa/ukuran dan return mengembalikan grup asal. Racikan gratis Es/Gula/default Normal/custom memakai snapshot unit. Rekap online jumlah per menu sesudah antrean, rentang berurutan dan histori, tanpa pesanan/omzet/kas; pengingat header/tutup kas setelah diaktifkan owner, bukan blocker baru. Feedback terakhir: lima baris Menu per halaman, baris ≥64 px/input56 px dan Topping/Rincian tanpa pill.

Spesifikasi/register D-57–60, AC-122–126, UT-19–21, design system, AGENTS dan README diselaraskan. Bukti lokal pada [review D-57–60](berrie-site/REVIEW-HISTORY.md#d57-d60). Implementasi produksi/IndexedDB/server/backup/migrasi, UT peserta dan gerbang pilot tetap belum selesai; T-07–13/17/19/21 tidak dinyatakan selesai oleh prototipe ini. Identitas simpan dan hasil build dicatat setelah konfirmasi layanan; tetap tanpa deployment.

Pemeriksaan final: 64/64 tes lulus; typecheck/lint/build/packaging dan git diff --check lulus. Dokumentasi: 24 dokumen/254 tautan lokal valid; D-01–60, AC-01–126 dan UT-01–21 lengkap/unik. Pemeriksaan browser terbaru mengonfirmasi editor racikan bisa dibuka tanpa menambah tinggi row; tidak ada console error pada tab final. Lima row terukur 64,5–65 px dan area tap/input56 px; Topping/Rincian transparan/radius0. Bukti screenshot sementara /private/tmp/berrie-menu-five-rows.jpg; bukan thumbnail deployment.

Layanan mengonfirmasi versi **7**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_64088aa7b84081918beae49e3ad1623c`, commit `c7acc254fe0f52f72ddc3559ec4cbdbf21e1a209`. Arsip `sha256:4e3d3ac14217e9557d66aa40c5d2287d153a148c22b1b697ebf8fea4a7c1d04c`, 62 berkas, 2457600 byte. `deployment_id=null`; pembacaan ulang layanan latest_version_number=7/current_live_url=null/current_preview_url=null. Checkout Sites bersih; spesifikasi/design system/tasks root tetap lokal di luar Git Sites. Preview localhost 1024×768 dipertahankan, tanpa deployment atau perubahan akses.

## Revisi Menu, Stok dan Kas — D-61–65 (8 Oktober 2026)

Melanjutkan checkout versi7 tanpa mengulang dari awal. + Menu/tabel tidak menyusut; variabel owner single-multi/dropdown/harga per kombinasi, kosong -, dialog Kasir sesuai menu dan snapshot; Isi stok/Stok opname/minimal; rekap sampai menit/input jelas/koreksi delta default approval owner; Kas breakdown/Uang masuk-keluar dan dua alur sesuai petugas sama/ganti shift. Impor ditunda seluruhnya. Spesifikasi/register D-61–65, AC-127–131, UT-22–25, design system, AGENTS/README diselaraskan. Bukti dan batas pada [review terkini](berrie-site/REVIEW-HISTORY.md#d61-d65).

75/75 tes, typecheck/lint dan git diff --check lulus. Browser memverifikasi Pizza tanpa variabel, topping Keju+Jamur/harga30.000, stok1000→1010→999→991→996, stok minimal editable, tanggal step60, uang100.000−20.000 dan tutup langsung, handover sesi50.000 ke staf/hitung buta/cancel. Final tabel378px, lima row64,5–65 dan input56; row error tumbuh/area425 tidak menyusut. Screenshot sementara /private/tmp/berrie-menu-d61-d65.jpg dan /private/tmp/berrie-kas-d61-d65.jpg, bukan deployment thumbnail. Build/arsip/identitas layanan dicatat setelah hasil aktual. Implementasi operasional/UT peserta/visual/printer/restore/pilot tetap belum selesai. Tidak ada deployment.

Pemeriksaan dan simpan final: build/packaging lulus; layanan mengonfirmasi versi **8**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_851d12c9df708191a0bb1375f13c8402`, commit `d082fe11ff4c98291bcfc43211cc5a6c76a4da94`. Arsip `sha256:c5d283445ba649d70826cb729c99a62d71bd2b63c1dd57675ecc86779dbc3274`, 62 berkas, 2.498.560 byte. `deployment_id=null`; pembacaan ulang layanan mengonfirmasi latest_version_number=8/current_live_url=null/current_preview_url=null. Checkout Sites bersih dan git diff --check lulus. Spesifikasi/design system/tasks root tetap lokal di luar Git Sites. Preview localhost 1024×768 dipertahankan; tanpa deployment atau perubahan akses.

## Revisi penemuan Menu & Stok — D-66 (8 Oktober 2026)

Melanjutkan sumber aktual versi8 dan REVIEW-HISTORY.md#d61-d65 (nama versi/file pada permintaan adalah rujukan lama). Feedback pemilik: Varian/copy ringkas, Status/Menu/Varian/Harga/Kategori, + Menu modal/Batal/hasil paling atas, daftar harga dalam dialog menggantikan + Kombinasi, Diskon submenu sendiri, tanpa Rincian dan opname hanya Stok. Ledger dipertahankan pada tab Stok. Draft baru bisa dibatalkan tanpa membuang edit lain; SKU removed diarsipkan saat commit. Harga baru wajib eksplisit, harga/ID lama/stok/pesanan dipertahankan. Definisi domain/izin/invariants/stack tetap.

Spesifikasi02/03/09/10/11/12/README, design system dan AGENTS diselaraskan; D-66, AC-132, UT-26 ditambahkan dengan ID lama dipertahankan. Bukti terpilih pada [review D-66](berrie-site/REVIEW-HISTORY.md#d66). Browser root terukur1024×768; lima row64,5–65/input56/area378 dan kategori terlihat. Batal modal tidak menambah baris, new menu di atas sebelum/sesudah save, dua harga12.000/16.000, Diskon15% commit. Typecheck/lint/77 tes lulus, git diff --check lulus. Build lokal lulus; hasil build/packaging/identitas simpan final dicatat setelah layanan. Tidak ada deployment, screenshot baru, UT peserta atau bukti pilot. Implementasi operasional tetap Menunggu.

Pemeriksaan/simpan final D-66: typecheck/lint/build/packaging dan git diff --check lulus; 77/77 tes lulus. Dokumentasi26 berkas/262 tautan lokal valid; D-01–66/AC-01–132/UT-01–26 lengkap dan unik. Layanan mengonfirmasi versi **9**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_52b4a271d4588191893cbf460b66ac3b`, commit `6a8814b81bf189ff6528e3e921b7004e1dd11825`. Arsip `sha256:081a58b670c35b566eea20492f89917ae93b281cc9e8c62e1de0b8ffc589d29c`, 62 berkas, 2.519.040 byte; `deployment_id=null`. Pembacaan ulang layanan mengonfirmasi latest_version_number=9/current_live_url=null/current_preview_url=null. Checkout Sites bersih; root spesifikasi/design system/tasks tetap lokal di luar Git Sites. Preview localhost tetap berjalan dan frame1024×768 dipertahankan. Tidak ada deployment atau perubahan akses.

## 9 Oktober 2026 — D-67 Menu & Stok (versi 10, tanpa deployment)

Instruksi terbaru pemilik diterapkan dari versi9 aktual (bukan versi4 pada prompt). Review yang dimaksud `REVIEW-KASIR-D61-D65.md` tidak ada; acuan yang sesuai `REVIEW-HISTORY.md#d61-d65`, juga D-66. Dua status sel berwarna/hapus seluruh menu berkonfirmasi/soft delete/history tetap, Batal perubahan dan tanpa checkbox/bulk. Varian satu modal harga dasar+tambahan≥0/default pertama berbintang, tanpa preset/pengaturan harga/langkah harga. Stok satu row/menu, baseline/actual reset beralasan dengan actor/waktu/before/after; minimal saja konfigurasi dan sisa read-only. Copy rekap dipangkas, Diskon navigasi utama. Spesifikasi/DS/AC-133/134/UT-27/28 diselaraskan; tidak membuka ulang stack atau gerbang pilot. Bukti aktual dan batas pada REVIEW-HISTORY.md#d67. Belum deployment atau perubahan akses.

Pemeriksaan final: **83/83 tes lulus**, typecheck/lint/build/packaging dan `git diff --check` lulus. Tautan lokal dokumen diperiksa tanpa rujukan hilang. Browser tablet memverifikasi edit/Batal, varian harga dasar + tambahan, hapus berkonfirmasi, stok beralasan/log dan kegagalan simpan yang mempertahankan input. Data contoh dipulihkan ke fixture awal; preview localhost tetap 1024×768. Bukti dan batas pada [review D-67](berrie-site/REVIEW-HISTORY.md#d67); UT peserta dan implementasi operasional belum dinyatakan lulus.

Layanan mengonfirmasi versi **10**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_443852a871d48191b6a9b618ab074d33`, commit `daeb9652c89eb4189ca90acc4690728340636895`. Arsip `sha256:2cdae00c25c036a56bf398f6e427916d72a016368aba66a03f87d83b482e501f`, 62 berkas, 2.519.040 byte; `deployment_id=null`. Tidak ada deployment/perubahan akses. Sumber Sites tersimpan di Git; spesifikasi/design system/tasks root tetap lokal di luar Git Sites.

## 9 Oktober 2026 — D-68 Menu, Stok, pustaka diskon dan Kas

Melanjutkan sumber aktual versi10 tanpa memulai ulang. Feedback pemilik diterapkan pada Hapus/log, Batal/Simpan kontekstual simetris, kategori wajib/tambah inline/CRUD kategori-tipe, field stok tanpa Ubah/harga rata kiri, pustaka persen/potongan/Beli X gratis Y dan penetapan per menu/channel. Persetujuan promo jumlah diperluas X/Y1..99, Beli2gratis3=qty5bayar2, topping penuh/debit qty penuh/alokasi refund unit/snapshot confirmed tetap/tanpa diskon order. Pembuka kas/waktu zona toko dan penjelasan sumber saldo ditambahkan. Spesifikasi terdampak/register D-68/AC-135–139/UT-29–30/design system/AGENTS/README diselaraskan.

**95/95 tes, typecheck dan lint lulus.** Browser tablet1024×768 memverifikasi Menu/Stok bersih/edit/revert/Batal, pasangan166×48, lima row64,5–65/input56/footer tidak menimpa tabel, kategori inline/rename/used-delete, library/assignment/Beli2gratis3 qty5×5000=10000/stok1000→995, cash metadata, log hapus dan kegagalan/hasil belum diketahui. Bukti dan batas pada [review D-68](berrie-site/REVIEW-HISTORY.md#d68). Fixture dipulihkan; server lokal/frame tablet dipertahankan. Build/packaging/identitas simpan dicatat sesudah hasil aktual. Tidak ada deployment/perubahan akses; implementasi operasional/UT peserta/pilot tetap belum selesai.

Pemeriksaan/simpan final D-68: **95/95 tes, typecheck/lint/build/packaging dan git diff --check lulus**. Dokumentasi28 berkas/273 tautan lokal valid; D-01–68/AC-01–139/UT-01–30 lengkap dan unik. Layanan mengonfirmasi versi **11**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_eff9be9d20588191b78e97d32aadf71a`, commit `2ca3e9b4e95216a4a5d775a803023f64ff745db2`. Arsip `sha256:8566abd967b096e89c8ea3f0e74e3cc21f47df98480005f3aa26f86acc669bd9`, 62 berkas, 2.560.000 byte; `deployment_id=null`. Pembacaan ulang layanan mengonfirmasi latest_version_number=11/current_live_url=null/current_preview_url=null. Checkout Sites bersih; root spesifikasi/design system/tasks tetap lokal di luar Git Sites. Preview localhost/frame1024×768 tetap berjalan; tidak ada deployment atau perubahan akses.

## 10 Oktober 2026 — D-69 jadwal diskon, tabel gulir dan Kas ringkas

Melanjutkan versi11/commit2ca3e9b4, bukan versi4 lama. Jadwal diskon opsional zona toko, copy Diskon/Varian dihapus, tabel Menu/Stok/Rekap bergulir vertikal, rekap periode grid sejajar. Kas ringkas, lalu feedback visual lanjutan mengganti dua kolom timpang: state awal satu panel/CTA tanpa Rp0/tabel kosong; aktif card penuh/satu saldo bawah breakdown/finish pendek/riwayat disclosure. Input akhir tetap label Uang akhir di laci (Rp) agar jelas; seluruh blocker/izin/hitung buta tetap. Subagen meninjau UIUX rekap/Kas; UI/UX Pro Max dipasang global sesuai instruksi pemilik. D-69/AC-140–142/UT-31–32/specs/design system/AGENTS diperbarui. 99/99 tes domain lulus; final browser/typecheck/lint/build/packaging/identitas simpan dicatat sesudah hasil aktual. [Review D-69](berrie-site/REVIEW-HISTORY.md#d69). Tidak ada deployment/perubahan akses atau kelulusan operasional/UT/pilot.

Pemeriksaan final D-69: **99/99 tes domain, typecheck/lint/build/packaging dan git diff --check lulus**. Browser tablet1024×768 memverifikasi tabel Menu24row/Stok21row bergulir, edit lintas tab/Batal, rekap input tanggal-jam56px/sejajar/Waktu sekarang, validasi jadwal dengan error spesifik dan status Terjadwal, state awal Kas/aktif/card penuh/finish/disclosure serta step1 tautan rekap. Form jadwal pada360px juga diperiksa: empat field56px berada dalam dialog dan footer terlihat; bukan seluruh cakupan mobile/zoom/tema/perangkat fisik. Dokumen29 berkas/278 tautan lokal valid. Skill UI/UX Pro Max terpasang global di /Users/icang/.codex/skills/ui-ux-pro-max, sumber nextlevelbuilder/ui-ux-pro-max-skill; tersedia otomatis giliran berikutnya dan panduan telah dibaca/dipakai pada revisi ini.

Layanan mengonfirmasi versi **12**, ID `appgprj_6ac54219b9248191bf551b9871d78958~appgver_0e8b6306f880819189b8c8e66d241edb`, commit `e3226843507cd6bdfbe86715324a33774e3233cf`. Arsip `sha256:b23892d43e6e8d4fee3c6c137c84865e5e2716ab5f8b869addfcd8ff4a42e9a8`, 62 berkas/2570240byte; `deployment_id=null`. Pembacaan ulang latest_version_number=12/current_live_url=null/current_preview_url=null; checkout Sites bersih. Root spesifikasi/design system/tasks berada di luar Git Sites. Preview localhost/frame1024×768 dipertahankan untuk pemilik; data contoh masih memori. **Tidak ada deployment/perubahan akses**; UT peserta/pilot/operasional tetap belum selesai.

## 10 Oktober 2026 — Eksplorasi Kasir alternatif lokal

Pemilik meminta satu kandidat yang berbeda, bebas mengganti keputusan UIUX lama, tetap tablet1024×768 dan tanpa deployment. Kandidat pada `?design=alternative` menyediakan navigasi horizontal Kasir/Pesanan/Riwayat + Kelola toko, katalog kartu ketuk langsung/Atur opsional, jumlah inline, penyajian item berikutnya, pembayaran satu panel/Tunai/QRIS/Uang pas dan hasil tanpa dialog struk otomatis. Palet/Manrope/shape/spacing baru dibatasi pada kandidat; tombol Sekarang/Alternatif berbagi state untuk membandingkan. Domain uang/stok/izin tetap bersama. Spesifikasi/design system baseline belum diganti menjadi persetujuan final; batas UI lama dilepas khusus eksplorasi yang diminta ini.

[Review alternatif](berrie-site/REVIEW-HISTORY.md#d70) memuat penggunaan UI/UX Pro Max, keputusan, pemeriksaan dan batas. Typecheck/lint/99 tes/build/diff-check lulus; browser tablet: delapan kartu penuh, tambah/jumlah/racikan/penyajian, state lintas pembanding, pembayaran inline/kembali/sukses; jalur simpan gagal/input bertahan/retry pada panel pembayaran; visual gelap dan smoke360. AC-101 serta UT-02/03/05/17/18/20 menjadi area evaluasi terkait, belum kelulusan peserta. Implementasi operasional/pilot tidak berubah. Belum commit/simpan versi Sites baru, tanpa deployment/perubahan akses. Preview lokal dipertahankan untuk review pemilik.

## 12 Oktober 2026 — D-70 alternatif disetujui, UI pembanding dihapus

Pemilik memilih alternatif sebagai satu UI dan meminta pembanding lama dibuang tanpa backup baru. State/query/switch desain, katalog tabel Kasir/sidebar/ciutkan dan stylesheet/palet/font lama dihapus; komponen sidebar/hook yang tidak terpakai serta Inter/OFL dihapus. Manrope/katalog kartu/qty/pembayaran satu panel default; jumlah confirmed/detail terbaca. UI tunggal langsung root localhost1024×768. Tidak membuat salinan implementasi lama atau mengubah histori Git. Sumber tetap Site yang sama.

D-70/DESIGN-SYSTEM ditulis ulang; AGENTS/README/specs02/03/05/09/10/12/register dan indeks diselaraskan. Rujukan D-01–70/AC-01–143/UT-01–33/V-01–10. [Review D-70](berrie-site/REVIEW-HISTORY.md#d70) mencatat browser/root tanpa switch,8 kartu, tambah/jumlah/penyajian, pembayaran23.000/sukses/detail/stok10→9 dan18→17, kegagalan/input5.000 bertahan/retry. Typecheck/lint/99 tes lulus; build final/diff-check dicatat setelah hasil aktual. Build awal menemukan selector CSS kosong dari pembersihan lalu diperbaiki. Persetujuan visual tidak meluluskan UT peserta/AC operasional/pilot. Tanpa deployment/commit/push/versi layanan baru; latest layanan sebelumnya12.

Pemeriksaan final D-70: typecheck/lint/build lokal dan git diff --check lulus,99/99 tes. Tautan lokal seluruh dokumen valid. Root localhost menampilkan satu UI/tablet1024×768, tanpa switch; tiga baris/empat unit total53.000 terlihat penuh, tanpa console error. Preview dipertahankan; tidak ada deployment/commit/push/simpan versi layanan baru.

## 12 Oktober 2026 — D-71 Kasir/Riwayat dan visual Jira

Feedback pemilik diterapkan lokal: menu→modal→Tambahkan, Item berikutnya di Pesanan baru/dine-in kiri/default hanya unit baru, judul/copy ringkas/Catatan QRIS, sukses save/process/settle→empty+notifikasi/Lihat pesanan, struk tanpa konfirmasi/bagikan dan retry SALINAN, Riwayat rentang inklusif zona toko. Bahasa visual menyeluruh Inter/ikon/tombol/form/tab/tabel/modal/spacing/shape/state terang-gelap; struktur dua kolom/horizontal tetap. Berrie memakai komponen sendiri, tanpa paket/branding Atlassian atau crypto. D-71/specs/AC-54/108/116/143–147/UT-04/33–35/design system/AGENTS/README diselaraskan; ID lama tetap.

**103/103 tes, typecheck/lint/build lokal lulus.** Empat tes baru menguji batas kalender/zona/rentang/DST. Browser memverifikasi modal sebelum tambah/default item lama,8 kartu/3baris penuh1024×768, Simpan dulu/QRIS/Tunai/Bayar nanti sukses→empty, gagal/unknown mempertahankan input lalu pemeriksaan operasi sama, print close/reopen SALINAN, Riwayat populated/reversed/empty, tabel64,5–65/input56, Kas gelap, modal360 CTA52 dan filter satu kolom, reflow teks200%. Error referensi ikon lama dan preview stale selama edit telah diperbaiki; pemeriksaan diulang. [Review D-71](berrie-site/REVIEW-KASIR-D71.md) membatasi bukti; bukan kelulusan seluruh AC/UT/perangkat/pilot. Belum commit/push/simpan versi layanan/deployment; latest layanan terakhir dikonfirmasi12. Root dokumen tetap di luar Git Sites.

## 12 Oktober 2026 — Perapihan review dan patokan lanjutan

Tiga belas file review D-43–70 digabung menjadi [REVIEW-HISTORY.md](berrie-site/REVIEW-HISTORY.md), lalu file terpisah dihapus. Isi bukti, batas uji dan identitas versi dipertahankan; tautan spesifikasi/tasks/peta agen dialihkan ke bagian riwayat yang sesuai. [REVIEW-KASIR-D71.md](berrie-site/REVIEW-KASIR-D71.md) tetap review aktif. Patokan lanjutan di atas membedakan state kode lokal D-71 (dilanjutkan D-72) dari versi layanan terakhir12/D-69. Hanya dokumentasi yang diubah; kode dan pekerjaan lokal sebelumnya dipertahankan. Tidak ada commit/push/simpan versi layanan/deployment atau kelulusan AC/UT baru.

Pemeriksaan perapihan: seluruh isi13 review terverifikasi sebelum file asal dihapus;19 dokumen/299 tautan lokal/66 anchor valid pada pemeriksaan awal, lalu rujukan status M-03 file01 diselaraskan ke D-71. Pemeriksaan final tautan/anchor dan `git diff --check` lulus. Tes aplikasi tidak diulang karena tidak ada perubahan kode.

## 12 Oktober 2026 — D-72 cetak otomatis dan lanjut draft

Feedback pemilik diterapkan lokal sambil mempertahankan perubahan D-71: modal/copy/tipografi/penyajian diringkas, error identitas dapat dikoreksi, copy Pesanan/Riwayat dihapus dan nominal rata kiri. Setelah commit Bayar nanti mencoba dapur; pembayaran mencoba dapur batch baru lalu pelanggan/batch lama pelanggan saja. Simpan dulu tanpa cetak/debit, detail draft → Edit pesanan ke Kasir dengan nomor/identitas tetap. Patch draft dan attempt operasi terpisah menjaga rollback/replay simulasi.

**111/111 tes, typecheck/lint/build dan diff-check lulus.** Browser tablet/360 memeriksa perbaikan identitas, font12/total22, simpan/edit nomor tetap, cetak ulang kedua tujuan, bayar nanti/bayar akhir, gagal/unknown dan Riwayat rata kiri. Rincian serta batas pada [review D-71/D-72](berrie-site/REVIEW-KASIR-D71.md#lanjutan-feedback-kasirpesananriwayat--d-72--12-oktober-2026). D-72, AC-148–150 dan UT-36 ditambahkan; sumber terkait diselaraskan. Cetak masih attempt simulasi; belum printer fisik/operasional/UT/pilot. Tidak ada commit/push/simpan versi layanan/deployment. Latest layanan tetap12/D-69 yang terakhir dikonfirmasi, tanpa pembacaan layanan baru.

Pemeriksaan penutup D-72:19 dokumen/293 tautan lokal valid dan ID baru unik; diff-check lulus. Preview Kasir kosong/kas contoh terbukaRp0, ukuran browser dipulihkan, tanpa console error.

## 13 Oktober 2026 — D-73 menu agnostik, Kas dan fondasi Atlassian

Pemilik menetapkan owner/kasir menentukan arti harga/qty/stok, tanpa mode satuan/volume/konversi:100×200=20000, debit stok200 saat konfirmasi. Varian opsional/gratis/berharga dibuat dalam form Tambah menu yang sama, preview akhir domain dan footer terjangkau; field varian dipakai bersama editor existing. Kas maksimum640 px rata kiri. Audit resmi Atlassian mengoreksi fitur font/hierarki/radius per peran/ikon/tab/state/ruang, tetap komponen Berrie/Inter OFL/Lucide. Alur D-72 dan invariants tetap. Dokumen/register D-73, AC-151/152, UT-37/38 dan design system diperbarui dalam pekerjaan yang sama.

**113/113 tes, typecheck/lint/build lulus.** Dua tes baru mencakup SKU berharga+pilihan gratis/satu ledger stok awal dan harga100×qty200/debit200/replay/settlement tanpa debit ulang. Browser tablet memeriksa menu18000/23000, input error bertahan, harga100/qty200→20000, Kas640 terang/gelap, form200%,8 kartu/3baris72px. Form360/pilihan gratis5000 menyimpan satu row dan footer tetap terjangkau. [Review D-73](berrie-site/REVIEW-MENU-KAS-D73.md) memuat rincian/batas. Tanpa deployment/commit/push/simpan versi layanan; versi layanan terakhir tetap12/D-69. Data contoh/UT peserta/operasional/pilot tetap dibatasi.

Pemeriksaan penutup D-73:19 dokumen/278 tautan lokal dan seluruh anchor lokal valid; D-73/AC-151/152/UT-37/38 unik, `git diff --check` lulus. Preview lokal tablet dipertahankan di Menu & Stok, form QA dibatalkan, ukuran host browser dipulihkan. Kas contoh terbukaRp100.000; data uji hanya memori tab contoh. Bukti visual sementara di `/tmp/berrie-d73-kas.jpg` dan `/tmp/berrie-d73-menu.jpg`, bukan aset produk/patokan desain atau berkas historis review-sites.

## Lanjutan Kas tablet dan laporan harian — D-74 · 13 Oktober 2026

Feedback pemilik: selesai bertugas bertumpuk di kanan Kas; laporan perlu fokus bisnis/awam, refund bukan fokus rutin. UI/UX Pro Max dan workflow Sites lokal dipakai. Kas dua kolom tablet/satu kolom HP, navigasi atas tablet/bawah HP tetap; laporan Penjualan/Uang diterima/transaksi/rata-rata/menu bernilai dan penelusuran asal. Filter tanggal/refund lintas hari/metode/export diperbaiki dalam domain terpisah. [Review D-74](berrie-site/REVIEW-KAS-LAPORAN-D74.md) mencatat hasil dan batas. Typecheck/lint/121 tes/build lokal serta git diff --check lulus. Browser tablet/HP/tema/teks200%/blocker/telusur diperiksa; bug overlap tab HP diperbaiki. Tidak ada deployment/commit/simpan versi layanan. T-14/operasional/UT peserta/pilot tetap belum selesai.

## Pelaksanaan 31 Oktober 2026 — D-75

Cakupan editor Menu/Stok, audit seluruh Laporan, alias/Toko dan staf diimplementasikan lokal. 128/128 tes, typecheck, lint tanpa warning dan build lulus; catatan klasifikasi route Vinext tetap. Pemeriksaan visual tablet1024×768/HP360, daftar panjang/keyboard dan interaksi gagal/unknown belum dapat dijalankan karena akses capture/host Chrome bermasalah. [Review D-75](berrie-site/REVIEW-ADMIN-LAPORAN-D75.md) memuat audit per bagian dan daftar verifikasi tersisa; jangan menandai AC-155–158/UT-40–43 lulus penuh. Tidak ada perubahan T-01/produksi atau deployment.

## Audit ADS lintas prototipe — 31 Oktober 2026

Seluruh sumber layar/alur dan komponen ditinjau dalam batas D-75. Perbaikan bersama: token border/ruang, tab satu indikator/hover/pressed, header600, penamaan/scope tabel, navigasi Pengaturan, badge/empty/disclosure/callout/dialog/toast, prioritas disabled/error dan reflow toolbar laporan HP. Palet, Inter/Lucide, target sentuh serta layout Kasir/Kas tetap. [Review audit](berrie-site/REVIEW-ADS-2026-10-31.md) membedakan implementasi ADS, penerapan Jira, adaptasi POS dan keterbatasan referensi.

Typecheck/lint/128 tes/build lokal lulus; pengukuran22 pasangan token memenuhi target terpilih. Browser hanya memberi bukti terbatas awal Kasir/Menu/frame1024×768 dan AX beberapa dialog/Stok/Rekap; capture terakhir magenta, klik koordinat noWindowsAvailable, browser host tidak tersedia. Seluruh tab setelah patch/HP360/keyboard/gelap/200% belum terverifikasi: pekerjaan visual **tetap terbuka**. Permintaan membuka layar Mac/Chrome sudah disampaikan; bukan izin untuk meluluskan dari inspeksi sumber. AC-101/109/110/141/143/147/151–158 dan UT-33–43 terkait, tanpa klaim lulus penuh/hasil peserta. Tidak ada keputusan produk baru, commit/push/versi layanan/deployment atau perubahan produksi.


## Lanjutan pemeriksaan Safari — 31 Oktober 2026

Pemilik mendelegasikan keputusan rutin sampai audit selesai. Audit dilanjutkan di sesi pemanggil karena sesi lama masih waitingOnApproval. Safari native memberi bukti langsung tablet1024×768 dan HP360 untuk layar utama/subtab Pengaturan, daftar panjang Menu/Stok, form menu/varian/diskon, laporan, keyboard dialog, gelap/teks200% dan stress nama/harga panjang. Gagal bayar mempertahankan51.000; unknown diperiksa melalui operasi sama. Perbaikan tambahan: satu panah select, header sticky kolom yang benar, lebar label status/kategori, navigasi HP dua baris khusus teks200%/inset dan keranjang alur normal, guard keluar hilang saat editor dibatalkan. Domain bisnis tetap.

Typecheck/lint/128tes/build/diff-check lulus; catatan route Vinext tetap. [Bukti dan batas akhir](berrie-site/REVIEW-ADS-2026-10-31.md#penutupan-pemeriksaan-lanjutan-safari--31-oktober-2026) membedakan observasi representatif dari seluruh kombinasi/perangkat/UT peserta. Zoom halaman200% belum bisa dikonfirmasi: Safari/Chrome native berakhir cgWindowNotFound saat mencoba menu zoom; teks200% sudah diperiksa. Tidak meluluskan AC visual penuh atau pilot. Data uji memori dipulihkan ke fixture; observasi akhir berhasil Menu bersih tablet lalu Kasir. Tidak menyimpan screenshot baru, commit/push/versi layanan/deployment atau mengubah produksi.


## Penutupan audit visual pelaksana — 31 Oktober 2026

Laptop kembali menyala; Safari memverifikasi page zoom200% aktual melalui Page Menu. Kasir/Buka kas/Lainnya/Menu & Stok/dialog Tambah menu/Laporan diperiksa pada1024×768 yang reflow saat zoom: teks dan aksi representatif terbaca, modal panjang dapat digulir sampai akhir dengan footer terlihat. Tidak ada temuan baru. Zoom dipulihkan100% dan dikonfirmasi melalui Page Menu, lalu Kasir tablet1024×768 ditampilkan kembali. Audit pelaksana cakupan representatif selesai; [bukti penutupan zoom](berrie-site/REVIEW-ADS-2026-10-31.md#lanjutan-zoom-dan-penutupan-audit-pelaksana--31-oktober-2026) menggantikan batas zoom pada catatan sebelumnya. Tidak ada perubahan kode/mutasi contoh baru; checks aplikasi sebelumnya tetap berlaku. Seluruh AC/UT peserta, screen reader, perangkat/printer fisik dan gerbang operasional/pilot belum diluluskan. Tetap lokal tanpa deployment/versi layanan baru/screenshot tersimpan.

## Pelaksanaan workspace Pesanan — D-78 · 31 Oktober 2026

Workspace Aktif/Tersimpan, filter kerja/bayar AND awal Semua, daftar operasional berurut konfirmasi batch dan detail bersama tablet40/60/HP penuh selesai lokal. Progres mengecualikan draft/batal; sisa tagihan memakai domain/snapshot, refund due terpisah. Lanjutkan draft ID/nomor/identitas tetap; pilihan penyajian awal kosong, guard keluar, selection keluar hasil dikosongkan setelah commit. Kasir D-76/D-77 dan integritas/definisi completed/blocker dipertahankan.

Typecheck/lint tanpa warning/146tes/build/diff-check lulus; catatan klasifikasi route Vinext tetap. Safari native memeriksa populated1024×768/360, batch/draft tambahan/nama panjang/refund, kegagalan bayar/input bertahan/unknown operasi sama, hasil selesai keluar filter, penyajian independen, lanjut draft, scroll kembali, teks200% dan keyboard disclosure. [Review D-78](berrie-site/REVIEW-PESANAN-D78.md) membatasi cakupan/manual vs otomatis. UT-47–49 masih rencana peserta; AC-166–172 belum kelulusan operasional/pilot.

PR terdahulu dinyatakan merged oleh pemilik; checkout lokal tetap feat/cashier-d77/2656316 dengan revisi D-78 belum dicommit. Tanpa commit/push/PR/publish/versi layanan/deployment baru. Prototipe tetap memori; preview lokal tablet dipertahankan.

## PR workspace Pesanan D-78 — 31 Oktober 2026

Atas instruksi lanjutan pemilik, revisi dicommit sebagai `29a9b39` pada `feat/orders-d78`, berbasis `origin/main` merged `0dd3743`. PR#1 terverifikasi MERGED; tree main sama dengan baseline sebelumnya. Branch D-78 dipush dan [PR#2](https://github.com/chandragumelar/berrie/pull/2) dibuat ke main. Merge tetap oleh pemilik. Repo Sites bersih sesudah commit; dokumen root di luar Git tetap lokal dan batas ini disebut dalam deskripsi PR. Checks kode sebelumnya146tes/typecheck/lint/build tetap berlaku; perubahan saat persiapan PR hanya catatan otorisasi/status. Tanpa deployment/versi layanan baru.


## Fondasi operasional awal — 1 November 2026

PR prototipe #2 terkonfirmasi merged (merge `36f5c27`); checkout branch `feat/orders-d78` bersih dan dipertahankan. Repo Git lokal root diinisialisasi terpisah untuk spesifikasi dan aplikasi; repo prototipe tetap mandiri dan dikecualikan agar riwayatnya tidak tertimpa. Scaffold `app/` React/TypeScript strict/Vite dan Dexie dibuat terpisah, belum terhubung ke UI simulasi.

- T-01 berjalan: dev/build/typecheck/lint/test dan lockfile ada; dokumentasi awal tersedia. Belum memverifikasi dev di browser atau menyelesaikan konfigurasi contoh lingkungan/struktur Git final.
- T-02 berjalan (AC-06–07, 24–25, 28, 102–105 terkait): integer, half-up, alokasi terbesar dan contoh Rp33.350 serta promo SKU dasar diuji. Unit/qty, diskon persen, snapshot lengkap, settlement/refund dan pengujian properti komprehensif masih terbuka; AC belum diluluskan.
- T-03 berjalan (AC-09–10, 20, 30, 39, 48 terkait): skema Dexie awal dan primitive commit/replay diuji rollback serta konflik payload memakai fake-indexeddb. Belum ada lock antar-tab, validasi revisi/izin, constraints bisnis lengkap, pengujian browser/crash/kuota dan migrasi/pemulihan; primitive belum aman untuk transaksi nyata.
- Pemeriksaan: typecheck, lint, build dan 6 tes lulus. Tes IndexedDB memakai emulator, bukan bukti lintas browser atau crash fisik. Instalasi npm memakai `--legacy-peer-deps`; npm melaporkan 10 moderate pada seluruh dependensi; audit dependensi produksi melaporkan 0, sedangkan dependensi pengembangan masih perlu ditinjau sebelum rilis. Tidak ada deployment/DNS/provisioning.
- Berikutnya selesaikan T-01–03 dan buktinya, lalu T-04/T-05/T-06 sesuai dependensi. [Persiapan deployment](app/DEPLOYMENT.md) belum otorisasi publikasi.


## Lanjutan fondasi — 1 November 2026

T-01: scaffold Vite/React/TypeScript strict, lockfile, contoh env tanpa rahasia, struktur domain/storage/network/cetak/UI dan perintah dev/build/typecheck/lint/test didokumentasikan; server dev dipakai tes Chrome. Git root lokal terpisah dari repo prototipe; belum ada commit/push. Pendukung seluruh AC, bukan kelulusan perilaku POS.

T-02 masih berjalan (AC-06–07, 24–25, 28, 102–105 terkait): snapshot harga/topping/promo/tarif dan alokasi; nominal/persen half-up, qty 1–999, settlement gratis, refund parsial berdasarkan alokasi asal dan penolakan unit ganda diuji. Belum ada command order operasional yang menegakkan satu settlement, validasi snapshot pada batas restore/API dan seluruh variasi aturan pembayaran/refund; jangan menandai AC selesai.

T-03 masih berjalan (AC-09–10, 20, 30, 39, 48 terkait): primitive menulis state, ledger, audit, outbox, receipt dan sequence bersama; lock Web Locks gagal tertutup, revisi dan urutan diperiksa, payload identik direplay. Checkpoint dan staging awal tidak menimpa asal. Chrome headless nyata: dua tab bersaing satu commit, retry sesudah reload, rollback karena duplikasi ledger, staging gagal dan upgrade IndexedDB gagal mempertahankan ledger asal. Masih diperlukan command bisnis dengan pemeriksaan invariants dalam transaksi, validasi lengkap snapshot dan jalur migrasi/aktivasi/pemulihan aktual, uji kuota nyata/crash dan dukungan browser target. T-04 tetap menyediakan autentikasi/permit/otorisasi nyata; actor dan policy ID pada envelope bukan bukti izin.

Pemeriksaan saat ini: 12 tes unit, 2 tes Chrome, typecheck, lint dan build lulus. Chrome memakai data uji; tidak membuktikan kehilangan daya/kuota fisik, keamanan, backup terenkripsi atau keseluruhan AC. Arsip build historis dikeluarkan dari indeks root tanpa menghapus file; repo prototipe tidak disentuh. Tidak ada push, deployment, provisioning atau perubahan DNS.


## Penguatan validasi snapshot T-02 — 1 November 2026

Pada baseline `main` `d306011`, validator runtime menerima data eksternal `unknown` untuk snapshot settlement dan histori refund. Struktur, identitas, batas, sumber dan nilai dihitung ulang menggunakan kalkulasi domain yang sama; refund memvalidasi snapshot dan histori sebelum memakai alokasi asal. Unit Rp0 tidak menghasilkan refund moneter. Tes mencakup contoh Rp33.350, JSON round-trip, manipulasi dan input tidak sah, refund bertahap, input tidak berubah, serta 200 kombinasi generatif dengan seed tetap untuk konservasi, urutan sisa dan refund penuh. Terkait AC-24–25, AC-28, AC-102–104; ini bukti domain parsial, bukan kelulusan AC operasional.

Pemeriksaan `foundation/app`: typecheck, lint, 19 tes unit, 2 tes browser Chrome lokal dan build lulus; `git diff --check` lulus. T-02 tetap berjalan: model snapshot awal belum mencakup seluruh variasi promo termasuk Beli X gratis Y, dan command transaksi/izin, integrasi validator pada API/restore serta pengujian menyeluruh tetap belum tersedia. Struktur snapshot unit saat ini tidak menyimpan batas baris asal sehingga qty per baris hanya dapat diperiksa saat pembentukan, bukan direkonstruksi dari snapshot. T-03 tetap berjalan; tes browser primitive tidak membuktikan crash fisik, kuota, keamanan atau restore produksi. Tidak ada deployment atau perubahan prototipe.

## Promo Beli X gratis Y pada domain — 1 November 2026

T-02 tetap berjalan. Domain settlement membentuk kelompok draft berdasarkan SKU, harga, identitas promo/revisi, topping, pilihan, penyajian dan catatan; ID unit menentukan kelompok lengkap dan alokasi sisa terbesar. Snapshot membekukan identitas dan anggota kelompok, divalidasi dari data snapshot sendiri; refund memakai alokasi asal. Kontrak pemanggil hanya memasukkan draft satu order: snapshot confirmed disimpan terpisah dan tidak dihitung ulang. Belum ada penegakan kontrak ini dalam transaksi database. Terkait AC-24–25, AC-28, AC-102–104, AC-137–138 dan AC-151; pengujian domain parsial bukan kelulusan AC operasional.

Pemeriksaan `foundation/app`: typecheck, lint, 24 tes unit (termasuk 200 kombinasi generatif seed tetap), 2 tes browser Chrome dan build lulus; `git diff --check` lulus. Belum ada UI, CRUD/jadwal promo, command order/stok, otorisasi, API atau integrasi validasi restore/migrasi produksi. Validator memeriksa konsistensi internal, bukan autentisitas snapshot terhadap perubahan terkoordinasi pada seluruh data. T-03 tetap berjalan; tes browser penyimpanan bukan bukti crash fisik, kuota, keamanan atau restore produksi. Tidak ada deployment atau perubahan prototipe.
