const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// 👇 NOMOR ANDA SUDAH DIPERBARUI (Format Internasional)
const NOMOR_TUJUAN = '6283146289435@c.us'; 

const TARGET_FB_URL = 'https://www.facebook.com/groups/ubudcommunity/search/?q=looking%20for%20villa';
const KEYWORDS = ['monthly', 'long term', 'year', 'budget', 'looking for'];

console.log('🔄 Menghidupkan Mesin WhatsApp...');

// Gunakan LocalAuth agar tidak perlu scan ulang terus menerus (kecuali di Codespaces baru)
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('⚠️ SCAN QR CODE DI BAWAH INI DENGAN WA ANDA (Linked Devices):');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Terhubung!');
    // Kirim pesan tes ke nomor Anda sendiri
    client.sendMessage(NOMOR_TUJUAN, '🤖 Bot Aktif! Sedang memantau Facebook untuk Bos Yusron...');
    jalankanScraper();
});

client.initialize();

async function jalankanScraper() {
    console.log(`🚀 Meluncur ke Facebook...`);
    
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    // Set ukuran layar HP iPhone X
    await page.setViewport({ width: 375, height: 812 }); 

    try {
        await page.goto(TARGET_FB_URL, { waitUntil: 'networkidle2', timeout: 60000 });
        
        console.log('⬇️ Scrolling halaman...');
        // Scroll 5 kali pelan-pelan
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
                // Filter teks sampah, ambil yang panjangnya wajar untuk postingan
                if (text && text.length > 50 && text.length < 500) {
                    results.push(text);
                }
            });
            return [...new Set(results)]; // Hapus duplikat
        });

        console.log(`🌾 Mendapat ${leads.length} data mentah.`);
        
        let sentCount = 0;
        for (const postText of leads) {
            const isMatch = KEYWORDS.some(k => postText.toLowerCase().includes(k));
            
            if (isMatch) {
                const pesan = `🔥 *LEAD BARU* 🔥\n\n${postText.substring(0, 300)}...\n\n(Cek Grup FB)`;
                await client.sendMessage(NOMOR_TUJUAN, pesan);
                console.log(`📤 Terkirim ke WA.`);
                sentCount++;
                await new Promise(r => setTimeout(r, 4000)); // Jeda 4 detik biar aman
            }
        }
        
        if(sentCount === 0) {
             console.log("⚠️ Tidak ada lead yang cocok kali ini.");
             // Opsional: Kirim laporan kosong biar tau bot jalan
             // await client.sendMessage(NOMOR_TUJUAN, 'Laporan: Belum ada lead baru.'); 
        } else {
             console.log(`✅ Selesai! Mengirim ${sentCount} leads.`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await browser.close();
        console.log('😴 Selesai.');
    }
}
