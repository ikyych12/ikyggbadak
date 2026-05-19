const { randomInt, sleep } = require('./utils');
const { getCekUmur, setCekUmur, isPremium } = require('./database');
const { Markup } = require('telegraf');
const config = require('./config');

function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash & hash;
    }
    return Math.abs(hash);
}

function getCountryCode(nomor) {
    for (let len = 3; len >= 1; len--) {
        const prefix = nomor.substring(0, len);
        if (config.internationalProviders[prefix]) return prefix;
    }
    return null;
}

function hitungUmur(masaAktif) {
    const [tahun, bulan, hari] = masaAktif.split('-').map(Number);
    const tanggalAktif = new Date(tahun, bulan - 1, hari);
    const sekarang = new Date();
    
    let tahunUmur = sekarang.getFullYear() - tanggalAktif.getFullYear();
    let bulanUmur = sekarang.getMonth() - tanggalAktif.getMonth();
    let hariUmur = sekarang.getDate() - tanggalAktif.getDate();
    
    if (hariUmur < 0) {
        bulanUmur--;
        const bulanLalu = new Date(sekarang.getFullYear(), sekarang.getMonth(), 0);
        hariUmur += bulanLalu.getDate();
    }
    if (bulanUmur < 0) {
        tahunUmur--;
        bulanUmur += 12;
    }
    
    if (tahunUmur >= 1) return `${tahunUmur} tahun ${bulanUmur} bulan`;
    if (bulanUmur >= 1) return `${bulanUmur} bulan ${hariUmur} hari`;
    return `${hariUmur} hari`;
}

function generateCekUmur(nomor, isPremiumUser = false) {
    const seed = simpleHash(nomor);
    function seededRandom(min, max) {
        const r = ((seed * 9301 + 49297) % 233280) / 233280;
        return Math.floor(r * (max - min + 1) + min);
    }
    
    const countryCode = getCountryCode(nomor);
    const isInternational = countryCode !== null && countryCode !== '62';
    
    let provider, wilayah, negara;
    
    if (isInternational && isPremiumUser) {
        negara = config.internationalProviders[countryCode];
        provider = `${negara} ${seededRandom(1, 5)}G`;
        const regions = config.internationalRegions[countryCode] || ["Capital City"];
        wilayah = regions[seededRandom(0, regions.length - 1)];
    } else if (isInternational && !isPremiumUser) {
        return { error: "premium_required" };
    } else {
        for (const [prefix, nama] of Object.entries(config.providers)) {
            if (nomor.startsWith(prefix)) { provider = nama; break; }
        }
        if (!provider) provider = "Unknown";
        const wilayahList = ["Jakarta", "Surabaya", "Bandung", "Medan", "Semarang", "Makassar", "Palembang", "Bogor", "Malang", "Yogyakarta", "Denpasar", "Balikpapan"];
        wilayah = wilayahList[seededRandom(0, wilayahList.length - 1)];
        negara = "Indonesia";
    }
    
    // Masa Aktif: tahun bebas, tapi untuk 2026 hanya bulan Jan/Feb
    const sekarang = new Date();
    const currentYear = sekarang.getFullYear();
    
    let aktifTahun = seededRandom(2018, currentYear);
    let aktifBulan = seededRandom(1, 12);
    let aktifHari = seededRandom(1, 28);
    
    // Khusus tahun 2026, batasi bulan ke Jan/Feb
    if (aktifTahun === 2026) {
        aktifBulan = seededRandom(1, 2);
        aktifHari = seededRandom(1, 28);
    }
    
    // Kalau tahunnya 2026 tapi bulan > sekarang? gak mungkin karena 2026 cuma Jan/Feb
    const masaAktif = `${aktifTahun}-${String(aktifBulan).padStart(2, '0')}-${String(aktifHari).padStart(2, '0')}`;
    const umur = hitungUmur(masaAktif);
    
    const statusList = ["Active", "Active", "Active", "Inactive"];
    const status = statusList[seededRandom(0, statusList.length - 1)];
    const tipeList = ["Prepaid", "Prepaid", "Prepaid", "Postpaid"];
    const tipe = tipeList[seededRandom(0, tipeList.length - 1)];
    
    return { nomor, negara, provider, wilayah, masaAktif, umur, status, tipe, lastCek: new Date().toISOString() };
}

async function cekumurCommand(ctx, nomor) {
    const userId = ctx.from.id;
    const premium = isPremium(userId);
    const botUsername = ctx.botInfo.username;
    
    if (!nomor) {
        const text = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🔍 *CEK UMUR NOMOR* 🔍
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📝 *Cara penggunaan:*
/cekumur <nomor>

📌 *Contoh Indonesia:*
/cekumur 628123456789

🌍 *Contoh Luar Negeri (PREMIUM ONLY):*
/cekumur 14155551234 (USA)

💎 *Premium bisa cek nomor luar negeri!*

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        await ctx.reply(text, { parse_mode: 'Markdown' });
        return;
    }
    
    let cleanNomor = nomor.replace(/\D/g, '');
    const isIndo = cleanNomor.startsWith('62');
    
    if (isIndo && cleanNomor.length < 12) {
        await ctx.reply(`> ❌ Nomor Indonesia minimal 10 digit\n> Contoh: 628123456789`, { parse_mode: 'Markdown' });
        return;
    }
    
    if (!isIndo && !premium) {
        await ctx.reply(
`> 🌍 *NOMOR LUAR NEGERI*
> 
> ⚠️ Nomor luar negeri hanya bisa dicek oleh user PREMIUM!
> 
> 💬 Hubung owner untuk upgrade!`, { parse_mode: 'Markdown' });
        return;
    }
    
    let data = getCekUmur(cleanNomor);
    
    if (!data) {
        const loadingMsg = await ctx.reply(`> 🔍 *Mengecek umur nomor ${cleanNomor}...*`, { parse_mode: 'Markdown' });
        
        await sleep(800);
        await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🔍 *Mengecek...* [Database]`, { parse_mode: 'Markdown' });
        await sleep(600);
        await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🔍 *Mengecek...* [Verifikasi]`, { parse_mode: 'Markdown' });
        await sleep(500);
        
        data = generateCekUmur(cleanNomor, premium);
        if (data.error !== "premium_required") {
            setCekUmur(cleanNomor, data);
        }
        await ctx.deleteMessage(loadingMsg.message_id);
    }
    
    if (data.error === "premium_required") {
        await ctx.reply(`> 🌍 Nomor luar negeri hanya untuk PREMIUM!`, { parse_mode: 'Markdown' });
        return;
    }
    
    const username = ctx.from.username || ctx.from.first_name;
    const resultText = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🦏 *@${botUsername}* 🦏
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *HALLO PENGGUNA @${username}*
> 
> *hasil dari cekumur dibawah ya*
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> > 📱 *HASIL CEK UMUR NOMOR*
> > 
> > ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
> > ┃ 📞 Nomor: \`${data.nomor}\`
> > ┃ 🗺️ Negara: ${data.negara}
> > ┃ 📡 Provider: ${data.provider}
> > ┃ 📍 Wilayah: ${data.wilayah}
> > ┃ 📅 Masa Aktif: ${data.masaAktif}
> > ┃ 🕐 Umur: ${data.umur}
> > ┃ 🔰 Status: ${data.status}
> > ┃ 🏷️ Tipe: ${data.tipe}
> > ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━
> > 
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 🦏 *Silahkan badak jika ingin gacor!*
> 
> ${!premium ? '⚠️ STATUS KAMU FREE, UPGRADE PREMIUM DULU!' : '✅ STATUS KAMU PREMIUM, LANGSUNG BADAK!'}
> 
> ╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
> ┃  👑 @tuanmudakyzzy
> ╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(resultText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            premium ? 
                [Markup.button.callback('🦏 BADAK SEKARANG', 'badak_lagi')] :
                [Markup.button.url('💎 UPGRADE PREMIUM', 'https://t.me/tuanmudakyzzy')],
            [Markup.button.callback('🔄 CEK LAGI', 'cekumur_lagi')]
        ])
    });
}

module.exports = { cekumurCommand };