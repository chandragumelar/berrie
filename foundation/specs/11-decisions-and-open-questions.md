# 11 — Decisions and open questions

Tanggal baseline: 6 Oktober 2026. Pemilik telah menyetujui seluruh keputusan dalam `/specs` dan menetapkannya sebagai sumber kebenaran. Semua D-xx di bawah final. Nama file dipertahankan untuk menjaga rujukan; daftar V-xx adalah pekerjaan implementasi/validasi, bukan pilihan produk yang dibuka kembali. Belum dilaksanakannya pekerjaan tidak membatalkan keputusan.

## Baseline produk yang dipertahankan

F&B, satu lokasi dan kasir aktif, owner tunggal dengan identitas staf dan izin terpisah, PWA desktop/Android/iOS, trial 60 hari/Rp50.000 per bulan, QRIS manual, satu metode/order, bayar awal/akhir, stok saat Minta dibuat, tambahan sebelum lunas, order baru setelah lunas, satu printer untuk tiket/struk, PIN owner enam digit dan izin offline tujuh hari, backup server harian 30 hari, serta retensi minimal 90 hari setelah tenggang. Semua batas fitur pada file 01 tetap berlaku.

## Register keputusan final

| ID | Keputusan baseline | Alasan / dampak | Detail |
| --- | --- | --- | --- |
| D-01 | Bahasa Indonesia, IDR integer, zona default Asia/Jakarta | Selaras pasar awal; zona toko tetap bisa dipilih | 01,07 |
| D-02 | React + TypeScript + Vite, Dexie/IndexedDB | PWA responsif dengan domain lokal terpisah dari UI | 01,08 |
| D-03 | Supabase Auth/PostgreSQL; satu API mutasi transaksional | Auth terkelola, relasi/constraints dan isolasi toko | 07,08 |
| D-04 | Frontend Cloudflare Pages; backup terpisah Cloudflare R2 | Pisahkan hosting aset dari data operasional/cadangan; verifikasi biaya sebelum aktivasi | 01,08 |
| D-05 | Region awal ditargetkan Singapore; versi dependensi dikunci saat implementasi | Ketersediaan region diperiksa sebelum provisioning; target bukan klaim harga/latensi terukur | Validasi V-01 |
| D-06 | Nomor tanggal–epoch–sequence dan UUID tetap | Mudah dibaca, aman terhadap nomor bentrok setelah pindah | 04 |
| D-07 | Batch immutable dan unit ber-ID internal | Tambahan, sajikan sebagian, refund dan stock return bisa ditelusuri | 04,07 |
| D-08 | Diskon order nominal/persen; direvisi D-43 dengan promo SKU katalog | Tidak digabung dalam satu pesanan; potongan nyata dan snapshot dapat ditelusuri | 03,05,07 |
| D-09 | Alokasi diskon/pajak/layanan metode sisa terbesar | Refund parsial konsisten sampai rupiah terakhir | 07 |
| D-10 | Refund penuh per unit terpilih; nominal bebas ditunda | Hindari nilai refund tanpa hubungan item/pajak yang jelas | 05 |
| D-11 | Tagihan Rp0 memakai settlement gratis tanpa payment | Mendukung diskon 100% tanpa kas fiktif | 05,06 |
| D-12 | Refund due setelah pembatalan paid menghalangi tutup | Catatan batal tidak boleh menyiratkan uang sudah dikembalikan | 04–06 |
| D-13 | Satu sesi kas lintas tengah malam, close immutable; segmen serah-terima penanggung jawab | Satu laci, jejak staf dan selisih tanpa reset ledger toko | 06 |
| D-14 | Pengakuan laporan saat settlement/refund; filter sesi terpisah | Stok dapur tidak disamakan dengan penjualan atau tanggal pencairan | 06 |
| D-15 | Kas kurang: minta pencatatan sumber dana nyata | Mencegah refund/keluar dengan saldo ekspektasi negatif tanpa penjelasan | 05,06 |
| D-16 | Import katalog atomik dengan preview, tanpa overwrite stok existing | Mencegah kehilangan ledger dan hasil parsial membingungkan | 03 |
| D-17 | Satu penulis antar-tab, outbox urut dan receipt idempoten | Satu perangkat tetap bisa punya race atau retry | 07,08 |
| D-18 | Data lama setelah pergantian perangkat masuk karantina | Offline device lama tidak bisa dicabut seketika | 08 |
| D-19 | Setelah izin habis hanya penyelesaian unit lama, tanpa tambahan | Operasional bisa dibereskan tanpa menjadikan masa tenggang tak terbatas | 08 |
| D-20 | WhatsApp melalui teks/share sheet/salin manual | Tidak perlu server struk publik atau integrasi pesan | 09 |
| D-21 | Hasil cetak dikonfirmasi manusia; attempt ulang SALINAN | Browser tidak membuktikan kertas sudah keluar | 09 |
| D-22 | Billing awal transfer manual diverifikasi operator | Harga bisa dijalankan tanpa integrasi gateway pelanggan | 01 |
| D-23 | Auto-lock 5 menit, cooldown PIN persisten, backup terenkripsi | Batas dasar akses dan perlindungan file; wajib review keamanan | 08 |
| D-24 | Target pilot 14 hari/100 order dan restore drill | Rilis ditentukan bukti operasional, bukan kelengkapan layar saja | 10 |
| D-25 | Koreksi metode beralasan dengan ledger penyesuaian | Salah input tidak boleh menghapus jejak atau memalsukan penjualan/refund | 05,06 |
| D-26 | Kemampuan lengkap, informasi bertahap, Kasir sebagai layar utama | Kurangi kebingungan awal tanpa menghilangkan fitur | [12](12-ux-principles.md) |
| D-27 | Buat dulu, bayar nanti dan Bayar dulu mudah dijangkau; Simpan pembayaran ikut konfirmasi draft atomik | Direvisi arahan pemilik: tidak perlu klik pembuatan kedua sesudah bayar, membuka/membatalkan form tidak memberi efek; status/stok terpisah | [12](12-ux-principles.md), [09](09-screens-and-hardware.md) |
| D-28 | Onboarding minimum, pengaturan tambahan ditunda | Aktivasi/PIN, nama toko, menu pertama dan uang awal cukup untuk mulai; printer/topping/pajak/hitung stok tidak wajib | [02](02-user-flows.md), [12](12-ux-principles.md) |
| D-29 | Pisahkan bukti lokal, server, pembayaran, cetak; konfirmasi proporsional risiko | Pemulihan jelas tanpa transaksi ganda atau dialog rutin berulang | [12](12-ux-principles.md) |
| D-30 | Uji pengguna baru UT-01–18 dan pemeriksaan UX pada acceptance | Target kegunaan harus dibuktikan; tidak mengklaim viral | [10](10-acceptance-criteria.md), [12](12-ux-principles.md) |
| D-31 | Penyajian per item, campuran satu tagihan; No. antrean / nama | Menu sama bisa dibagi makan di tempat/bungkus, ringkasan/tiket jelas; tanpa manajemen meja | 01,04,07,09,12 |
| D-32 | Bahasa kasir awam, Simpan dulu dan daftar menu per varian | Stok/harga/ketersediaan terlihat tanpa detail, tanpa promo rekaan; status bukti tidak memakai jargon | 03,09,12 |
| D-33 | Satu Pelanggan baru, buka/tutup kas terlihat, tanpa navigasi duplikat | Input yang belum disimpan dipertahankan; keadaan kas tetap terlihat, bukan notifikasi panjang; blocker tetap lengkap | 02,06,09,12 |
| D-34 | Identitas/PIN staf, tiga izin per aktivitas dan batas diskon; default tindakan sensitif perlu owner | Batasi kesempatan penyalahgunaan tanpa konfirmasi setiap transaksi; bukan jaminan bebas fraud | 01,07,08 |
| D-35 | Approval owner dari HP online masuk MVP; receipt terikat satu operasi, owner lokal sebagai alternatif | HP hanya otorisasi/admin akses, efek uang/stok tetap satu kasir; tanpa push/WhatsApp otomatis | 02,07,08 |
| D-36 | Serah-terima kas antarstaf, hitung sebelum melihat ekspektasi, selisih berjejak | Tanggung jawab laci terpisah dari sesi toko; bukan payroll/absensi | 06,08 |
| D-37 | Channel GoFood/GrabFood/ShopeeFood manual, ID unik, harga channel dan satu stok bersama | Integrasi API/partner, scraping, sinkron stok dan import laporan platform ditunda | 01,03,04 |
| D-38 | Tagihan platform terpisah Payment; subsidi, pembalikan, biaya dan pencairan dicocokkan manual | Penjualan tidak sama dana cair; tidak mengotori laci atau menggandakan penjualan | 05–07 |
| D-39 | Tabel kompak berkolom lintas daftar, bukan kartu per entri | Mudah membandingkan; HP tetap tabel dengan rincian; promo SKU ditambahkan D-43 | 09,12 |
| D-40 | Mockup default tablet landscape; acuan awal 1024×768 CSS px | Review sesuai preferensi pemilik; satu PWA tetap responsif pada HP/portrait/desktop | 09,12 |
| D-41 | Sites untuk satu prototipe visual dan alur; UI disetujui menjadi acuan implementasi akhir | Pakai kembali komponen/aset/token UI; mockup lokal referensi perilaku. Workflow desain tidak mengganti hosting/backend produksi atau membuktikan kesiapan operasional | 01,09,10,12 |
| D-42 | Palet awal mengikuti ResearchRabbit About Us; pemetaan aktif diganti D-49 | Putih/hitam, cyan muda, turquoise, lavender dan hijau; pemetaan UI/semantik dengan kontras terjaga. Revisi khusus warna, bukan perubahan alur/layout | 09,12; [design system](../DESIGN-SYSTEM.md) |
| D-43 | Promo per SKU saat setup/edit: opsional nominal/persen, terlihat pada Kasir | Permintaan pemilik mengganti batas order-only. Detail minimal: aktif manual, per channel, owner, tanpa topping dan tanpa digabung diskon order; jadwal otomatis/paket tidak ditambahkan | 03,05–08; AC-102–105 |
| D-44 | Kasir disederhanakan: satu tindakan awal, Toko, dua penyajian, pembayaran/Struk ringkas, font sistem dan kontrol modern lintas aplikasi | Buka kas saat tertutup, serah-terima saat ganti penanggung jawab; tujuan cetak kedua dokumen sesuai kelayakan, bukan cetak ulang batch lama otomatis | 02,04,09,12; AC-106–109; design system |
| D-45 | Bahasa visual aplikasi Apple diadaptasi untuk PWA setelah riset resmi | SF Pro melalui font sistem, Lucide lokal dengan ukuran/bobot konsisten, aksi kapsul, ikon bulat, radius bertingkat/segmented; material navigasi selektif dan fallback solid. Memperinci bentuk D-44; token Berrie berbeda dari nilai native Apple, palet/stack/bisnis tetap | 09,12; DESIGN-SYSTEM.md; AC-101/109 |
| D-46 | Penguatan kualitas UI: pola OS sesuai konteks, token semantik terang/gelap dan pembesaran teks web | Arahan pemilik setelah evaluasi tiga repo HIG dan Apple resmi. Kasir ringkas; judul besar selektif, grouped settings, sheet/dialog dan kontrol sesuai tugas. Integrasi pengetahuan ke dokumen/prompt, belum instalasi skill/MCP atau perubahan UI. Memperinci D-45, palet D-42 dan bisnis/stack tetap | 09,12; DESIGN-SYSTEM.md; AC-101/109/110 |
| D-47 | Feedback Kasir: typography kecil tanpa font 16 px, nama/harga regular, tabel rapat dan tindakan langsung terlihat | Skala 14/18/20/22 menurut peran; alias N, stok angka, diskon 0, Rp harga; varian dipertahankan di detail, toggle kas membuka workflow, Pesanan baru sekunder. Dokumen/prompt saja, bisnis tetap | 02,03,06,07,09,12; DESIGN-SYSTEM.md; AC-101/109/110/111 |
| D-48 | Kolom numerik murni dan navigasi kiri yang dapat diciutkan | Feedback langsung saat implementasi: header Diskon, angka tanpa simbol/unit/slash; satu SKU per baris dengan varian inline, stok manual kosong dengan alasan di Menu. Rail ikon memperlebar katalog tanpa membuang state. Memperinci/mendahului tampilan D-47; aturan bisnis tetap | 03,09,12; DESIGN-SYSTEM.md; AC-96/106/109/110/111 |
| D-49 | Design system ditulis ulang dari nol: HEX palet, fondasi netral, font menyerupai Apple, komponen dan komposisi konkret | Pemilik menolak estetika prototipe sebelumnya dan meminta sistem baru tanpa histori/situs asal palet di dokumen desain. Apple system font pada Apple, Inter dibundel lokal pada OS lain; body/label/spacing, fill, shape, state, navigation dan glass terdefinisi. Mendahului pemetaan/shape/font/spacing D-42/44–46 yang berbeda; ukuran item dan aturan Kasir D-47–48 tetap. Dokumen selesai, penerapan belum diotorisasi/dilakukan | 09,12; DESIGN-SYSTEM.md; AC-101/109–112 |
| D-50 | Gradasi bubblegum horizontal mengganti permukaan putih UI terang; pilihan aktif tetap cyan | Arahan pemilik dari screenshot: lavender #E8E7F5 → #DEF3F7 → cyan lembut #DEF5F6 → mint #E6F6E4, opaque. Page netral, tema gelap dan putih kertas/tinta aksi tetap; text-tertiary #68686D menjaga kontras | 09,12; DESIGN-SYSTEM.md; AC-101/109–112 |
| D-51 | Kasir composer pembelian: filter tunggal, Habis/Promo tetap, kategori owner; keranjang ringkas, catatan draft, selesai bayar kosong | Instruksi terbaru pemilik mendahului D-44/47/48: nol hanya Habis, inactive hanya Menu & Stok; Bayar nanti/Bayar/Simpan dulu, penyajian dialog item, refund/koreksi/serve di Pesanan/detail; struk tetap transaksi asal | 02–05,09,12; DESIGN-SYSTEM.md; AC-113/114 |
| D-52 | Stok wajib dihitung pada semua menu/SKU, aktivasi dan CSV | Pemilik menghapus mode manual/tidak dihitung. Admin mengisi angka ≥0 (termasuk 0/1000), tidak mengarang stok untuk data lama; perbaikan awal berjejak sebelum jual; semua unit baru mendebit sekali | 01–03,07–10,12; DESIGN-SYSTEM.md; AC-115 |
| D-53 | Permukaan bubblegum diganti putih sejuk solid, cyan aktif tetap | Mandat designer dari pemilik: #FCFCFD untuk transaksi terang; page #F5F5F7, kontrol #EFEFF3. Menggantikan gradient D-50, font/shape/domain tetap | DESIGN-SYSTEM.md; 09/12; AC-109–112/116 |
| D-54 | Kasir/Pesanan/Riwayat lebih ringkas; dapur saja sebelum bayar; refund final sesudah uang | Pemilik: label pendek/tombol sejajar/Buka rincian; filter Semua/Tersimpan/Lunas/Belum bayar, hapus filter refund tertunda. Riwayat hanya settlement + pekerjaan selesai + due 0. Refund dari paid requested/served, requested cancel atomik dengan konfirmasi dapur. Submit sesudah uang, alasan refund tunggal tanpa alasan metode beda; due pembatalan terpisah tetap blocker. Localhost frame 1024×768 tanpa deployment | 02/04/05/07/09/12; DESIGN-SYSTEM.md; AC-116/117; UT-04/07/09/11 |

D-02 sampai D-05 adalah keputusan arsitektur final: React/TypeScript/Vite, Dexie/IndexedDB, Supabase Auth/PostgreSQL, Cloudflare Pages dan Cloudflare R2, dengan target region Singapore. V-01 memeriksa pelaksanaan keputusan vendor tersebut. Jika bukti implementasi menunjukkan hambatan nyata, laporkan dampak konkret kepada pemilik sebelum mengubah keputusan; jangan mengganti vendor atau melemahkan kewajiban backup/isolasi/offline diam-diam. Billing D-22 juga final: transfer manual diverifikasi operator, tanpa gateway/auto-debit untuk tahap awal.

## Pekerjaan implementasi dan bukti yang belum selesai

| ID | Pekerjaan / bukti yang harus dihasilkan | Keputusan final yang dilaksanakan | Penanggung jawab dan batas waktu |
| --- | --- | --- | --- |
| V-01 | Hitung biaya aktual auth/database/API/hosting/egress/email/backup 30 hari, periksa ketersediaan target region, tetapkan paket layanan dan lakukan provisioning saat diotorisasi | Jalankan D-02–05 dengan vendor final; jangan mengasumsikan layanan gratis | Pelaksana teknis sebelum produksi |
| V-02 | Uji model thermal dan jalur koneksi; terbitkan daftar kombinasi lolos beserta bukti | Satu printer kasir, cetak sistem 58/80 mm sesuai file 09 | Pelaksana QA + owner hardware sebelum klaim cetak |
| V-03 | Uji browser/perangkat, penyimpanan, izin offline, performa dan cetak; catat versi dukungan | Desktop/Android/iOS PWA; scope dukungan mengikuti hasil uji, bukan klaim universal | Pelaksana QA sebelum pilot/perluasan platform |
| V-04 | Jalankan restore drill database dan objek; ukur target ≤4 jam dan replay tepat sekali | Backup harian 30 hari dan pemulihan sesuai file 08 | Pelaksana teknis sebelum pilot, lalu bulanan |
| V-05 | Implementasikan/review KDF, lifecycle token/permit dan isolasi toko; kalibrasi parameter pada perangkat minimum | Desain keamanan file 08; PIN bukan enkripsi penuh database browser | Pelaksana teknis/reviewer keamanan sebelum rilis |
| V-06 | Siapkan rekening, petunjuk bukti bayar, kanal bantuan dan alur operator/audit entitlement | Transfer manual diverifikasi operator; tanpa gateway, auto-renew atau auto-debit | Operator Berrie sebelum penagihan pertama |
| V-07 | Verifikasi kecocokan konfigurasi tarif usaha pilot saat aktivasi fitur | Pajak/layanan default mati 0%; label/tarif diatur owner; rumus final file 07 | Owner saat setup dan sebelum fitur tarif diaktifkan |
| V-08 | Jalankan pilot 14 hari/100 pesanan dan UT-01–18; catat masalah serta hasil aktual | Scope final dan UX file 12; tanpa fitur restoran/pemasaran tambahan | Owner + pelaksana saat pilot dan validasi UX |
| V-09 | Review identitas staf/izin offline, approval HP lintas perangkat, expiry/replay/claim-crash, pencabutan dan serah-terima | D-34–36; AC-77–87, AC-95, AC-98–99 | Pelaksana keamanan/QA sebelum pilot staf |
| V-10 | Validasi contoh laporan merchant nyata yang disamarkan, harga/tarif/subsidi/pembalikan/payout serta keterpakaian tabel | D-37–39; AC-88–97, AC-100 | Owner + pelaksana sebelum pilot channel; bukan syarat akses API partner |

V-01–10 belum selesai. Rekening operasional, hasil uji model printer, biaya dan hasil pilot harus diisi dengan fakta ketika pekerjaan dilakukan. Status tersebut tidak berarti metode billing, vendor atau scope belum diputuskan.

## Pemeriksaan konsistensi dan otoritas

Instruksi pemilik menetapkan `/specs` sebagai sumber kebenaran. D-02–05 dan D-22 menggantikan pernyataan lama mengenai framework/vendor/billing. Indeks spesifikasi memuat status persetujuan serta pemisahan keputusan final dari pekerjaan implementasi; latar belakang dan batas riset ada pada [01](01-product-scope.md).

Pada pemeriksaan dokumentasi ini tidak ditemukan konflik nyata antarsesama spesifikasi yang memerlukan keputusan tambahan pemilik. Prasyarat aktivasi/PIN/buka kas tetap berlaku pada onboarding minimum; printer dan fitur menu tambahan tetap opsional. Revisi pemilik mengubah bayar dulu: commit final juga konfirmasi batch draft atomik. Stok tetap didebit sekali oleh batch, status keuangan/pengerjaan tetap terpisah; refund, blocker tutup kas dan pemulihan dipertahankan. [AGENTS.md](../AGENTS.md) telah dibuat sesuai instruksi terbaru pemilik sebagai panduan kerja agen; aplikasi dan uji kegunaan belum diimplementasikan/dijalankan.

## Risiko utama dan respons

| Risiko | Respons yang diputuskan |
| --- | --- |
| Data browser terhapus sebelum sync | Status pending, backup manual, panduan perangkat/profil; jelaskan batas pemulihan |
| Stok berubah saat form bayar terbuka atau paid draft data lama | Commit baru atomik ditolak; periksa uang eksternal sebelum retry. Data lama memakai koreksi nyata atau batal/refund; tidak ada debit/payment kedua |
| Tiket salinan dimasak dua kali | SALINAN jelas, konfirmasi hasil cetak dan komunikasi manual dapur |
| Device lama masih menjual offline | Epoch/izin terbatas, karantina dan rekonsiliasi eksplisit |
| Biaya layanan tidak layak pada harga Rp50.000 | Ukur biaya per toko aktif sebelum jual; jangan menambah add-on diam-diam |
| Salah input metode atau kejadian masa lalu | Audit dan penyesuaian, bukan overwrite histori tertutup |

## Referensi teknis dan batas bukti

Asal kebutuhan dan batas riset awal dicatat pada [01 — Latar belakang dan batas riset](01-product-scope.md#latar-belakang-dan-batas-riset); berkas riset mentah tidak tersedia dalam folder ini dan tidak diklaim sudah diperiksa ulang. Referensi resmi berikut diperiksa untuk mendukung pilihan teknis, bukan validasi pasar atau klaim harga:

- [Vite — Getting Started](https://vite.dev/guide/) menyediakan template React/TypeScript; pemilihan stack adalah keputusan desain Berrie.
- [Dexie — Transaction](https://dexie.org/docs/Transaction/Transaction.html) dan [Dexie.transaction](https://dexie.org/docs/Dexie/Dexie.transaction%28%29) menjelaskan transaksi IndexedDB; operasi jaringan/cetak dilakukan setelah commit lokal, bukan di dalam transaksi storage.
- [Supabase — Database overview](https://supabase.com/docs/guides/database/overview) menjelaskan PostgreSQL dan RLS; Berrie tetap wajib mengimplementasikan serta menguji otorisasi setiap toko.
- [Supabase — Restore to a new project](https://supabase.com/docs/guides/platform/clone-project) menyatakan objek/settings Storage tidak ikut tersalin; rancangan backup Berrie karena itu memisahkan cakupan database dan file.
- Referensi platform/printer berikut diperiksa pada 6 Oktober 2026 untuk batas teknis. Daftar printer Berrie tetap menunggu uji nyata sesuai [09](09-screens-and-hardware.md) dan V-02/V-03.
- [MDN — Making PWAs installable](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable): PWA dan pemasangan pada platform yang mendukung.
- [MDN — Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API): dukungan terbatas, bukan jalur hardware universal.
- [MDN — Window.print](https://developer.mozilla.org/en-US/docs/Web/API/Window/print): pencetakan melalui dialog browser/sistem.
- [Apple — Print from iPhone](https://support.apple.com/en-ie/guide/iphone/iph92628b8f/ios): pencetakan AirPrint memerlukan printer yang mendukung serta jaringan Wi-Fi yang sama.

## Log revisi

| Tanggal | Versi | Perubahan |
| --- | --- | --- |
| 2026-10-06 | v1 | Membuat 12 file spesifikasi dari konteks, menetapkan detail operasional dan implementasi melalui delegasi owner |
| 2026-10-06 | v2 dokumentasi | Konfirmasi persetujuan seluruh spesifikasi; tambah file 12 UX, selaraskan alur/layar/acceptance, jadikan specs sumber kebenaran dan perbarui konteks untuk stack/vendor/billing final; tunda AGENTS.md |
| 2026-10-06 | v3 panduan agen | Buat AGENTS.md atas instruksi pemilik; selaraskan status pada konteks dan file ini tanpa mengubah keputusan produk |
| 2026-10-06 | v4 feedback kasir | Revisi D-27; tambah D-31–33: Bayar dulu sekaligus konfirmasi batch atomik, penyajian campuran per item, identitas antrean, daftar menu/copy awam, satu pelanggan baru dan alur kas; pertahankan ID AC/UT/D/V |

Feedback berikutnya dicatat dengan file/bagian, alasan, keputusan pengganti dan skenario acceptance terdampak. Perubahan harga, scope atau aturan transaksi tidak cukup hanya mengubah tabel keputusan; sinkronkan seluruh dokumen terkait.

### Revisi feedback kasir pemilik

D-27 direvisi; D-31–33 ditambahkan. Label sebelumnya Proses pesanan kini konfirmasi pembuatan internal dengan tombol Buat dulu, bayar nanti; Bayar dulu diakhiri Simpan pembayaran yang menyimpan settlement + konfirmasi draft bersama. Penyajian per item dan identitas antrean menggantikan tipe/identitas meja tunggal. AC/UT mempertahankan ID; target kegunaan tetap belum dibuktikan.

### Revisi 7 Oktober 2026 — pengawasan, channel dan tabel

Pemilik menyetujui pengaturan per aktivitas dan persetujuan dari HP bila layak; keputusan implementasi: masuk scope dengan inbox online tanpa push, receipt satu operasi dan batas offline eksplisit. Pelaksana memilih serah-terima laci. Integrasi platform otomatis ditunda atas arahan pemilik; pencatatan dan pencocokan manual masuk MVP. Preferensi tabel menggantikan kartu daftar. D-13/D-30 diselaraskan, D-34–39/V-09–10/AC-77–100/UT-13–17 ditambahkan tanpa mengubah ID lama. Seluruhnya keputusan/rencana, bukan bukti implementasi atau keamanan. Batas diskon, default izin dan waktu validitas approval ditetapkan sebagai detail implementasi yang didelegasikan pemilik; tidak ada layanan dibeli atau produksi diubah.

### Revisi 7 Oktober 2026 — desain Sites

D-41 mengikuti instruksi pemilik: evaluasi visual dan alur dalam satu prototipe Sites; pertahankan UI yang disetujui pada implementasi akhir. Tambahkan AC-101 untuk versi desain dan kesetiaan implementasi. ID UT-01–17 dan D/V/AC lama dipertahankan. Pada pencatatan awal D-41, brief/paket disiapkan sebelum kode. Status sekarang: Revisi Kasir D-43–45 sudah diterapkan pada prototipe `berrie-site/` dan diperiksa melalui browser pada tablet/HP serta tes domain. Visual belum disetujui pemilik. Data contoh di memori; bukan aplikasi operasional. Tidak ada deployment. Bukti dan batas pemeriksaan ada di [review Kasir](../berrie-site/REVIEW-HISTORY.md#d43-d45). D-02–05 tetap berlaku.

### Revisi palet — 7 Oktober 2026

D-42: pemilik menunjuk ResearchRabbit About Us sebagai referensi palet. Putih/hitam dan aksen cyan/turquoise/lavender/hijau menggantikan berry/netral hangat; token serta sumber pemeriksaan dicatat pada DESIGN-SYSTEM.md. AC-101 diperjelas mencakup kesetiaan palet, tanpa mengubah ID atau UT. Pada pencatatan awal D-42 hanya dokumentasi/paket yang berubah. Kini palet dipakai pada prototipe Kasir; kontras terpilih telah dihitung, visual/seluruh keadaan belum disetujui atau diverifikasi.

### Revisi Kasir/promo — 7 Oktober 2026

Pemilik memperjelas bahwa diskon SKU adalah promo katalog nyata untuk memudahkan kasir menjawab pelanggan, bukan diskon order yang dibagi pada tabel. D-43 mengganti batas lama D-08/D-39. Detail minimal dipilih agen sesuai mandat pilihan sederhana: tanpa penggabungan diskon order, aktivasi manual dan berlaku per channel, topping tidak dipotong, setting hanya owner. D-44 mencatat feedback UI termasuk font sistem seperti Apple, tindakan awal tunggal, label Toko, penghapusan opsi Campuran serta modal ringkas. Paket/komponen stok dan jadwal otomatis tetap belum masuk scope. Prompt revisi lokal sudah dibuat dan kemudian diterapkan pada kode prototipe Kasir. Visual belum disetujui dan tidak ada deployment. AC-102–108/UT-18 mempertahankan ID; bukti simulasi terpilih tercatat di [review Kasir](../berrie-site/REVIEW-HISTORY.md#d43-d45), seluruh kriteria operasional/UT belum lulus.

UX Principles bagian 10.1 kini menjabarkan font, hierarki teks/tindakan, bentuk, ikon dan state komponen lintas aplikasi; token numerik tetap DESIGN-SYSTEM.md. AC-109 menambah bukti konsistensi komponen, tanpa mengganti ID lama. Penerapan komponen Kasir dan pemeriksaan browser terpilih sudah dilakukan; persetujuan visual/seluruh bukti AC-109 belum selesai.

## Adaptasi visual Apple — D-45 (7 Oktober 2026)

Pemilik meminta riset resmi Apple dan arahan bentuk/ikon yang lebih konkret. [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) mencatat sumber Apple Fonts, SF Symbols, HIG dan WWDC serta memisahkan temuan dari token CSS Berrie: font sistem lokal, Lucide SVG konsisten, tombol kapsul/tombol ikon bulat, radius input/panel/dialog berbeda menurut peran, segmented dengan sudut bertingkat dan material selektif pada navigasi. D-45 memperinci D-44, tidak mengganti palet D-42 atau aturan transaksi/stack. AC-109 memeriksa panel komponen, state, kontras dan fallback; AC-101 tetap memerlukan review/persetujuan visual. Kode prototipe Kasir sudah mengikuti token D-45 dan panel komponen tersedia. Bukti terpilih ada di [review Kasir](../berrie-site/REVIEW-HISTORY.md#d43-d45); persetujuan visual belum ada dan tidak ada deployment.

## Penguatan design system — D-46 (7 Oktober 2026)

Pemilik meminta mempelajari Apple-Hig-Designer, HIGAgentSkills, hig-mcp dan HIG resmi, menambahkan pola interaksi OS ke prompt, lalu memperbaiki design system agar kualitas UI mendekati aplikasi Apple yang matang. DESIGN-SYSTEM.md mencatat penilaian sumber, keputusan adaptasi, pemilihan pola, token terang/gelap dan ukuran relatif. HIG resmi menjadi acuan primer; repo komunitas menjadi referensi terpilih, tidak otomatis mengatur proyek atau dipasang.

D-46 baru pada dokumen/prompt/paket. Kode prototipe masih D-43–45 dan visual belum disetujui. AC-110 menambah pemeriksaan pola/tema/reflow serta provenance; AC-109/101 dan UT-01–18 dipertahankan. Tidak ada perubahan scope bisnis, stack, layanan atau deployment. Rujukan terkini D-01–46, V-01–10, AC-01–110 dan UT-01–18.

## Feedback visual dan Kasir — D-47 (7 Oktober 2026)

Pemilik meminta prompt perbaikan Sites berdasarkan screenshot: nama menu/harga item terlalu besar, bold berlebihan; instruksi lanjutan menegaskan tidak ada font 16 px. D-47 menetapkan skala 14/18/20/22 px per peran, 400 nama/harga dan 600 hanya judul/total; panel 14/500. Tabel lebih rapat, target sentuh tetap; tanpa subbaris ukuran/satuan generik, SKU nyata tetap dipilih/ditelusuri. Stok kuantitas angka saja, header Rp harga tanpa Rp per sel, tanpa diskon 0, alias tipe owner default N. P=Paket hanya contoh jika tipe kelak sah, bukan perluasan paket/stok.

Detail sederhana yang dipilih sesuai mandat: alias 1–3 huruf/angka uppercase/unik; menu bervarian tanpa nama unik membuka pemilih dengan stok per SKU/rentang harga jujur; Pesanan baru mengganti label ambigu Pelanggan baru dan hanya perlu saat transaksi ada. Bentuk toggle kas adalah button pembuka form, tidak mengubah state sebelum commit. Penyajian/identitas dan pemicu Batalkan/Catat refund/Koreksi langsung terlihat; business/izin/audit tetap. Input 14 px mengikuti arahan pemilik dan membutuhkan pemeriksaan Safari/iPhone tanpa mematikan zoom.

D-47 memperbarui design system, 02/03/06/07/09/12, AC-111, konteks dan prompt/paket. Tidak ada revisi kode, pemanggilan Sites, instalasi, deployment atau bukti visual baru pada pekerjaan ini. Visual tetap belum disetujui. Rujukan D-01–47, V-01–10, AC-01–111, UT-01–18.

D-47, feedback lanjutan: Sedang promo sejajar setelah Camilan dalam toolbar kategori; promo tetap filter tambahan yang bisa digabung kategori. Ruang kosong/padding/header dipangkas agar tabel pada 1024×768/root default dengan ≥20 menu pendek menampilkan minimal 8 baris penuh, target 10 (row 44 px, area isi ≥352 px). Tidak memakai kartu per menu atau mengecilkan hit area; nama panjang/zoom boleh mengurangi jumlah terlihat secara wajar. Ini target review, belum hasil pengukuran.

## Feedback saat implementasi — D-48 (7 Oktober 2026)

Instruksi terbaru pemilik: header **Diskon** saja. Isi kolom Sisa stok, Diskon dan Rp harga hanya angka dengan pemisah ribuan/desimal; tanpa Rp, %, teks, dash, slash atau rentang. Diskon memakai nilai sesuai jenis yang owner atur (misalnya 10 untuk 10% atau 2.000 untuk potongan Rp2.000); jenis/nilai/harga dasar dan efektif dijelaskan pada detail item, bukan menambahkan unit di sel tabel. Nominal total/pembayaran/refund/struk tetap berformat Rp.

Satu baris katalog mewakili satu SKU dengan satu stok/harga yang pasti. SKU bernama sama dibedakan melalui nama varian **inline**; jika nama varian juga sama, tambahkan kode SKU asli. Ini menggantikan penyajian kelompok stok/harga per varian D-47: tidak menjumlahkan stok, tidak mengarang harga atau memilih SKU diam-diam. Subbaris generik/satuan tidak diulang pada satu SKU; varian asli tetap terlihat di detail/keranjang/refund. Filter promo membatasi SKU nyata. Stok manual menggunakan sel angka kosong, dengan **Stok tidak dihitung/Tidak tersedia** pada sel Menu dan nama aksesibel; tidak diisi 0 palsu. Kuantitas 0 tetap angka 0/disabled, dinonaktifkan meski saldo positif tetap alasan di Menu. Input numerik menolak huruf dan batas domain tetap memvalidasi angka/uang.

Navigasi kiri tablet/desktop dapat diciutkan menjadi rail ikon dan dibuka kembali melalui tombol berlabel **Ciutkan navigasi/Buka navigasi**, dengan aria-expanded dan fokus keyboard. Menambah ruang katalog tanpa mengubah pesanan, filter, channel atau histori. Ikon navigasi tetap memiliki nama aksesibel; HP mempertahankan navigasi responsif. Tidak ada perubahan stack, scope paket, uang/stok/izin atau otorisasi deployment.

D-46–48 kini diterapkan pada prototipe Sites. [Bukti revisi](../berrie-site/REVIEW-HISTORY.md#d46-d48) memuat hasil browser dan batasnya. Visual belum disetujui; tidak ada deployment. Catatan “dokumen saja” pada entri historis di atas menjelaskan tahap sebelumnya.

## Penulisan ulang design system — D-49 (7 Oktober 2026)

Pemilik menilai hasil sebelumnya terlalu standar dan menolak arah estetikanya. Instruksi terbaru: hapus seluruh isi design system lama lalu buat sistem baru berdasarkan HEX warna, font yang secara visual menyerupai Apple, dan rujukan HIG resmi. [DESIGN-SYSTEM.md](../DESIGN-SYSTEM.md) kini hanya memuat panduan aktif, tanpa riwayat revisi, evaluasi repo komunitas, nama atau tautan situs asal palet.

Palet diperiksa melalui CSS publik dan computed styles elemen halaman [rujukan pemilik](https://www.researchrabbit.ai/solutions/for-students). Nilai palet/tint diekstrak dari stylesheet; pemetaan page/surface/text, tema gelap dan status adalah pilihan Berrie. Pemeriksaan elemen yang dirender mengonfirmasi putih/hitam, hijau #8ADD8A, fill #FACCB3/#B0EDF0/#C4EEC4 dan footer #9CA2B1; warna lain pada tabel palet/tint tersedia sebagai deklarasi CSS, bukan klaim semuanya tampil sebagai fill di halaman itu.

HIG Foundations serta topik typography/color/layout/materials/buttons/segmented/text fields/sidebars/alerts/accessibility/SF Symbols dibaca dari dokumentasi resmi Apple. Token CSS dan pemilihan Inter adalah adaptasi Berrie; tidak menyalin kontrol native atau distribusi SF Pro. Font Apple tetap lokal, Inter akan dibundel/cache bersama aplikasi pada implementasi. Ukuran 14/18/20/22 dan kebutuhan numerik/SKU/dua urutan bayar D-47–48 dipertahankan.

Fondasi baru mengganti canvas cyan penuh dengan page netral, membatasi aksen, merapikan hierarki teks/komposisi, menambah spacing scale dan konstruksi seluruh keluarga komponen termasuk aksi mengambang. Radius group menjadi 16 px, segmented 16/12 px dengan inset 4 px; gap 8 px untuk target mandiri, sedangkan kelompok tersambung tetap punya hit area masing-masing. Material hanya lapisan navigasi mengambang; konten transaksi solid.

AC-101/109/110 mengikuti token aktif, AC-111 mempertahankan perilaku/kepadatan, AC-112 menambah review komposisi dan cakupan komponen. UT-01–18 mempertahankan ID, target dan peserta; catatan observasi visual/font diperbarui. Pekerjaan ini hanya dokumen; versi Sites 1/2 tetap bukti historis, tidak ada revisi kode, unduhan font ke proyek, versi Sites baru, screenshot baru atau deployment.


## Gradasi bubblegum — D-50 (7 Oktober 2026)

Pemilik meminta putih UI diganti bubblegum dari screenshot. Implementasi awal mengambil satu sampel tengah #DEF3F7; pemilik mengoreksi bahwa maksudnya variasi kiri ke kanan. Arahan final mempertahankan cyan #61DCE2 pada navigasi/filter/segmen aktif dan menerapkan gradasi horizontal pada permukaan putih UI terang.

Sampel gambar terakhir (2880×1456), baris latar pada 95% tinggi: x=0% #E8E7F5, 50% #DEF3F7, 60% #DEF5F6, 99,9% #E6F6E4. Ini nilai piksel gambar terlampir, bukan klaim HEX CSS situs asal. Token final `linear-gradient(90deg, #E8E7F5 0%, #DEF3F7 50%, #DEF5F6 60%, #E6F6E4 100%)`, fallback #DEF3F7. Gradient opaque diterapkan pada katalog/keranjang, panel, overlay dan field yang sebelumnya putih; page netral, tema gelap, cetakan/kertas dan tinta putih aksi gelap tetap. Ini pengecualian eksplisit terbaru terhadap batas gradient dekoratif D-49; tidak menambah blur/animasi/dekorasi.

Text-tertiary terang menjadi #68686D demi kontras. Pilihan aktif cyan memakai tinta gelap, hover #B0EDF0, pressed #D7F6F8 dan indikator/atribut selected. Bukti dan batas ada di [review D-49/D-50](../berrie-site/REVIEW-HISTORY.md#d49-d50). AC-101/109–112 serta UT-01–18 tetap; tidak mengubah domain, stack, izin atau gerbang pilot.

## Revisi operasional Kasir — D-51/D-52 (7 Oktober 2026)

D-51 berasal dari review keranjang oleh pemilik: satu filter aktif, Semua/Habis/Promo tetap, kategori di Pengaturan, stok nol dipisahkan, SKU nonaktif hanya di Menu & Stok. Penyajian dipilih dalam dialog item; Reguler generik disembunyikan, catatan item terlihat dari draft. Diskon order/Catatan/Simpan dulu memakai button jelas; Bayar nanti/Bayar diperpendek. Refund/koreksi/penyajian tersedia di Pesanan/detail, composer Kasir kembali kosong setelah settlement berhasil. Struk tetap merujuk order yang dibayar; gagal/hasil tidak diketahui mempertahankan input sampai operasi asal diperiksa.

D-52 mengubah pilihan stok D-01/03 dan representasi manual D-47/48: seluruh SKU wajib kuantitas. Admin boleh mengisi 1000, namun tetap ada saldo dan debit setiap unit. Tidak ada mode tidak dihitung, termasuk aktivasi/CSV. Nilai kosong/legacy null tidak otomatis menjadi 0; hitungan awal eksplisit diaudit sebelum jual. Ledger/histori dan pemulihan gagal tetap dipertahankan. Topping tetap ketersediaan tanpa ledger bahan sesuai scope, bukan SKU jual yang bebas stok. Izin, atomisitas/idempotensi dan pemisahan uang/penyajian tetap berlaku.

Bukti prototipe dan batas ada pada [review D-51/D-52](../berrie-site/REVIEW-HISTORY.md#d51-d52); tidak membuktikan produksi/pilot, tanpa deployment. ID lama dipertahankan; AC-113–115 ditambahkan, UT-01/02/03/05/10/17/18 mengikuti perilaku terbaru.

## Pemensiunan folder mockup — 8 Oktober 2026

Pemilik meminta menghapus mockup lama bila tidak diperlukan. Pemeriksaan tidak menemukan dependensi kode/runtime/config Sites ke folder itu. M-01/M-02 dipensiunkan: `mockup/` dihapus dari workspace, prototipe aktif hanya `berrie-site/`. Tidak menyimpan cadangan folder sesuai instruksi pemilik; catatan hasil lama pada tasks mempertahankan histori; ini tidak mengklaim seluruh suite browser lama sudah dipindahkan atau lulus pada Sites. D-41/AC-101 dan ID M-01/M-02 dipertahankan; stack, aturan bisnis, kriteria rilis dan versi 4 tersimpan tanpa deployment tidak berubah.

## Revisi surface dan alur — D-53/D-54 (8 Oktober 2026)

Instruksi terbaru pemilik menggantikan gradient D-50 dan detail label/antrean/cetakan lama D-44/47/51. Designer memilih putih sejuk #FCFCFD solid untuk fokus menu/uang, cyan #61DCE2 tetap seleksi. Kasir ringkas tanpa Lihat di Pesanan/helper, Bayar dan Struk full-width sejajar; tabel Stok/Harga, Beri diskon, No. antrean / nama.

Pesanan memakai filter Tersimpan/Lunas/Belum bayar/Semua dan tombol Buka rincian. Pemilik kemudian menegaskan refund hanya untuk paid order, dari Pesanan sebelum disajikan atau Riwayat setelah disajikan; submit hanya sesudah uang dikembalikan. Filter Refund tertunda dihapus. Kewajiban akibat pembatalan terpisah tetap dipertahankan untuk integritas/tutup kas. Refund requested memasukkan cancellation atomik dengan konfirmasi dapur; refund served tidak mengubah penyajian. Riwayat hanya settlement dengan pekerjaan/due selesai; refund selesai tetap historis. Metode refund aktual tercatat, alasan refund wajib tanpa field metode berbeda tambahan. Tujuan pelanggan disabled sebelum settlement dan domain menolak; tiket dapur tetap tersedia. Localhost default frame tablet 1024×768, versi hosted tetap responsif; tanpa deployment.

## Revisi pemilik — D-55/D-56 (8 Oktober 2026)

| ID | Keputusan final | Alasan dan batas | Acuan |
| --- | --- | --- | --- |
| D-55 | Nama toko tunggal, keranjang/detail ≥4 item pendek tablet, lavender keranjang, identitas wajib, Bayar primer; Pesanan default Lunas dan tabel/modal ringkas | Feedback pemilik mengganti identitas opsional dan penekanan Bayar nanti D-47/51/54. Pesanan baru tidak ada pada Kasir, tetap detail agar order tersimpan dapat dilanjutkan tanpa membuang draft. Draft tidak disamakan dengan requested; nomor batch tetap data/tiket | 02/04/07/09/12; DESIGN-SYSTEM.md; AC-118/119 |
| D-56 | Form menu dropdown Tipe/custom dan kategori owner, kode otomatis; ukuran/rasa SKU datar + topping satu form; harga hanya channel aktif; Stok Minimal dan peringatan di aplikasi | Tipe berbeda dari ukuran. N/P/PR menghindari bentrok Paket/Promo; kode SKU unik otomatis terpisah. Paket/Promo label tanpa bundle/diskon otomatis. Varian/stok/topping memakai model existing; crossing ≤threshold tanpa push/WA/email | 02/03/07/08/09/12; DESIGN-SYSTEM.md; AC-120/121 |

Implementasi prototipe dan bukti terpilih pada [review D-55/D-56](../berrie-site/REVIEW-HISTORY.md#d55-d56). Tidak mengubah stack produksi, scope paket komponen, printer, backup atau gerbang pilot. ID lama dipertahankan; D-01–56, V-01–10, AC-01–121, UT-01–18.

## Tabel menu, stok bersama dan rekap online — 8 Oktober 2026

| ID | Keputusan final | Alasan dan batas | Acuan |
| --- | --- | --- | --- |
| D-57 | Input pengelolaan seperti Excel, satu pilihan rasa/ukuran per baris, dropdown/error/bulk/duplikat/tempel dan satu save; Menu/Stok/Rekap online | Owner meminta review cepat tanpa banyak overlay/layer; kode stabil dan jejak stok tetap; tabel owner di kasir aktif | 02/03/07/08/09/12; AC-122 |
| D-58 | Satu stok menu untuk semua rasa/ukuran; racikan Es/Gula/custom tanpa harga/stok terpisah | UKM menghitung total Milkshake50, tidak perlu Pisang10/Coklat20; variasi harga tetap. Satu gelas ukuran mana pun satu unit, bukan resep bahan; migrasi lama perlu hitungan eksplisit | 03/04/07/08; AC-123/124 |
| D-59 | Toko default; rekap stok online gabungan setelah antrean reda, cutoff/pengingat dan qty per menu tanpa order/omzet | Kasir tidak sempat input online rinci saat ramai. Saldo belum realtime sebelum rekap; qty yang sudah dicatat harus dikecualikan, range/receipt mencegah duplikasi; channel rinci lama opsional | 02/03/06/07/08/09; AC-125 |
| D-60 | Menu lima row per halaman, row64/input56, topping/rincian plain tanpa pill | Feedback pemilik pada progress tablet meminta jarak jari lebih lega daripada tujuh row; Kasir tetap kepadatan lama | DESIGN-SYSTEM.md; 09/12; AC-126 |

UT-19–21 ditambahkan sebagai target peserta; belum hasil UT. Scope revisi tidak menambahkan BOGO, paket komponen, stok bahan/rasa terpisah atau integrasi platform otomatis. Prototype lokal tanpa deployment, penyimpanan versi hanya dinyatakan setelah konfirmasi layanan.

## Feedback Menu & Stok dan Kas — 8 Oktober 2026

| ID | Keputusan final | Alasan | Acuan |
| --- | --- | --- | --- |
| D-61 | Variabel dibuat/dinamai owner, single/multi dropdown, kosong `-`, harga per kombinasi; menu-first +Variabel/+Kombinasi dan + Menu; tabel tidak menyusut | Pemilik meminta variasi kios yang berbeda, topping Keju sekaligus Jamur dan harga per kombinasi. Detail rutin: pilihan gratis, kompatibilitas topping lama dan batas12/30/30; snapshot tetap | 03/07/09/12; DESIGN-SYSTEM; AC-127/128; UT-22 |
| D-62 | Stok dipisahkan Isi stok vs Stok opname; stok awal saat setup, stok minimal jelas/editable owner | Pemilik menyatakan dua kegiatan agar tidak bingung; saldo read-only dibedakan dari tambahan/fisik, ledger/izin tetap | 03/07/08/09/12; AC-129; UT-23 |
| D-63 | Rekap sampai menit, input jelas, histori Koreksi dengan default approval owner mengikuti Koreksi stok | Pemilik menyetujui approval owner default. Delta terhadap revisi terakhir; asal/periode/checkpoint immutable dan idempoten | 03/06/07/08/09/12; AC-130; UT-24 |
| D-64 | Kas breakdown jelas, Uang masuk/keluar dan urutan selesai sesuai keadaan; same actor langsung tutup, shift handover dalam sesi sama | Pemilik meminta label/posisi/sequential dan mendelegasikan keputusan toko tanpa/dengan shift. Tidak handover wajib bila bekerja sendiri; tidak mereset sesi | 02/06/07/08/09/12; AC-131; UT-25 |
| D-65 | Tidak ada impor pada tahap ini, CSV maupun Excel | Instruksi terakhir pemilik membatalkan kebutuhan impor; kontrak/tes kompatibilitas lama dipertahankan, bukan UI aktif | 01/03/09/10; AC-04/05 ditunda |

D-61–65 mendahului bagian D-56–60 yang berbeda, tanpa mengganti ID/histori, stok bersama D-58, aturan uang/approval atau stack. Prototipe pada Sites yang sama tanpa deployment. UI/UX Pro Max dibaca sebagai skill rujukan tambahan dari [sumber](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md); tidak dipasang lokal dan bukan izin mengubah palet/font Berrie. Persetujuan visual/UT peserta/operasional belum selesai. Register terkini D-01–65, V-01–10, AC-01–131, UT-01–25.

## Penemuan Menu & Stok — D-66 (8 Oktober 2026)

| ID | Keputusan final | Alasan dan batas | Acuan |
| --- | --- | --- | --- |
| D-66 | Copy Varian ringkas; Status/Menu/Varian/Harga/Kategori di awal; + Menu modal/Batal/hasil paling atas; harga di dialog Varian, tanpa + Kombinasi/Rincian; Diskon sub sendiri, opname hanya Stok | Pemilik menolak alur + Kombinasi karena tidak jelas, baris baru tersembunyi dan cancel di ujung kanan. Pilihan tunggal otomatis dan multi dipilih bersama di daftar harga, harga baru eksplisit; harga/ID lama tetap. Batas12/30/500, stok bersama, histori/snapshot/izin/promo tidak berubah. Data harga removed diarsipkan, bukan dihapus | 02/03/09/12; DESIGN-SYSTEM; AC-127/128/132; UT-22/26 |

D-66 mendahului interaksi/kolom D-60/61 yang berbeda. Register terkini D-01–66, AC-01–132, UT-01–26, V-01–10. Prototipe lokal, tanpa deployment; visual dan UT belum disetujui/selesai.

## Penyederhanaan Menu & Stok — D-67 (9 Oktober 2026)

| ID | Keputusan final | Alasan dan batas | Acuan |
| --- | --- | --- | --- |
| D-67 | Dua status Dijual/Tidak dijual dengan hijau/merah hanya pada sel status; Hapus menu berkonfirmasi, histori tetap; tanpa checkbox/bulk; Batal perubahan; pilihan pertama default berbintang; harga dasar + tambahan integer≥0 per pilihan langsung dalam modal Varian; Stok satu baris/menu dengan saldo acuan beralasan; Diskon navigasi utama | Feedback pemilik terbaru mendahului D-57/60/61/62/66 yang berbeda. 0 berarti harga tidak berubah, tanpa pengaturan harga/preset/langkah Lanjut ke harga. Single berharga menghasilkan kombinasi SKU≤30, multi berharga menambah per pilihan tanpa stok bahan. Konversi harga lama yang tidak dapat diwakili secara aditif ditahan, bukan ditebak. Stok awal = saldo acuan hasil setup/hitungan/perubahan terakhir; mengubahnya menetapkan saldo aktual baru melalui Koreksi stok, bukan menambah angka ke sisa. Actor/waktu/alasan/before/after wajib berjejak. Stok minimal konfigurasi saja; sisa read-only. Tiga copy rekap dihapus tanpa mengubah invariants/omzet/kas/checkpoint/merchant manual. Batas12/30/500, lima row64/input56/tablet1024×768 tetap | 02/03/07/08/09/10/12; DESIGN-SYSTEM; AC-133/134; UT-27/28 |

Status Diarsipkan dipensiunkan dari UI. Hapus adalah soft delete seluruh grup: tersembunyi dari daftar aktif Menu/Stok/Kasir, ID/saldo/ledger/pesanan lama tetap, tanpa purge. Aksi final dialog diperlukan; draft aktif menahan hapus. Tidak menambah pemulihan/purge katalog, deployment, impor, stok resep atau vendor baru. Register terkini D-01–67, AC-01–134, UT-01–28, V-01–10. Implementasi prototipe bukan kelulusan pilot/UT.

## Pengelolaan katalog dan diskon fleksibel — D-68 (9 Oktober 2026)

| ID | Keputusan final | Alasan dan batas | Acuan |
| --- | --- | --- | --- |
| D-68 | Hapus paling kiri/log tanggal-jam-actor; Batal/Simpan simetris hanya saat berubah; error filter hanya>0; kategori wajib/CRUD kategori-tipe/tambah inline; field stok konsisten tanpa Ubah/harga rata kiri; pustaka diskon reusable persen/potongan/Beli X gratis Y; metadata dan penjelasan sumber kas | Feedback pemilik dan persetujuan eksplisit aturan BOGO, diperluas agar mendukung buy2get3. Label tegas Beli2 gratis3 = terima5 bayar2; SKU/pilihan sama, sisa penuh, topping utuh, stok seluruh unit, alokasi potongan ke seluruh kelompok untuk refund, tanpa diskon order. Snapshot confirmed tetap, tanpa lintas batch/beda menu/jadwal otomatis. Hapus nama/definisi in-use ditahan. Mengganti bagian D-43/51/67 yang berbeda; stack/storage/pilot tetap | 01/02/03/05/06/07/08/09/10/12; DESIGN-SYSTEM; AC-135–139; UT-29/30 |

Konfigurasi kategori/tipe yang sudah ditambahkan disimpan terpisah dari draft Menu. Rename berlaku ke katalog/alias, bukan snapshot/kode SKU. Pembuka kas dan penanggung jawab saat ini dibedakan. Pustaka/diskon jumlah tetap simulasi memori sampai kontrak produksi diterapkan dan dibuktikan. Rujukan terkini D-01–68, AC-01–139, UT-01–30, V-01–10. Tidak ada deployment atau perubahan akses.


## Jadwal diskon, tabel bergulir dan Kas ringkas — D-69 (10 Oktober 2026)

| ID | Keputusan | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-69 | Jadwal mulai–selesai diskon opsional zona toko; copy tambahan Diskon/Varian dan bintang Default dihapus; Menu/Stok/Rekap gulir vertikal; rekap grid periode; Kas ringkas/tombol pergerakan di atas/step1 tautan rekap | Instruksi eksplisit pemilik mendahului larangan jadwal otomatis D-43/D-68 dan pagination D-60. Tanpa jadwal berulang/mesin kampanye. Snapshot item lama tetap, batas mulai inklusif/akhir eksklusif. Satu saldo kas tercatat tetap diperlukan; label input Uang akhir di laci (Rp) dipertahankan untuk aksesibilitas. Blocker/hitung buta/ledger tak berubah. Subagen UIUX memberi rekomendasi rekap/Kas; feedback lanjutan mengganti dua kolom timpang dengan state awal ringkas/card Kas penuh/finish pendek/riwayat disclosure. Skill UI/UX Pro Max dipasang sesuai instruksi pemilik. Bukan hasil UT | 01/02/03/06/07/08/09/10/12; DESIGN-SYSTEM; AC-140–142; UT-31/32 |

## Desain terpilih menjadi satu UI — D-70 (12 Oktober 2026)

| ID | Keputusan | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-70 | Alternatif disetujui sebagai satu-satunya UI; hapus pembanding/cabang Kasir lama tanpa membuat backup. Manrope lokal, stone/putih, hijau gelap dan terracotta; navigasi horizontal Kasir/Pesanan/Riwayat + Kelola toko; kartu menu ketuk langsung/Atur opsional; jumlah draft inline; pembayaran panel tetap; struk opsional setelah commit Kasir | Instruksi eksplisit pemilik memilih desain baru. Mendahului palet/font/shape/material/sidebar/tabel katalog/lapisan bayar/struk otomatis dan target empat baris lama yang berbeda. Target tablet8 kartu dan3 baris normal, HP responsif. Invariants uang/stok/izin/ID operasi serta Menu/Stok/Rekap D-68/69 tetap. Visual disetujui, bukan UT/pilot. Histori keputusan dipertahankan, tidak membuat salinan implementasi lama atau menulis ulang Git. Tetap lokal/tanpa deployment | 02/03/05/09/10/12; DESIGN-SYSTEM; AC-101/143; UT-02/03/05/17/18/20/33 |

## Kasir, Riwayat dan arah visual Jira — D-71 (12 Oktober 2026)

| ID | Keputusan final | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-71 | Jira menjadi arah visual menggantikan usulan ResearchRabbit/palet-font D-70; Inter lokal/OFL dan komponen Berrie sendiri. Navigasi horizontal/katalog kiri–pesanan kanan tetap. Toggle Item berikutnya di Pesanan baru, dine-in kiri/bungkus kanan; ketuk kartu membuka modal, Tambahkan wajib/tanpa Atur. Judul tunggal/copy bayar dihapus/Catatan non-tunai. Save/process/settle berhasil → empty + notifikasi/Lihat pesanan. Cetak tanpa konfirmasi/bagikan, selesai setelah attempt tanpa klaim fisik, ulang SALINAN dari detail. Riwayat awal–akhir inklusif/default hari ini/zona toko. Crypto tidak ditambahkan | Persetujuan eksplisit pemilik atas feedback dan empat rekomendasi. Membuka modal menambah satu ketukan per item; default terisi/opsi relevan/CTA terlihat menjaga kemudahan. Mengubah default tidak mengubah item lama. Hasil unknown/gagal tetap ditahan; attempt bukan bukti kertas. Bukan adopsi seluruh aset/paket ADS, stack/izin/uang/stok/pilot tetap. Lokal tanpa deployment | 01–05/07–10/12; DESIGN-SYSTEM; AC-54/108/143–147; UT-04/33–35 |

## Perapihan Kasir, cetak otomatis dan lanjut draft — D-72 (12 Oktober 2026)

| ID | Keputusan final | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-72 | Hapus copy bantuan/harga per unit di modal, Item berikutnya pada card serta copy Pesanan/Riwayat. Racikan12px seperti penyajian, total panel22px, nominal Riwayat rata kiri. Validasi identitas tidak mengunci input. Bayar nanti otomatis mencoba dapur, bayar langsung dapur baru lalu pelanggan, bayar batch lama pelanggan saja. Simpan dulu tanpa cetak/debit; detail draft menyediakan Edit pesanan ke Kasir dengan nomor/identitas tetap. Ulang memilih tujuan yang layak, SALINAN | Feedback eksplisit pemilik mendahului toggle dan cetak opsional D-71. Edit pesanan sebagai pilihan implementasi untuk melanjutkan draft tersimpan. Commit bisnis mendahului printer, gagal/unknown input tetap, operasi sama; batch confirmed/lunas tidak ditimpa. Prototipe hanya simulasi attempt, tanpa bukti kertas/printer. Visual Jira/Inter/stack/izin/uang/stok/pilot tetap. Lokal tanpa deployment | 02/04/05/07/09/10/12; DESIGN-SYSTEM; AC-148–150; UT-36 dan04/34/35 |

## Harga/qty agnostik, form menu dan fondasi Atlassian — D-73 (13 Oktober 2026)

| ID | Keputusan final | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-73 | Owner/kasir menentukan arti harga/qty/stok; tanpa mode satuan/volume/konversi. Harga100 × qty200 =20000; debit200 dari saldo grup saat konfirmasi. Menu tanpa varian, varian harga tetap dan berharga ditampung dalam form Tambah menu yang sama dengan harga dasar/tambahan0+/preview akhir. Kas maksimum640 px rata kiri/grid label–nilai. Audit seluruh fondasi visual memakai atlassian.design, memperbaiki hierarki font, radius per peran, tab, ikon, state dan ruang; komponen sendiri/Inter OFL/Lucide tetap | Instruksi eksplisit pemilik mengutamakan wadah agnostik dan meminta visual tidak bias terhadap prototipe. Mendahului asumsi satu gelas=1 unit D-58, satuan tampilan, varian harus sesudah menu ditambah D-66, serta ukuran/radius seragam D-71. Qty tetap integer1–999, stok bersama wajib integer≥0; semua tambahan berlaku per qty. Tanpa qty pecahan, konversi antarvarian, stok bahan, vendor/stack baru. Aset resmi Atlassian tidak diadopsi; adaptasi visual bukan klaim identik Jira atau kelulusan UT. Lokal tanpa deployment | 02/03/06/07/09/10/12; DESIGN-SYSTEM; AC-151/152; UT-37/38 |

Batas12 variabel/30 opsi/30 kombinasi berharga/500 SKU tetap. Draft tidak mendebit; konfirmasi/settlement/retry tetap sekali. Saldo awal menu baru dicatat sekali per grup, bukan per row varian. Snapshot, promo, izin, hitung buta dan blocker tidak diubah. Register terkini D-01–73, V-01–10, AC-01–152, UT-01–38. [Review lokal](../berrie-site/REVIEW-MENU-KAS-D73.md) membatasi klaim hasil pemeriksaan.

## Kas tablet dan laporan berorientasi bisnis — D-74 (13 Oktober 2026)

| ID | Keputusan | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-74 | Kas: breakdown maksimum640 px kiri, Ganti petugas/Tutup toko bertumpuk di kanan, area maksimum960 px; <900 satu kolom. Navigasi tablet atas/HP bawah tetap. Laporan mengutamakan Penjualan/Uang diterima/jumlah transaksi/rata-rata belanja, menu penyumbang penjualan; pengembalian/gratis kontekstual, rincian disclosure dan telusur ke pesanan asal | Feedback pemilik dan delegasi keputusan navigasi. Koreksi eksplisit pemilik: refund jarang, tidak menjadi fokus bisnis harian. UI/UX Pro Max dipakai untuk responsif, hierarki, data aditif dan target sentuh; rekomendasi dashboard BI padat tidak diterapkan mentah pada kasir awam. Penjualan utama setelah diskon sebelum pengembalian; penerimaan neto tetap definisi06. Tidak mengklaim metrik unik dibanding seluruh POS, laba/HPP atau sebab-akibat performa. Tanggal/refund/method/CSV prototipe diperbaiki memakai sumber kejadian. Semua invariants/izin/stack dan D-73 lainnya tetap. Lokal/tanpa deployment | 06/09/10/12; DESIGN-SYSTEM; tasks/review D-74; AC-153/154; UT-38/39 |

D-74 mendahului batas seluruh workspace Kas640 px dan finish di bawah/berdampingan D-69/73 yang berbeda. Register terkini D-01–74, AC-01–154, UT-01–39, V-01–10. Prototipe bukan aplikasi operasional; T-14, audit lengkap/koreksi klasifikasi/server/UT/pilot belum selesai.

## Editor, laporan dan pengaturan terpadu — D-75 · 31 Oktober 2026

| ID | Keputusan final | Alasan / batas | Pemetaan |
| --- | --- | --- | --- |
| D-75 | Aksi Menu/Stok sticky di atas editor, penanda draft/guard keluar dan tanpa keterangan opsional; Laporan ringkasan→menu→detail/kejadian, dasar metrik eksplisit, tabel per hari tanpa perbandingan riwayat tak terverifikasi; alias bergabung di Tipe menu, Toko pertama/default; staf tambah/ubah/nonaktif/aktifkan dan kebijakan bersama sesuai08 | Instruksi eksplisit pemilik. Simpan gagal/unknown mempertahankan input/operasi; alasan koreksi/audit tetap. Tidak mengubah rumus uang, identitas tipe/SKU/histori, role atau vendor. Tidak mengklaim laba, sebab-akibat, autentikasi PIN atau aplikasi operasional. Lokal tanpa deployment. | 03/06/08/09/10/12; DESIGN-SYSTEM; tasks; AC-155–158; UT-40–43 |

D-75 mendahului lokasi alias terpisah D-47, urutan Tampilan pertama dan aksi editor hanya di bawah. Definisi laporan D-74/file06 dan model akses D-34–36/file08 tetap. ID lama dipertahankan: D-01–75, AC-01–158, UT-01–43, V-01–10. Bukti dan batas pada [review D-75](../berrie-site/REVIEW-ADMIN-LAPORAN-D75.md).

## Kasir cepat terpadu — D-76 · 31 Oktober 2026

| ID | Keputusan | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-76 | Kasir tanpa judul/breadcrumb berulang; tambah langsung menu sederhana + Urungkan satu unit draft; favorit per grup/urutan owner; Channel dan default penyajian berikutnya di kepala pesanan; Mulai bertugas menggantikan sakelar kas | Instruksi eksplisit pemilik mengizinkan revisi medium–radikal dan mengganti kewajiban modal/Tambahkan pada setiap pemilihan. Mengurangi langkah rutin, mempertahankan pilihan dan pengecualian per item. Uang/stok/settlement/izin/receipt/cetak/pemulihan tidak berubah. Tidak ada backend/persistensi produksi atau deployment. | 02–10/12; DESIGN-SYSTEM; AC-159–164; UT-44–46; review D-76/tasks |

D-76 mendahului kewajiban modal/Tambahkan untuk semua menu dan penyajian hanya di modal D-71/72 serta Semua sebagai filter awal. Kasir tetap dua kolom tablet, navigasi utama/pembayaran satu panel. ID lama dipertahankan: D-01–76, AC-01–164, UT-01–46, V-01–10. [Bukti dan batas](../berrie-site/REVIEW-KASIR-D76.md).

## Kepala pesanan ringkas — D-77 · 31 Oktober 2026

| ID | Keputusan | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-77 | Hapus copy terlihat Default penyajian dan Untuk item berikutnya; Channel dan nilainya sebaris di atas kontrol Makan di tempat/Bungkus | Instruksi eksplisit pemilik. Nama aksesibel kontrol tetap; perilaku default berikutnya, pengecualian per item, channel dan seluruh domain tetap D-76. Commit/push diotorisasi, merge oleh pemilik; tanpa deployment. | 02/09/10/12; DESIGN-SYSTEM; AC-163/165; UT-46; review D-76/tasks |

## Workspace pekerjaan Pesanan — D-78 · 31 Oktober 2026

| ID | Keputusan | Alasan/batas | Dampak |
| --- | --- | --- | --- |
| D-78 | Aktif/Tersimpan tanpa duplikasi; pengerjaan dan pembayaran AND awal Semua; daftar operasional berurut konfirmasi batch; tablet≥900 daftar40/detail60 scroll terpisah, HP detail penuh; detail bersama tagihan→penyajian→aksi tambahan/Aksi lainnya; Lanjutkan pesanan untuk draft yang sama | Instruksi eksplisit pemilik mengganti default Lunas/filter tabel/halaman detail terpisah tablet D-55. Waktu hilang tidak diganti created/payment; tanpa ambang terlambat. Selection keluar hasil dikosongkan setelah aksi, tanpa auto-select tetangga. Uang/stok/settlement/definisi selesai/refund/izin/actor/approver/cetak/penutupan tidak berubah. Kasir D-76/D-77 tetap. Prototipe memori, lokal saja; tanpa commit/push/PR/versi layanan/deployment. | 02/04/05/07/08/09/10/12; DESIGN-SYSTEM; AC-166–172; UT-47–49; review D-78/tasks |

ID terdahulu tetap: D-01–78, AC-01–172, UT-01–49, V-01–10. [Bukti dan batas lokal](../berrie-site/REVIEW-PESANAN-D78.md).
