const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// --- SETTING PENCARIAN ---
// Ganti link ini dengan grup target Anda (pastikan link search grup)
const TARGET_URL = 'https://www.facebook.com/groups/ubudcommunity/search/?q=looking%20for%20villa'; 
const KATA_KUNCI = ['monthly', 'long term', 'year', 'budget', 'looking for']; 

(async () => {
  console.log('🤖 MENYIAPKAN ROBOT...');
  
  // Buka Browser (Mode Headless agar jalan di Codespaces)
  const browser = await puppeteer.launch({
    headless: "new", // Wajib "new" atau true untuk Codespaces
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Set ukuran layar HP biar FB tidak curiga
  await page.setViewport({ width: 375, height: 812 });

  // 1. MENUJU TARGET (Tanpa Login dulu biar aman dari Checkpoint)
  // Trik: Kita intip versi mobile basic atau halaman publik
  console.log(`🚀 Meluncur ke: ${TARGET_URL}`);
  
  // Di Codespaces/Server, login FB sangat rawan. 
  // Kita coba scrape data publik dulu (yang bisa dilihat tanpa login)
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });

  // 2. TUNGGU LOADING
  console.log('⏳ Menunggu halaman dimuat...');
  await new Promise(r => setTimeout(r, 5000));

  // 3. AMBIL DATA
  console.log('🌾 Sedang memanen data...');
  
  // Scroll sedikit ke bawah
  await page.evaluate(() => window.scrollBy(0, 1000));
  await new Promise(r => setTimeout(r, 3000));

  const dataLeads = await page.evaluate(() => {
    // Cari semua teks postingan
    // Note: Selector FB sering berubah, kita ambil secara umum
    let elements = document.querySelectorAll('div[role="article"], div[data-ad-preview="message"]');
    if (elements.length === 0) {
        // Coba selector alternatif mbasic (jika dialihkan ke mbasic)
        elements = document.querySelectorAll('div.br, div.story_body_container');
    }
    
    let results = [];
    elements.forEach(el => {
      let text = el.innerText;
      if (text && text.length > 20) {
        results.push(text);
      }
    });
    return results;
  });

  // 4. FILTER HASIL
  console.log('\n🔥 --- HASIL PENCARIAN --- 🔥');
  
  if (dataLeads.length === 0) {
      console.log("⚠️ Tidak ada data ditemukan. Mungkin FB meminta Login.");
      console.log("Tips: Di server cloud, FB memblokir akses tanpa login.");
  } else {
      let foundCount = 0;
      dataLeads.forEach(text => {
        // Cek apakah mengandung kata kunci
        const isMatch = KATA_KUNCI.some(keyword => text.toLowerCase().includes(keyword));
        
        if (isMatch) {
            foundCount++;
            console.log(`\n[LEAD #${foundCount}]`);
            console.log(text.substring(0, 200) + "..."); // Tampilkan 200 huruf awal
            console.log("-----------------------------------");
        }
      });
      console.log(`\n✅ Total ditemukan: ${foundCount} lead potensial.`);
  }

  await browser.close();
})();
