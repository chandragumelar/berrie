# Review Menu, Stok, Diskon dan Kas — D-68

9 Oktober 2026. Melanjutkan sumber aktual versi10/commit `daeb9652c89eb4189ca90acc4690728340636895` pada proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`. Rujukan awal versi4/nama REVIEW-KASIR-D67 pada permintaan sudah lama; bukti sebelumnya [REVIEW-MENU-D67.md](REVIEW-MENU-D67.md). Tidak ada deployment atau perubahan akses. Identitas simpan final/build/arsip dicatat di [tasks](../tasks.md) sesudah dikonfirmasi layanan.

## Perubahan dan keputusan

- Hapus menu di kolom paling kiri; konfirmasi mengarsipkan seluruh SKU grup dan menjaga histori. Log menu dihapus menampilkan tanggal/jam, pelaku, nama menu dan alasan. Saat draft berubah, selesaikan Simpan/Batal sebelum hapus agar tidak membuang edit lain.
- Batal/Simpan hanya muncul saat draft berbeda. Label Batal, dimensi pasangan sama. Revert ke nilai lama menyembunyikan aksi. Filter Perlu diperbaiki hanya muncul bila ada sel invalid; memilihnya menyaring baris yang perlu dikoreksi.
- Kategori wajib pada tambah/aktivasi/simpan, tanpa pilihan Tanpa kategori. Tambah kategori/tipe langsung di dropdown; CRUD di Pengaturan. Nama yang masih dipakai menu aktif tidak dapat dihapus. Rename menjaga snapshot pesanan/kode. Konfigurasi yang telah ditambahkan tersimpan tersendiri walau modal Menu dibatalkan.
- Stok: harga rata kiri; angka baseline dalam field berbatas membuka dialog hitungan aktual+alasan, tanpa tombol teks Ubah. Minimal editable, sisa teks baca saja. Pasangan aksi minimal hanya saat nilai berubah.
- Diskon menjadi pustaka persen/potongan rupiah/Beli X gratis Y. Dropdown penetapan di sebelah Varian; `-` berarti tanpa diskon. Penetapan/harga channel terpisah. Definisi digunakan tidak dapat dihapus, edit berlaku pada quote baru dan mempertahankan snapshot unit lama. Potongan melebihi harga menahan commit.
- Persetujuan pemilik untuk promo jumlah diterapkan umum X/Y1..99. **Beli2 gratis3 = terima5 bayar harga menu2**. Qty input mencakup unit gratis, berlaku berulang hanya SKU/pilihan identik dalam draft yang sama, sisa unit membayar penuh; topping seluruh unit tetap bayar. Debit stok seluruh qty sekali. Potongan dialokasikan ke seluruh unit kelompok memakai pembagian rupiah deterministik, refund parsial memakai alokasi asal. Unit confirmed tidak dihitung ulang. Promo tidak digabung diskon order. Nama diskon bukan mesin eligibility ulang tahun atau jadwal otomatis.
- Kas memperlihatkan actor/waktu pembukaan dalam zona toko, terpisah dari penanggung jawab saat ini. Uang awal + penjualan tunai bersih kembalian − refund tunai + uang masuk nonpenjualan − uang keluar nonrefund + koreksi. Penjelasan di setiap baris mencegah pencatatan penjualan/refund dua kali; ekspektasi tidak menggantikan hitung fisik.

## Bukti pemeriksaan prototipe

TypeScript strict/lint lulus; **95/95 tes domain lulus** (83 lama +12 tambahan). Cakupan baru: kombinasi X/Y dan qty1..16/harga ganjil/topping, sisa, penggabungan draft/pemisahan pilihan, confirmed tetap, pembayaran/retry/fullqty stok/refund parsial, diskon channel/snapshot/hapus/rollback/izin, kategori wajib/rename/hapus, stale katalog, potongan saat harga turun, pembatalan draft dan arsip tipe tetap terhapus. `git diff --check` serta build/packaging final dicatat pada tasks setelah hasil aktual.

Pemeriksaan interaktif localhost **1024×768**:

- Menu bersih tidak menampilkan pasangan aksi/error0; harga5000→7000/Batal kembali5000. Kedua tombol terukur166×48 px. Lima baris64,5–65 px/input56 px terlihat penuh, footer tidak menutup baris kelima. Kolom lebar dapat digulir horizontal; nama menu mempertahankan lebar terbaca.
- Stok minimal5→9 menampilkan Batal/Simpan; kembali5 menghilangkan aksi. Harga termasuk rentang rata kiri; baseline angka berbingkai, sisa baca saja.
- Tambah kategori Dessert inline tetap di modal Menu/terpilih; rename Dessert manis berhasil di Pengaturan. Hapus nama terpakai disabled; hapus unused berkonfirmasi.
- Definisi Beli2gratis3 tersimpan dan terpilih pada Es Teh. Qty5×5000 menghasilkan total10000, potongan15000, pembayaran tunai dan stok1000→995. Pengujian domain refund unit promo teralokasi4000 dari total20000/harga10000, tanpa return stok otomatis.
- Buka kas100000 memperlihatkan tanggal/jam/pelaku serta penjelasan per sumber. Hapus Matcha Latte memperlihatkan tanggal/jam/Maya Owner/nama menu dalam log; Batal konfirmasi tidak menghapus.
- Simulasi gagal simpan mempertahankan nama/nilai input; hasil belum diketahui diperiksa melalui operasi yang sama, tanpa membuat duplikat. Data contoh dikembalikan ke fixture; preview tetap berjalan dengan frame tablet1024×768.

Bukti visual sementara `/private/tmp/berrie-menu-d68.png` dan `/private/tmp/berrie-stok-d68.png`, bukan thumbnail deployment. Perubahan dipetakan ke AC-135–139/UT-29–30; bukan kelulusan seluruh AC atau hasil UT peserta.

## Batas

Prototipe Sites di memori, data demo hilang saat reload. Belum IndexedDB/API transaksi produksi, penulis tunggal lintas tab, auth/approval/offline/sync, migrasi, backup/restore, printer fisik, performa perangkat atau pilot. Source/version yang disimpan berbeda dari data contoh. Stack produksi dan gerbang rilis tetap pada specs; tidak dinyatakan siap operasional.
