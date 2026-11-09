from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
 for width in [360,1024]:
  page=b.new_page(viewport={'width':width,'height':768});page.set_default_timeout(8000)
  page.goto('http://127.0.0.1:4173/?workspace=responsive',wait_until='networkidle')
  page.get_by_role('button',name='Kelola toko' if width==1024 else 'Lainnya').click()
  page.get_by_role('button',name='Pengaturan',exact=True).click()
  if width==360: page.get_by_role('button',name='Toko',exact=True).click()
  page.get_by_role('button',name='Edit',exact=True).click()
  field=page.get_by_label('Nama toko'); old=field.input_value();field.fill('Toko contoh baru')
  assert page.get_by_text('Perubahan belum disimpan').is_visible()
  page.get_by_role('button',name='Batal',exact=True).click();assert page.get_by_label('Nama toko').input_value()==old
  page.get_by_role('button',name='Edit',exact=True).click();field.fill('Draft test')
  if width==360: page.get_by_role('button',name='Kembali ke pengaturan').click()
  else: page.get_by_role('button',name='Printer',exact=True).click()
  assert page.get_by_text('Buang perubahan?',exact=True).is_visible();page.get_by_role('button',name='Lanjut edit').click();assert field.input_value()=='Draft test'
  page.get_by_role('button',name='Batal',exact=True).click()
  if width==360: page.get_by_role('button',name='Kembali ke pengaturan').click()
  page.get_by_role('button',name='Pajak & biaya layanan',exact=True).click()
  page.get_by_role('button',name='Edit',exact=True).click();page.get_by_label('Pajak (%)').fill('10');assert page.get_by_text('Rp55.000').is_visible()
  page.get_by_role('button',name='Batal',exact=True).click()
  if width==360: page.get_by_role('button',name='Kembali ke pengaturan').click()
  page.get_by_role('button',name='Printer',exact=True).click();assert page.get_by_text('Contoh Pelanggan').is_visible();assert page.get_by_text('Contoh Dapur').is_visible()
  if width==360: page.get_by_role('button',name='Kembali ke pengaturan').click()
  page.get_by_role('button',name='Data & Perangkat',exact=True).click();page.get_by_role('button',name='Pindah perangkat',exact=True).click();assert page.get_by_text('Simulasi · tidak memindahkan',exact=False).is_visible();page.get_by_role('button',name='Tutup dialog').click()
  assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  print(width,'draft, guard, pajak, printer, perpindahan, overflow OK',flush=True);page.close()
 b.close()
