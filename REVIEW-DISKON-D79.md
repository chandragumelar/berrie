# Review Diskon D-79

Keputusan pemilik untuk prototipe memori: workspace Diskon mengelola penawaran, sasaran SKU–channel dan jadwal, dengan perubahan hubungan dalam satu operasi simulasi. Hubungan tetap dipakai Menu dan snapshot pesanan tetap. Tidak ada deployment atau koneksi aplikasi operasional.

Pemeriksaan: tes domain massal/konflik/pelepasan/rollback/Menu/snapshot dan suite prototipe 147 tes lulus; lint dan build lulus. Typecheck manifest lulus setelah konfigurasi prototipe mengecualikan foundation/app yang memiliki konfigurasi terpisah. Pemeriksaan browser lanjutan dan batasnya tercatat di bawah. AC-173/174 dan UT-50/51 belum dinyatakan lulus; UT peserta, perangkat dan pilot belum dilakukan.

## Review browser lanjutan

Chrome 156 via Playwright, preview lokal: pada 1024×768 dan 360×768 diuji buat 10%, pilih semua hasil pencarian Es Kopi Susu, setujui konflik, tampilkan field jadwal, guard Kembali/Lanjut edit, simpan, edit dan lepas hasil terlihat. Tidak ada overflow horizontal pada skenario tersebut. Keyboard: input persen dan Tab ke nama; nama panjang dan pilih seluruh hasil tidak menyebabkan overflow horizontal; Buang perubahan kembali ke daftar. Pada 1024×768 gangguan gagal mempertahankan input; unknown mempertahankan input dan pemeriksaan operasi yang sama menampilkan satu hasil serta menutup editor. Pemeriksaan lanjutan di kedua ukuran mencakup navigasi utama dengan Lanjut edit/Buang perubahan, gagal/unknown, jadwal invalid dan valid, penolakan konflik, nama manual dan contoh Beli X gratis Y. Keyboard diperiksa pada input dan perpindahan Tab, bukan audit aksesibilitas menyeluruh; UT peserta tetap belum dilakukan. Pada HP, overlay development ResizeObserver sempat menghalangi skenario dan ditutup untuk melanjutkan; bukan bukti masalah pada build produksi.

Guard navigasi utama dan penggantian draft ketika memilih diskon lain diperbaiki dalam review lanjutan. Pemeriksaan typecheck, lint, 147 tes dan build diulang dan lulus. Tidak ada deployment atau kelulusan UT peserta/pilot.
