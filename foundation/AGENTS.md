# Panduan agen — Berrie

## Tujuan dan urutan acuan

Berrie adalah POS makanan/minuman untuk UMKM: satu toko, satu perangkat kasir aktif, akun owner dan identitas staf berizin, operasional inti offline. Bahasa produk Indonesia; nominal IDR. Utamakan kemudahan kasir, ketepatan uang/stok dan pemulihan data.

Instruksi eksplisit terbaru pemilik mendahului keputusan tertulis. Mulai dari indeks spesifikasi pada peta berikut; keputusan produk di `specs/` sudah disetujui. Pekerjaan implementasi/validasi yang belum selesai tidak membuka ulang keputusan. Latar belakang dan batas riset ada pada file 01, alasan keputusan pada file 11, prinsip UX pada file 12, dan token visual pada design system. `AGENTS.md` mengatur cara bekerja, bukan menyalin seluruh spesifikasi.

Konflik nyata antarsesama sumber yang tidak terjawab keputusan tertulis: sebut file, aturan yang bentrok, dampak dan rekomendasi kepada pemilik. Lanjutkan pekerjaan yang tidak bergantung pada konflik itu.

## Peta file dan tanggung jawab

Setiap file sumber di bawah mempunyai satu peran utama. Baca sesuai tugas; revisi prototipe mengikuti spesifikasi dan design system terkini, dengan bukti implementasi pada review dan satu pelacak aktif.

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
| [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md) | Sistem desain aktif: palet HEX, font, body/label, spacing, shape, komponen/state, tema/material dan review; histori pada file 11 |
| [tasks.md](tasks.md) | Satu pelacak pelaksanaan aktif (`foundation/tasks.md` di GitHub); status, sisa pekerjaan, baseline dan bukti PR diperbarui bersama kode; bukan bukti otomatis AC/UT lulus |
| [app/README.md](app/README.md) | Kontrak dan perintah aplikasi operasional pada `foundation/app/` di GitHub |
| [berrie-site/README.md](../README.md) | Petunjuk prototipe Sites lokal, perintah dan batas simulasi |
| [berrie-site/REVIEW-HISTORY.md](../REVIEW-HISTORY.md) | Riwayat gabungan review D-43–70, bukti uji dan identitas versi lama; bukan acuan UI aktif |
| [berrie-site/REVIEW-PESANAN-D78.md](../REVIEW-PESANAN-D78.md) | Bukti/status workspace Pesanan D-78 dan batas verifikasi |
| [berrie-site/REVIEW-KASIR-D76.md](../REVIEW-KASIR-D76.md) | Bukti/status Kasir D-76, tes dan batas simulasi |
| [berrie-site/REVIEW-KASIR-D71.md](../REVIEW-KASIR-D71.md) | Bukti revisi Kasir/Riwayat dan arah visual Jira/Inter, hasil pemeriksaan dan batas simulasi |
| [berrie-site/REVIEW-ADMIN-LAPORAN-D75.md](../REVIEW-ADMIN-LAPORAN-D75.md) | Bukti/status editor, laporan, pengaturan dan staf D-75; batas simulasi dan verifikasi visual |
| [berrie-site/REVIEW-KAS-LAPORAN-D74.md](../REVIEW-KAS-LAPORAN-D74.md) | Bukti Kas tablet/finish bertumpuk dan laporan harian/telusur, batas simulasi laporan |
| [berrie-site/REVIEW-MENU-KAS-D73.md](../REVIEW-MENU-KAS-D73.md) | Bukti form menu agnostik, Kas ringkas dan audit fondasi Atlassian D-73 |
| [review-sites/](review-sites/) | Gambar review historis prototipe; bukan aset produk/target estetika atau izin screenshot baru |
| [Prototipe Sites](../) | Kode Sites: `app/` UI/style, `lib/berrie/` domain/tes; `components/ui/`, `lib/utils.ts` dependensi UI yang dipakai; favicon di `public/` |

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

## Acuan desain dan alur

Baca indeks spesifikasi dan keputusan terbaru, kemudian prinsip UX, alur, layar dan design system sesuai tugas. Kasir/Pesanan, Menu/Stok, Rekap, Pengaturan dan Laporan mengikuti sumber tersebut; review lama hanya bukti versi saat pencatatan. Jangan menyalin ringkasan keputusan bertanggal ke AGENTS sebagai aturan paralel. UI yang disetujui dipakai kembali sesuai AC-101; Sites tetap prototipe sampai integrasi operasional dibuktikan.

## Pelacakan dan verifikasi

- Di repo GitHub, root adalah prototipe Sites; `foundation/app/` aplikasi operasional dan `foundation/specs/` spesifikasi yang ikut repository. Pelacak aktif hanya `foundation/tasks.md`; jangan membuat salinan status kedua pada root repo atau app.
- Bila bekerja dari workspace pemilik dengan repository induk terpisah, periksa juga instruksi induk dan keputusan terbaru pemilik. Salinan spesifikasi bernama sama belum tentu identik; laporkan konflik nyata beserta file, aturan, dampak dan rekomendasi tanpa mengganti aturan bisnis sepihak.
- Sebelum memilih scope PR, periksa remote `main`, commit baseline, PR merged/terbuka, status checkout dan perubahan pengguna. Gunakan clone/worktree terpisah jika checkout tidak boleh diubah. Bila jaringan tidak tersedia, nyatakan keterbatasannya; jangan menyebut ref lokal sebagai keadaan remote terbaru.
- Setiap perubahan implementasi wajib memperbarui bagian Posisi sekarang, status tugas terkait, pemetaan bukti kode/PR, pekerjaan tersisa, dependensi paket dan bukti pemeriksaan pada pelacak dalam perubahan yang sama. Catatan tambahan di akhir tidak menggantikan ringkasan/tabel. Cocokkan pelacak dengan diff sebelum commit/PR; bila status tetap Berjalan, jelaskan bagian yang bertambah dan yang belum selesai. Jangan memperbarui tanggal saja.
- Cantumkan baseline commit dan bukti PR/commit yang sudah tersedia. Setelah merge, verifikasi commit merge sebelum mengklaim merged. Persetujuan spesifikasi, tes primitive atau PR parsial tidak menyelesaikan seluruh T/AC/UT.
- Ikuti perintah pada README dan manifest aplikasi yang benar. Fondasi Vite memiliki dev/build/typecheck/lint/test/test:browser; prototipe Sites mempunyai perintah tersendiri. Jangan mengklaim perintah yang tidak tersedia atau tidak dijalankan sebagai lulus.
- Untuk perubahan kode, jalankan pemeriksaan relevan dan regresi perilaku bermakna; prioritaskan uang/property, transaksi/isolasi/migrasi, offline/retry/crash. Dokumen saja: periksa konsistensi, tautan dan rujukan/dependensi, tanpa tes aplikasi yang tidak relevan.
- Sebelum menghapus dokumen, periksa pemakaian dan informasi unik; pindahkan bukti yang masih diperlukan ke sumber aktif, perbarui seluruh rujukan, lalu hapus. Jangan menyimpan salinan cadangan dokumen yang dipensiunkan atau menghapus kode/config/runtime untuk merapikan dokumen.
- Laporkan hasil aktual dan batas pengujian. Tes otomatis tidak menggantikan printer fisik, restore drill, keamanan, performa perangkat dan peserta UT. Kesiapan pilot/rilis hanya dinyatakan jika gerbang file 10 mempunyai bukti.
