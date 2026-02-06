const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// 👇 NOMOR WA BOS YUSRON
const NOMOR_TUJUAN = '6283146289435@c.us'; 

// 👇 TARGET PENCARIAN (Ubud Community)
const TARGET_FB_URL = 'https://www.facebook.com/groups/ubudcommunity/search/?q=looking%20for%20villa';
const KEYWORDS = ['monthly', 'long term', 'year', 'budget', 'looking for'];

console.log('🔄 Menghidupkan Mesin WhatsApp...');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Wajib untuk Replit
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

client.on('qr', (qr) => {
    console.log('\n⚠️  SCAN QR CODE DI BAWAH INI (CEPAT SEBELUM HILANG):');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('\n✅ WhatsApp Terhubung! Siap berburu...');
    client.sendMessage(NOMOR_TUJUAN, '🤖 Bot Replit Aktif! Sedang memantau Facebook...');
    jalankanScraper();
});

// Tambahan: Error Handling biar Replit gak mati sendiri
client.on('disconnected', (reason) => {
    console.log('❌ WA Terputus:', reason);
});

client.initialize();

async function jalankanScraper() {
    console.log(`🚀 Meluncur ke Facebook...`);
    
    // Setting Browser Khusus Replit (Anti-Crash)
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Kunci agar jalan di Replit
            '--disable-gpu',
            '--single-process', 
            '--no-zygote'
        ]
    });

    const page = await browser.newPage();
    // Layar HP Standard
    await page.setViewport({ width: 375, height: 812 }); 

    try {
        // Timeout diperpanjang jadi 2 menit karena internet server kadang lambat
        await page.goto(TARGET_FB_URL, { waitUntil: 'networkidle2', timeout: 120000 });
        
        console.log('⬇️ Scrolling halaman...');
        for(let i=0; i<5; i++){
             await page.evaluate(() => window.scrollBy(0, window.innerHeight));
             await new Promise(r => setTimeout(r, 2000));
        }

        // Ambil Data
        const leads = await page.evaluate(() => {
            const divs = document.querySelectorAll('div');
            let results = [];
            divs.forEach(el => {
                let text = el.innerText;
                // Filter panjang teks
                if (text && text.length > 50 && text.length < 600) {
                    results.push(text);
                }
            });
            return [...new Set(results)]; 
        });

        console.log(`🌾 Mendapat ${leads.length} data mentah.`);
        
        let sentCount = 0;
        for (const postText of leads) {
            const isMatch = KEYWORDS.some(k => postText.toLowerCase().includes(k));
            
            if (isMatch) {
                const pesan = `🔥 *LEAD BARU DARI REPLIT* 🔥\n\n${postText.substring(0, 300)}...\n\n(Segera Cek Grup FB)`;
                
                await client.sendMessage(NOMOR_TUJUAN, pesan);
                console.log(`📤 Terkirim ke WA.`);
                sentCount++;
                // Jeda 5 detik
                await new Promise(r => setTimeout(r, 5000)); 
            }
        }
        
        if(sentCount === 0) {
             console.log("⚠️ Tidak ada lead yang cocok kali ini.");
        } else {
             console.log(`✅ Selesai! Terkirim ${sentCount} leads.`);
        }

    } catch (error) {
        console.error('❌ Error Scraper:', error.message);
    } finally {
        await browser.close();
        console.log('😴 Selesai. Menunggu perintah selanjutnya...');
    }
}
