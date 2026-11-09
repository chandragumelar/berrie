# Review Pengaturan D-81

Revisi lokal prototipe memori: kelompok Pengaturan, kategori/tipe pada Menu, draft konfigurasi, pemisahan Data & Perangkat, detail channel, preview pajak/printer dan status langganan contoh. Tidak ada layanan atau data produksi; status contoh bukan akun nyata.

Pemeriksaan lokal: typecheck, lint, test dan build tersedia melalui manifest. Pemeriksaan Chromium tanpa screenshot pada 360×768 dan 1024×768 mencakup edit/batal/guard, contoh pajak, preview printer, pembukaan perpindahan dan lebar halaman; pemeriksaan tambahan mencakup gagal simpan dan hasil belum diketahui, input bertahan, simpan akun/status channel dan kembali dari Menu, guard kategori/tipe, tahapan simulasi restore/perpindahan, posisi daftar HP dan penolakan mutasi dari HP owner. Script review berada di `scripts/check-settings-d81*.py` dan memerlukan Playwright Python serta Chrome lokal; bukan perintah npm proyek. Detail hasil final ada pada PR.

Semua data tetap memori sesi. Backup/restore, ACK, perpindahan, akun, pembayaran dan cetak adalah simulasi. Preview/dialog cetak bukan bukti kertas keluar; CSV bukan backup. Pemeriksaan ini tidak membuktikan printer fisik, restore produksi, keamanan, UT peserta atau kesiapan pilot.
