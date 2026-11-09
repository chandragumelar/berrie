from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
 page=b.new_page(viewport={'width':1024,'height':768});page.set_default_timeout(8000);page.goto('http://127.0.0.1:4173/?workspace=responsive',wait_until='networkidle')
 page.get_by_role('button',name='Kelola toko').click();page.get_by_role('button',name='Pengaturan',exact=True).click()
 page.get_by_role('button',name='Panel review').click();page.get_by_label('Gangguan simpan').click();page.get_by_role('option',name='Gagal simpan').click();page.get_by_role('button',name='Tutup panel review').click()
 page.get_by_role('button',name='Edit',exact=True).click();page.get_by_label('Nama toko').fill('Tetap ada');page.get_by_role('button',name='Simpan',exact=True).click();page.get_by_text('Perubahan belum tersimpan',exact=False).wait_for();assert page.get_by_label('Nama toko').input_value()=='Tetap ada';page.get_by_role('button',name='Batal',exact=True).click()
 page.get_by_role('button',name='Panel review').click();page.get_by_label('Gangguan simpan').click();page.get_by_role('option',name='Normal',exact=True).click();page.get_by_role('button',name='Tutup panel review').click()
 page.get_by_role('button',name='Channel penjualan',exact=True).click();page.get_by_role('button',name='GoFood',exact=False).click();page.get_by_role('button',name='Edit',exact=True).click();page.get_by_label('Akun outlet').fill('Akun contoh');page.get_by_label('Channel aktif').check();page.get_by_role('button',name='Simpan',exact=True).click();page.wait_for_timeout(400);assert page.get_by_text('Status: Aktif',exact=True).is_visible();assert page.get_by_label('Akun outlet').input_value()=='Akun contoh'
 page.get_by_role('button',name='Atur menu & harga').click();assert page.get_by_text('Menu & harga · GoFood').is_visible();page.get_by_role('button',name='Kembali ke channel GoFood').click();assert page.get_by_text('Status: Aktif',exact=True).is_visible()
 print('gagal menyimpan, input, channel bersama dan kembali OK',flush=True);b.close()
