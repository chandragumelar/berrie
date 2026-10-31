# Berrie — Design system

**Kasir aktif D-76 · 31 Oktober 2026:** bagian D-76 di bawah mengganti modal wajib/penyajian hanya di modal pada D-71/72. Fondasi ADS dan komponen D-75 tetap.

Sistem aktif **D-75 · 31 Oktober 2026** (editor/laporan/pengaturan; konstruksi Kas D-74 tetap), melanjutkan alur D-72 dan mengoreksi fondasi visual D-71 berdasarkan dokumentasi resmi [Atlassian Design System](https://atlassian.design/). Pemilik meminta seluruh sistem visual ditinjau tanpa mempertahankan bentuk prototipe sebagai patokan. Implementasi komponen Berrie sendiri; tidak mengimpor font/ikon/aset atau seluruh paket ADS. Histori tetap pada [register](specs/11-decisions-and-open-questions.md). Situs tetap prototipe lokal; persetujuan arah bukan kelulusan visual final/UT/pilot.

## Arah dan struktur

Permukaan putih/netral, biru untuk aksi utama/seleksi/fokus, status memakai warna semantik dan teks. Hierarki jelas, border tipis, bayangan hanya untuk lapisan mengambang. Semua permukaan solid. Navigasi tablet horizontal Kasir/Pesanan/Riwayat + Kelola toko. Katalog kiri, Pesanan baru kanan; HP satu area dengan keranjang dan navigasi bawah. Tanpa pembanding/desain alternatif aktif, gradient atau dekorasi produk.

Katalog dua kolom: setiap kartu membuka modal, tanpa menambahkan item dan tanpa ikon Atur/copy bantuan lama. Modal memakai default SKU yang terlihat, hanya pilihan yang dimiliki menu, qty, penyajian dan catatan; **Tambahkan ke pesanan** tetap terlihat saat isi bergulir. Nama varian membedakan SKU; harga akhir Rp, promo/stok rendah berupa konteks tertulis. Satu filter aktif; Semua/Habis/Promo selalu ada, kategori owner. Stok nol hanya Habis, nonaktif hanya administrasi.

Pesanan baru memakai satu judul, tanpa pemilih Item berikutnya. Penyajian hanya di modal item: **Makan di tempat** kiri, **Bungkus** kanan; default Bungkus. Modal tanpa copy bantuan dan harga per unit; total item tetap terlihat. Qty draft −/qty/+ inline; − pada satu menghapus baris draft. Racikan gratis default tidak diulang, pilihan berbeda/catatan terlihat. Identitas wajib sebelum simpan/proses/bayar.

Bayar primer, Bayar nanti/Simpan dulu sekunder. Bayar mengganti panel dengan ringkasan/metode/diterima/kembalian atau verifikasi. Copy “Saat disimpan, item baru juga diminta dibuat.” dihapus. QRIS/non-tunai memakai **Catatan**. Kembali tanpa commit; pending/unknown mengunci input dan menyediakan pemeriksaan operasi yang sama. Hanya keberhasilan save/process/settle mengosongkan Kasir: empty state, notifikasi spesifik dengan **Lihat pesanan**. Tidak ada kartu sukses menetap atau dialog Struk otomatis. Gagal mempertahankan input. Domain uang/stok/izin/ID operasi tetap.

D-72: setelah commit Bayar nanti otomatis mencoba dapur; pembayaran dengan batch baru mencoba dapur lalu pelanggan, pembayaran batch lama hanya pelanggan. Simpan dulu tanpa cetak/debit. Detail draft menyediakan **Edit pesanan** ke Kasir untuk tambah/hapus/ubah menu, qty dan pilihan dengan nomor/identitas tetap. Perubahan kerja tidak menghapus draft asal ketika simpan gagal.

Struk/cetak ulang di detail Pesanan/Riwayat. Pratinjau tujuan yang layak, dapur sebelum pelanggan pada satu printer. Setelah attempt tersimpan dialog selesai, tanpa Kertas sudah keluar/Bagikan struk pelanggan dan tanpa klaim kertas fisik berhasil. Cetak ulang eksplisit **SALINAN**, memakai transaksi/batch asal, tanpa debit uang/stok. Prototipe hanya mencatat simulasi attempt.

Riwayat: Tanggal awal/Tanggal akhir/Metode dalam tiga kolom, bertumpuk pada HP. Default kedua tanggal hari ini zona toko. Kedua tanggal inklusif sampai akhir hari; rentang terbalik menampilkan error. Search/metode/rentang bekerja bersama pada tanggal settlement, bukan tanggal dibuat atau zona browser. Copy Snapshot pembayaran/urutan pekerjaan di daftar dihapus, nominal Riwayat rata kiri sejajar header Total.

## Token warna

Sumber [cashier-ui.css](berrie-site/app/cashier-ui.css); struktur bersama [globals.css](berrie-site/app/globals.css). Nama token lama yang masih dipakai dipertahankan sebagai alias semantik, termasuk accent-cyan dan alt-rail. Nilai berikut adalah token Berrie aktif; tidak mengklaim salinan seluruh token resmi Atlassian.

| Token | Terang | Gelap |
| --- | --- | --- |
| `canvas` | `#F7F8F9` | `#1D2125` |
| `surface` | `#FFFFFF` | `#22272B` |
| `surface-grouped` | `#F1F2F4` | `#2C333A` |
| `surface-raised` | `#FFFFFF` | `#2C333A` |
| `basket-surface` | `#FFFFFF` | `#22272B` |
| `text-primary` | `#172B4D` | `#DEE4EA` |
| `text-secondary` | `#44546F` | `#B6C2CF` |
| `text-tertiary` | `#44546F` | `#B6C2CF` |
| `text-accent` | `#0C66E4` | `#85B8FF` |
| `text-selected` | `#0055CC` | `#85B8FF` |
| `action-primary` | `#0C66E4` | `#579DFF` |
| `action-primary-text` | `#FFFFFF` | `#101214` |
| `action-hover` | `#0055CC` | `#85B8FF` |
| `action-pressed` | `#09326C` | `#388BFF` |
| `selection-surface` | `#F7F8F9` | `#2C333A` |
| `secondary-hover` | `#DCDFE4` | `#38414A` |
| `secondary-pressed` | `#B3B9C4` | `#454F59` |
| `selected-surface` | `#E9F2FF` | `#1C2B41` |
| `fill-selected` | `#E9F2FF` | `#1C2B41` |
| `selected-hover` | `#CCE0FF` | `#09326C` |
| `selected-pressed` | `#B3D4FF` | `#0055CC` |
| `border-control` | `#8590A2` | `#738496` |
| `divider` | `#DCDFE4` | `#454F59` |
| `focus` | `#0C66E4` | `#85B8FF` |
| `focus-offset` | `#FFFFFF` | `#22272B` |
| `danger-text` | `#AE2E24` | `#FF9C8F` |
| `danger-surface` | `#FFECEB` | `#5D1F1A` |
| `warning-text` | `#7F5F01` | `#F5CD47` |
| `warning-surface` | `#FFF7D6` | `#533F04` |
| `positive-text` | `#216E4E` | `#7EE2B8` |
| `positive-surface` | `#DCFFF1` | `#164B35` |
| `info-text` | `#0055CC` | `#85B8FF` |
| `info-surface` | `#E9F2FF` | `#1C2B41` |
| `accent-cyan` | `#0C66E4` | `#579DFF` |
| `accent-lavender` | `#B8ACF6` | `#B8ACF6` |
| `accent-ink` | `#172B4D` | `#172B4D` |
| `disabled-surface` | `#F1F2F4` | `#2C333A` |
| `disabled-text` | `#44546F` | `#B6C2CF` |
| `scrim` | `#091E427D` | `#091E427D` |
| `alt-rail` | `#FFFFFF` | `#22272B` |
| `alt-rail-text` | `#172B4D` | `#DEE4EA` |
| `alt-rail-muted` | `#44546F` | `#B6C2CF` |
| `alt-rail-hover` | `#F1F2F4` | `#2C333A` |
| `alt-rail-active` | `#E9F2FF` | `#1C2B41` |
| `alt-rail-active-text` | `#0055CC` | `#85B8FF` |

Tema default sistem, override Terang/Gelap di panel review. Navigasi mengikuti tema terang/gelap. Kertas selalu putih/hitam. Selected mempunyai aria-pressed/current dan garis/border, fokus ring 2 px/offset 2 px. Status punya teks. Teks normal target4.5:1, kontrol bermakna3:1; audit menyeluruh masih perlu bukti.

## Tipografi, ruang dan bentuk

**Inter Variable lokal**, bobot400–700, fallback -apple-system/BlinkMacSystemFont/Segoe UI/sans-serif. [Font](berrie-site/public/fonts/InterVariable.woff2) dan [OFL](berrie-site/public/fonts/OFL.txt) berpasangan; tanpa CDN runtime, cache produksi harus mencakup font. Atlassian memakai Atlassian Sans turunan Inter; Berrie memakai Inter berlisensi OFL dengan fitur cv07/08/09/10 serta ss07/08 untuk bentuk karakter yang mendekati acuan. Ini bukan font resmi Atlassian. Body14/400 dengan line-height sekitar20, nama kartu14/600, harga14/500, bagian16/600 dengan line-height24, halaman24/600 dengan line-height28, dialog20/600 dengan line-height24. Total panel pesanan22/600 tetap sebagai penekanan transaksi, total dialog28/600 dan saldo Kas24/600. Hasil racikan/kategori12/400; kategori sentence case. Metadata bukan untuk uang/identitas utama. Rem, angka tabular, reflow200%; skala POS14 adalah adaptasi keterbacaan/kepadatan, bukan adopsi semua ukuran ADS.

Radius sesuai peran: checkbox/detail2 px, label/badge4, kontrol6, kartu/panel/popover8, modal/tabel12, profil lingkaran. Border1 px; elevation hanya untuk popover/dialog/notifikasi, memakai token shadow bersama. Ikon Lucide outline1.5 dengan ujung datar, glyph standar16 px dan chevron12 px, empty state32; target≥44×44, kontrol utama48, Bayar/Tambahkan52. Kasir memakai ShoppingBasket, Pesanan ListChecks, Riwayat History, Kelola toko Settings; bentuk glyph Lucide tetap berbeda dari ikon resmi Atlassian. Ikon dekoratif aria-hidden, ikon tunggal bernama aksesibel.

Tablet1024×768/default: padding utama24, katalog–pesanan24, pesanan340 px (370 desktop≥1280), grid8, inset12–14, ritme8–12. Target8 kartu pendek dan3 baris pesanan biasa penuh. Nama/racikan panjang tumbuh dan bergulir; jangan dipotong untuk target jumlah. Katalog/pesanan punya gulir isi dan aksi terjangkau. HP≤960 satu area, baseline360. Root localhost iframe1024×768 termasuk dialog; hosted responsif. Panel review berada di luar alur kasir.

## Komponen dan state

Field/MoneyField/Choice/QuantityField/ServingControl/Tick/Badge/DataTable bersama lintas layar. Menu/Stok/Rekap mengikuti D-68/69: gulir/header sticky, row≥64/input≥56, error sel/log actor-waktu, Batal/Simpan kontekstual simetris. Tampilan Jira tidak menyalin kepadatan kontrol desktop ke target sentuh kasir, tidak menambah integrasi/vendor/fitur.

Navigasi dan tab memakai permukaan ringan, teks terpilih dan garis bawah2 px; hover/pressed/focus/disabled/error tetap eksplisit. Menu baru: nama → kategori/tipe → harga dan Varian opsional → stok. Tanpa varian label Harga; setelah menambah varian label Harga dasar. Tambahan0 berarti harga tetap; preview Harga akhir memakai perhitungan domain yang sama. Isi form bergulir, Batal/Tambahkan ke tabel berada di footer tetap terjangkau; error mempertahankan input dan mendapat fokus. Tidak ada mode satuan/konversi atau field volume. Pemilik menentukan arti harga, qty dan stok.

Kas mempunyai area maksimum960 px rata kiri. Pada lebar≥900 px, breakdown maksimum640 px di kiri dan Selesai bertugas di kanan, dengan Ganti petugas di atas Tutup toko. Kedua card sejajar atas, gap24 px; aksi pergerakan serta blocker/riwayat tetap selebar kolom angka. Di bawah900 px satu kolom maksimum640 px dengan finish di bawah. Label dan nominal berada dalam grid yang sama, nominal rata kanan/tabular, gap24 px (12 pada HP); tidak membentangkan angka ke ujung layar. Saldo tercatat satu kali setelah divider, hitung buta/izin/blocker tetap. HP dan pembesaran teks mengalir ulang tanpa mengecilkan target sentuh.

Empty memberi langkah mulai; loading tidak menggeser aksi; error menyebut hasil simpan dan pemulihan sambil mempertahankan input. Dialog hanya konfigurasi/detail, pembayaran Kasir tetap panel. Fokus kembali ke pemicu/aksi yang sah. Keyboard, reduced-motion/forced-colors, zoom/tema tetap. Sukses penyimpanan bukan ACK server, verifikasi uang, kertas atau backup.

Bukti terkini: [review D-73](berrie-site/REVIEW-MENU-KAS-D73.md), [review D-71/D-72](berrie-site/REVIEW-KASIR-D71.md), [tasks](tasks.md), AC-143–152 dan UT-33–38. UI/UX Pro Max membantu panduan, bukan pengganti peserta/printer/offline/restore. Lokal, tanpa deployment.

## Acuan konstruksi

Prinsip [spacing Atlassian](https://atlassian.design/foundations/spacing/) memakai basis8 px; token ruang Berrie4/8/12/16/24 membedakan detail, kelompok dan section. [Radius](https://atlassian.design/foundations/radius/), [warna](https://atlassian.design/foundations/color/) dan [elevation](https://atlassian.design/foundations/elevation/) menjadi acuan peran, tema dan lapisan. [Ikon](https://atlassian.design/foundations/iconography/) mengutamakan metafora familier, label, stroke1.5 dan ujung datar. [Tipografi](https://atlassian.design/foundations/typography/product-typefaces-and-scale) menjadi acuan hierarki dan fitur karakter; aset Inter memakai OFL sendiri. [Lisensi ADS](https://atlassian.design/license) diperiksa; tidak memasang paket/branding Atlassian. Review D-73 membedakan fondasi yang diadaptasi dari aset resmi dan pola POS khusus; tidak mengklaim kemiripan penuh Jira.

## Kas dan laporan untuk kegiatan harian — D-74

Navigasi tablet tetap horizontal di atas: Kasir/Pesanan/Riwayat/Kelola toko; HP di bawah: Kasir/Pesanan/Riwayat/Lainnya. Mempertahankan lebar katalog dan area pesanan. Urutan sama; tidak menambah sidebar.

Laporan dimulai toolbar periode ringkas, tab, dua card **Penjualan** dan **Uang diterima**, lalu jumlah transaksi berbayar/rata-rata belanja. Penjualan memakai nilai setelah diskon sebelum pengembalian, di luar pajak/layanan; label bantuan menjelaskan dasar. Refund bukan fokus rutin: catatan dan kolom pengembalian muncul bila ada kejadian. Gratis hanya tampil jika ada. Rincian perhitungan memakai disclosure, penerimaan per metode dan menu penyumbang penjualan terpisah. Menu bisa diurut nilai penjualan/jumlah, bukan klaim laba. Telusuri angka menuju pesanan asal dan kembali mempertahankan periode/tab/filter.

Tab laporan mengikuti ukuran isi dan tinggi48 px; membungkus tanpa menumpuk isi pada HP. Dua card menjadi satu kolom di bawah700 px. Tabel panjang bergulir di wilayah berlabel; tidak membentangkan halaman. Palet/Inter/radius/fokus/target44 D-73 tetap. Bukti pada [review D-74](berrie-site/REVIEW-KAS-LAPORAN-D74.md); AC-153/154 dan UT-39 belum lulus operasional/peserta.

## Editor, laporan dan Pengaturan — D-75

Bar aksi editor sticky di atas isi, permukaan solid/token border, status tertulis dan Batal/Simpan ukuran sama; ruangnya tetap dihitung dalam layout, fokus diberi scroll-padding. HP mengikuti visual viewport normal tanpa footer simpan fixed, navigasi bawah tetap. Menu/Stok punya penanda belum disimpan per tab; hilangkan field keterangan opsional, alasan koreksi wajib tetap.

Laporan: Ringkasan/Telusuri angka/Kejadian penting/Dana platform. Dua card utama, strip transaksi/rata-rata, pengecualian kontekstual, tabel Menu terjual, lalu disclosure per hari/perhitungan/metode. Nama kolom neto eksplisit ketika ada pengembalian; tidak menambah grafik dekoratif atau perbandingan dengan cakupan riwayat tak terverifikasi. Pengaturan mulai Toko; Nama singkat (alias) berdampingan nama tipe. Aksi staf berlabel, form/error dan konfirmasi dampak memakai komponen dialog/tabel existing. Palet/Inter/target/shape D-73/74 tetap.

## Penyelarasan komponen bersama — audit ADS · 31 Oktober 2026

Pelaksanaan visual dalam batas D-75, tanpa keputusan produk/ID baru. [Review audit dan batas verifikasi](berrie-site/REVIEW-ADS-2026-10-31.md) adalah status terbaru; bukti browser lama tidak dianggap verifikasi revisi ini.

- Token konstruksi bersama: border standar1 px, seleksi2 px, ruang tambahan32 px untuk empty state. Palet, Inter lokal, Lucide, radius per peran dan elevation overlay D-73 tetap. `strong`/`b` mengikuti penekanan600; aturan khusus nama/harga/nominal tetap berlaku.
- Tab internal satu indikator garis bawah, tanpa centang tambahan. Hover/pressed terlihat, selected memakai600 dan atribut existing. Filter button tetap button `aria-pressed`; Radix Tabs tetap mengelola keyboard tab. Daftar tab rata awal, mengikuti isi dan membungkus. Navigasi Pengaturan memakai bidang selected dan garis kiri selain warna; tidak menambah sidebar kasir.
- Header tabel bersama memakai permukaan grouped, teks secondary600, separator2 px, inset12×8. Sel tabel baca inset vertikal8; editor tetap row≥64/input≥56. Kolom sticky memakai warna header yang sama. Pilihan varian memakai perlakuan netral; status stok read-only berupa label ringkas, status editable tetap kontrol56. `DataTable` memberi nama pada tabel serta scope kolom, region gulir bernama bila diperlukan. Tidak mengubah editor menjadi modal: pola tabel langsung D-68/69 tetap adaptasi Berrie atas pedoman Dynamic table ADS.
- Badge status12/500 dengan teks; empty state berjarak32/16, ikon32 dan judul terpisah. Callout/error punya garis tepi kiri; error tetap persisten. Dialog/close44, deskripsi, toast, disclosure, serta strip metrik laporan memakai ritme bersama. Toast tetap di tengah sesuai prototipe, berbeda dari flag ADS kiri bawah.
- Disabled/error mengalahkan hover/selected termasuk select Radix. Batas error dipertahankan saat fokus; fokus biru tetap menunjukkan lokasi keyboard. Fokus kontrol di tabel memakai outline ke dalam agar tidak terpotong batas gulir. Forced colors punya border seleksi eksplisit; reduced motion existing tetap.
- HP≤600: toolbar laporan satu kolom, tab label boleh membungkus, judul+aksi boleh turun baris, tombol simpan Pengaturan selebar area. Toast menghormati safe area. Tidak mengubah breakpoint Kasir960, baseline360, grid Kas900, area Kas960/breakdown640, maupun target8 kartu/3baris1024×768. Target tersebut **belum diverifikasi ulang secara visual** setelah patch ini.

Pengukuran token statis22 pasangan terang/gelap memenuhi teks≥4,5:1 serta border/fokus≥3:1 pada pasangan yang diperiksa. Ini bukan pengukuran computed style seluruh state atau sertifikasi aksesibilitas. Audit pelaksana Safari memberi observasi tablet/HP360, keyboard dialog, gelap, teks200% dan page zoom200% pada state representatif. Zoom telah dikonfirmasi200% lalu dipulihkan100%; preview tablet kembali terlihat. Cakupan akhir ada pada review audit; jangan menyatakan audit visual menyeluruh lulus.

ADS adalah fondasi/komponen lintas aplikasi; Jira adalah penerapan produk tertentu. [Navigasi Jira resmi](https://support.atlassian.com/jira-software-cloud/docs/what-is-the-new-navigation-in-jira/) memakai sidebar yang bisa disesuaikan dan top bar utilitas. Berrie mempertahankan navigasi atas tablet/bawah HP serta kontrol sentuh lebih besar. Dokumentasi ADS sendiri menandai selected netral pada sebagian komponen sebagai feature flag; patch mempertahankan selected biru yang disetujui Berrie. Tidak mengklaim identik dengan tenant Jira, aset Atlassian Sans atau ikon resmi.


Perbaikan hasil observasi Safari: chevron select tunggal tidak direset shorthand warna; header tabel bergerak satu kelompok dengan kolom sticky yang sesuai; kolom status/kategori memakai lebar rem agar label bawaan utuh. Pada HP dengan teks200%, navigasi bawah menjadi dua baris dan inset mengikuti tinggi target sentuh; tombol keranjang mengikuti alur halaman agar tidak menutup isi. Guard keluar editor dibersihkan ketika simpan/batal mengembalikan editor bersih. Ini koreksi implementasi D-75, tanpa perubahan keputusan bisnis.

## Kasir cepat — D-76

- Tanpa breadcrumb/judul Kasir/Pilih menu yang mengulang konteks. Search/filter memulai katalog; status kas/stok ringkas, workspace dua kolom tablet.
- Kartu nama/harga utama, tanpa kategori berulang; nama panjang tumbuh. Target44×44 tetap. Grup berpilihan memiliki petunjuk; sederhana langsung tambah dengan feedback nama/Urungkan satu unit. Item habis berlabel Habis dan disabled.
- Favorit sebelum Semua, posisi owner stabil; Menu & Stok → Favorit menyediakan pilih/Naik/Turun keyboard, tanpa drag wajib.
- Kepala pesanan menampung Channel (Toko statis bila tunggal), ID platform kondisional, identitas dan kontrol penyajian berikutnya. D-77: label Channel dan nilainya sebaris; tanpa copy terlihat Default penyajian/Untuk item berikutnya. Makan di tempat kiri/Bungkus kanan; nama aksesibel kontrol tetap ada. Reflow satu kolom pada teks200%; penyajian unit selalu terlihat.
- Kas tertutup: panel utama Mulai bertugas/Uang awal/Buka kas; tanpa katalog disabled. Kas aktif: status penanggung jawab/Kelola kas; serah-terima/tutup tetap lewat alur Kas.
- Pertahankan Inter lokal, token biru/netral, fokus/state/kontras ADS. HP360/gulir/teks200% tidak boleh memotong nama atau menyembunyikan akhir form. Panel review tetap utilitas prototipe.

[Bukti pemeriksaan D-76](berrie-site/REVIEW-KASIR-D76.md); [kriteria AC-159–164](specs/10-acceptance-criteria.md). Bukan hasil UT peserta atau gerbang pilot.

## Workspace Pesanan — D-78

Acuan visual Inter lokal/biru-netral dan komponen/state yang sama. Kelompok Aktif/Tersimpan memakai tab berlabel hitungan, filter select berlabel Pengerjaan/Pembayaran pada daftar saja. Entri operasional tombol seluruh lebar, identitas utama, ringkasan dua baris dan +N, status/progres/sisa/kewajiban/waktu terpisah. Pilihan memakai border2px + teks ✓ Dipilih + aria-pressed, tanpa mengandalkan warna. Gunakan token surface/divider/selected-surface/text-accent; fokus ring existing tetap.

≥900px grid2fr/3fr gap16, scroll terpisah dan min-width0 pada masing-masing area. Detail awal placeholder, tanpa auto-select. <900 daftar/detail bergantian pada region yang dipertahankan, tombol Kembali ke pesanan; filter satu kolom. Detail berurutan tagihan→item per batch/penyajian→pendukung; Aksi lainnya disclosure≥44. Nama panjang membungkus, ringkasan dapat dipendekkan tetapi nama utuh di detail; status bertulisan. Teks200% tetap scroll/reflow; tidak memaksa empat baris detail lama. D-78 mengganti tabel Pesanan generik/default Lunas serta detail tablet halaman terpisah; Kasir D-76/D-77 tetap.
