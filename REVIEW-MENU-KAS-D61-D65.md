# Review prototipe — Menu, Stok dan Kas D-61–65

8 Oktober 2026. Proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`, checkout lokal `berrie-site/`. Sumber sebelumnya versi7, tanpa deployment. Identitas versi hasil revisi dan hasil build/arsip dicatat sesudah konfirmasi layanan pada [tasks](../tasks.md); simpan versi tidak memublikasikan situs.

## Cakupan yang diterapkan

- + Menu menggantikan Tambah baris. Tabel lima kombinasi per halaman, area minimum378px, row minimum64/input56; tidak menyusut ketika stok awal/error muncul. Stok awal hanya untuk menu baru; input menu/harga jelas. Kolom variabel mengikuti menu di halaman/pencarian, nama/checkbox sticky saat scroll horizontal.
- + Variabel pada menu membuka nama/nilai langsung, pilihan tunggal/beberapa, harga per kombinasi atau gratis; kosong `-`. + Variabel lagi dan + Kombinasi tersedia dalam editor. Kasir hanya melihat variabel menu itu; multi Keju+Jamur mengikuti harga kombinasi tersimpan. Data racikan/topping lama tetap dapat dibaca, snapshot pesanan tetap.
- Stok memiliki Isi stok (tambahan) dan Stok opname (hasil fisik), saldo tercatat read-only, hasil/selisih dan keterangan wajib. Draft kedua kegiatan terpisah. Stok minimal berupa input owner, tanpa mengubah saldo.
- Rekap online tanggal/jam sampai menit, input Jumlah terpakai online berbatas nyata. Histori Koreksi mengikuti Koreksi stok/default approval owner. Catatan asal/rentang/checkpoint tidak ditimpa; stok berubah dengan delta revisi terakhir, bukan mengurangi jumlah baru lagi. Rincian asal/koreksi dapat dibaca.
- Kas menampilkan rincian uang seharusnya dan Pergerakan uang laci dengan Uang masuk/keluar selama berjualan. Selesai bertugas terpisah: petugas sama langsung bereskan/hitung/tutup, ganti petugas hitung/autentikasi/konfirmasi/serah-terima dan teruskan sesi yang sama. Langkah akhir tersedia sesudah hitungan sesuai tujuan disimpan; cancel mempertahankan jejak hitungan dan melepaskan penghentian layanan.
- Tidak ada impor CSV/Excel pada UI tahap ini. Parser/tes kompatibilitas CSV lama dipertahankan; bulk harga/kategori dan pengisian sel tetap. Urutan paste multiline lama yang mengunci Rasa/Ukuran dipensiunkan bersama kolom tetap.

## Pemeriksaan aktual

TypeScript strict, lint dan **75/75 tes domain** lulus, termasuk kombinasi multi/kanonis, snapshot harga/definisi/default gratis, blank/no variable, validasi/rollback tabel, stok tambahan/opname/minimal, koreksi delta/revisi/stale/izin/approval owner/idempotensi, hitungan sesuai tujuan, blocker, cancel dan selisih beberapa segmen. Regresi pembayaran/promo/refund/debit stok/cetak ulang lama tetap lulus. `git diff --check` lulus. Build/packaging hasil sumber ini diverifikasi workflow penyimpanan; hasil akhirnya tercatat pada tasks. Tidak ada script test:browser; pemeriksaan berikut memakai preview browser langsung.

Browser localhost dengan iframe1024×768:

1. + Menu berpindah ke halaman terakhir dan fokus nama; Pizza baru Rp25.000/stok20 berhasil disimpan. Lima row terukur64,5–65px, input56px; tabel378px. Saat row baru memiliki error nama/harga, row tumbuh114,5px dan area425px, tidak menyusut. Screenshot final `/private/tmp/berrie-menu-d61-d65.jpg`.
2. Pizza tanpa variabel di Kasir tidak menampilkan Ukuran/Gula/Topping. Setelah owner menambahkan Topping multi Keju/Jamur, kombinasi kosong Rp25.000 dan Keju+Jamur Rp30.000 tersimpan. Memilih keduanya pada dialog item menampilkan totalRp30.000. Kombinasi yang belum mempunyai harga ditahan; harga tidak dijumlah dari opsi.
3. Es Teh1000 + Isi stok10 menghasilkan1010; opname fisik999 menghasilkan999 (selisih−11). Field stok minimal7 dapat disimpan. Rekap8 menghasilkan991; Koreksi3 beralasan menghasilkan996, histori menampilkan1 koreksi dan jumlah terkini3. Native input akhir mempunyai step60 dan value YYYY-MM-DDTHH:mm. Periode sama/lebih awal ditolak dan input bertahan.
4. Kas owner100.000 − uang keluar20.000 untuk belanja menghasilkan ekspektasi80.000; hitungan akhir80.000 membuka langkah3, tutup berhasil tanpa serah-terima. Sesi berikut50.000, serah-terima ke Rani/PIN demo123456/diterima50.000 mempertahankan kas terbuka dan menambah penanggung jawab; ekspektasi staf disembunyikan sebelum hitungan. Hitungan akhir50.000 membuka langkah3. Membatalkan dialog mempertahankan sesi terbuka dan menampilkan kembali Hitung laci lebih dahulu. Jejak pertama/revisi dan jumlah selisih segmen diverifikasi domain. Screenshot komposisi Kas final `/private/tmp/berrie-kas-d61-d65.jpg`.

Bukti screenshot hanya review lokal, bukan deployment thumbnail. Root localhost tetap viewport tablet1024×768 ketika dibuka; versi hosted tetap responsif bila nanti diterbitkan. HMR perubahan domain dapat me-reload data contoh; data demo tetap memori sesi.

## Pemetaan dan batas

D-61–65, AC-127–131 dan UT-22–25 diselaraskan pada spesifikasi/design system/AGENTS/tasks. AC-04/05 dan cabang impor ditunda, ID lama tetap. AC-109/110 tema/zoom/perangkat dan AC-101 persetujuan visual masih memerlukan bukti lengkap. Skill UI/UX Pro Max dibaca sebagai panduan tambahan kontekstual/input/error recovery; tidak dipasang lokal dan tidak mengganti token Berrie.

Ini prototipe data contoh; bukan IndexedDB/offline/server approval/authentikasi nyata, tidak menguji backup/restore/printer fisik atau performa perangkat. PIN demo/checkbox bukan bukti autentikasi/penerimaan uang nyata. Belum UT peserta, persetujuan visual atau kelulusan pilot/produksi. Tidak ada deployment atau perubahan akses.
