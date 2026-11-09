from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless=True)
 for width in [360,1024]:
  page=b.new_page(viewport={'width':width,'height':768});page.add_init_script("window.addEventListener('error',e=>{if(e.message.includes('ResizeObserver loop'))e.stopImmediatePropagation();});");page.set_default_timeout(8000);page.goto('http://127.0.0.1:4173/?workspace=responsive',wait_until='networkidle')
  page.get_by_role('button',name='Kelola toko' if width==1024 else 'Lainnya').click();page.get_by_role('button',name='Menu & Stok',exact=True).click()
  page.get_by_label('Cari menu').fill('roti');page.get_by_role('button',name='Kelola kategori & tipe').click();page.get_by_label('Tambah kategori').fill('Draft kategori')
  page.get_by_role('button',name='Tipe menu',exact=True).click();page.get_by_role('button',name='Lanjut edit').click();assert page.get_by_label('Tambah kategori').input_value()=='Draft kategori'
  page.get_by_role('button',name='Tipe menu',exact=True).click();page.get_by_role('button',name='Buang perubahan').click();assert page.get_by_label('Tambah tipe').is_visible()
  page.get_by_label('Tambah tipe').fill('Draft tipe');page.get_by_role('button',name='Kembali ke Menu').click();page.get_by_role('button',name='Lanjut edit').click();assert page.get_by_label('Tambah tipe').input_value()=='Draft tipe'
  page.get_by_role('button',name='Kembali ke Menu').click();page.get_by_role('button',name='Buang perubahan').click();assert page.get_by_label('Cari menu').input_value()=='roti'
  page.get_by_role('button',name='Kelola kategori & tipe').click();page.get_by_label('Tambah kategori').fill('Tetap');page.get_by_role('button',name='Kasir',exact=True).click();page.get_by_role('button',name='Lanjut edit').click();assert page.get_by_label('Tambah kategori').input_value()=='Tetap'
  print(width,'guard kategori/tipe dan konteks Menu OK',flush=True);page.close()
 b.close()
