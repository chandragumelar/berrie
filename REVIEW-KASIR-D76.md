# Review Kasir D-76 — 31 Oktober 2026

Revisi lokal terpadu atas instruksi eksplisit pemilik: memperbolehkan tambah langsung dan mengganti kewajiban modal/Tambahkan untuk setiap pemilihan. Arah visual Inter lokal/biru-netral ADS dipertahankan, tanpa paket/framework/backend baru. Pekerjaan lokal D-71–75/audit ADS dipertahankan. Tidak ada commit, push, cabang pembanding, simpan versi layanan, publish atau deployment.

## Hasil implementasi

| Area | Perilaku saat ini |
| --- | --- |
| Kepala Kasir | Breadcrumb Kedai…/Transaksi, judul Kasir dan heading Pilih menu dihapus. Search/filter memulai katalog; status kas/stok ringkas, dua kolom tablet dan navigasi utama tetap. Panel review tetap utilitas prototipe. |
| Tambah langsung | Satu SKU jual tanpa pilihan aktif; label kombinasi tetap tunggal bukan pemilihan. Ketuk menambah qty1 draft memakai quote/channel/promo/default saat itu. Penggabungan tampilan mempertimbangkan SKU, harga/channel/promo, topping/racikan/pilihan, catatan, penyajian, status/batch. Confirmed tidak berubah. |
| Editor/Urungkan | Menu berpilihan menunggu Tambahkan ke pesanan. Baris draft bisa diedit, qty inline tetap. Feedback nama ditambahkan/Urungkan menyimpan order+ID satu unit baru, menghapus tepat unit tersebut sekali; tidak berlaku pada unit confirmed/lunas, dikunci busy/unknown dan dihapus sesudah commit sukses. Edit atau penambahan melalui editor menghentikan kesempatan sebelumnya. |
| Favorit | Filter sebelum Semua; satu kartu per grup. Menu & Stok → Favorit hanya owner, pilih menu/Naik/Turun/Hapus favorit dengan tombol keyboard. Urutan tidak mengikuti stok/harga/penjualan. Habis tetap pada posisi owner, disabled; nonaktif tidak tampil. Masuk Kasir memilih Favorit bila ada aktif, selain itu Semua. Search membatasi filter, kosong menawarkan Lihat semua menu. |
| Kepala pesanan | Channel terlihat, Toko awal/statis bila satu aktif, ID platform kondisional. Guard perubahan channel saat ada item/confirmed tetap; identitas tetap wajib. Default Makan di tempat kiri/Bungkus kanan, keterangan Untuk item berikutnya; setiap pesanan baru Bungkus. Default tidak menyentuh item lama. |
| Kas | Kas tertutup hanya Mulai bertugas/Uang awal/Buka kas, lalu workspace setelah sukses. Kas aktif menunjukkan penanggung jawab/Kelola kas. Pemegang berbeda hanya panel serah-terima sebelum melayani. Tidak ada toggle atau jalur tutup langsung; Kas/hitung akhir/blocker/ledger tetap. |

Domain tambahan `lib/berrie/cashier.ts` memusatkan klasifikasi menu sederhana, tambah/undo, pemilihan/filter/urut Favorit dan quote kartu grup. Rumus uang, debit stok, settlement/refund, izin, operasi/idempotensi, cetak dan pemulihan tidak diganti. `Order.serving` adalah default berikutnya; detail/struk tetap membaca `Unit.serving`.

## Bukti pemeriksaan pelaksana

Menggunakan preview loopback port4173, Chrome dengan frame lokal1024×768 dan Safari Responsive Design Mode1024×768/360×768. Gambar hanya diamati melalui alat, tidak menyimpan screenshot baru.

- Tablet: Mulai bertugas tanpa katalog/identitas; uang awal100.000 → Buka kas → workspace. Search/filter dan kepala pesanan baru terlihat, tanpa breadcrumb/judul duplikat. Status penanggung jawab/Kelola kas terlihat. Pemeriksaan akhir Safari1024×768 menampilkan sepuluh kartu pendek penuh serta tiga baris Air Mineral/Ayam Bakar/Es Teh lengkap dengan kontrol qty, total38.000 dan seluruh aksi. Caption/default dan spasi tablet dipadatkan tanpa target di bawah44×44.
- Alur langsung: Air Mineral langsung masuk draft, feedback/Urungkan menghapus satu penambahan. Es Kopi Susu membuka editor pilihan, default Bungkus; baru masuk setelah Tambahkan ke pesanan. Air Mineral Bungkus ditambahkan, default diganti Makan di tempat, lalu penambahan baru terpisah. Baris lama tetap Bungkus. Penyajian kopi diubah khusus item melalui editor; dua baris Air Mineral tetap berbeda.
- Pembayaran: identitas Review 76, total28.000, Bayar → panel tunggal → Uang pas → Simpan pembayaran. Sukses memberi notifikasi/perintah cetak simulasi, draft kosong dan default baru Bungkus. Tidak ada Urungkan pembayaran. Ini pencatatan/cetak simulasi, bukan uang/kertas nyata.
- Favorit: pilih Air Mineral dan Kentang Goreng, fokus Naik Kentang melalui Shift+Tab, Return memindahkan urutan; fokus berpindah ke Turun yang masih tersedia dengan outline terlihat. Kembali Kasir otomatis Favorit; Kentang tetap pertama/berlabel Habis/disabled, Air Mineral berikutnya.
- Keyboard: dari Uang awal, Tab memfokuskan Buka kas dengan outline, Return membuka kas. Naik/Turun diuji seperti di atas. Escape menutup editor. Ini cakupan keyboard representatif, bukan seluruh lintasan atau pengujian screen reader.
- HP360: panel Mulai bertugas, buka Rp0, katalog, tambah langsung dan kepala pesanan/qty/penyajian/total/aksi diperiksa. Teks200% reflow dan gulir sampai Bayar/Bayar nanti/Simpan dulu/Lihat menu di atas navigasi dua baris.
- Stress: nama80 karakter/harga98.765.432 pada kartu dan keranjang360/teks200% tumbuh dan dapat digulir. Ditemukan judul modal memenuhi ruang dan total bertumpuk; diperbaiki menjadi satu modal gulir, label total/nominal bertumpuk vertikal. Uji ulang mencapai catatan/total/tombol Simpan perubahan item tanpa overlap. Nominal panjang boleh membungkus di modal sempit; tidak dipotong.

Alat native kadang menunjukkan AX yang lebih baru daripada capture/aksi fokus yang tidak sesuai. Observasi yang berhasil dicatat di atas; perubahan AX saja tidak dianggap bukti layout. Browser host terstruktur tetap unavailable. Tidak mengklaim semua permutasi viewport/tema/dialog atau page zoom200% diuji ulang pada D-76; teks200% di panel review berbeda dari page zoom. Pengujian page zoom audit sebelumnya tetap historis.

## Pemeriksaan kode dan dokumentasi

- `npm run typecheck`: lulus.
- `npm run lint`: lulus tanpa warning.
- `npm test`:137/137 lulus, tanpa skip/failure. Sembilan tes D-76 mencakup klasifikasi, tambah langsung/pemisahan snapshot/confirmed, default dan pengecualian per item, undo satu unit, Favorit/filter/urut/izin/replay, quote grup/channel/promo/BOGO, draft tanpa debit, process→settlement dan replay tepat sekali. Tes filter lama diselaraskan untuk Favorit.
- `npm run build`: lulus; catatan klasifikasi route `? Unknown` Vinext tetap, bukan error build.
- `git diff --check`: lulus. Tidak ada script test:browser; tidak dijalankan/diklaim lulus.
- Spesifikasi02–10/12, register D-76, AC-159–164, UT-44–46, design system, indeks, AGENTS, README dan tasks diperbarui; ID lama dipertahankan. Pemeriksaan18 dokumen/310 target tautan lokal: semua ada, tanpa target hilang.

## Batas hasil

Favorit tersimpan pada State.settings.favorites dan default pada Order.serving di memori React. Reload/HMR memuat ulang data contoh; bukan localStorage/IndexedDB, sync, server ACK, backup/restore atau keamanan owner produksi. Urutan tetap selama sesi simulasi, bukan janji persistensi antarperangkat. Produksi tetap mengikuti stack dan kontrak file07/08.

Bukti debit/replay berasal dari domain simulasi: draft/tambah/undo/default tanpa ledger, konfirmasi mengurangi satu kali, settle batch confirmed/replay tidak mengurangi lagi. Bukan bukti transaksi storage atomik, isolasi tab atau crash recovery produksi. Serah-terima dan blocker Kas tetap memakai alur/domain lama, dengan regresi tes yang lulus; tidak seluruhnya diulang lewat browser D-76. Printer fisik, UT peserta44–46, keamanan/performa perangkat, offline/restore drill serta gerbang pilot belum diluluskan.

Penutupan: ukuran teks Safari dipulihkan100% dan viewport1024×768. Preview lokal tetap berjalan untuk review pemilik. Bukti UI representatif di atas tidak meluluskan seluruh AC visual.

## Koreksi copy D-77 — 31 Oktober 2026

Instruksi lanjutan pemilik: hapus copy terlihat Default penyajian/Untuk item berikutnya; Channel dan nilai/pemilih sebaris, kontrol penyajian di bawah. Nama aksesibel Default penyajian tetap, tanpa perubahan default/per-item/channel/domain. Chrome tablet1024×768 diamati langsung: Channel Toko sebaris, dua copy hilang, baris draft Pisang Goreng tetap Makan di tempat. Draft pengguna dipertahankan. Safari capture gagal audio/video pada percobaan ini; Chrome berhasil. Tidak menambah tes cermin copy/CSS; regresi domain dan checks dijalankan sebelum commit.

Pemilik mengotorisasi commit/push; merge dilakukan pemilik. Checkpoint mencakup revisi lokal terdahulu yang saling bergantung (D-71–76/audit ADS), tanpa menimpa/membuang pekerjaan. Dokumen root di luar repo Git berrie-site tetap lokal; tidak mengubah struktur repo atau membuat salinan spesifikasi kedua. Repo GitHub kosong, baseline e322684 menjadi main untuk dasar merge, revisi pada branch terpisah. Tidak ada konfigurasi workflow/deploy di repo tujuan kosong atau workflow .github lokal; tidak menjalankan deployment/layanan Sites.

Pemeriksaan D-77: typecheck dan lint tanpa warning,137/137 tes serta build lokal lulus. Build tetap memberi catatan klasifikasi route Vinext yang sama. Diff staged diperiksa termasuk file baru; satu whitespace lama pada stylesheet baru dibersihkan. Tidak ada deploy/merge.
