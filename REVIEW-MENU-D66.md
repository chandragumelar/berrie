# Review Menu & Stok — D-66

8 Oktober 2026. Proyek Sites `appgprj_6ac54219b9248191bf551b9871d78958`, checkout lokal dari versi8. User menyebut versi4 dan REVIEW-KASIR-D61-D65.md; sumber aktual yang ditemukan ialah versi8 dan REVIEW-MENU-KAS-D61-D65.md. Melanjutkan sumber terbaru, tanpa mengembalikan revisi lain. Identitas simpan layanan dicatat pada tasks setelah konfirmasi, bukan deployment.

## Perubahan

- Seluruh label editor memakai Varian. Deskripsi persis “Tambahkan pilihan yang dimiliki menu ini”; contoh persis “Contoh: Ukuran cup (Kecil, Besar). Topping (Susu, Cokelat). Ice (Normal, Less Ice)”.
- Tabel Status/Menu/Varian/Harga/Kategori kemudian pilihan/harga channel/Tipe. Checkbox tetap kontrol pemilihan, bukan kolom bisnis. Lima baris dan nama/checkbox sticky dipertahankan.
- + Menu modal Tambah menu/Batal. Batal tidak menambah draft; Tambahkan ke tabel menaruh menu pertama, fokus nama, tetap di atas setelah save. Batal tambah menu sebelum commit hanya menghapus grup baru dari draft. Stok awal/minimal dari modal dapat diperbaiki sebelum save.
- Pemilik menolak alur + Kombinasi. Diganti Varian → nama/pilihan → Lanjut ke harga → daftar harga di dialog → Terapkan varian & harga → Simpan perubahan. Pilihan tunggal membuat daftar harga otomatis; harga baru kosong/wajib eksplisit. Multi mengusulkan kosong/satuan dan menjaga harga pasangan existing; Harga untuk pilihan lain memilih topping yang dibeli bersama, lalu menambah entri harga. Hapus pilihan harga tersedia di dialog. Batas30 mencegah daftar eksponensial; di atas batas otomatis owner menentukan pilihan harga sendiri.
- Harga/ID existing tetap; penggabungan pilihan dengan harga berbeda ditahan. SKU yang dikeluarkan dari daftar harga diarsipkan saat commit, stok/histori/snapshot dipertahankan. Definisi terpakai tetap satu per grup.
- Diskon sub di bawah Menu & Stok serta bagian workspace untuk akses layar kecil. Atur diskon membuka form katalog/channel yang sama dengan aturan domain promo existing. Tidak ada Rincian di tabel; Stok opname hanya Stok → Stok opname. Ledger tetap tersedia di Stok → Perubahan stok.

## Bukti lokal dan batas

- Root preview `http://127.0.0.1:4173/` terukur iframe1024×768 termasuk dialog, tanpa parameter. Default wrapper localhost yang sudah ada dipertahankan.
- Browser/DOM memeriksa urutan kolom, copy Varian, Batal modal (24 pilihan tetap24), tambah Milkshake Uji tampil baris pertama, daftar Kecil/Besar Rp12.000/Rp16.000 dan commit26 pilihan. Baris pertama masih terlihat setelah save; stok awal50 satu grup. Nama/varian/harga terbaca, lima row terukur64,5–65 px, input56, area tabel378; Kategori terlihat sebelum batas kanan region pada tablet.
- Editor kopi existing memunculkan dua harga Kecil/Besar tanpa + Kombinasi. Keyboard Lanjut/Batal/Terapkan bekerja. Satu click pointer footer editor gagal pada otomasi iframe; pengujian diteruskan dengan keyboard, bukan dinyatakan bukti tap perangkat fisik.
- Diskon submenu membuka daftar5 pilihan; form Es Kopi Besar tanpa stok opname. Simpan15% menampilkan15% sesudah commit. Aturan topping/promo/order/snapshot tetap memakai domain existing.
- Typecheck, lint dan77 tes lulus. Dua tes baru menjaga harga/ID/stok existing, rollback bila harga baru kosong, tidak ada opening stok kedua atau perubahan pesanan lama, kanonisasi pasangan multi dan pembatasan daftar. Build lokal lulus; build/packaging final saat simpan dicatat pada tasks.
- Tidak ada screenshot baru/thumbnail deployment. QA ini menggunakan DOM, ukuran elemen dan interaksi; belum persetujuan estetika. HP/zoom200/tema/perangkat fisik dan UT-22/26 belum diuji pada revisi ini.

Pemetaan: AC-126/127/128 dan AC-132; UT-22/26. Data bisnis hanya memori sesi dan reload menghapus contoh. Tidak membuktikan IndexedDB, approval/server/offline, printer, backup, migrasi, restore drill atau pilot. Kasir/Pesanan/Riwayat/Kas di luar cakupan visual revisi; regresi domain terkait tetap dijalankan. Tidak ada deployment atau perubahan akses.
