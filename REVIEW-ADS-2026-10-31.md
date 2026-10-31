# Audit visual lintas prototipe terhadap ADS — 31 Oktober 2026

Melanjutkan D-75 lokal, tanpa commit/push/deployment/publish/versi layanan baru. Kondisi awal Git berisi perubahan tracked/untracked D-71–75 dan penghapusan file review lama; seluruhnya dipertahankan. Patch audit hanya menyentuh CSS bersama, semantik DataTable, design system dan catatan pekerjaan. Domain, rumus, izin, stok dan alur tidak diubah. Skill UI/UX Pro Max dipakai untuk fokus keyboard/modal dan panduan aksesibilitas; acuan utama tetap spesifikasi Berrie serta dokumentasi resmi ADS.

**Status terbaru: audit visual pelaksana pada cakupan representatif selesai, termasuk pemeriksaan Safari tablet/HP, teks200% dan zoom halaman200%.** Rincian bukti/batas ada pada penutupan dan lanjutan zoom di bawah. Tabel awal mencatat percobaan pertama, bukan status akhir. Zoom browser telah dipulihkan ke100% dan preview tablet1024×768 kembali terlihat. Prototipe tetap memori/data contoh, bukan aplikasi operasional atau siap pilot.

## Temuan ringkas dan perbaikan

| Temuan | Perbaikan sumber |
| --- | --- |
| Tab editor memakai garis bawah sekaligus centang, sementara Radix memakai komposisi berbeda | Satu garis seleksi2 px, bobot600, baseline dan inset bersama; hover/pressed terpisah; atribut/keyboard existing dipertahankan |
| Header tabel berulang kurang tegas; aturan font500 `!important` menimpa niat600 | Header seluruh tabel baca/editor memakai grouped/secondary600, separator2 px; kolom sticky konsisten |
| Editor sangat ramai oleh kontrol/status/aksi berwarna | Pilihan varian dinetralkan, status stok read-only dipadatkan menjadi label; kontrol edit tetap56/row64 dan batas input tetap terlihat |
| Pengaturan selected bergantung bidang/warna dan underline yang berbeda dari navigasi lain | Garis kiri+600, ritme4/16/24, aksi primer mengikuti isi di tablet dan lebar area di HP |
| Penekanan semantik `strong`/`b` diwarisi400; empty/feedback/dialog/disclosure tidak seragam | Penekanan600, badge12, empty ikon32, ritme feedback/disclosure/strip laporan, close44, safe area toast |
| Aturan hover/selected bersaing dengan disabled/error | Terminal state explicit termasuk Radix data-disabled; error tetap saat hover/fokus, outline di dalam kontrol tabel supaya tidak terpotong |
| Nama DataTable pada div non-region tidak memberi nama tabel; header tanpa scope eksplisit | `aria-label` langsung pada table, `scope=col`, region gulir bernama ketika dipakai |
| Toolbar laporan HP dua kolom berisiko mempersempit label+ekspor; tab label dipaksa nowrap | Satu kolom≤600, label tab boleh membungkus, section title+aksi boleh turun baris |

Palet dan konstruksi awal sudah dekat dengan bahasa ADS: Inter, biru/netral, border tipis, navigasi garis bawah. Perbedaan utama yang bisa diperiksa dari sumber adalah konsistensi, bukan kekurangan warna biru. Hasil sumber lebih konsisten pada tabel/tab/feedback/seleksi; **belum ada dasar untuk memberi skor kemiripan visual akhir atau mengklaim identik Jira**.

## Cakupan seluruh sumber dan status browser

| Layar/komponen aktual | Ditinjau dari sumber / dampak patch | Bukti browser sesi ini |
| --- | --- | --- |
| Kasir | Katalog, filter, keranjang, modal item, qty/penyajian/catatan, pembayaran, notifikasi, guard gagal/unknown; token/disabled/badge/close bersama | Layar awal dalam frame1024×768 terlihat: kas tertutup,8 kartu pendek penuh, keranjang kosong/disabled. Pembayaran dan3baris berisi belum diverifikasi ulang |
| Pesanan / Detail | Semua/Lunas/Belum bayar/Tersimpan, search, status kerja/uang, detail/penyajian/batal/refund/koreksi/struk; tabel/feedback bersama | Belum diverifikasi revisi ini |
| Riwayat | Tanggal awal/akhir/metode/search, error rentang, detail asal; header/nama tabel/empty bersama, nominal rata kiri tetap | Belum diverifikasi revisi ini |
| Menu & Stok → Menu | Tabel panjang, Tambah menu/varian, kategori/tipe inline, draft sticky, hapus/log, error; header/varian/seleksi/fokus bersama | Tabel awal dan form Tambah menu terbaca AX; tabel awal terlihat langsung sebelum patch final. Batal form dipakai; tidak menyimpan menu |
| Menu & Stok → Stok | Stok awal/koreksi beralasan, minimal/sisa, log; header dan label status bersama | AX tabel dan modal Ubah stok awal Es Kopi Susu terbaca; dibatalkan tanpa menyimpan. Capture/layout final belum dapat dipercaya |
| Menu & Stok → Rekap online | Toggle aktivasi, checkpoint/periode, qty, konfirmasi, koreksi/histori; tabel/disclosure/disabled bersama | AX keadaan belum diaktifkan/rekap tersimpan0 terbaca; form aktif belum diperiksa |
| Diskon | Pustaka, tambah/edit/persen/potongan/BOGO, jadwal, hapus, empty/error/disabled; tabel/modal bersama | Belum diverifikasi revisi ini |
| Kas | Belum buka/aktif/tertutup, uang masuk/keluar, finish/handover/count/blocker/riwayat; tabel/disclosure/callout bersama | Belum diverifikasi revisi ini. Grid angka≤640/finish kanan/workspace≤960 dipertahankan dari sumber |
| Laporan | Ringkasan/Telusuri angka/Kejadian penting/Dana platform; periode/urut/filter/disclosure/trace, empty/error/ekspor; tabs/toolbar/strip/tabel bersama | Belum diverifikasi revisi ini |
| Pengaturan | Toko/Kategori menu/Tipe menu/Metode pembayaran/Pajak & biaya layanan/Printer/Data & Perangkat/Akun & keamanan/Staf & izin/Channel penjualan/Langganan; selected/nav/form/tabel bersama | Belum diverifikasi revisi ini |
| Staf & izin / Persetujuan | Daftar/tambah/ubah/nonaktif/aktifkan/reset PIN demo/matriks izin/online/konfirmasi; tabel/dialog/disabled bersama | Belum diverifikasi revisi ini; tidak mengubah identitas/kebijakan contoh |
| Overlay dan fixture | Dialog existing dan popover/select/variable picker; Panel review/Komponen & aksesibilitas, terang/gelap/200%/gangguan simpan | Lainnya dan beberapa dialog terbaca AX. Tidak ada drawer alur terpisah baru; seluruh state hover/fokus/error/unknown belum diuji langsung |

Hanya memakai data contoh. Tidak ada produksi yang dibaca/diubah. Tidak menyimpan screenshot baru; observasi gambar ditampilkan langsung melalui alat.

## Kendala browser yang teramati

Preview `npm run dev -- --host 127.0.0.1 --port 4173` berjalan. Chrome native sempat menampilkan Kasir dan Menu pada frame tablet1024×768. Browser host terstruktur selalu melaporkan `The browser access host is unavailable` (Chrome dan browser bawaan); inventory browser kosong. Native menunjukkan perubahan AX yang kadang tidak sesuai isi/capture, klik koordinat memberi `noWindowsAvailable`, dan capture terakhir menjadi magenta polos. Menaikkan jendela, membuka UI responsif dan mencoba akses browser bawaan belum memulihkan akses yang konsisten. Ini belum membuktikan bug render Berrie. HTTP200 juga bukan bukti render React lulus.

Permintaan membuka layar Mac/Chrome sudah disampaikan. **HP360, pemeriksaan ulang seluruh tab setelah patch, tema gelap visual, keyboard/fokus, zoom200%, daftar panjang/akhir tabel dan state gagal/unknown masih tertunda.** Jangan mengubah status ini menjadi lulus dari inspeksi CSS atau hasil build.

## Validasi lokal

- `npm run typecheck`: lulus (exit0).
- `npm run lint`: lulus (exit0, tanpa warning).
- `npm test`:128/128 lulus, tanpa skip/failure; mencakup uang/stok/replay/cetak/tanggal/laporan/staf yang sudah ada. Tidak menambah tes yang hanya menyalin CSS.
- `npm run build`: lulus (exit0); catatan route `? Unknown` dari analisis statis Vinext tetap, bukan kegagalan build.
- Pengukuran22 pasangan token: teks terang≥5,20:1, gelap≥6,21:1 pada pasangan terpilih; border-control/surface terang3,23:1, gelap3,93:1; fokus/surface terang5,20:1, gelap7,39:1. Meliputi primary/secondary/selected/action/disabled/danger/warning/positive/info dan border/fokus. Bukan audit seluruh computed style/permutasi hover atau layar.
- `git diff --check` lulus. Tidak ada script `test:browser`; tidak dijalankan atau dilaporkan lulus.
- Pemeriksaan5 dokumen yang diperbarui:93 target tautan lokal ada; tidak ada target hilang. Build diulang setelah perubahan CSS terakhir dan kembali lulus dengan catatan Vinext yang sama.

Pemetaan: AC-101/109/110/143/147 untuk konsistensi, aksesibilitas dan target perangkat; AC-141/151/152/155 untuk editor/form; AC-153/154/156 untuk Kas/laporan; AC-157/158 untuk Pengaturan/staf. Regresi UT-33–43 tetap memerlukan pelaksana/kemudian peserta sesuai cakupannya; **tidak ada UT peserta atau AC visual penuh yang diluluskan dari sesi ini**. Tidak menambah keputusan produk, sehingga register/specs/ID lama tetap.

## Referensi resmi yang dipelajari

| Referensi | Penerapan / batas |
| --- | --- |
| [Foundations](https://atlassian.design/foundations), [Components](https://atlassian.design/components), [Tokens](https://atlassian.design/foundations/tokens), [All tokens](https://atlassian.design/components/tokens/all-tokens) | Token semantik dan komponen lintas aplikasi; indeks ditelusuri, bukan satu-satunya sumber |
| [Color](https://atlassian.design/foundations/color), [Spacing](https://atlassian.design/foundations/spacing), [Border](https://atlassian.design/foundations/border), [Radius](https://atlassian.design/foundations/radius), [Elevation](https://atlassian.design/foundations/elevation) | Warna menurut peran, basis8, border1/selected2, radius2/4/6/8/12, shadow hanya lapisan yang perlu; tidak memasang paket ADS |
| [App typefaces](https://atlassian.design/foundations/typography/product-typefaces-and-scale), [Iconography](https://atlassian.design/foundations/iconography), [Accessibility](https://atlassian.design/foundations/accessibility) | Hierarki/angka tabular, metafora dan label, kontras/reflow/keyboard; Inter OFL dan Lucide berbeda dari aset resmi |
| [Button usage](https://atlassian.design/components/button/usage), [Tabs usage](https://atlassian.design/components/tabs/usage), [Select usage](https://atlassian.design/components/select/usage), [Modal dialog usage](https://atlassian.design/components/modal-dialog/usage) | Hierarki aksi, seleksi/keyboard/label/fokus; tidak menyalin kepadatan desktop ke kontrol kasir |
| [Dynamic table](https://atlassian.design/components/dynamic-table/usage), [Lozenge](https://atlassian.design/components/lozenge/usage), [Empty state](https://atlassian.design/components/empty-state/usage), [Section message](https://atlassian.design/components/section-message/usage), [Flag](https://atlassian.design/components/flag/usage) | Header/nama/kolom, status bertulisan, langkah empty, feedback persisten vs notifikasi. ADS menyarankan modal untuk tabel kompleks; editor langsung Berrie tetap sesuai keputusan D-68/69. Flag Berrie tetap tengah |
| [Navigasi Jira](https://support.atlassian.com/jira-software-cloud/docs/what-is-the-new-navigation-in-jira/) | Referensi penerapan Jira dengan sidebar dan utilitas atas; Berrie mempertahankan navigasi tablet atas/HP bawah. Bukan inspeksi tenant Jira login atau pembandingan pixel-identik |

Halaman Text field terbuka tanpa isi yang dapat dibaca alat, sementara `/usage` gagal diambil. Tidak mengklaim telah mempelajari rincian halaman tersebut; pemeriksaan field bertumpu pada Select, Modal, Accessibility dan aturan proyek yang dapat dibaca. Sebagian ADS menandai perlakuan selected netral sebagai feature flag; bukan alasan mengganti selected biru Berrie yang disetujui. Tidak ada konflik aturan bisnis yang memerlukan perubahan keputusan.


## Penutupan pemeriksaan lanjutan Safari — 31 Oktober 2026

Pemilik mendelegasikan keputusan rutin audit lokal kepada agen. Sesi lama masih `waitingOnApproval`; pemeriksaan dilanjutkan di sesi pemanggil, tanpa mengubah kebijakan persetujuan sistem. HTTP loopback200 dan Safari native berhasil dipakai pada `?workspace=responsive`, viewport1024×768 serta360×768. Gambar hanya diamati langsung melalui alat; tidak menyimpan screenshot baru. Skill UI/UX Pro Max untuk fokus/modal dan Sites untuk workflow lokal dipakai; sumber, identitas Site dan pekerjaan sebelumnya dipertahankan.

### Temuan tambahan yang diperbaiki

| Temuan aktual | Perbaikan dan hasil ulang |
| --- | --- |
| Panah select status memenuhi sel seperti pola berulang di Safari | Geometry background chevron dipertahankan terhadap shorthand warna sel; satu panah per kontrol terlihat pada Menu |
| Header Menu bergeser dan menutupi label Varian | Header sticky mengikuti kolom pertama/ketiga yang benar; satu `thead` sticky, border terpisah; header Menu24baris dan Stok21baris terbaca sampai akhir |
| Label Tidak dijual dan Makanan terpotong dalam select | Lebar kolom status/kategori memakai rem dan ruang panah; kedua label terlihat lengkap pada tablet |
| Navigasi HP360 bertumpuk pada pembesaran teks200%; tombol Lihat menu berisiko tertutup | Navigasi dua baris khusus teks200%, inset mengikuti dua target sentuh, tombol keranjang mengikuti alur dokumen. Pembayaran dan Lihat menu terlihat penuh di atas navigasi setelah gulir akhir |
| Pesan guard keluar masih terlihat setelah Batal membersihkan editor | Callback dirty stabil membersihkan hanya pesan guard tersebut ketika editor bersih. Uji ulang: guard muncul saat pindah, Batal menghapus guard dan status draft |
| Dialog controlled tanpa Radix Trigger kehilangan titik kembali keyboard | Patch sesi sebelumnya pada `components/ui/dialog.tsx` dipertahankan. Tambah staf dibuka dengan Return dari pemicu yang difokuskan melalui keyboard; Escape mengembalikan fokus ke Tambah staf |

Perubahan tambahan pada `app/cashier-ui.css`, `app/page.tsx` dan patch dialog yang sudah ada tidak mengubah rumus/domain/izin/stock ledger. Kolom tabel tetap bisa digulir mendatar; tidak memaksa semua kolom ke lebar HP. Tidak membuat tes yang hanya menyalin CSS.

### Bukti langsung pada lanjutan ini

| Area | Bukti yang diamati |
| --- | --- |
| Kasir tablet | Delapan kartu pendek penuh; tiga baris Air Mineral/Americano/Ayam Bakar penuh bersama totalRp51.000 dan seluruh aksi. Identitas kosong mendapat error dekat input/fokus; modal punya default Bungkus. Panel pembayaran tunggal dan nominal tetap terlihat |
| Simpan gagal/unknown | Gagal menyimpan pembayaran mempertahankan uang diterima51.000 dan menampilkan pemulihan. Unknown mengunci metode/input/aksi utama; Periksa hasil operasi yang sama menghasilkan satu pesanan dan keranjang kosong. Ini bukti simulasi, bukan storage transaksional produksi |
| Pesanan/detail/Riwayat | Pesanan default Lunas, rincian status keuangan/penyajian terpisah, struk SALINAN, modal Refund disabled tanpa pilihan/konfirmasi dan footer bisa digulir. Pilih semua penyajian memindahkan transaksi selesai ke Riwayat; filter tanggal/metode dan total rata kiri terlihat |
| Menu/Stok/Rekap | Menu24baris dan Stok21baris digulir sampai Nasi Goreng; header utuh. Error nama kosong/status draft/guard keluar/Batal diperiksa. Tambah menu/Varian opsional tablet dan footer360 terlihat. Rekap diaktifkan pada data contoh; periode/tanggal/jam/tabel/CTA disabled tanpa input diperiksa, tanpa menyimpan rekap |
| Diskon | Pustaka dan form Tambah diskon; persen/jadwal mulai–selesai opsional, empat field tanggal-jam dan Batal/Simpan terlihat di360. Tidak menyimpan promo baru |
| Kas | Saldo contoh100.000+51.000=151.000, finish bertumpuk kanan pada tablet dan satu kolom di360. Tema gelap/teks200% mempertahankan label/nominal dan tombol. Modal Uang masuk200% dapat digulir sampai Simpan; tidak menyimpan pergerakan baru |
| Laporan | Ringkasan terisi51.000, transaksi/rata-rata, menu terjual/disclosure; Telusuri angka/filter, Kejadian penting/filter dan Dana platform/empty. Toolbar dan tab membungkus di360 tanpa menimpa isi. Tabel lebar memakai region gulir. Tidak mengunduh ekspor saat audit |
| Pengaturan | Toko sebagai tujuan awal; Kategori, Tipe/alias, Metode pembayaran, Pajak/layanan, Printer, Data & Perangkat, Akun & keamanan, Staf, Channel, Langganan serta Persetujuan owner kosong telah dibuka/dilihat. Label demo/produksi terpisah dan kontrol disabled terlihat; tidak mengubah akun, tarif, akses atau layanan nyata |
| Keyboard/tema/stress | Keyboard Tambah staf→Return→input→Escape→pemicu. Gelap pada Kas/modal/Persetujuan/Kasir HP. Fixture nama panjang80karakter dan harga98.765.432 tumbuh di modal/keranjang360; Total dan Tambahkan/Bayar terjangkau. Teks200% pada Kas/modal dan keranjang/pembayaran HP diperiksa; navigasi overlap diperbaiki lalu dilihat ulang |

Fixture stress dan transaksi uji hanya memori; dipulihkan melalui Mulai ulang data contoh. HMR sesudah perubahan hook juga memuat ulang fixture. Observasi terakhir yang berhasil: Menu bersih tablet1024×768, label select lengkap; lalu kembali ke Kasir. Chrome preview lokal dari sesi pemanggil tetap menunjuk root dengan frame tablet.

### Batas pemeriksaan pada penutupan pertama

Pada penutupan pertama, akses native Safari/Chrome terputus dengan `cgWindowNotFound` ketika mulai mencoba **zoom halaman browser** melalui View→Zoom In. Pemilihan level200% dan pemulihan level zoom tidak dapat dikonfirmasi. Nilai81% pada toolbar responsive Safari adalah skala tampilan viewport, bukan bukti page zoom. Jangan menyamakan pembesaran teks200% di panel review dengan page zoom200%.

Cakupan di atas adalah audit pelaksana pada state representatif, bukan seluruh kombinasi tema/viewport/state, lintasan keyboard setiap kontrol, hasil screen reader, atau kesetaraan semua browser. Sebagian dialog lanjutan, transisi Staf/offline/HP-owner dan refund lintas periode tetap bertumpu pada audit sumber/tes domain serta bukti sesi terdahulu yang disebut terpisah. Tidak meluluskan seluruh AC visual atau UT peserta. Printer fisik, performa perangkat, keamanan, IndexedDB/offline/restore drill dan gerbang pilot tetap di luar hasil prototipe ini.

### Pemeriksaan kode final

Typecheck, lint tanpa warning,128/128 tes domain dan build lokal lulus pada pemeriksaan lanjutan; build tetap mengeluarkan catatan klasifikasi route Vinext. Lint awal menemukan dependency callback `setError` belum dicantumkan; diperbaiki dan lint diulang lulus. Typecheck/build diulang sesudah patch dependency terakhir. `git diff --check` lulus. Tidak ada script `test:browser` yang dijalankan. Tautan lokal dokumen diperiksa kembali sesudah catatan akhir.

Pemeriksaan dokumen akhir:5 berkas/95 target tautan lokal di dalam repo ada, tanpa target hilang. Typecheck dan build ulang sesudah patch dependency terakhir kembali exit0; percobaan memulihkan Safari terakhir tetap `cgWindowNotFound`.

Pemetaan tetap AC-101/109/110/141/143/147/151–158 dan UT-33–43. Tidak menambah keputusan produk atau mengubah ID lama. Tidak ada commit/push/versi layanan baru/deployment/perubahan produksi. Pada penutupan pertama masih ada batas verifikasi zoom browser di atas; perkembangan berikut dicatat di bawah. Tidak menandai seluruh AC visual lulus.


## Lanjutan zoom dan penutupan audit pelaksana — 31 Oktober 2026

Sesudah laptop dinyalakan kembali, Safari native dapat dipakai lagi pada URL responsif lokal, viewport1024×768. Page Menu Safari menunjukkan175%, lalu dipilih200% dan dibuka ulang untuk memastikan nilai **200%** aktual. Nilai81% di toolbar Responsive Design Mode tetap hanya skala preview. Ini pemeriksaan page zoom, terpisah dari teks200% panel review pada sesi sebelumnya.

| Pemeriksaan pada page zoom200% | Hasil langsung |
| --- | --- |
| Kasir, navigasi bawah dan keranjang kosong | Header/filter/input dan label navigasi terbaca, tanpa overlap antartombol yang terlihat; tata letak beralih ke layar sempit |
| Buka kas | Judul, field uang awal/fokus, petunjuk dan tombol Buka kas tampil utuh; ditutup tanpa menyimpan |
| Lainnya | Isi modal dapat digulir sampai Pengaturan; tombol terakhir terlihat penuh |
| Menu & Stok | Tab/aksi tambah/search terbaca; tabel tetap dalam area gulir dengan kolom lebar. Label status Tidak dijual/Dijual tetap utuh |
| Tambah menu | Header/tutup dan footer Batal/Tambahkan ke tabel terlihat. Isi digulir sampai Stok awal/Stok minimal; footer tetap terlihat; Escape menutup tanpa menyimpan |
| Laporan Ringkasan kosong | Periode/penjelasan zona dan ekspor tersusun vertikal; kartu Penjualan/Uang diterima serta teks panjang membungkus di area konten dan bisa digulir |

Beberapa panggilan alat sempat memberi perubahan jendela/noWindowsAvailable/kegagalan capture; pembacaan ulang berhasil dan hasil akhir diamati langsung. Tidak menganggap error alat sebagai bug render aplikasi.

`Cmd+0` memulihkan zoom, lalu Page Menu dibuka ulang dan menunjukkan **100%**. Kembali ke Kasir: preview tablet1024×768 terlihat dengan navigasi atas, delapan kartu pendek penuh dan panel Pesanan baru di kanan, kas tertutup/data contoh. Tidak menyimpan screenshot atau mutasi contoh baru. Tidak ada perubahan kode pada lanjutan ini sehingga pemeriksaan aplikasi sebelumnya tetap berlaku; hanya catatan bukti/status yang diperbarui dan diperiksa konsistensinya.

Audit visual pelaksana untuk cakupan representatif di dokumen ini ditutup: temuan implementasi yang teramati telah diperbaiki/diperiksa ulang, tanpa temuan baru pada lanjutan zoom. Ini tidak meluluskan seluruh permutasi/AC/UT peserta atau gerbang operasional/pilot. Batas screen reader, browser/perangkat lain, alur lanjutan dan pengujian fisik tetap seperti dijelaskan di atas; bukan pekerjaan implementasi produksi yang selesai.
