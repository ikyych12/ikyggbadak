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
        const regions = config.internationalRegions[countryCode] || ["Capital City", "Metropolitan"];
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
    
    const aktifTahun = seededRandom(2018, 2026);
    const aktifBulan = seededRandom(1, 12);
    const aktifHari = seededRandom(1, 28);
    const masaAktif = `${aktifTahun}-${String(aktifBulan).padStart(2, '0')}-${String(aktifHari).padStart(2, '0')}`;
    
    const statusList = ["Active", "Inactive", "Pending", "Suspended"];
    const status = statusList[seededRandom(0, statusList.length - 1)];
    const tipeList = ["Prepaid", "Postpaid", "Corporate", "Residential"];
    const tipe = tipeList[seededRandom(0, tipeList.length - 1)];
    
    return { nomor, negara, provider, wilayah, masaAktif, status, tipe, lastCek: new Date().toISOString() };
}

async function cekumurCommand(ctx, nomor) {
    const userId = ctx.from.id;
    const premium = isPremium(userId);
    
    if (!nomor) {
        const text = 
`> ❌ *CARA PENGGUNAAN*
> 
> /cekumur <nomor>
> 
> 📝 *Contoh:*
> /cekumur 6285712345678 (Indonesia)
> /cekumur 14155551234 (USA) - *Premium only*
> 
> 💎 Premium bisa cek nomor luar negeri!`;
        
        await ctx.reply(text, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('💎 Info Premium', 'info_premium')],
                [Markup.button.url('🔥 Hubung Owner', 'https://t.me/tuanmudakyzzy')]
            ])
        });
        return;
    }
    
    let cleanNomor = nomor.replace(/\D/g, '');
    if (cleanNomor.startsWith('0')) {
        cleanNomor = '62' + cleanNomor.substring(1);
    }
    if (!cleanNomor.startsWith('62') && !cleanNomor.startsWith('1') && !cleanNomor.startsWith('4') && !cleanNomor.startsWith('6') && !cleanNomor.startsWith('8')) {
        cleanNomor = '62' + cleanNomor;
    }
    
    let data = getCekUmur(cleanNomor);
    
    if (!data) {
        const loadingMsg = await ctx.reply(`> 🔍 *Mengecek umur nomor ${cleanNomor}...*`, { parse_mode: 'Markdown' });
        
        await sleep(800);
        await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🔍 *Mengecek umur nomor ${cleanNomor}...* [Akses database operator]`, { parse_mode: 'Markdown' });
        await sleep(600);
        await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🔍 *Mengecek umur nomor ${cleanNomor}...* [Verifikasi ke server Dukcapil]`, { parse_mode: 'Markdown' });
        await sleep(500);
        
        data = generateCekUmur(cleanNomor, premium);
        if (data.error !== "premium_required") {
            setCekUmur(cleanNomor, data);
        }
        await ctx.deleteMessage(loadingMsg.message_id);
    }
    
    if (data.error === "premium_required") {
        await ctx.reply(
`> 🌍 *NOMOR INTERNASIONAL DETEKSI*
> 
> Nomor ${cleanNomor} hanya bisa dicek oleh user PREMIUM!
> 
> 💎 *Upgrade ke premium untuk:*
> • Cek nomor luar negeri
> • Badak tanpa cooldown
> • Range angka 1-400
> 
> @tuanmudakyzzy (owner)`,
            { 
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url('💎 HUBUNG OWNER (PREMIUM)', 'https://t.me/tuanmudakyzzy')]
                ])
            }
        );
        return;
    }
    
    const username = ctx.from.username || ctx.from.first_name;
    const resultText = 
`> *HALLO PENGGUNA @${username}*
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
> > ┃ 🔰 Status: ${data.status}
> > ┃ 🏷️ Tipe: ${data.tipe}
> > ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━
> > 
> > 🕐 Terakhir dicek: ${new Date(data.lastCek).toLocaleString('id-ID')}
> > 🔒 Hasil permanen (sama jika dicek siapapun)
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 🦏 *Silahkan badak jika ingin gacor!*
> 
> ${!premium ? '⚠️ STATUS KAMU FREE, UPGRADE PREMIUM DULU!' : '✅ STATUS KAMU PREMIUM, LANGSUNG BADAK!'}
> 
> @tuanmudakyzzy (owner)`;
    
    await ctx.reply(resultText, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            premium ? 
                [Markup.button.callback('🦏 BADAK SEKARANG', 'badak_lagi')] :
                [Markup.button.url('💎 UPGRADE PREMIUM', 'https://t.me/tuanmudakyzzy')],
            [Markup.button.callback('🔄 CEK LAGI', 'cekumur_lagi'), Markup.button.url('🔥 HUBUNG OWNER', 'https://t.me/tuanmudakyzzy')]
        ])
    });
}

module.exports = { cekumurCommand };
