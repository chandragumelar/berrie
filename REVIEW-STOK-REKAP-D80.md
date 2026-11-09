# Review prototipe Stok / Rekap online D-80

Prototipe data contoh dalam memori; bukan implementasi operasional atau kelulusan AC/UT peserta.

1. Daftar Stok memantau nama, sisa, kondisi domain dan detail per grup, dengan pencarian/filter serta keadaan kosong.
2. Detail responsif memisahkan informasi sekunder dan edit batas eksplisit dengan batal/simpan dan perlindungan perubahan.
3. Sesuaikan stok memakai total fisik, selisih dan alasan; operasi count lama memeriksa saldo saat dibuka dan mencatat baseline/ledger.
4. Rekap memakai Periode → Isi pemakaian → Periksa & simpan; pengaturan dan riwayat terpisah.
5. Kosong belum diperiksa; nol eksplisit. Aksi sisanya mengisi hanya yang kosong termasuk hasil tersembunyi; semua nol sah.
6. Detail stok menampilkan ledger tersedia, detail rekap memuat asal dan koreksi; referensi dibuka hanya jika cocok dengan data yang ada. Data hilang tidak dikarang.

Pemeriksaan: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` dijalankan pada sumber akhir sebagaimana dicatat dalam PR. Browser Chrome headless 1024×768 dan 360×768 menjalankan pencarian/filter, detail/kembali, edit batas, penyesuaian, aktivasi rekap, tiga tahap, kembali dengan input, simpan, riwayat dan penyimpanan koreksi; validasi kosong/invalid dan isi nol tersaring juga diperiksa. Jam contoh dimajukan tiga menit agar cutoff yang baru diaktifkan dapat diuji tanpa menunggu. Pengujian ini bukan penilaian visual menyeluruh atau UT peserta. Tidak ada screenshot baru yang disimpan.

Batas: belum diuji perangkat fisik, printer, keamanan, performa, restore, atau pilot. Penelusuran saldo/pelaku lama hanya menampilkan nilai yang memang tersimpan. Simulasi gagal dan hasil belum diketahui diperiksa pada rekap tablet; input tetap ada dan hasil diperiksa lewat operasi sama. Nama panjang, fokus pada tombol detail, teks review 200% dan ukuran tombol detail 78×48 px diperiksa pada kedua ukuran. Pemeriksaan aksesibilitas masih terbatas; commit lokal bukan bukti sinkronisasi server atau penyimpanan produksi.
