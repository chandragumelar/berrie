# Panduan agen — Berrie

## Tujuan dan urutan acuan

Berrie adalah POS makanan/minuman untuk UMKM: satu toko, satu perangkat kasir aktif, akun owner dan identitas staf berizin, operasional inti offline. Bahasa produk Indonesia; nominal IDR. Utamakan kemudahan kasir, ketepatan uang/stok dan pemulihan data.

Instruksi eksplisit terbaru pemilik mendahului keputusan tertulis. Mulai dari indeks spesifikasi pada peta berikut; keputusan produk di `specs/` sudah disetujui. Pekerjaan implementasi/validasi yang belum selesai tidak membuka ulang keputusan. Latar belakang dan batas riset ada pada file 01, alasan keputusan pada file 11, prinsip UX pada file 12, dan token visual pada design system. `AGENTS.md` mengatur cara bekerja, bukan menyalin seluruh spesifikasi.

Konflik nyata antarsesama sumber yang tidak terjawab keputusan tertulis: sebut file, aturan yang bentrok, dampak dan rekomendasi kepada pemilik. Lanjutkan pekerjaan yang tidak bergantung pada konflik itu.

## Peta file dan tanggung jawab

Setiap file sumber di bawah mempunyai satu peran utama. Baca sesuai tugas; revisi prototipe mengikuti spesifikasi dan design system terkini, dengan bukti/status implementasi pada review dan tasks.

| File / lokasi | Peran dan kapan digunakan |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Cara kerja agen dan peta repo ini |
| [specs/README.md](specs/README.md) | Pintu masuk spesifikasi, urutan acuan dan status keputusan terkini |
| [specs/01-product-scope.md](specs/01-product-scope.md) | Scope, prioritas, stack dan urutan pembangunan |
| [specs/02-user-flows.md](specs/02-user-flows.md) | Urutan alur pengguna; dibaca setelah prinsip UX untuk tugas alur |
| [specs/03-menu-and-availability.md](specs/03-menu-and-availability.md) | Katalog, SKU/varian, topping, promo, alias tipe, stok dan CSV |
| [specs/04-orders-and-dine-in.md](specs/04-orders-and-dine-in.md) | Pesanan, batch, penyajian, tambahan dan pembatalan |
| [specs/05-payments-and-refunds.md](specs/05-payments-and-refunds.md) | Pembayaran, settlement, koreksi metode dan refund |
| [specs/06-cash-and-reports.md](specs/06-cash-and-reports.md) | Kas, blocker penutupan, serah-terima laci dan definisi laporan |
| [specs/07-data-and-business-rules.md](specs/07-data-and-business-rules.md) | Model data, invariants, rumus uang dan kontrak penyimpanan |
| [specs/08-offline-backup-and-restore.md](specs/08-offline-backup-and-restore.md) | Izin aktivitas/actor/approver, request/receipt/offline, keamanan, sync dan pemulihan; baca sebelum implementasi jalur berizin |
| [specs/09-screens-and-hardware.md](specs/09-screens-and-hardware.md) | Penerapan per layar, navigasi, layout, cetakan dan perangkat |
| [specs/10-acceptance-criteria.md](specs/10-acceptance-criteria.md) | AC dan gerbang pilot/rilis; menentukan bukti kelulusan |
| [specs/11-decisions-and-open-questions.md](specs/11-decisions-and-open-questions.md) | Register D/V dan alasan perubahan; histori keputusan berada di sini |
| [specs/12-ux-principles.md](specs/12-ux-principles.md) | Prinsip interaksi/bahasa/aksesibilitas, cakupan kemampuan dan UT; dibaca sebelum 02/09 untuk tugas UI |
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Sistem desain aktif D-78: palet HEX, font, body/label, spacing, shape, komponen/state, tema/material dan review; histori pada file 11 |
| [tasks.md](tasks.md) | Status pekerjaan, dependensi, kebutuhan eksternal dan catatan pelaksanaan; bukan bukti otomatis AC/UT lulus |
| [berrie-site/README.md](berrie-site/README.md) | Petunjuk prototipe Sites lokal, perintah dan batas simulasi |
| [berrie-site/REVIEW-HISTORY.md](berrie-site/REVIEW-HISTORY.md) | Riwayat gabungan review D-43–70, bukti uji dan identitas versi lama; bukan acuan UI aktif |
| [berrie-site/REVIEW-PESANAN-D78.md](berrie-site/REVIEW-PESANAN-D78.md) | Bukti/status workspace Pesanan D-78 dan batas verifikasi |
| [berrie-site/REVIEW-KASIR-D76.md](berrie-site/REVIEW-KASIR-D76.md) | Bukti/status Kasir D-76, tes dan batas simulasi |
| [berrie-site/REVIEW-KASIR-D71.md](berrie-site/REVIEW-KASIR-D71.md) | Bukti revisi Kasir/Riwayat dan arah visual Jira/Inter, hasil pemeriksaan dan batas simulasi |
| [berrie-site/REVIEW-ADMIN-LAPORAN-D75.md](berrie-site/REVIEW-ADMIN-LAPORAN-D75.md) | Bukti/status editor, laporan, pengaturan dan staf D-75; batas simulasi dan verifikasi visual |
| [berrie-site/REVIEW-KAS-LAPORAN-D74.md](berrie-site/REVIEW-KAS-LAPORAN-D74.md) | Bukti Kas tablet/finish bertumpuk dan laporan harian/telusur, batas simulasi laporan |
| [berrie-site/REVIEW-MENU-KAS-D73.md](berrie-site/REVIEW-MENU-KAS-D73.md) | Bukti form menu agnostik, Kas ringkas dan audit fondasi Atlassian D-73 |
| [review-sites/](review-sites/) | Gambar review historis prototipe; bukan aset produk/target estetika atau izin screenshot baru |
| [berrie-site/](berrie-site/) | Kode Sites: `app/` UI/style, `lib/berrie/` domain/tes; `components/ui/`, `lib/utils.ts` dependensi UI yang dipakai; favicon di `public/` |

Konfigurasi/manifes/lockfile dan berkas tersembunyi prototipe Sites mengikuti README proyek. Pada Sites, `build/`, `scripts/`, konfigurasi framework dan `.openai/hosting.json` mengatur preview/build/identitas Sites; `lib/connector*`, `app/chatgpt-auth.ts` dan `components/connector-error.tsx` adalah dukungan opsional runtime Sites, bukan fitur POS aktif. `db/`, `drizzle/`, `drizzle.config.ts` dan `cloudflare-env.d.ts` mendukung tooling starter yang masih tercantum pada konfigurasi/perintah. Vendor stylesheet dan lisensinya berpasangan. Tidak menafsirkan dukungan tersebut sebagai backend produksi Berrie.

`node_modules/`, `dist/`, `.next/`, `.wrangler/`, `.sites-runtime/`, cache dan keluaran tes adalah hasil lokal yang diabaikan; bukan sumber yang perlu dipetakan satu per satu. Jangan menyalin/menghapus konfigurasi runtime untuk merapikan dokumen.

Jika keputusan produk berubah, perbarui spesifikasi terdampak, register keputusan, AC/UT, design system bila relevan dan status pekerjaan dalam pekerjaan yang sama; pertahankan ID lama. Jangan menambah bagian arahan historis berulang di AGENTS; riwayat tetap pada register dan catatan pelaksanaan.

## Cara bekerja dengan pemilik

- Gunakan bahasa Indonesia santai, jelas dan ringkas; jelaskan dampak praktis sebelum detail teknis.
- Kerjakan cakupan yang diotorisasi sampai selesai. Tentukan detail rutin/pilihan paling sederhana yang sesuai spesifikasi; jelaskan asumsi yang berpengaruh. Jangan meminta konfirmasi berulang untuk keputusan final atau tindakan lokal mudah dibalik.
- Tanyakan hanya bila perlu mencegah perubahan scope/aturan bisnis atau dampak sulit dibalik. Persetujuan spesifikasi bukan izin membeli layanan, mengubah data produksi atau memublikasikan; cek otorisasi sesi dan siapkan hasil konkret sebelum persetujuan akhir yang masih diperlukan.
- Pertahankan pekerjaan pengguna; jangan reset/menimpa/menghapus untuk mempermudah implementasi. Penghapusan file yang memang diminta pemilik tetap boleh setelah rujukan/dependensi diperiksa.
- Laporkan hasil aktual, pemeriksaan yang dijalankan dan kendala. Jangan menyebut mockup fitur operasional selesai atau target hasil pengukuran.

## Stack dan batas implementasi

- Produksi tetap React + TypeScript strict + Vite, PWA, Dexie/IndexedDB, Supabase Auth/PostgreSQL dengan satu API mutasi transaksional, Cloudflare Pages dan backup Cloudflare R2 terpisah. Target Singapore mengikuti validasi penyedia; starter Vinext Sites hanya prototipe.
- Jangan mengganti vendor/framework utama atau memperluas MVP tanpa perubahan pemilik. Barcode, banyak kasir simultan, stok resep, split bill, gateway pelanggan, layar dapur, integrasi/import otomatis platform, paket/komponen stok belum masuk scope. D-69 mengizinkan rentang mulai–selesai diskon, tanpa jadwal berulang/mesin kampanye.
- Pisahkan domain/perhitungan dari React, storage, jaringan dan printer. UI memanggil operasi domain; rumus uang tidak diduplikasi per layar.
- Tipe domain eksplisit dan validasi batas input/import/API/restore; server tetap memeriksa izin/invariants. Gunakan dependensi seperlunya, package manager proyek dan lockfile; verifikasi dokumentasi resmi bila perlu.
- Rahasia server/backup tidak masuk bundle/log/fixture/repo; contoh konfigurasi tanpa rahasia.

## Integritas yang wajib dijaga

- Uang integer rupiah, tarif basis point; pembulatan/alokasi file 07. Tanpa float biasa untuk hasil finansial; snapshot harga/promo/tarif dan histori dapat ditelusuri.
- Draft tidak mengurangi stok. Konfirmasi pembuatan melalui Bayar nanti/Minta dibuat mengurangi sekali. Bayar: Simpan pembayaran mengonfirmasi draft+settlement+debit stok dalam satu commit. Bayar unit confirmed, retry, sync dan cetak ulang tidak mendebit lagi.
- Harga/qty/stok agnostik D-73: pemilik menentukan arti angka tanpa mode satuan/konversi; qty integer1–999. Stok wajib integer ≥0 per grup menu D-58, dipakai bersama oleh seluruh SKU rasa/ukuran; tanpa mode manual/tidak dihitung. Data lama tanpa stok ditahan sampai admin mengisi hitungan awal berjejak. Keuangan dan pengerjaan terpisah; lunas bukan disajikan. Tambahan setelah lunas pesanan baru. Batal, refund uang dan return stok kejadian berjejak berbeda; cegah duplikasi, jangan hapus histori.
- Mutasi lokal+ledger/audit/outbox atomik. ID operasi tetap, receipt/idempotensi/constraints dan satu penulis antar-tab; tombol disabled bukan pengaman tunggal. Jaringan/cetak setelah commit, di luar transaksi storage.
- IndexedDB database operasional, bukan localStorage. Efek bisnis berasal dari kasir aktif; HP owner hanya administrasi akses/keputusan approval online sesuai file 08. Approval bukan bukti eksekusi/perpindahan uang.
- Bedakan tersimpan lokal, ACK server, pembayaran terverifikasi, kertas fisik dan backup. Sukses harus punya bukti sesuai jenis hasil.
- Tutup kas mengikuti semua blocker file 06; jangan menyelesaikan pesanan/refund otomatis atau mengubah sesi tertutup. Ganti penanggung jawab lewat serah-terima tanpa reset ledger/selisih.
- Restore/migrasi mempertahankan data lama saat gagal; CSV bukan backup. Jangan menyarankan hapus data browser sebagai solusi umum.
- Satu printer untuk dapur/pelanggan; ulang bertanda SALINAN. Dialog selesai bukan bukti kertas keluar; dukungan perangkat perlu uji fisik.

## Desain dan workflow terkini

- D-75 (31 Oktober2026): aksi Menu/Stok sticky di atas editor, status draft terlihat/guard keluar, tanpa keterangan perubahan opsional; alasan koreksi tetap. Laporan ringkas/menu/kejadian dan detail disclosure, dasar neto/periode eksplisit. Alias di Tipe menu, Toko pertama/default. Staf dikelola owner online dengan ID tetap/nonaktif, izin aktivitas bersama; PIN hanya simulasi. Acuan/bukti pada review D-75, pemeriksaan visual mengikuti status aktual.

- D-74 (13 Oktober2026): Kas breakdown≤640 px kiri/finish bertumpuk kanan pada≥900 px, workspace≤960; sempit satu kolom. Laporan mengutamakan Penjualan/Uang diterima/transaksi/rata-rata/menu penyumbang nilai, refund/gratis kontekstual dan telusur ke pesanan asal. Navigasi tablet atas/HP bawah tetap. D-73 tetap: harga/qty/stok agnostik; varian opsional pada form Tambah menu yang sama; breakdown Kas maksimum640 px. Arah visual Jira/Inter lokal/biru-netral, komponen sendiri; satu UI tanpa pembanding/backup baru. Ikuti DESIGN-SYSTEM.md D-74 (audit dokumentasi resmi Atlassian: radius per peran, font/ikon/tab/state/ruang). UI yang disetujui dipakai kembali sesuai AC-101; Sites tetap prototipe/data contoh, bukan aplikasi operasional. Simpan lokal, tanpa deployment sampai diotorisasi.
- Kasir: navigasi horizontal Kasir/Pesanan/Riwayat + Kelola toko; D-76 kartu sederhana langsung tambah qty1/Urungkan satu unit draft, berpilihan tetap editor/Tambahkan; Favorit per grup/urutan owner di Menu & Stok; Channel dan default penyajian hanya item berikutnya di kepala pesanan; D-77 Channel/nilai sebaris, tanpa copy terlihat Default penyajian/Untuk item berikutnya, awal Bungkus/dine-in kiri/bungkus kanan; Mulai bertugas saat kas tertutup, Kelola kas/serah-terima tanpa bypass penutupan; qty draft inline; tanpa Item berikutnya di card. Satu filter aktif; Semua/Habis/Promo selalu ada, kategori owner; nol di Habis, nonaktif hanya administrasi. Identitas wajib, pembayaran satu panel, sukses save/process/settle empty+notifikasi/Lihat pesanan, D-72 cetak otomatis sesudah commit: Bayar nanti dapur, bayar dapur batch baru lalu pelanggan/batch lama pelanggan saja; Simpan dulu tanpa cetak/debit dan Edit pesanan dari detail ke Kasir. Struk/ulang di detail tanpa dialog otomatis/konfirmasi kertas/bagikan; ulang SALINAN. Riwayat awal–akhir inklusif/default hari ini zona toko. Pesanan D-78: Aktif/Tersimpan, filter kerja/bayar AND awal Semua; tablet≥900 daftar40/detail60, HP detail penuh/kembali menjaga konteks; aksi sesuai bagian/detail bersama, refund due langsung dan Aksi lainnya. Definisi selesai/integritas tetap.
- Label Bayar nanti/Bayar/Simpan dulu/Simpan pembayaran/Refund/Catat refund/Pesanan baru dipertahankan. Draft tanpa debit; commit mengonfirmasi tepat sekali. Simpan gagal mempertahankan input; unknown diperiksa dari operasi yang sama.
- Font Inter lokal/OFL, target44×44, keyboard/fokus/zoom/kontras/status selain warna. Tablet1024×768/default target8 kartu pendek dan3 baris pesanan normal penuh; nama panjang tumbuh/gulir. HP baseline360; review komponen di luar alur kasir.
- Administrasi mengikuti D-61–69/file03/06/07: variabel owner/harga dasar+tambahan nonnegatif/default pertama; kategori wajib/CRUD kategori-tipe/tambah inline; pustaka diskon reusable persen/potongan/Beli X gratis Y dan jadwal mulai–selesai opsional zona toko. Tanpa impor. Menu/Stok/Rekap gulir vertikal/header sticky, row≥64/input≥56. Hapus/log actor-waktu, Batal/Simpan kontekstual simetris, stok satu row/menu/baseline beralasan/minimal editable/sisa read-only. Kas ringkas/satu saldo tercatat/hitung buta/label hitungan akhir/blocker tetap. Detail mengikuti specs, bukan histori review.

## Status dan verifikasi

Per 1 November 2026: root memiliki Git lokal baru; `berrie-site/` tetap Git sendiri dan dikecualikan dari root. Versi layanan terakhir12 (D-69), identitas pada tasks. Pemilik menyetujui arah visual dan alur D-71; sumber/pemeriksaan lokal pada REVIEW-KASIR-D71.md, REVIEW-KAS-LAPORAN-D74.md/tasks, belum disimpan menjadi versi layanan baru/deployment. Rujukan D-01–78, V-01–10, AC-01–172, UT-01–49. Scaffold T-01 berada di `app/`; T-02/T-03 masih berjalan, dan aplikasi operasional, uji peserta/perangkat fisik/gerbang pilot belum selesai. Periksa keadaan aktual sebelum bekerja.

- Perintah scaffold operasional tercatat pada `app/README.md`; perintah Sites tersedia pada README/manifest Sites: dev/build/typecheck/lint/test; tidak ada test:browser. Jangan melaporkan perintah yang tidak ada sebagai lulus.
- Scaffold baru harus menyediakan dan mendokumentasikan dev/build/typecheck/lint/test nyata. Untuk perubahan kode, jalankan pemeriksaan relevan dan regresi perilaku bermakna; prioritaskan domain uang/property, transaksi/isolasi/migrasi serta offline/retry/crash.
- Petakan perubahan ke AC/UT terkait; happy path checkout tidak membuktikan integritas/pilot. Dokumen saja: periksa konsistensi, tautan dan rujukan/dependensi berkas, tanpa tes aplikasi yang tidak relevan.
- Catat batas pengujian; tes otomatis tidak menggantikan printer fisik, restore drill, keamanan, performa perangkat dan peserta UT. Jangan menyatakan siap pilot/rilis sebelum gerbang file 10 punya bukti.
