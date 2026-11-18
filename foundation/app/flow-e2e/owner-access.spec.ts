import { test,expect } from '@playwright/test';

test('daftar melalui email lokal, aktivasi, PIN, reload dan logout',async({page,request})=>{
 const email=`flow-${crypto.randomUUID()}@example.test`,password=crypto.randomUUID()+'aA1!';
 await page.setViewportSize({width:360,height:800});await page.goto('/');
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByLabel('Email').focus();await expect(page.getByLabel('Email')).toBeFocused();
 await page.getByRole('button',{name:'Belum punya akun? Daftar'}).click();
 await page.getByLabel('Email').fill(email);await page.getByLabel('Kata sandi').fill(password);await page.getByRole('button',{name:'Daftar',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Verifikasi email'})).toBeVisible();
 let messageId='';
 await expect.poll(async()=>{
  const result=await request.get(`http://127.0.0.1:55424/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
  const data=await result.json() as {messages?:{ID:string}[]};messageId=data.messages?.[0]?.ID ?? '';return !!messageId;
 }).toBe(true);
 const message=await (await request.get(`http://127.0.0.1:55424/api/v1/message/${messageId}`)).json() as {HTML?:string};
 const link=message.HTML?.match(/href="([^"]+)"/)?.[1]?.replaceAll('&amp;','&');
 expect(link).toBeTruthy();const confirmation=await request.get(link!,{maxRedirects:0});expect([302,303,307]).toContain(confirmation.status());
 await page.getByRole('button',{name:'Kembali ke masuk'}).click();
 await page.getByLabel('Email').fill(email);await page.getByLabel('Kata sandi').fill(password);await page.getByRole('button',{name:'Masuk',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Siapkan toko'})).toBeVisible();
 await page.getByLabel('Nama toko').fill('Toko integrasi');await page.getByRole('button',{name:'Aktifkan perangkat'}).click();
 await expect(page.getByRole('heading',{name:'Buat PIN'})).toBeVisible();
 await page.getByLabel('PIN',{exact:true}).fill('483027');await page.getByLabel('Konfirmasi PIN').fill('483027');await page.getByRole('button',{name:'Simpan PIN'}).click();
 await expect(page.getByRole('heading',{name:'Kasir'})).toBeVisible();
 await page.getByRole('button',{name:'Pengaturan'}).click();const deviceBefore=await page.locator('dt').filter({hasText:'ID perangkat'}).locator('xpath=following-sibling::dd[1]').textContent();expect(deviceBefore).toBeTruthy();
 await page.reload();await expect(page.getByRole('heading',{name:'Buka kasir'})).toBeVisible();
 await page.getByLabel('PIN').fill('483027');await page.getByRole('button',{name:'Buka',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Kasir'})).toBeVisible();
 await page.getByRole('button',{name:'Pengaturan'}).click();await expect(page.locator('dt').filter({hasText:'ID perangkat'}).locator('xpath=following-sibling::dd[1]')).toHaveText(deviceBefore!);
 await page.setViewportSize({width:1024,height:768});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const other=await page.context().browser()!.newContext();const second=await other.newPage();
 await second.goto('/');await second.getByLabel('Email').fill(email);await second.getByLabel('Kata sandi').fill(password);await second.getByRole('button',{name:'Masuk',exact:true}).click();
 await expect(second.getByRole('heading',{name:'Kasir aktif di perangkat lain'})).toBeVisible();await other.close();
 await page.getByRole('button',{name:'Kunci'}).click();await page.context().setOffline(true);
 await page.getByLabel('PIN').fill('483027');await page.getByRole('button',{name:'Buka',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Kasir'})).toBeVisible();await page.context().setOffline(false);
 await page.getByRole('button',{name:'Keluar akun'}).click();await expect(page.getByRole('heading',{name:'Masuk'})).toBeVisible();
 await page.getByLabel('Email').fill(email);await page.getByLabel('Kata sandi').fill(password);await page.getByRole('button',{name:'Masuk',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Buka kasir'})).toBeVisible();await page.getByLabel('PIN').fill('483027');await page.getByRole('button',{name:'Buka',exact:true}).click();
 await expect(page.getByText('Toko integrasi')).toBeVisible();
 await page.getByRole('button',{name:'Kunci'}).click();
 for(let i=0;i<5;i++){await page.getByLabel('PIN').fill('000000');await page.getByRole('button',{name:'Buka',exact:true}).click();await expect(page.getByRole('alert')).toContainText('PIN salah');}
 await page.getByLabel('PIN').fill('483027');await page.getByRole('button',{name:'Buka',exact:true}).click();await expect(page.getByRole('alert')).toContainText('Terlalu banyak percobaan');
 await page.context().setOffline(true);await page.getByRole('button',{name:'Keluar akun'}).click();await expect(page.getByRole('heading',{name:'Masuk'})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>sessionStorage.getItem('berrie-auth-session'))).toBeNull();await expect(page.getByRole('alert')).toContainText('server tidak dapat dihubungi');
 await page.context().setOffline(false);await page.reload();await expect(page.getByRole('heading',{name:'Masuk'})).toBeVisible();
});
