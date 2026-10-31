# Review editor, Laporan dan Pengaturan — D-75

31 Oktober 2026. Melanjutkan sumber lokal D-74 di Site yang sama. Semua perubahan lokal sebelumnya dipertahankan; tidak commit/push, simpan versi layanan atau deployment. Versi layanan terakhir yang tercatat tetap12/D-69, tidak diperiksa ulang. Ini prototipe memori, bukan aplikasi operasional.

## Temuan dan keputusan susunan

Menu menyembunyikan teks status dirty dengan sr-only, aksi berada sesudah tabel dan field keterangan opsional. Stok minimal memiliki aksi serupa di bawah, tanpa status dirty per tab. Bar aksi dipindah ke atas editor dengan position:sticky, status terlihat dan Batal/Simpan setara. Bar punya ruang dalam layout dan scroll-padding; tidak memakai footer simpan fixed yang bersaing dengan navigasi HP/keyboard. Bukan klaim seluruh perangkat keyboard sudah diuji.

Tab mempertahankan input, status dirty Menu/Stok terlihat; keluar pengelolaan ditahan sampai simpan/batal. Peringatan beforeunload untuk draft membantu reload/menutup tab, bukan persistensi atau jaminan saat OS mematikan browser. Pending/unknown mengunci input; hasil diperiksa dari operasi sama. Field Keterangan perubahan opsional dihapus, audit rutin otomatis tetap. Modal koreksi stok tetap wajib alasan.

Staf sebelumnya daftar names statis; Rincian hanya mengubah input dialog lalu menutup dengan pesan simulasi tanpa menyimpan identitas. Tidak ditemukan alur tambah/nonaktif nyata pada state prototipe. Sekarang identitas ber-ID tetap tersimpan di state, tambah/ubah nama/nonaktif/aktifkan kembali/reset PIN demo dan kebijakan bersama melewati operasi domain berjejak/idempoten. Owner online wajib; HP boleh administrasi akses saja, ACK kasir ditampilkan terpisah dan bisa disimulasikan dari kasir. Pemegang laci wajib serah-terima sebelum dinonaktifkan. Tidak ada role builder/hard delete/verifier/PIN asli. Semua demo tetap memakai123456; reset hanya revisi jejak demo.

Toko pertama/default setiap masuk Pengaturan, shortcut Data & Perangkat tetap kontekstual. Tipe menu menempatkan Nama singkat (alias) berdampingan nama tipe; Batal/Simpan per baris mengommit nama+alias atomik, kode SKU/snapshot lama tetap. Menyimpan satu baris tidak menghapus draft baris tipe lain. Tampilan terpisah dihapus. Nama petugas baru dipakai di profil, pilihan akses/serah-terima, log stok, kas dan laporan; ID tetap saat nama diubah/nonaktif.

## Audit seluruh Laporan

| Area sebelumnya | Temuan / dampak | Susunan D-75 |
| --- | --- | --- |
| Pendapatan/headline | Uang diterima belum langsung menyebut neto refund dan pajak/layanan; Penjualan/refund berbeda basis | Ringkasan dua angka dengan dasar eksplisit; strip Payment >0/rata-rata sebelum refund, gratis terpisah |
| Periode | Sesi tertutup masih dilabel Sesi berjalan; filter detail berpotensi tertinggal saat ganti periode | Konteks menyebut sesi terakhir ketika tertutup; tanggal awal inklusif/akhir eksklusif zona toko; ganti periode mereset trace |
| Refund/diskon/gratis | Refund kontekstual sudah baik, diskon tidak perlu kartu baru | Catatan kejadian dengan angka aktual; diskon menu/order sudah masuk Penjualan, refund uang/platform berbeda; tidak ada insight generik |
| Menu penyumbang | Tabel di bawah rincian/metode; nilai neto tetapi label Nilai penjualan ambigu; belum ada link pesanan per SKU | Menu terjual lebih awal, urut nilai atau qty neto sesuai06, label pengembalian eksplisit/negatif tetap; telusur pesanan berisi SKU |
| Perhitungan | Disclosure sudah tersedia, tetapi jembatan penerimaan belum langsung ditulis | Rumus Penjualan dan Payment−refund uang keduanya terlihat pada disclosure; perbedaan platform/pajak/periode dijelaskan |
| Metode | Selalu menjadi panel panjang di jalur utama | Disclosure metode dengan pembayaran/refund/neto dan link; batas koreksi historis tetap jujur |
| Tren/perbandingan | Riwayat memori tidak membuktikan cakupan hari buka/periode lengkap | Disclosure per hari memakai kejadian yang sama dan merekonsiliasi total; tidak mengarang nol/data lengkap/perbandingan persen |
| Telusuri angka | Filter internal ada tetapi sulit diganti; nominal menu drill berisiko dianggap subtotal SKU | Tombol Semua/Penjualan/Penerimaan/Pengembalian, filter berlabel; menu drill menjelaskan nominal seluruh pesanan; kembali dari detail mempertahankan state komponen |
| Perlu diperiksa | Filter pengecualian negatif memasukkan aktivitas rutin lain | Kejadian penting memakai daftar perubahan/pengecualian, filter petugas/channel hanya untuk daftar ini, tanpa vonis fraud atau menjumlah nominal aktivitas sebagai omzet |
| Dana platform | Sudah terpisah tetapi pengguna perlu tahu filter ringkasan tidak berlaku | Tab dipertahankan, cakupan seluruh tagihan lintas periode ditulis; pencairan bukan Payment/penjualan baru, biaya null tetap belum diperiksa |
| Ekspor | Label tidak menyebut cakupan seluruh periode saat trace aktif | Ekspor periode CSV; penjelasan filter rincian tidak mempersempit ekspor; incompleteness menahan ekspor |
| Kosong/data lama | Tanpa catatan bukan bukti toko tak berjualan; refund lama mungkin kurang metadata | Empty state menyebut periode/pembayaran, warning pengembalian tidak lengkap tetap; tidak mengklaim hasil setelah refund lengkap |

Tidak menambah laba/HPP, chart dekoratif, proyeksi, perbandingan tak sebanding atau klaim sebab-akibat. Definisi metrik06, alokasi integer07, timing settlement/refund dan seluruh invariants dipertahankan.

## Pemeriksaan aktual dan status

- `npm test`: **128/128 lulus**. Tujuh regresi baru: identitas/replay/rename/nonaktif/aktifkan tanpa menghapus histori; penolakan offline/staf/reader/owner-target; HP administrasi/ACK tanpa efek kas/stok; pemegang laci/reset PIN demo; kebijakan/batas/payload tetap; rename+alias atomik tanpa perubahan SKU/histori; rekonsiliasi catatan harian lintas waktu pembayaran/refund.
- Fixture tes hapus menu sebelumnya memakai nama `Rani` sebagai actor ID. Disesuaikan ke ID tetap `a` agar tetap menguji approval dengan identitas valid; tidak melemahkan pemeriksaan staf nonaktif/tidak dikenal.
- `npm run typecheck`, `npm run lint` (tanpa warning) dan `npm run build` lulus pada sumber final. Build mengeluarkan catatan klasifikasi route Vinext sebagaimana D-74, bukan kegagalan build. Tidak ada script test:browser.
- Endpoint preview loopback memberi HTTP200. HTTP200 bukan bukti React berhasil dirender.
- **Browser/tablet1024×768/HP360 belum dapat diverifikasi pada revisi ini.** Native Chrome sempat memberi AX judul halaman tanpa konten; screenshot menjadi warna magenta polos, lalu gagal dengan ScreenCaptureKit SCStreamError -3811. Browser host juga tidak tersedia. Ini kendala akses verifikasi, belum terbukti sebagai bug render atau bukti layout lulus. Pemilik diminta mengaktifkan/membuka kunci layar jika sedang terkunci. Tidak mengklaim daftar panjang/fokus/keyboard/tema/empty/gagal browser sudah diuji.

Pemeriksaan dokumen:22 berkas/317 tautan lokal; seluruh target di dalam repo ada. Empat rujukan historis di luar repo tidak tersedia (dua path skill Sites versi1.0.1 dan dua gambar temporer D-74); tidak dibuat ulang/dihapus atau dianggap bukti baru. ID D-01–75/AC-01–158/UT-01–43 disebut lengkap, git diff --check lulus.

Pemetaan D-75, AC-155–158, UT-40–43; sumber/domain terimplementasi, kelulusan visual/operasional/peserta masih belum. Daftar tugas visual tersisa: Menu dan Stok daftar panjang, aksi/status/revert/pindah/keluar, simpan gagal/unknown, baris terakhir dan keyboard HP; Toko default/alias valid-duplikat; staf kosong/tambah/ubah/nonaktif-holder/HP/offline; semua tab laporan kosong/berisi/refund lintas periode, trace/kembali, tanggal invalid dan ekspor; tablet1024×768/HP360, tema/fokus/200%.

## Batas simulasi

Memori React tetap hilang saat reload. Belum IndexedDB, server, permit/KDF, isolasi perangkat, printer, backup/restore, histori lengkap/koreksi metode/penyesuaian lintas sesi atau autentikasi staf. HP/kasir adalah dua permukaan pada state demo yang sama, bukan bukti sinkronisasi lintas perangkat. User testing, printer fisik/performa/keamanan/restore drill dan gerbang pilot/rilis tetap belum selesai. Tidak ada produksi, layanan atau publikasi yang diubah.

## Lanjutan audit visual lintas prototipe — 31 Oktober 2026

[Audit ADS terbaru](REVIEW-ADS-2026-10-31.md) menambahkan perbaikan komponen bersama dan merinci cakupan sumber seluruh layar. Browser sempat menampilkan Kasir/Menu dan AX Stok/Rekap/dialog, lalu kembali tidak andal/magenta. Ini tidak menutup daftar verifikasi visual D-75 di atas: seluruh tab/HP360/state setelah patch masih tertunda. Checks lokal dan batas bukti dicatat pada review tersebut; keputusan D-75 dan status operasional/UT/pilot tetap.


## Lanjutan Safari dan batas akhir

Pemeriksaan awal di atas telah dilanjutkan melalui Safari native: tablet1024×768/HP360, daftar panjang/header Menu–Stok, draft/error/guard/Batal, form/varian, subtab laporan/Pengaturan, fokus dialog, tema gelap dan teks200% pada state representatif. Temuan panah select/header/navigasi200%/pesan guard diperbaiki lalu diperiksa ulang. Typecheck/lint/128tes/build lulus. [Bagian penutupan audit ADS](REVIEW-ADS-2026-10-31.md#penutupan-pemeriksaan-lanjutan-safari--31-oktober-2026) memuat bukti spesifik, bukan kelulusan seluruh skenario D-75. Lanjutan sesudah laptop menyala menutup pemeriksaan page zoom200% Safari pada Kasir/Buka kas/Lainnya/Menu/form Tambah menu/Laporan; zoom dipulihkan100% dan preview tablet1024×768 kembali terlihat. Audit pelaksana pada cakupan representatif selesai; cakupan penuh perangkat/keyboard/UT tetap belum terverifikasi. Tidak ada screenshot baru, deployment atau kelulusan operasional/pilot.
