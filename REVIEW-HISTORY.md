# Riwayat review prototipe — D-43–70

Digabung pada 12 Oktober 2026. Catatan ini menyimpan hasil pemeriksaan, batas simulasi dan identitas versi lama; bukan aturan UI aktif atau bukti pengujian ulang. Patokan terbaru: [review D-71](REVIEW-KASIR-D71.md), [posisi sekarang](../tasks.md#posisi-sekarang), [spesifikasi](../specs/README.md) dan [design system](../DESIGN-SYSTEM.md).

Isi catatan lama dipertahankan; judul dan tautan disesuaikan untuk penggabungan. Nama file lama dalam narasi hanya identitas historis. Klaim “terkini”, status persetujuan dan hasil uji di tiap bagian berlaku pada tanggal pencatatannya.

## Indeks riwayat

- [D-43–45](#d43-d45)
- [D-46–48](#d46-d48)
- [D-49–50](#d49-d50)
- [D-51–52](#d51-d52)
- [D-53–54](#d53-d54)
- [D-55–56](#d55-d56)
- [D-57–60](#d57-d60)
- [D-61–65](#d61-d65)
- [D-66](#d66)
- [D-67](#d67)
- [D-68](#d68)
- [D-69](#d69)
- [D-70](#d70)

<a id="d43-d45"></a>

## Review revisi Kasir Berrie

7 Oktober 2026 · proyek `appgprj_6ac54219b9248191bf551b9871d78958` · D-43–45. Revisi kode tersedia untuk review; visual belum disetujui. Pemilik kemudian meminta tidak mengambil/menampilkan screenshot tambahan, sehingga laporan berikut memakai pemeriksaan browser dan tes yang sudah dijalankan. Tidak ada deployment.

### Hasil yang diperiksa

| Bagian | Bukti aktual pada preview |
| --- | --- |
| Mulai melayani | Kas tertutup hanya mempunyai satu Buka kas; form kosong dan Rp0 diterima. Pelanggan baru muncul setelah kas berhasil dibuka |
| Tabel | Lima kolom tablet; A–Z berdasarkan tipe/nama/varian, stok 0 Habis/disabled, stok manual Tidak dihitung, saldo positif yang dinonaktifkan tetap alasan eksplisit. Filter kategori/promo bekerja |
| Promo SKU | Kopi Besar Rp20.000 diskon 10% menjadi Rp18.000. Tiga unit + Extra shot Rp5.000/unit: subtotal Rp75.000, promo Rp6.000, total Rp69.000. Topping tidak dipotong |
| Snapshot | Mengubah promo menjadi potongan Rp3.000 menghasilkan harga katalog Rp17.000; tagihan lama tetap Rp18.000/unit. Refresh draft eksplisit tersedia; tidak mengganti batch lama |
| Channel/metode | Default Toko saja. GoFood muncul setelah diaktifkan dengan akun outlet. Promo Toko tidak berpindah ke platform. Toko contoh memakai Tunai + QRIS; aktivasi baru hanya Tunai |
| Dua penyajian | SKU sama Bungkus dan Makan di tempat menjadi dua baris dalam satu tagihan; tidak ada opsi Campuran |
| Bayar dulu | Uang kosong/kurang ditolak; input bertahan. Total Rp69.000, uang Rp100.000, kembalian Rp31.000. Commit mengonfirmasi batch dan stok 10→7 sekali, tetap belum disajikan |
| Buat dulu | Stok berkurang ketika batch dikonfirmasi. Pembayaran QRIS atas batch lama membutuhkan verifikasi manusia dan tidak mengurangi stok lagi |
| Gangguan simpan | Gagal simpan mempertahankan input. Hasil belum diketahui menahan tindakan baru; Periksa hasil operasi yang sama menyelesaikan operasi sekali tanpa debit kedua |
| Struk | Default Pelanggan & dapur untuk batch baru; pratinjau dapur tanpa harga, pelanggan dengan harga/status. Saat membayar batch lama default Pelanggan saja |
| Cetak tambahan/salinan | Kiriman 2 bertanda TAMBAHAN dan hanya memuat item baru. Cetak ulang eksplisit SALINAN tidak mengubah uang/stok; konfirmasi kertas terpisah dari upaya cetak |
| Serah-terima | Sesi terbuka Maya→Rani mempertahankan kas seharusnya Rp105.000 dan histori ledger. Tidak membuka sesi baru/reset saldo |
| Nama/keranjang panjang | Nama menu panjang dan Rp98.765.432 tetap terbaca. Delapan baris dengan catatan berbeda memakai scroll isi; total dan kedua tindakan sah tetap terlihat pada 1024×768 |

Pembukaan/penutupan form bayar tidak memberi efek bisnis. Promo SKU + diskon order ditolak dengan alasan, tanpa membuang potongan/input diam-diam. Perubahan promo, refund dari alokasi asli dan pengembalian stok terpisah juga diperiksa lewat tes domain.

### Ukuran dan komponen

Browser diperiksa pada landscape 1024×768, portrait 768×1024, HP lebar 360/390 dan desktop 1280 px. Lebar dokumen sama dengan viewport: tidak ada scroll horizontal Kasir. Portrait/HP memakai tabel kolom prioritas; tipe dan promo bergabung dalam sel Menu. Pemeriksaan terakhir pada 360 px membuktikan dropdown kategori Minuman + Sedang promo menyisakan SKU promo yang benar.

Font DOM aktual: `-apple-system, system-ui, Segoe UI, sans-serif`; ukuran utama/input/tombol 16 px, bantuan 14 px, judul/total 24 px. Primer dan sekunder 48 px/radius kapsul, tombol ikon 44 px, input/dropdown 48 px/radius 12 px, segmented ≥44 px/radius 10 px dalam shell bertingkat. Fokus keyboard hitam 2 px diperiksa; Escape menutup dialog dan kontrol dapat dinavigasi. Ikon Lucide lokal memakai 20 px/stroke 1,75, chevron/spinner 16 px. Panel demo menyediakan review primer/sekunder/tersier/ikon, disabled/loading/error serta contoh modal/tabel/segmented.

Kontras WCAG dihitung dari pasangan warna kontrol yang dibaca pada DOM; bukan klaim semua keadaan sudah diaudit:

| Pasangan | Rasio |
| --- | --- |
| Hitam / putih | 21,00:1 |
| Hitam / cyan muda #D7F6F8 | 18,43:1 |
| Hitam / lavender #A49EDB | 8,49:1 |
| Teks #4B5563 / sekunder #F3F4F6 | 6,87:1 |
| Teks #4B5563 / loading #E5E7EB | 6,10:1 |
| Error #B91C1C / putih | 6,47:1 |
| Border #6B7280 / putih | 4,83:1 |

CSS reduced motion/transparency dan fallback putih solid tersedia. Preferensi tersebut belum diemulasi pada browser/perangkat nyata; zoom native 200% belum diperiksa. Bukti ini tidak meluluskan seluruh AC-109.

### Pemeriksaan kode

- `npm run typecheck`: lulus.
- `npm run lint`: lulus.
- `npm test`: 24 lulus, 0 gagal. Mencakup perhitungan integer/basis point, pembulatan/alokasi, promo per channel, snapshot, no stacking, pembayaran/stock rollback, retry idempoten, dua penyajian, batch tambahan, cetak/konfirmasi/SALINAN, refund nilai asli, return sekali, custody dan batas kasir aktif.
- Build dan packaging dijalankan melalui helper Sites sebelum sumber/versi disimpan; kegagalan menghentikan workflow. Identitas versi dan bukti simpan aktual dicatat pada bagian Penyimpanan versi di bawah.

AC-102–108 mempunyai bukti simulasi terpilih di tabel di atas dan tes domain. Migrasi/restore, replay tersimpan permanen, isolasi transaksi lintas tab, server/auth, printer fisik dan pengujian perangkat tetap belum dibuktikan. AC-101 membutuhkan persetujuan visual pemilik serta perbandingan aplikasi operasional kelak. UT-01–18 membutuhkan peserta sesuai spesifikasi dan belum dinyatakan lulus.

### Batas prototipe

Data contoh berada di memori dan hilang saat reload. Commit atomik menggunakan salinan state dalam simulasi, bukan transaksi IndexedDB/server. QRIS hanya pencatatan/verifikasi manual contoh. Cetak dan konfirmasi fisik disimulasikan tanpa koneksi printer. UI dan tes domain bukan bukti siap pilot/rilis. Stack produksi D-02–05 dan mockup lokal lama dipertahankan.

### Penyimpanan versi 1 — 7 Oktober 2026

Revisi Kasir berhasil disimpan sebagai **versi 1** pada proyek Sites yang sama. Tidak ada deployment (`deployment_id: null`). Sumber sudah dipush, build lokal dan packaging lulus sebelum penyimpanan.

- Versi: `appgprj_6ac54219b9248191bf551b9871d78958~appgver_9a818fdf488081918e4a3d0f9682509d`.
- Commit sumber: `cbd92da46bac2950d18f89909dc377e68e8e8a76`.
- Build: helper Sites `build-site.mjs`, exit 0. Vinext melaporkan build complete; klasifikasi route statis/dinamis masih Unknown pada starter, bukan kegagalan build.
- Archive: `/private/tmp/berrie-kasir-review.tar.gz`, 63 file, 2.129.920 byte; SHA-256 `77aa1dc9aa50e3ff021829a36a1563013d8c213aa980d5589e9b5757e80ac087`.
- Verifikasi: typecheck, lint, 24 tes domain lulus; pemeriksaan browser terpilih sesuai laporan review.

Visual menunggu review pemilik. Data masih contoh di memori, cetak/pembayaran bukan integrasi operasional. Tidak ada screenshot tambahan setelah pemilik meminta menghentikannya.

Bukti review dan batasnya berada pada bagian di atas.

Catatan ini membuktikan versi D-43–45 yang disimpan. D-46/D-47 masih arahan dokumentasi/prompt, belum UI; versi lokal setelah pembersihan file bukan versi 1 yang telah disimpan.

### Pemeriksaan sesudah pembersihan lokal — 7 Oktober 2026

Menghapus 49 komponen UI tanpa jalur import dari aplikasi, helper ID tanpa pemakai, tiga SVG placeholder dan dua file contoh D1; komponen terpakai/runtime/konfigurasi/dependensi tetap. Catatan README diringkas, bukti simpan versi 1 digabung ke laporan ini. Tidak mengubah app/page.tsx, app/globals.css, domain atau fixture.

Typecheck dan lint lulus; 24 tes domain lulus (0 gagal); build lokal selesai, git diff --check lulus. Browser/review visual tidak diulang; pemeriksaan ini tidak menerapkan D-46/D-47 atau meluluskan AC/UT baru. Perubahan masih lokal, tanpa commit/push/simpan versi baru atau deployment.


<a id="d46-d48"></a>

## Review revisi Kasir D-46–48

7 Oktober 2026 · proyek `appgprj_6ac54219b9248191bf551b9871d78958`. Revisi diterapkan untuk review, tanpa screenshot baru atau deployment. Visual belum disetujui. Review versi 1 tetap pada [REVIEW-KASIR.md](REVIEW-HISTORY.md#d43-d45).

### Perubahan dan hasil aktual

| Bagian | Bukti browser/tes |
| --- | --- |
| Font | Isi/input/tabel/tombol 14 px; Kasir 18 px, dialog 20 px, nominal Total 22 px. Nama/harga/subtotal regular; 600 hanya judul dan nominal total. Pemeriksaan DOM pada Kasir baseline menghasilkan teks 14/18 px, tanpa teks 16 px |
| Kepadatan tablet | 1024×768/default, fixture 21 SKU bernama pendek: **9 baris penuh** sebelum scroll. Area isi 431,91 px; baris sederhana 45 px termasuk divider, manual/dinonaktifkan 66 px karena alasan. Minimum 8 terpenuhi pada fixture ini; target 10 belum tercapai |
| Filter | Semua/Minuman/Makanan/Camilan/Sedang promo sejajar pada satu baris (baseline y=225). Minuman + promo menyisakan Kopi Besar dengan stok 10, diskon 10, harga 18.000 |
| Sel numerik D-48 | Semua sel stok/diskon/harga cocok pola angka/pemisah numerik atau kosong; tidak ada Rp/%/dash/slash/rentang. Header Diskon. Nilai diskon sesuai jenis owner; jenis dan harga dasar/efektif tersedia di detail. Stok manual kosong, alasan di Menu; bukan 0 palsu |
| SKU/varian | Kopi Besar dan Kecil menjadi baris bernama unik dengan stok/harga pasti. Kecil dinonaktifkan meski stok 20; alasan terlihat. Identitas SKU nyata tetap di item/keranjang/refund. Kode membedakan varian bernama identik |
| Alias | Input ! ditolak inline. ab disimpan sebagai AB; perubahan hanya tampilan. Tes batas domain menolak kosong/invalid/duplikat/tipe baru dan perubahan oleh staf |
| Keranjang | Penyajian dan identitas langsung terlihat; Batalkan/Catat refund/Koreksi terbuka. Pesanan baru menahan draft dengan Simpan dulu. Delapan baris Air Mineral berisi catatan berbeda total Rp40.000; area item 109 px/scroll 760 px; kedua aksi utama berakhir y=614, Simpan y=666, baris batal/refund/koreksi y=718, tetap dalam viewport 768 |
| Toggle kas | Membuka form Buka/Tutup kas sebagai button, bukan perubahan langsung. Batal membuka tidak mengubah kas tertutup; Rp0 diterima. Tutup kas menampilkan blocker unit belum diserahkan |
| Bayar dulu | Kopi Besar dua unit Rp36.000. Tunai Rp10.000 ditolak (kurang Rp26.000), input tetap; Rp40.000 diterima. Struk pelanggan/dapur menampilkan varian nyata; stok sekali, lunas bukan disajikan |
| Buat dulu | Air Mineral dikonfirmasi sebelum bayar; Struk pelanggan BELUM BAYAR. Pembayaran QRIS sesudahnya perlu verifikasi; default Struk Pelanggan saja, tidak debit batch lama lagi |
| Batal/refund/koreksi | Batalkan membuka unit/asalan/pemberitahuan dapur. Setelah satu Kopi Besar dibatalkan, pemilih refund hanya menawarkan unit tersebut dengan alokasi asli Rp18.000. Koreksi menawarkan jenis penyajian/metode/return terpisah dan disabled dengan alasan sesuai keadaan |
| Navigasi kiri | Expanded 136 px → rail 60 px. Lebar katalog 536,44 → 584,29 px; total Rp36.000 tetap. Tombol Buka/Ciutkan navigasi punya aria-expanded; Tab menuju Kasir dengan fokus hitam 2 px |
| Nama/angka panjang | Nama 80 karakter dan 98.765.432 tanpa pemotongan. Lebar dokumen sama dengan viewport pada 390, portrait 768, desktop 1280; angka tabel tetap numerik |
| Tema/reflow | Terang dan gelap diperiksa. Surface gelap aktual rgb(28,34,36), teks rgb(245,247,248). HP 360 px tetap tanpa scroll horizontal. Teks review 200% menjadi 28 px pada input/menu, tidak overflow pada 360/1024 dan dua panel reflow vertikal. Kertas Struk tetap putih/hitam |

Navigasi tetap sama; tidak membangun ulang layar lain. Pembersihan starter yang sudah ada sebelum tugas dipertahankan. Font sistem lokal dan Lucide tetap dependensi terkunci; tidak memasang paket/HIG/MCP baru.

### Validasi dan batas

`npm run typecheck`, `npm run lint` dan `npm test` lulus; **31 tes, 0 gagal**. Regresi tambahan memeriksa alias pada batas domain, preservasi katalog/histori, SKU unik, filter SKU nyata, sel numerik dan stok manual. Tes lama promo/perhitungan integer, snapshot/alokasi/refund, idempotensi, rollback pembayaran/stok, batch tambahan dan SALINAN tetap lulus.

Build lokal dan packaging melalui helper Sites lulus. Penyimpanan sempat tertahan oleh Sites project not found; akses proyek yang sama kemudian pulih pada 7 Oktober 2026. Kode lokal dipertahankan, proyek tidak diganti. Identitas versi/commit dan hasil penyimpanan yang dikonfirmasi layanan dicatat pada [Penyimpanan versi 2](#penyimpanan-versi-2). Tanpa deployment.

Kontras menggunakan token semantik D-46. Contoh pasangan aktual: terang hitam/putih 21:1, teks sekunder #4B5563/putih 7,56:1; gelap #F5F7F8/#1C2224 14,99:1 dan #C0CBD0/#1C2224 9,74:1 (dibulatkan, dihitung dari sRGB). Belum audit semua backdrop/hover/pressed/perangkat. CSS reduced motion/transparency, prefers-contrast dan forced-colors tersedia dengan fallback solid/system colors, tetapi belum diemulasi sebagai preferensi OS. Panel review menunjukkan komponen/state untuk pemeriksaan lanjutan.

Teks 200% diuji melalui kontrol review yang mengubah root, **bukan klaim zoom browser native 200% atau Dynamic Type**. Browser tersedia belum menyediakan emulasi media/zoom native; Safari/iPhone fisik, keyboard layar dan autozoom input 14 px belum diuji. Zoom tidak dinonaktifkan. Pembaca layar/perangkat nyata juga belum menjadi bukti.

AC-74/75/96/101/106/109/110/111 mempunyai bukti prototipe terpilih di atas, tidak otomatis lulus penuh. AC domain punya regresi simulasi, bukan bukti penyimpanan IndexedDB/isolasi antar-tab/server/offline/migrasi/restore/printer fisik. UT-01–18 tetap membutuhkan peserta. Data bisnis di memori dan hilang saat reload; pembayaran/printing adalah simulasi. Tidak menyatakan siap pilot, native Apple atau desain disetujui.

### Penyimpanan versi 2

7 Oktober 2026 · [Berrie · Prototipe Kasir](sites-project://appgprj_6ac54219b9248191bf551b9871d78958). Revisi D-46–48 berhasil disimpan sebagai **versi 2**, tanpa deployment. Akses proyek yang sempat mengembalikan project not found sudah pulih; proyek yang sama dipertahankan.

- Versi: `appgprj_6ac54219b9248191bf551b9871d78958~appgver_15f6470accd48191bdd1ff92a969fd49`
- Sumber ter-push: `11be9656cd0e07a7323490260a03203afe1f8fb2`
- Arsip terkonfirmasi layanan: 60 file, 1.945.600 byte, SHA-256 `025ca1c727eb33ba9b9e3ffd34b9d43da8c3b959186c334cc9e699e6fc157eb8`.
- Hasil save: version_number=2, deployment_id=null. Pemeriksaan ulang proyek: latest_version_number=2, current_live_url=null.
- 31 tes/typecheck/lint sebelumnya lulus; build dan packaging terbaru lulus. Tidak membuat screenshot baru.

Visual belum disetujui; bukan aplikasi operasional. Versi 1 sebelumnya bersumber `cbd92da46bac2950d18f89909dc377e68e8e8a76`; [bukti versi 1](REVIEW-HISTORY.md#d43-d45). Catatan ini mempertahankan hasil penyimpanan yang sudah dikonfirmasi, bukan pemeriksaan layanan baru saat perapihan dokumen.


<a id="d49-d50"></a>

## Review penerapan Kasir D-49/D-50

7 Oktober 2026 · proyek [Berrie · Prototipe Kasir](sites-project://appgprj_6ac54219b9248191bf551b9871d78958). Token aktif pada [design system](../DESIGN-SYSTEM.md). Review versi [1](REVIEW-HISTORY.md#d43-d45)/[2](REVIEW-HISTORY.md#d46-d48) tetap historis. Revisi ini belum disetujui secara visual; disimpan tanpa deployment. Tidak membuat screenshot baru.

### Penerapan

- Page #F5F5F7; sidebar grouped 200 px, rail 64 px, label 14/500 utuh, selected ringan dengan indikator dan aria-current. Katalog/keranjang radius 16 px tanpa shadow dasar.
- D-50 mengganti permukaan putih terang dengan gradient bubblegum horizontal opaque: #E8E7F5 0%, #DEF3F7 50%, #DEF5F6 60%, #E6F6E4 100%. Warna disampel dari gambar pemilik, bukan deklarasi CSS situs referensi. Fallback #DEF3F7; selected navigasi/filter/segmen tetap cyan #61DCE2 sesuai instruksi terakhir. Tema gelap tetap; kertas putih/hitam.
- Skala 14/18/20/22 menurut peran; nama/harga regular, total 600. Apple system font pada stack Apple, Inter variable WOFF2 dan OFL dibundel di public/fonts, fallback sistem. Tidak mengambil font dari CDN saat membuka Kasir.
- Form, segmented 16/12 px, kategori, status, focus dan overlay mengikuti token. Search/channel sejajar. Stepper qty dengan tombol 44 px; catatan item/pesanan memakai textarea. Kontrol bersama terpisah dari domain; operasi dan rumus domain tidak diubah.
- Panel review terpisah menunjukkan tombol/icon/aksi mengambang, field/select/textarea/checkbox/radio/toggle/stepper, segmented/chip/tag/badge, navigation/table, empty/feedback/error/loading/hasil belum diketahui, dialog/sheet, popover lewat select, serta contoh material dan fallback. Panel tidak menjalankan transaksi.

### Bukti browser terpilih

Browser in-app pada macOS, localhost yang sama, viewport dikontrol dalam CSS px. Pemeriksaan DOM/computed styles dan interaksi; bukan foto perangkat nyata.

| Pemeriksaan | Hasil aktual |
| --- | --- |
| Tablet 1024×768/default | Fixture 21 SKU: **8 baris penuh**, area scroll katalog 462 px, header sekitar 36,52 px. Baris pendek 45 px termasuk divider; alasan/nama panjang tumbuh. Semua/Minuman/Makanan/Camilan/Sedang promo sejajar. Minimum 8 terpenuhi pada fixture ini; ideal 10 belum tercapai |
| Navigasi | Expanded 200 px, rail 64 px; label Pengaturan/Menu & Stok satu baris. Ciut/buka mempertahankan draft Rp36.000. Nama aksesibel/aria-expanded, selected aria-current tersedia |
| Font/render | Stack computed `-apple-system, system-ui (BlinkMacSystemFont), Inter, Segoe UI, sans-serif` pada host Apple. Item/input 14 px/400, navigasi 14 px/500; ukuran lain mengikuti token. Identitas face native persis dan render Inter pada OS non-Apple belum dapat dibuktikan dari API browser yang tersedia |
| Keranjang | Dua Kopi Besar, identitas 12 / Rani, total Rp36.000. Dua urutan + Simpan dulu terlihat; grup aksi 108,03 px, batas akhir aksi transaksi y=711 pada viewport 768. Daftar item scroll terpisah. Refund/batal/koreksi tetap langsung tersedia sesuai kondisi |
| Bayar dulu | Dua Kopi Besar, promo Rp4.000, total Rp36.000. Tunai Rp10.000 ditolak dengan kurang Rp26.000; input 10.000 bertahan. Rp40.000 diterima, Struk pelanggan/dapur muncul; stok 10→8 sekali. Lunas dan belum diserahkan tetap terpisah |
| Gagal simpan | Simpan dulu saat gangguan: error spesifik, identitas 12 / Rani dan total Rp36.000 bertahan; stok tetap 10. Sesudah form aksi dirapatkan, batas akhir tindakan y≈752,98, tetap di viewport 768. Tidak mengaku uang/stok tersimpan |
| Tema | Terang surface #DEF3F7 + computed gradient empat stop, selected #61DCE2. Gelap surface #1C1C1E, teks #F5F5F7, selected #163538 / label #C3F5F7. Kertas tetap putih/hitam |
| HP/reflow | Lebar dokumen sama viewport 360 dan 390; pemicu Keranjang berlabel menampilkan qty/total. Keranjang HP satu kolom. Portrait 768×1024 dan desktop 1280 juga tanpa overflow horizontal pada fixture yang diperiksa |
| Nama/angka panjang | Nama 80 karakter dan 98.765.432 tersedia di tabel, membungkus tanpa pemotongan. Fixture long diuji 390/768/1280 |
| Teks 200% | Kontrol review menaikkan root: input 28 px, tanpa overflow horizontal pada 360 dan 1024; panel reflow. Ini pembesaran teks, bukan bukti zoom browser native/Dynamic Type |
| Keyboard | Tab memberi ring 2 px #166E73; dialog memakai primitive yang sama dan close berlabel. Audit keyboard/pembaca layar penuh belum selesai |

Bukti checkout/teks 200%/fixture panjang dilakukan sebelum perubahan terakhir yang hanya mengganti paint warna; geometry/controls sama. Surface gradient dan cyan aktif serta overflow HP 360 diverifikasi ulang sesudah paint final. Tidak mengklaim seluruh pasangan state/media sudah diuji.

### Kontras

sRGB pada warna computed/token solid. Gradient opaque diuji sepanjang interpolasi stop; minimum terjadi di lavender #E8E7F5 untuk pasangan berikut. Primary #1D1D1F 13,769:1; secondary #616166 5,038:1; tertiary baru #68686D 4,534:1; border #85858A 3,004:1; focus #166E73 4,892:1. Tertiary lama #6E6E73 tidak cukup pada bubblegum dan diganti. Primary/selected cyan 10,293:1; tombol primer putih/hitam 21:1. Marker/atribut selected tetap, tidak hanya warna.

Nilai tersebut tidak meluluskan seluruh state/backdrop/media. Reduced motion/transparency, increased contrast dan forced colors punya CSS fallback, belum diemulasi sebagai preferensi OS. Native zoom 200%, Safari/iPhone/autozoom/keyboard layar, pembaca layar, font fallback gagal dan font offline/PWA pada perangkat non-Apple belum diuji.

### Pemeriksaan dan batas

31 tes domain, typecheck, lint, build lokal dan packaging diperiksa pada sumber akhir sebelum simpan; hasil layanan/identitas versi dicatat setelah terkonfirmasi. Tes domain mencakup promo/alokasi/refund integer, snapshot, rollback pembayaran/stok, replay idempoten, batch tambahan, izin simulasi, serah-terima dan SALINAN. Kode domain tidak berubah dalam revisi ini.

AC-101/106/107/109–112 dan UT-01–18 dipetakan ke bukti prototipe terpilih; tidak lulus penuh. Domain/storage/lock IndexedDB, API/server/offline/backup/restore, keamanan, printer fisik, UT peserta dan pilot tetap belum dibuktikan. Data contoh di memori, hilang saat reload. Layar selain Kasir belum direview ulang lengkap walau token bersama ikut dipakai.


<a id="d51-d52"></a>

## Review Kasir — D-51/D-52

7 Oktober 2026 · proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958` · revisi berikut versi 3, disimpan tanpa deployment. Identitas hasil simpan layanan dicatat pada [tasks](../tasks.md). [Design system aktif](../DESIGN-SYSTEM.md) dan [spesifikasi](../specs/README.md) tetap acuan; ini bukti prototipe, bukan aturan tambahan.

### Perubahan

- Semua/Habis/Promo tetap, kategori owner dari Pengaturan, tepat satu pilihan aktif. Stok 0 hanya Habis dan disabled; SKU inactive/arsip tidak muncul di Menu hari ini.
- Keranjang tanpa pemilih penyajian duplikat. Dialog item menetapkan Bungkus/Makan di tempat. Reguler bawaan tunggal disembunyikan; varian/kode nyata tetap membedakan SKU. Catatan item terlihat berlabel sejak draft.
- Diskon order/Catatan sejajar dengan ikon, fill dan border; Simpan dulu juga jelas sebagai button. Bayar nanti/Bayar diperpendek, bantuan menyatakan Bayar nanti langsung meminta dibuat.
- Refund, koreksi dan penyajian hanya pada detail Pesanan/Riwayat; draft diedit dengan tap item. Setelah settlement di Kasir berhasil, keranjang baru kosong. Struk mengacu order/batch asal; pembayaran tidak berarti disajikan.
- Seluruh SKU wajib stok integer ≥0. Form baru/aktivasi memerlukan angka, CSV hanya quantity dan stok awal baru wajib. Contoh Es Teh 1000; existing CSV tidak mengubah saldo. Legacy tanpa saldo ditahan dari Kasir dan commit, diperbaiki lewat hitungan awal admin berjejak; tidak berubah menjadi 0 diam-diam. Status jual terpisah dari saldo, seluruh penjualan baru mendebit sekali.

### Bukti lokal

`npm run test`: 38 lulus, 0 gagal. Termasuk agregasi stok, rollback seluruh settlement/batch/ledger, replay, bayar batch lama, return terpisah, uang/alokasi/promo, stok baru/CSV wajib, perbaikan legacy, hitungan 1000→998 dan retry, kategori reserved/duplikat. Typecheck dan lint lulus. Build/arsip dan identitas versi final dicatat pada tasks setelah workflow selesai.

Browser DOM/computed pada localhost, tanpa screenshot baru:

- Tablet 1024×768: Semua 19 SKU dapat dijual, 20 aktif termasuk satu Habis; 10 baris menu pendek terlihat penuh sebelum scroll. Lebar dokumen 1024. Gradient lavender→pale cyan→mint dan selected cyan #61DCE2 dipertahankan.
- Promo→Minuman menghasilkan satu aria-pressed aktif; Habis hanya Kentang Goreng 0/disabled. Kecil inactive tidak ada di filter Kasir, tetap terlihat dengan saldo 20 dan Jual kembali di Menu & Stok.
- Pengaturan menolak kategori Promo, daftar kosong menyisakan Semua/Habis/Promo; tambahan Spesial muncul. Mengubah daftar tidak menghapus SKU.
- Form Menu baru stok kosong ditolak dengan input tetap; 1000 berhasil dan tampil pada pengelolaan.
- Pisang Goreng Makan di tempat + Cokelat Bungkus/catatan less ice pada draft: tanpa Reguler generik, tanpa serving control keranjang, catatan terlihat sebelum bayar; total Rp32.000. Bayar Rp50.000 memberi struk order asal, keranjang 0; penyajian dilakukan dari Pesanan.
- Puding Bayar nanti mengonfirmasi batch/debit sekali, tetap belum bayar; tanpa refund/koreksi/serve pada Kasir. Bayar masih tersedia dan pengelolaan lewat Lihat di Pesanan.
- Es Teh catatan less ice, bayar Rp10.000/total Rp5.000, simulasi hasil belum diketahui: catatan dan uang input 10.000 tetap; periksa operasi sama menghasilkan struk order 0001 dan keranjang kosong, stok 1000→999 sekali.
- Baseline 360×800: lebar dokumen 360, filter select. Teks review 200% pada tablet: item font 28 px, lebar dokumen tetap 1024, alur tumbuh vertikal. Preview final kembali 1024×768/100%, data contoh direset, kas terbuka.

### Batas

Pemetaan AC-101/106/108/109–115 dan UT-01/02/03/05/10/17/18 adalah bukti terpilih prototipe. Belum seluruh AC lulus, belum UT peserta, belum pilot. State hanya memori; legacy diuji pada domain fixture, bukan migrasi IndexedDB produksi. Auth/izin server, sinkron, printer fisik, perpindahan uang, backup/restore nyata dan browser/perangkat lain belum dibuktikan. Mockup lama tidak diubah, tanpa deployment.


<a id="d53-d54"></a>

## Review Kasir/Pesanan/Riwayat — D-53/D-54

8 Oktober 2026 · proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958` · revisi setelah versi 4, tanpa deployment. [Design system](../DESIGN-SYSTEM.md) dan [spesifikasi](../specs/README.md) menjadi acuan; identitas versi setelah penyimpanan dicatat di [tasks](../tasks.md).

### Perubahan

- Panel transaksi putih sejuk solid #FCFCFD, tanpa bubblegum/gradient. Cyan pilihan aktif #61DCE2 tetap; font/spacing/shape D-49 tetap.
- Kasir: tanpa Lihat di Pesanan/helper Bayar nanti. No. antrean / nama tetap opsional, Beri diskon, header Stok/Harga. Bayar dan Struk full-width sejajar setelah konfirmasi.
- Sebelum bayar, modal Struk memilih Dapur saja; pelanggan/keduanya disabled, tanpa bagikan pelanggan. Domain menolak cetak pelanggan pada seluruh tahap sebelum settlement. Bayar batch lama tidak mendebit/cetak dapur kedua otomatis.
- Pesanan: Semua/Tersimpan/Lunas/Belum bayar, tanpa filter Refund tertunda. Nomor/nama teks biasa, tombol Buka rincian pada kolom tersendiri. Detail mempertahankan nomor/nama dan kembali ke daftar asal.
- Riwayat hanya settlement dengan seluruh pekerjaan selesai dan due 0. Pesanan belum bayar/lunas belum diserahkan tidak masuk. Refund selesai tetap histori; cancel sebelum payment tetap dalam data/audit tetapi tidak menjadi transaksi selesai. Tanpa 0 belum disajikan/diserahkan; search dan grup tanggal/metode berjarak 16 px, antarfield 16 px. State metode/tanggal Riwayat terpisah dari filter Pesanan.
- Pemicu Refund untuk unit paid requested/served/cancelled; submit Catat refund disabled sebelum uang dikembalikan. Requested memerlukan dapur diberi tahu, cancellation dan refund atomik. Alasan refund wajib, tanpa alasan metode berbeda tambahan; metode aktual/unit/sesi terjejak. Refund lintas sesi masuk kas kini, settlement dan sesi asal tetap. Approval disiapkan sebelum uang melalui pemicu tersendiri; bukan hasil refund. Due pembatalan terpisah tetap aktif dan blocker kas.
- Root localhost memakai iframe viewport 1024×768 termasuk dialog; jendela desktop lebih lebar tidak memperbesar UI. `?workspace=responsive` membuka UI langsung untuk pemeriksaan responsif; hosted tetap responsif.

### Bukti aktual

Tes domain/katalog/filter: 43 lulus, 0 gagal. Regresi menolak cetak pelanggan sebelum bayar, dapur/bayar tanpa debit kedua, membedakan active/completed, refund dengan metode berbeda tanpa alasan tambahan, audit metode/unit, refund requested atomik memerlukan dapur+uang, rollback/idempotensi, dan refund histori sesi lama pada kas kini. Typecheck/lint/build dan pemeriksaan dokumentasi dicatat final di tasks.

Browser DOM/computed pada localhost:

- Viewport iframe 1024×768; 9 baris menu penuh sebelum scroll pada hasil akhir (≥8, target ideal 10 belum tercapai). Surface rgb(252,252,253), background-image none, seleksi rgb(97,220,226).
- Air Mineral Bayar nanti stok 18→17; modal default Dapur saja, opsi Pelanggan & dapur/Pelanggan saja disabled. Tanpa share pelanggan. Setelah dialog ditutup, Bayar dan Struk masing-masing x=700, width=296, height=48.
- Order belum bayar tidak masuk Riwayat, Refund disabled. Sesudah bayar Rp5.000 tetap tidak di Riwayat sebelum penyajian; muncul pada filter Lunas di Pesanan. Tidak ada filter Refund tertunda, Buka rincian membuka detail.
- Refund requested: unit dipilih + alasan + dapur masih disabled sebelum uang; setelah uang dicentang enabled. Commit menghasilkan Dibatalkan/Lunas · Refund penuh pada Riwayat, Pesanan aktif 0.
- Pisang Rp12.000 lunas tetap Pesanan; sesudah Tandai disajikan/diserahkan masuk Riwayat. Refund dari Riwayat dengan metode QRIS berbeda dari Tunai tidak mempunyai field alasan metode berbeda; tanpa konfirmasi uang disabled, setelah dikonfirmasi tersimpan dan tetap di Riwayat.
- Riwayat search→filter gap 16 px, antarfield 16 px, tidak ada metadata 0 belum disajikan.

### Batas

Pemetaan AC-101/108/109–117 dan UT-04/07/09/11 adalah bukti prototipe terpilih, bukan kelulusan penuh. Input kalender native tidak dapat diisi melalui otomasi browser sesi ini; perilaku filter tanggal belum dibuktikan melalui UI. Tidak ada tes browser script baru. State di memori, belum IndexedDB/API/izin server/backup/restore/perpindahan uang nyata/printer fisik/UT peserta/pilot. Checkbox adalah pernyataan kasir, bukan verifikasi rekening otomatis. Keputusan visual pemilik masih belum dicatat. Tidak mengubah akses atau melakukan deployment.


<a id="d55-d56"></a>

## Review Kasir/Pesanan/Menu & Stok — D-55/D-56

8 Oktober 2026 · proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958` · revisi setelah versi 5, tanpa deployment. [Design system](../DESIGN-SYSTEM.md), [indeks](../specs/README.md) dan [tasks](../tasks.md) memuat keputusan/status/identitas penyimpanan layanan.

### Hasil implementasi

- Nama toko satu kali di bawah brand; tanpa duplikasi di topbar seluruh tab.
- Keranjang solid lavender-soft #E8E7F6, katalog #FCFCFD; tema gelap memakai grouped. Beri diskon/Catatan lebar isi dengan target ≥44. Bayar hitam, Bayar nanti abu-abu. Tidak ada Pesanan baru di Kasir, baik kosong maupun berisi; detail tetap menawarkan order baru dan draft tidak dibuang.
- No. antrean / nama (wajib), domain menolak blank/whitespace sebelum save/process/settle tanpa efek uang/stok/batch. Nama dan penyajian berada dalam target edit yang sama untuk menghemat tinggi tanpa mengurangi hit area.
- Pesanan Semua/Lunas/Belum bayar/Tersimpan, default Lunas; kolom Pelanggan/Status/Keuangan/Rincian tanpa Total. Requested = Belum disajikan, draft tetap jujur. Detail mempertahankan total dan empat item pendek; copy Belum diserahkan/Sudah diserahkan dengan danger/positive.
- Modal Penyajian: Pilih item yang sudah disajikan atau diserahkan, kolom Pilih item/Penyajian, Pilih semua, tanpa Nilai asal. Refund tetap mempertahankan nilai alokasi asal yang diperlukan.
- MenuEditor satu form: Tipe kiri/Kode unik read-only kanan, default Normal/Paket/Promo/custom; alias N/P/PR, collision otomatis 2–3 karakter. Kode SKU otomatis unik alias-sequence, kode lama stabil. Tipe hanyalah label, bukan bundle/promo otomatis. Kategori dropdown dari Pengaturan; harga platform hanya channel aktif dan wajib eksplisit.
- Pilihan ukuran/rasa flat 1–30 baris berisi nama/harga/stok, topping opsional existing/baru dengan harga tambahan. Seluruh SKU/topping/setting/opening/audit satu commit dan idempoten; invalid baris akhir rollback seluruhnya. Saldo existing tetap melalui Tambah/Koreksi stok; harga tersembunyi tidak ditimpa.
- Total stok (wajib), Stok Minimal, copy Peringatan muncul saat stok mencapai angka ini atau lebih rendah. Stok rendah membuka daftar per SKU ≤threshold; toast sesudah crossing committed, bukan setiap render atau draft. Bukan push/WA/email/integrasi platform.

### Bukti terpilih aktual

Browser in-app localhost, iframe 1024×768/default:

- Computed workspace width/scrollWidth 1024/1024. Katalog rgb(252,252,253), keranjang rgb(232,231,246). Nama toko tunggal di sidebar, judul Kasir tanpa toko.
- Keranjang Air Mineral/Americano/Ayam Bakar/Cappuccino: empat baris penuh, masing-masing 53 px dalam area 274,05 px. Target edit/hapus ≥44 px. Total Rp75.000. Antrean blank pada Bayar nanti ditolak; item tetap. Setelah 12 / Rani, Simpan pembayaran Rp75.000 membuka Struk dan composer kosong.
- Pesanan default Lunas; tabel baru tanpa Total, Belum disajikan/Lunas. Detail empat baris penuh, masing-masing 57 px dalam area 239,45 px. Modal penyajian baru hanya dua kolom; memilih satu item berhasil tanpa perubahan tagihan. Sudah diserahkan computed text/fill rgb(36,99,51)/rgb(226,246,226); belum rgb(166,27,37)/rgb(255,240,241).
- Form tiga ukuran Kopi Uji: Regular 15.000/stok10, Medium 20.000/stok8, Large 25.000/stok6, satu topping Cokelat 3.000; Simpan menu menghasilkan N-001/N-002/N-003. Kasir tap Medium + Cokelat menghasilkan Rp23.000, tanpa langkah pemilih ukuran tambahan.
- + Tambah tipe → Premium menghasilkan kode read-only PRE dan SKU PRE-001, tabel Kasir PRE/Kopi Spesial Uji. Konfirmasi stok 6→5 memunculkan toast Stok rendah dan daftar threshold 5. Blank tipe/varian/duplikat/rollback juga diuji domain.
- Tanpa platform aktif: semua field harga platform absen. Setelah owner mengaktifkan GoFood dengan akun contoh: Harga GoFood muncul, GrabFood/ShopeeFood tetap absen. Harga channel belum diisi tidak memakai fallback dan tidak dapat dijual.
- Katalog default memperlihatkan 9 baris penuh sebelum scroll, target ≥8 terpenuhi pada fixture terpilih, ideal 10 belum tercapai.

Typecheck, lint dan 51 tes domain/katalog/filter lulus. Tes mencakup identitas wajib rollback, varian+topping atomik/idempotensi, tipe collision, harga channel eksplisit/preservasi, threshold, serta regresi uang/promo/refund/cetak/stock return. Build/packaging dan identitas simpan final dicatat pada tasks setelah workflow selesai. Tidak ada script test:browser.

### Batas bukti

Empat item terbukti pada nama pendek/default, bukan janji empat nama/catatan panjang selalu muat; konten panjang membungkus dan bergulir. Review terang tablet terpilih, belum pemeriksaan penuh HP/zoom/keyboard layar/forced colors/tema gelap. Interaksi checkbox ukuran melalui label digunakan karena otomasi tombol checkbox gagal menarget koordinat; label berhasil dan hasil form dibuktikan. Tidak menganggap ini hasil UT peserta.

Pemetaan AC-101/109–121 dan UT-01/02/03/04/07/10/17/18 adalah bukti prototipe terpilih, bukan kelulusan penuh. Data di memori, reload kembali fixture; belum IndexedDB/API/approval server/backup/restore/printer fisik/push/perpindahan uang nyata. Label Paket/Promo bukan dukungan bundle/discount otomatis. Tidak mengubah akses, tidak deployment, belum persetujuan visual/pilot.


<a id="d57-d60"></a>

## Review prototipe Menu & Stok — D-57–60

8 Oktober 2026. Proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`. Revisi lokal dari versi 6, tanpa deployment. Identitas simpan layanan dicatat pada tasks root setelah konfirmasi.

### Perubahan

Menu berupa tabel langsung dengan satu pilihan rasa/ukuran per baris, dropdown, tempel TSV, duplikat, kategori/harga banyak baris, filter sel salah dan satu simpan. Lima baris per halaman; nama/checkbox tetap saat scroll horizontal. Topping/Rincian tombol teks tanpa pill. Harga channel tambahan hanya ketika channel aktif; tidak ada fallback untuk harga yang belum diisi. Form detail lama tetap menyediakan promo dan tindakan terpisah.

Satu saldo awal/minimal grup menu dipakai seluruh rasa/ukuran. Tiga Milkshake contoh = Coklat/Pisang/Vanilla dengan harga 15.000/15.000/18.000 dan satu saldo 50. Checkout menghitung total kebutuhan semua pilihan sebelum debit; cancel/return memakai grup asal, ledger dan idempotensi. Nilai stock per SKU dalam prototipe hanya cache yang diperbarui serentak; produksi memerlukan StockGroup dan ledger tunggal.

Racikan Es/Gula gratis dengan default Normal, pilihan Less ice/Less sugar/Tanpa es/Tanpa gula; custom kelompok/pilihan. Snapshot pilihan dan definisi disimpan pada unit agar edit katalog tidak mengubah draft lama. Pilihan terlihat di keranjang dan preview struk/dapur. Topping tetap opsi gratis/berbayar per unit; tanpa double/triple/BOGO/paket komponen.

Tab Stok menyediakan perubahan beberapa menu dan keterangan per baris. Rekap online hanya jumlah pemakaian per menu sesudah antrean, cutoff periode berurutan dan histori; tidak membuat pesanan/omzet/kas. Konfirmasi mengecualikan pesanan yang sudah dicatat. Owner mengaktifkan pengingat header/tutup kas; pengingat bukan blocker penutupan baru. Saldo belum realtime sebelum rekap.

### Bukti lokal

- Preview root memakai iframe workspace 1024×768. Tabel Menu menampilkan tepat lima baris, tinggi terukur 64,5–65 px; input/select/tombol teks 56 px. Kelima baris default terlihat penuh. Topping/Rincian computed border-radius 0 px/background transparan. Screenshot `/private/tmp/berrie-menu-five-rows.jpg`, bukan thumbnail deployment.
- Browser: harga Es Kopi Susu Besar diisi −1, filter otomatis menunjukkan sel salah dengan petunjuk; tabel tidak disimpan. Setelah diperbaiki 21.000, pindah Stok→Menu mempertahankan input, kemudian simpan berhasil. Tiga rasa Milkshake tampil terpisah.
- Browser: pengingat rekap diaktifkan, waktu akhir diisi, pemakaian Milkshake8 disimpan; saldo bersama50→42 dan histori1. Uji domain memastikan orders/cash/payouts tidak berubah.
- Browser: kas dibuka dengan saldo0, Es Kopi Susu Besar dipilih Less ice/Less sugar; keranjang menunjukkan dua racikan dan harga promo18.000. Tidak mencetak ke printer fisik.
- Suite 64 tes domain/katalog: seluruhnya lulus sebelum pemeriksaan akhir. Termasuk rollback tabel/rekap/stok, satu pembukaan stok tiga rasa, kebutuhan gabungan sebelum pembayaran, return, snapshot racikan, retry/duplikasi periode, zero recap, izin/HP/writer/expiry, CSV mempertahankan grup dan satu opening menu multi-varian, batas30 pilihan atomik.

Typecheck/lint lulus setelah perbaikan pilihan racikan; pemeriksaan akhir dan build dilakukan oleh workflow sebelum simpan. Hasil final aktual dicatat pada tasks.

### Batas bukti

AC-122–126 punya bukti prototipe terpilih; bukan kelulusan AC produksi atau UT-19–21 peserta. Belum IndexedDB, API/server authorization, locking antar-tab nyata, migrasi/restore, backup, platform sync, integrasi revenue atau uji performa/perangkat/printer. Data hanya memori dan hilang saat reload. Paste clipboard/bulk/custom lengkap belum diuji lewat browser; domain dan kontrolnya tidak membuktikan kemudahan owner tanpa UT.


<a id="d61-d65"></a>

## Review prototipe — Menu, Stok dan Kas D-61–65

8 Oktober 2026. Proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`, checkout lokal `berrie-site/`. Sumber sebelumnya versi7, tanpa deployment. Identitas versi hasil revisi dan hasil build/arsip dicatat sesudah konfirmasi layanan pada [tasks](../tasks.md); simpan versi tidak memublikasikan situs.

### Cakupan yang diterapkan

- + Menu menggantikan Tambah baris. Tabel lima kombinasi per halaman, area minimum378px, row minimum64/input56; tidak menyusut ketika stok awal/error muncul. Stok awal hanya untuk menu baru; input menu/harga jelas. Kolom variabel mengikuti menu di halaman/pencarian, nama/checkbox sticky saat scroll horizontal.
- + Variabel pada menu membuka nama/nilai langsung, pilihan tunggal/beberapa, harga per kombinasi atau gratis; kosong `-`. + Variabel lagi dan + Kombinasi tersedia dalam editor. Kasir hanya melihat variabel menu itu; multi Keju+Jamur mengikuti harga kombinasi tersimpan. Data racikan/topping lama tetap dapat dibaca, snapshot pesanan tetap.
- Stok memiliki Isi stok (tambahan) dan Stok opname (hasil fisik), saldo tercatat read-only, hasil/selisih dan keterangan wajib. Draft kedua kegiatan terpisah. Stok minimal berupa input owner, tanpa mengubah saldo.
- Rekap online tanggal/jam sampai menit, input Jumlah terpakai online berbatas nyata. Histori Koreksi mengikuti Koreksi stok/default approval owner. Catatan asal/rentang/checkpoint tidak ditimpa; stok berubah dengan delta revisi terakhir, bukan mengurangi jumlah baru lagi. Rincian asal/koreksi dapat dibaca.
- Kas menampilkan rincian uang seharusnya dan Pergerakan uang laci dengan Uang masuk/keluar selama berjualan. Selesai bertugas terpisah: petugas sama langsung bereskan/hitung/tutup, ganti petugas hitung/autentikasi/konfirmasi/serah-terima dan teruskan sesi yang sama. Langkah akhir tersedia sesudah hitungan sesuai tujuan disimpan; cancel mempertahankan jejak hitungan dan melepaskan penghentian layanan.
- Tidak ada impor CSV/Excel pada UI tahap ini. Parser/tes kompatibilitas CSV lama dipertahankan; bulk harga/kategori dan pengisian sel tetap. Urutan paste multiline lama yang mengunci Rasa/Ukuran dipensiunkan bersama kolom tetap.

### Pemeriksaan aktual

TypeScript strict, lint dan **75/75 tes domain** lulus, termasuk kombinasi multi/kanonis, snapshot harga/definisi/default gratis, blank/no variable, validasi/rollback tabel, stok tambahan/opname/minimal, koreksi delta/revisi/stale/izin/approval owner/idempotensi, hitungan sesuai tujuan, blocker, cancel dan selisih beberapa segmen. Regresi pembayaran/promo/refund/debit stok/cetak ulang lama tetap lulus. `git diff --check` lulus. Build/packaging hasil sumber ini diverifikasi workflow penyimpanan; hasil akhirnya tercatat pada tasks. Tidak ada script test:browser; pemeriksaan berikut memakai preview browser langsung.

Browser localhost dengan iframe1024×768:

1. + Menu berpindah ke halaman terakhir dan fokus nama; Pizza baru Rp25.000/stok20 berhasil disimpan. Lima row terukur64,5–65px, input56px; tabel378px. Saat row baru memiliki error nama/harga, row tumbuh114,5px dan area425px, tidak menyusut. Screenshot final `/private/tmp/berrie-menu-d61-d65.jpg`.
2. Pizza tanpa variabel di Kasir tidak menampilkan Ukuran/Gula/Topping. Setelah owner menambahkan Topping multi Keju/Jamur, kombinasi kosong Rp25.000 dan Keju+Jamur Rp30.000 tersimpan. Memilih keduanya pada dialog item menampilkan totalRp30.000. Kombinasi yang belum mempunyai harga ditahan; harga tidak dijumlah dari opsi.
3. Es Teh1000 + Isi stok10 menghasilkan1010; opname fisik999 menghasilkan999 (selisih−11). Field stok minimal7 dapat disimpan. Rekap8 menghasilkan991; Koreksi3 beralasan menghasilkan996, histori menampilkan1 koreksi dan jumlah terkini3. Native input akhir mempunyai step60 dan value YYYY-MM-DDTHH:mm. Periode sama/lebih awal ditolak dan input bertahan.
4. Kas owner100.000 − uang keluar20.000 untuk belanja menghasilkan ekspektasi80.000; hitungan akhir80.000 membuka langkah3, tutup berhasil tanpa serah-terima. Sesi berikut50.000, serah-terima ke Rani/PIN demo123456/diterima50.000 mempertahankan kas terbuka dan menambah penanggung jawab; ekspektasi staf disembunyikan sebelum hitungan. Hitungan akhir50.000 membuka langkah3. Membatalkan dialog mempertahankan sesi terbuka dan menampilkan kembali Hitung laci lebih dahulu. Jejak pertama/revisi dan jumlah selisih segmen diverifikasi domain. Screenshot komposisi Kas final `/private/tmp/berrie-kas-d61-d65.jpg`.

Bukti screenshot hanya review lokal, bukan deployment thumbnail. Root localhost tetap viewport tablet1024×768 ketika dibuka; versi hosted tetap responsif bila nanti diterbitkan. HMR perubahan domain dapat me-reload data contoh; data demo tetap memori sesi.

### Pemetaan dan batas

D-61–65, AC-127–131 dan UT-22–25 diselaraskan pada spesifikasi/design system/AGENTS/tasks. AC-04/05 dan cabang impor ditunda, ID lama tetap. AC-109/110 tema/zoom/perangkat dan AC-101 persetujuan visual masih memerlukan bukti lengkap. Skill UI/UX Pro Max dibaca sebagai panduan tambahan kontekstual/input/error recovery; tidak dipasang lokal dan tidak mengganti token Berrie.

Ini prototipe data contoh; bukan IndexedDB/offline/server approval/authentikasi nyata, tidak menguji backup/restore/printer fisik atau performa perangkat. PIN demo/checkbox bukan bukti autentikasi/penerimaan uang nyata. Belum UT peserta, persetujuan visual atau kelulusan pilot/produksi. Tidak ada deployment atau perubahan akses.


<a id="d66"></a>

## Review Menu & Stok — D-66

8 Oktober 2026. Proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`, checkout lokal dari versi8. User menyebut versi4 dan REVIEW-KASIR-D61-D65.md; sumber aktual yang ditemukan ialah versi8 dan REVIEW-MENU-KAS-D61-D65.md. Melanjutkan sumber terbaru, tanpa mengembalikan revisi lain. Identitas simpan layanan dicatat pada tasks setelah konfirmasi, bukan deployment.

### Perubahan

- Seluruh label editor memakai Varian. Deskripsi persis “Tambahkan pilihan yang dimiliki menu ini”; contoh persis “Contoh: Ukuran cup (Kecil, Besar). Topping (Susu, Cokelat). Ice (Normal, Less Ice)”.
- Tabel Status/Menu/Varian/Harga/Kategori kemudian pilihan/harga channel/Tipe. Checkbox tetap kontrol pemilihan, bukan kolom bisnis. Lima baris dan nama/checkbox sticky dipertahankan.
- + Menu modal Tambah menu/Batal. Batal tidak menambah draft; Tambahkan ke tabel menaruh menu pertama, fokus nama, tetap di atas setelah save. Batal tambah menu sebelum commit hanya menghapus grup baru dari draft. Stok awal/minimal dari modal dapat diperbaiki sebelum save.
- Pemilik menolak alur + Kombinasi. Diganti Varian → nama/pilihan → Lanjut ke harga → daftar harga di dialog → Terapkan varian & harga → Simpan perubahan. Pilihan tunggal membuat daftar harga otomatis; harga baru kosong/wajib eksplisit. Multi mengusulkan kosong/satuan dan menjaga harga pasangan existing; Harga untuk pilihan lain memilih topping yang dibeli bersama, lalu menambah entri harga. Hapus pilihan harga tersedia di dialog. Batas30 mencegah daftar eksponensial; di atas batas otomatis owner menentukan pilihan harga sendiri.
- Harga/ID existing tetap; penggabungan pilihan dengan harga berbeda ditahan. SKU yang dikeluarkan dari daftar harga diarsipkan saat commit, stok/histori/snapshot dipertahankan. Definisi terpakai tetap satu per grup.
- Diskon sub di bawah Menu & Stok serta bagian workspace untuk akses layar kecil. Atur diskon membuka form katalog/channel yang sama dengan aturan domain promo existing. Tidak ada Rincian di tabel; Stok opname hanya Stok → Stok opname. Ledger tetap tersedia di Stok → Perubahan stok.

### Bukti lokal dan batas

- Root preview `http://127.0.0.1:4173/` terukur iframe1024×768 termasuk dialog, tanpa parameter. Default wrapper localhost yang sudah ada dipertahankan.
- Browser/DOM memeriksa urutan kolom, copy Varian, Batal modal (24 pilihan tetap24), tambah Milkshake Uji tampil baris pertama, daftar Kecil/Besar Rp12.000/Rp16.000 dan commit26 pilihan. Baris pertama masih terlihat setelah save; stok awal50 satu grup. Nama/varian/harga terbaca, lima row terukur64,5–65 px, input56, area tabel378; Kategori terlihat sebelum batas kanan region pada tablet.
- Editor kopi existing memunculkan dua harga Kecil/Besar tanpa + Kombinasi. Keyboard Lanjut/Batal/Terapkan bekerja. Satu click pointer footer editor gagal pada otomasi iframe; pengujian diteruskan dengan keyboard, bukan dinyatakan bukti tap perangkat fisik.
- Diskon submenu membuka daftar5 pilihan; form Es Kopi Besar tanpa stok opname. Simpan15% menampilkan15% sesudah commit. Aturan topping/promo/order/snapshot tetap memakai domain existing.
- Typecheck, lint dan77 tes lulus. Dua tes baru menjaga harga/ID/stok existing, rollback bila harga baru kosong, tidak ada opening stok kedua atau perubahan pesanan lama, kanonisasi pasangan multi dan pembatasan daftar. Build lokal lulus; build/packaging final saat simpan dicatat pada tasks.
- Tidak ada screenshot baru/thumbnail deployment. QA ini menggunakan DOM, ukuran elemen dan interaksi; belum persetujuan estetika. HP/zoom200/tema/perangkat fisik dan UT-22/26 belum diuji pada revisi ini.

Pemetaan: AC-126/127/128 dan AC-132; UT-22/26. Data bisnis hanya memori sesi dan reload menghapus contoh. Tidak membuktikan IndexedDB, approval/server/offline, printer, backup, migrasi, restore drill atau pilot. Kasir/Pesanan/Riwayat/Kas di luar cakupan visual revisi; regresi domain terkait tetap dijalankan. Tidak ada deployment atau perubahan akses.


<a id="d67"></a>

## Review prototipe — Menu & Stok D-67

9 Oktober 2026. Sites `appgprj_6ac54219b9248191bf551b9871d78958`, checkout `berrie-site/`, sumber sebelumnya versi9 yang dikonfirmasi layanan. Nama review yang diminta pada prompt tidak ada; file yang sesuai adalah REVIEW-MENU-KAS-D61-D65.md dan review D-66. Identitas hasil penyimpanan versi dicatat pada [tasks](../tasks.md) setelah konfirmasi layanan; tidak ada deployment/perubahan akses.

### Hasil revisi

- Dua status Dijual/Tidak dijual; warna hijau/merah hanya pada sel status. Arsip bukan status UI ketiga. Hapus melalui ikon tong sampah di samping nama, membuka dialog nama/dampak semua varian dan Batal/Ya, hapus menu. Fokus awal Batal. Soft delete mempertahankan ID/grup/saldo/ledger/order; draft aktif dan grid stale ditahan.
- Checkbox/bulk dihapus. Batal perubahan dekat Simpan perubahan mengembalikan draft ke katalog committed terbaru, termasuk penambahan/varian/sel. Hapus ditahan selama draft tabel belum disimpan/dibatalkan. + Varian/N varian tombol berfill/border/ikon, tidak tersembunyi di ujung tabel.
- Varian satu modal: harga dasar + tambahan integer≥0 tiap pilihan.0 tidak mengubah harga; pilihan pertama default berbintang. Tidak ada preset Rasa/Ukuran/Topping, copy menu tanpa varian, Pengaturan harga atau Lanjut ke harga. Single berharga menjadi row kombinasi, semua0 modifier gratis; multi berharga memakai tambahan per pilihan tanpa subset eksponensial. Harga lama dipertahankan jika aditif; legacy nonaditif/multi kombinasi/channel selisih lain atau penggabungan status/promo/tipe/kategori berbeda ditahan dengan pesan. Snapshot pesanan lama tidak diubah.
- Stok satu row per grup/menu: Status/Menu/Harga/Kategori/Stok awal/Stok minimal/Stok sisa. Harga ringkasan satu angka/rentang, status aktif jika ada varian dijual. Hanya baseline dan minimal dapat diedit; baseline melalui modal total aktual baru + alasan wajib, delta terhadap saldo kini, expected balance menahan race. Log tanggal/jam/pelaku/before/after/delta/alasan. Penjualan/rekap/return mempertahankan baseline. Minimal tidak mengubah saldo/ledger. Tab Isi stok/opname lama dipensiunkan; opname lewat Ubah stok awal.
- Tiga copy rekap yang ditolak dihapus, rentang menit/exclude/order/checkpoint/stock-only tetap. Diskon navigasi utama sejajar Menu & Stok, tanpa sub/tab.
- Root localhost tetap iframe1024×768; browser review juga diatur1024×768. Hosted tetap responsif. Tidak ada perubahan dependency/lockfile/runtime atau deployment thumbnail.

### Pemeriksaan aktual

Tes domain **83/83** lulus, termasuk tambahan0/5000/single/multi, kompatibilitas harga/ID/kode/promo, konflik penggabungan, limit30, stok baseline/debit/reset/log/actor/race/retry/minimal, konfirmasi/izin/draft/stale soft delete. Regresi domain pembayaran/promo/refund/stock bersama/rekap/cash lama tetap lulus. Typecheck strict dan lint lulus pada sumber final; build/packaging diverifikasi workflow penyimpanan, identitas/hasil akhirnya pada tasks. `git diff --check` diperiksa. Tidak ada script test:browser.

Browser langsung pada localhost:

1. Frame terukur1024×768; lima row Menu terukur64,5–65px, input56px. Status warna hanya sel, tombol hapus terlihat di samping nama, label Varian tidak terlipat. Edit harga Es Teh5000→7000 lalu Batal mengembalikan5000.
2. Varian baru Ukuran/Kecil0/Besar3000 pada Es Teh dasar5000 menghasilkan row5000/8000; Terapkan memperbarui draft dan Simpan perubahan berhasil. Modal existing Es Kopi Susu membaca dasar15000, Kecil0/Besar5000 serta Es/Gula0/topping lama5000. Default pertama ditampilkan berbintang, tanpa langkah harga/preset. Tes domain menjaga harga/SKU/promo existing pada commit.
3. Stok satu row/menu. Ubah Es Teh1000→999 tanpa alasan ditolak dan input999 bertahan; alasan Hasil stok opname pagi berhasil, baseline/sisa999 dan log09 Okt13.41, Maya·Owner,1000→999/delta−1/alasan terlihat. Angka/waktu ini bukti demo, bukan transaksi nyata.
4. Simulasi Gagal simpan pada Es Kopi Susu target14/alasan Produksi tambahan pagi mempertahankan kedua input dan pesan; setelah Batal baseline tetap10. Tidak mengubah saldo.
5. Hapus Es Teh pertama membuka konfirmasi/fokus Batal; Batal mempertahankan menu. Ya, hapus menu menghilangkan row dari daftar aktif (24→23 pilihan); tes domain membuktikan ledger/order/ID tidak dihapus. Tombol terakhir direlokasi dekat nama, perilaku konfirmasi memakai handler sama.
6. Diskon membuka heading/daftar diskon sendiri tanpa subtab. Rekap online saat diaktifkan menampilkan Dari/Sampai/qty/exclude/histori, tanpa tiga copy lama. Data contoh dikembalikan ke fixture awal sesudah pemeriksaan; perubahan demo bukan data yang disimpan pada versi Sites.

Bukti screenshot lokal `/private/tmp/berrie-menu-d67.jpg`, `/private/tmp/berrie-varian-d67.jpg` dan `/private/tmp/berrie-stok-d67.jpg`, bukan aset produk atau thumbnail deployment.

### Pemetaan dan batas

D-67, AC-133/134, UT-27/28; D-61/62/66 dan AC/UT terkait diselaraskan tanpa mengganti ID lama. AC-101 persetujuan visual, zoom/gelap/HP/keyboard/kontras menyeluruh, UT peserta, performa perangkat, printer fisik, backup/restore dan keamanan/server masih belum dibuktikan. Pemeriksaan browser ini terpilih, bukan semua AC lulus.

Ini prototipe memori. Tidak membuktikan transaksi IndexedDB/API, offline/outbox/receipt server, otorisasi/auth/PIN sungguhan atau hasil uang/kertas nyata. Token/profil/runtime Sites tetap prototipe, stack produksi tidak berubah. Tidak ada deployment atau perubahan akses.


<a id="d68"></a>

## Review Menu, Stok, Diskon dan Kas — D-68

9 Oktober 2026. Melanjutkan sumber aktual versi10/commit `daeb9652c89eb4189ca90acc4690728340636895` pada proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`. Rujukan awal versi4/nama REVIEW-KASIR-D67 pada permintaan sudah lama; bukti sebelumnya [REVIEW-MENU-D67.md](REVIEW-HISTORY.md#d67). Tidak ada deployment atau perubahan akses. Identitas simpan final/build/arsip dicatat di [tasks](../tasks.md) sesudah dikonfirmasi layanan.

### Perubahan dan keputusan

- Hapus menu di kolom paling kiri; konfirmasi mengarsipkan seluruh SKU grup dan menjaga histori. Log menu dihapus menampilkan tanggal/jam, pelaku, nama menu dan alasan. Saat draft berubah, selesaikan Simpan/Batal sebelum hapus agar tidak membuang edit lain.
- Batal/Simpan hanya muncul saat draft berbeda. Label Batal, dimensi pasangan sama. Revert ke nilai lama menyembunyikan aksi. Filter Perlu diperbaiki hanya muncul bila ada sel invalid; memilihnya menyaring baris yang perlu dikoreksi.
- Kategori wajib pada tambah/aktivasi/simpan, tanpa pilihan Tanpa kategori. Tambah kategori/tipe langsung di dropdown; CRUD di Pengaturan. Nama yang masih dipakai menu aktif tidak dapat dihapus. Rename menjaga snapshot pesanan/kode. Konfigurasi yang telah ditambahkan tersimpan tersendiri walau modal Menu dibatalkan.
- Stok: harga rata kiri; angka baseline dalam field berbatas membuka dialog hitungan aktual+alasan, tanpa tombol teks Ubah. Minimal editable, sisa teks baca saja. Pasangan aksi minimal hanya saat nilai berubah.
- Diskon menjadi pustaka persen/potongan rupiah/Beli X gratis Y. Dropdown penetapan di sebelah Varian; `-` berarti tanpa diskon. Penetapan/harga channel terpisah. Definisi digunakan tidak dapat dihapus, edit berlaku pada quote baru dan mempertahankan snapshot unit lama. Potongan melebihi harga menahan commit.
- Persetujuan pemilik untuk promo jumlah diterapkan umum X/Y1..99. **Beli2 gratis3 = terima5 bayar harga menu2**. Qty input mencakup unit gratis, berlaku berulang hanya SKU/pilihan identik dalam draft yang sama, sisa unit membayar penuh; topping seluruh unit tetap bayar. Debit stok seluruh qty sekali. Potongan dialokasikan ke seluruh unit kelompok memakai pembagian rupiah deterministik, refund parsial memakai alokasi asal. Unit confirmed tidak dihitung ulang. Promo tidak digabung diskon order. Nama diskon bukan mesin eligibility ulang tahun atau jadwal otomatis.
- Kas memperlihatkan actor/waktu pembukaan dalam zona toko, terpisah dari penanggung jawab saat ini. Uang awal + penjualan tunai bersih kembalian − refund tunai + uang masuk nonpenjualan − uang keluar nonrefund + koreksi. Penjelasan di setiap baris mencegah pencatatan penjualan/refund dua kali; ekspektasi tidak menggantikan hitung fisik.

### Bukti pemeriksaan prototipe

TypeScript strict/lint lulus; **95/95 tes domain lulus** (83 lama +12 tambahan). Cakupan baru: kombinasi X/Y dan qty1..16/harga ganjil/topping, sisa, penggabungan draft/pemisahan pilihan, confirmed tetap, pembayaran/retry/fullqty stok/refund parsial, diskon channel/snapshot/hapus/rollback/izin, kategori wajib/rename/hapus, stale katalog, potongan saat harga turun, pembatalan draft dan arsip tipe tetap terhapus. `git diff --check` serta build/packaging final dicatat pada tasks setelah hasil aktual.

Pemeriksaan interaktif localhost **1024×768**:

- Menu bersih tidak menampilkan pasangan aksi/error0; harga5000→7000/Batal kembali5000. Kedua tombol terukur166×48 px. Lima baris64,5–65 px/input56 px terlihat penuh, footer tidak menutup baris kelima. Kolom lebar dapat digulir horizontal; nama menu mempertahankan lebar terbaca.
- Stok minimal5→9 menampilkan Batal/Simpan; kembali5 menghilangkan aksi. Harga termasuk rentang rata kiri; baseline angka berbingkai, sisa baca saja.
- Tambah kategori Dessert inline tetap di modal Menu/terpilih; rename Dessert manis berhasil di Pengaturan. Hapus nama terpakai disabled; hapus unused berkonfirmasi.
- Definisi Beli2gratis3 tersimpan dan terpilih pada Es Teh. Qty5×5000 menghasilkan total10000, potongan15000, pembayaran tunai dan stok1000→995. Pengujian domain refund unit promo teralokasi4000 dari total20000/harga10000, tanpa return stok otomatis.
- Buka kas100000 memperlihatkan tanggal/jam/pelaku serta penjelasan per sumber. Hapus Matcha Latte memperlihatkan tanggal/jam/Maya Owner/nama menu dalam log; Batal konfirmasi tidak menghapus.
- Simulasi gagal simpan mempertahankan nama/nilai input; hasil belum diketahui diperiksa melalui operasi yang sama, tanpa membuat duplikat. Data contoh dikembalikan ke fixture; preview tetap berjalan dengan frame tablet1024×768.

Bukti visual sementara `/private/tmp/berrie-menu-d68.png` dan `/private/tmp/berrie-stok-d68.png`, bukan thumbnail deployment. Perubahan dipetakan ke AC-135–139/UT-29–30; bukan kelulusan seluruh AC atau hasil UT peserta.

### Batas

Prototipe Sites di memori, data demo hilang saat reload. Belum IndexedDB/API transaksi produksi, penulis tunggal lintas tab, auth/approval/offline/sync, migrasi, backup/restore, printer fisik, performa perangkat atau pilot. Source/version yang disimpan berbeda dari data contoh. Stack produksi dan gerbang rilis tetap pada specs; tidak dinyatakan siap operasional.


<a id="d69"></a>

## Review Diskon, Menu, Rekap dan Kas — D-69

10 Oktober 2026. Melanjutkan versi11/commit `2ca3e9b4e95216a4a5d775a803023f64ff745db2` pada proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`, terkonfirmasi layanan/sumber. Versi4 pada prompt adalah rujukan lama; REVIEW-KASIR-D68 tidak ada, bukti aktual sebelumnya REVIEW-MENU-KAS-D68.md. Tanpa deployment/perubahan akses.

### Perubahan

Jadwal Diskon opsional: tanggal/jam mulai dan selesai dalam zona toko. Window lengkap, presisi menit, mulai inklusif/selesai eksklusif; input parsial/terbalik invalid. Tanpa jadwal tetap berlaku seperti sebelumnya. Pustaka memperlihatkan status/rentang; semua mode dan filter Promo/label BOGO mengikuti quote efektif. Tampilan menyegarkan di batas menit/fokus. Snapshot item yang dipilih tetap sampai refresh draft eksplisit; confirmed tidak berubah. Tidak ada cron cloud atau jadwal berulang. Copy tambahan/teknis Diskon dihapus.

Menu/Stok/Rekap tabel bergulir vertikal, header tetap dan seluruh row tersedia, tanpa pagination. Input56/baris≥64/font14 tetap. Helper Varian dan bintang/Default visual dihapus, perilaku default pertama tetap. Rekap memakai kelompok Dari read-only/Sampai tanggal+jam/Waktu sekarang sejajar dan konversi zona toko.

Kas menghapus copy/nominal duplikat, label mengikuti permintaan dan tombol uang masuk/keluar di atas. Satu Saldo kas tercatat di bawah breakdown tetap; label hitungan akhir dipertahankan menjadi Uang akhir di laci (Rp). Belum pernah buka: panel pendek/CTA tanpa Rp0/tabel kosong. Kas aktif fullwidth, finish dua jalur pendek, riwayat disclosure dengan jumlah. Actor pembuka tidak berubah; pemegang kini tampil hanya bila berbeda. Blind count/seluruh blocker/ledger tetap. Dialog tutup step1 tautan rekap, tanpa blocker baru.

Subagen UIUX meninjau layout rekap dan Kas secara read-only. Skill UI/UX Pro Max dari repositori nextlevelbuilder terpasang global atas permintaan pemilik; panduan empty state/progressive disclosure diterapkan tanpa mengganti token Berrie. Review bukan UT peserta.

### Pemeriksaan

99/99 tes domain lulus, termasuk4 tes baru tanggal/zona/invalid window/batas persen-potongan-BOGO/filter/channel/snapshot/refresh/hapus jadwal. Typecheck/lint final lulus; build/packaging/identitas simpan dicatat sesudah hasil aktual di tasks. Browser1024×768 memverifikasi root iframe tepat1024×768, Menu24 row/scroll1588>376 dan Stok21 row/scroll1485>376; input Harga EsTeh5000→7000 bertahan lintas Stok/Menu dan Batal kembali5000. Varian tanpa helper/default visual. Rekap tanggal/jam56px, Waktu sekarang mengisi keduanya dalam zona toko, layout tiga kelompok sejajar. Diskon Beli1gratis1 rentang11Okt08.00–17.00 tersimpan Terjadwal; akhir07.00 ditolak dengan pesan spesifik/input bertahan. Native tanggal/jam menangani event input agar nilai tidak hilang saat pindah field. Kas belum dibuka satu CTA; buka100000 metadata asli dan total tunggal; aktif card penuh/finish dua tombol/disclosure. Tutup kas menampilkan step1 tautan yang membuka Rekap online. Screenshot sementara `/private/tmp/berrie-kas-d69.jpg` dan `/private/tmp/berrie-rekap-d69.jpg`. Tidak ada script test:browser.

### Batas

Data simulasi dalam memori; reload menghapus demo. Waktu memakai jam perangkat, belum bukti sumber waktu tepercaya saat offline/jam berubah. Belum IndexedDB/API transaksi/server izin/backup/restore/printer fisik/performa perangkat/UT peserta/pilot. AC-140–142/UT-31–32 adalah pemetaan perubahan dan target, bukan seluruhnya lulus operasional. Identitas versi berikutnya hanya dicatat setelah layanan mengonfirmasi.


<a id="d70"></a>

## D-70 — Desain terpilih menjadi satu UI

12 Oktober 2026. Eksplorasi dibuat pada10 Oktober; pemilik memilihnya sebagai satu UI dan meminta pembanding lama dibuang tanpa backup baru pada12 Oktober. Sumber lokal melanjutkan versi layanan12/D-69; identitas Site tetap `appgprj_6ac54219b9248191bf551b9871d78958`. **Tidak ada deployment, commit, push atau penyimpanan versi layanan baru.**

### Perubahan sumber

- Hapus state/parameter pemilih desain, tombol Sekarang/Alternatif, cabang katalog tabel Kasir, sidebar lama dan kontrol ciutkan. Localhost root langsung UI terpilih dalam iframe1024×768; query desain lama tidak lagi memilih cabang.
- Promosikan stylesheet menjadi `app/cashier-ui.css`; hapus token/palet/font/style yang khusus pembanding. Hapus komponen sidebar/hook mobile yang tidak lagi dirujuk, serta Inter/OFL pasangannya. Tidak membuat salinan UI atau backup. Histori Git, keputusan dan bukti review lama tetap histori, tidak dapat diaktifkan sebagai UI.
- Manrope/OFL lokal, navigasi horizontal, kartu menu ketuk1/Atur, qty draft inline, penyajian Item berikutnya, pembayaran panel, hasil/Struk/Pesanan menjadi default. Jumlah unit pada detail/confirmed baca saja tetap terbaca. Component review memakai desain aktif.
- DESIGN-SYSTEM ditulis ulang untuk D-70; AGENTS/indeks/spec alur-katalog-pembayaran-layar-UX, AC-101/143, UT-33 dan tasks diselaraskan. D-70 mendahului visual Kasir lama; aturan domain/izin/admin D-68/69 tetap.

### Pemeriksaan aktual

Typecheck/lint lulus, **99/99 tes domain** lulus. Build lokal final dan `git diff --check` lulus. Build pertama menangkap selector CSS kosong hasil pembersihan; selector tersebut dihapus sebelum build ulang. Tidak ada test:browser; browser diperiksa langsung di preview.

Browser root tanpa parameter desain: switch tidak ada, navigasi utama/semua lima tujuan Kelola toko tersedia. Iframe1024×768, delapan kartu menu penuh/default. Preview final tiga baris/empat unit dengan total53.000 muat penuh (viewport item219 px, scroll219 px), tanpa console error. Kas awal100.000; Es Kopi Susu Besar18.000 setelah promo + Air Mineral5.000 =23.000. Tambah/kurangi qty langsung bekerja; kopi tetap Makan di tempat saat Air berikutnya Bungkus. Bayar teramati tanpa dialog transaksi; Uang pas/Simpan pembayaran berhasil, draft kosong dan hasil/struk/pesanan tersedia. Detail menampilkan1× pada kedua baris dan penyajian sesuai. Tab Stok menunjukkan kopi10→9, Air18→17; tidak debit draft berulang.

Pesanan berikut Air5.000: gangguan Gagal simpan mempertahankan received5.000 dan menampilkan belum tersimpan; kembali Normal/retry berhasil, hasil tercatat. Jalur QRIS/unknown/printer tidak diuji ulang lengkap pada promosi ini; aturan domain bersama/tes dan bukti eksplorasi sebelumnya tidak dianggap bukti perangkat produksi. Shell/style global sama pada halaman pengelolaan, bukan redesign baru aturan administrasi.

### Persetujuan, rujukan dan batas

Visual terpilih disetujui pemilik, bukan bukti seluruh AC/UT lulus. AC-143 memetakan perubahan; AC-101 masih memerlukan perbandingan implementasi operasional/lintas perangkat. UT-02/03/05/17/18/20 memakai desain terpilih, UT-33 belum peserta. Produksi/IndexedDB/server/offline/backup/restore/printer fisik/keamanan/performa/pilot belum selesai.

UI/UX Pro Max digunakan pada eksplorasi sebelumnya: panduan lokal Flat Design/hierarki/target/fokus dan Manrope disesuaikan kebutuhan kasir; hasil landing/immersive yang tidak relevan tidak diadopsi. Promosi ini mempertahankan desain yang dipilih, tidak menghasilkan arah baru. Situs tetap data contoh dalam memori, refresh menghapus sesi contoh. Root proyek `/Users/icang/berrie`, sumber Site `/Users/icang/berrie/berrie-site`. Preview `http://127.0.0.1:4173/`.
