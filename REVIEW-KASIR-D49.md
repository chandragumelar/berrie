# Review penerapan Kasir D-49/D-50

7 Oktober 2026 · proyek [Berrie · Prototipe Kasir](sites-project://appgprj_6ac54219b9248191bf551b9871d78958). Token aktif pada [design system](../DESIGN-SYSTEM.md). Review versi [1](REVIEW-KASIR.md)/[2](REVIEW-KASIR-D47.md) tetap historis. Revisi ini belum disetujui secara visual; disimpan tanpa deployment. Tidak membuat screenshot baru.

## Penerapan

- Page #F5F5F7; sidebar grouped 200 px, rail 64 px, label 14/500 utuh, selected ringan dengan indikator dan aria-current. Katalog/keranjang radius 16 px tanpa shadow dasar.
- D-50 mengganti permukaan putih terang dengan gradient bubblegum horizontal opaque: #E8E7F5 0%, #DEF3F7 50%, #DEF5F6 60%, #E6F6E4 100%. Warna disampel dari gambar pemilik, bukan deklarasi CSS situs referensi. Fallback #DEF3F7; selected navigasi/filter/segmen tetap cyan #61DCE2 sesuai instruksi terakhir. Tema gelap tetap; kertas putih/hitam.
- Skala 14/18/20/22 menurut peran; nama/harga regular, total 600. Apple system font pada stack Apple, Inter variable WOFF2 dan OFL dibundel di public/fonts, fallback sistem. Tidak mengambil font dari CDN saat membuka Kasir.
- Form, segmented 16/12 px, kategori, status, focus dan overlay mengikuti token. Search/channel sejajar. Stepper qty dengan tombol 44 px; catatan item/pesanan memakai textarea. Kontrol bersama terpisah dari domain; operasi dan rumus domain tidak diubah.
- Panel review terpisah menunjukkan tombol/icon/aksi mengambang, field/select/textarea/checkbox/radio/toggle/stepper, segmented/chip/tag/badge, navigation/table, empty/feedback/error/loading/hasil belum diketahui, dialog/sheet, popover lewat select, serta contoh material dan fallback. Panel tidak menjalankan transaksi.

## Bukti browser terpilih

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

## Kontras

sRGB pada warna computed/token solid. Gradient opaque diuji sepanjang interpolasi stop; minimum terjadi di lavender #E8E7F5 untuk pasangan berikut. Primary #1D1D1F 13,769:1; secondary #616166 5,038:1; tertiary baru #68686D 4,534:1; border #85858A 3,004:1; focus #166E73 4,892:1. Tertiary lama #6E6E73 tidak cukup pada bubblegum dan diganti. Primary/selected cyan 10,293:1; tombol primer putih/hitam 21:1. Marker/atribut selected tetap, tidak hanya warna.

Nilai tersebut tidak meluluskan seluruh state/backdrop/media. Reduced motion/transparency, increased contrast dan forced colors punya CSS fallback, belum diemulasi sebagai preferensi OS. Native zoom 200%, Safari/iPhone/autozoom/keyboard layar, pembaca layar, font fallback gagal dan font offline/PWA pada perangkat non-Apple belum diuji.

## Pemeriksaan dan batas

31 tes domain, typecheck, lint, build lokal dan packaging diperiksa pada sumber akhir sebelum simpan; hasil layanan/identitas versi dicatat setelah terkonfirmasi. Tes domain mencakup promo/alokasi/refund integer, snapshot, rollback pembayaran/stok, replay idempoten, batch tambahan, izin simulasi, serah-terima dan SALINAN. Kode domain tidak berubah dalam revisi ini.

AC-101/106/107/109–112 dan UT-01–18 dipetakan ke bukti prototipe terpilih; tidak lulus penuh. Domain/storage/lock IndexedDB, API/server/offline/backup/restore, keamanan, printer fisik, UT peserta dan pilot tetap belum dibuktikan. Data contoh di memori, hilang saat reload. Layar selain Kasir belum direview ulang lengkap walau token bersama ikut dipakai.
