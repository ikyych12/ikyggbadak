const { isOnCooldown, randomInt, sleep, getRemainingCooldown } = require('./utils');
const { getUser, updateUser, isPremium } = require('./database');
const { generateBadakThumbnail } = require('./canvas');
const { Markup } = require('telegraf');
const config = require('./config');

async function badakCommand(ctx, nomor) {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const premium = isPremium(userId);
    
    if (!nomor) {
        const text = 
`> ❌ *CARA PENGGUNAAN*
> 
> /badak <nomor>
> 
> 📊 *Range:*
> Free: 1-${config.badak.freeRange.max}
> Premium: 1-${config.badak.premiumRange.max}
> 
> 📝 *Contoh:*
> /badak 628123456789`;
        
        await ctx.reply(text, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🦏 Contoh Badak', 'contoh_badak')],
                [Markup.button.callback('💎 Info Premium', 'info_premium')]
            ])
        });
        return;
    }
    
    const angka = parseInt(nomor);
    if (isNaN(angka)) {
        await ctx.reply('> ❌ Masukkan angka yang valid!', { parse_mode: 'Markdown' });
        return;
    }
    
    const maxRange = premium ? config.badak.premiumRange.max : config.badak.freeRange.max;
    if (angka < 1 || angka > maxRange) {
        await ctx.reply(`> ❌ Angka harus antara 1-${maxRange}\n> ${premium ? '' : 'Upgrade ke premium untuk range 1-400!'}`, { parse_mode: 'Markdown' });
        return;
    }
    
    if (!premium) {
        const onCooldown = isOnCooldown(user.lastBadak || 0, config.badak.cooldownFree);
        if (onCooldown) {
            const remaining = getRemainingCooldown(user.lastBadak, config.badak.cooldownFree);
            await ctx.reply(`> ⏰ *COOLDOWN!*\n> \n> Tunggu ${remaining} detik lagi.\n> \n> 💎 Premium = tanpa cooldown`, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💎 Upgrade Premium', 'info_premium')]
                ])
            });
            return;
        }
    }
    
    const loadingMsg = await ctx.reply(`> 🦏 *MEMBADAKI ${angka}...*`, { parse_mode: 'Markdown' });
    
    await sleep(800);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${angka}...* [Connecting to server]`, { parse_mode: 'Markdown' });
    await sleep(600);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${angka}...* [Bruteforce API] ███░░░░░░░ 30%`, { parse_mode: 'Markdown' });
    await sleep(500);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${angka}...* [Inject payload] ██████░░░░ 60%`, { parse_mode: 'Markdown' });
    await sleep(400);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${angka}...* [Bypass firewall] ████████░░ 80%`, { parse_mode: 'Markdown' });
    await sleep(300);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${angka}...* [Finalizing] ██████████ 100%`, { parse_mode: 'Markdown' });
    await sleep(500);
    
    const isSuccess = randomInt(1, 100) > 20;
    const botUsername = ctx.botInfo.username;
    
    if (isSuccess) {
        const newTotal = (user.totalBadak || 0) + 1;
        
        updateUser(userId, {
            lastBadak: Date.now(),
            totalBadak: newTotal,
            badakList: [...(user.badakList || []), { nomor: angka, date: new Date().toISOString() }]
        });
        
        await ctx.deleteMessage(loadingMsg.message_id);
        
        // FORMAT SETELAH BADAK BERHASIL
        const successText = 
`> ✅ *TERIMAKASIH SUDAH BADAK DI BOT*
> 
> @${botUsername}
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 📊 *STATUS KAMU:* ${premium ? '💎 PREMIUM' : '⚠️ FREE'}
> 
> ${!premium ? '⚠️ STATUS KAMU FREE, INI FREE JANGAN BANYAK KOMPLAIN!' : '✅ STATUS KAMU PREMIUM, NIKMATI FITUR MAXIMAL!'}
> 
> 🔥 *PENGEN GACOR?* Klik tombol di bawah!
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 🦏 *BIAR MAKIN GACOR @${ctx.from.username || ctx.from.first_name}*
> 
> 📌 *AYO IKUTIN YANG DIBAWAH:*
> 
> 1️⃣ Pastikan jika ingin badak, nokos mu jangan dipake chatan dulu
> 2️⃣ Pake foto profil dan bio
> 3️⃣ Pasang 2FA
> 4️⃣ Masuk GB dan CH bebas
> 5️⃣ Pasang proxy di pengaturan WA (1.1.1.1)
> 6️⃣ Diamkan 3-7 hari
> 7️⃣ Coba dulu chatan 1-10 chat. Jika kena limit, pasang lagi proxy
> 8️⃣ Tunggu sampai bisa ya!
> 
> ✅ *JIKA UDA SELAMAT! WA MU UDA BADAK (OPSIONAL)*
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> @tuanmudakyzzy (owner)
> 
> ⚠️ *GA IKUTIN CARA? KENON JANGAN KOAR-KOAR NGENTOT!*`;
        
        await ctx.reply(successText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('🔥 HUBUNG OWNER (GACOR)', `https://t.me/tuanmudakyzzy`)],
                [Markup.button.callback('🦏 BADAK LAGI', 'badak_lagi'), Markup.button.callback('📋 LIST BADAK', 'mybadak')],
                [Markup.button.callback('💎 UPGRADE PREMIUM', 'info_premium')]
            ])
        });
        
    } else {
        await ctx.deleteMessage(loadingMsg.message_id);
        
        // FORMAT SETELAH BADAK GAGAL
        const failedText = 
`> ❌ *GAGAL BADAK!*
> 
> @${botUsername}
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 📊 *STATUS KAMU:* ${premium ? '💎 PREMIUM' : '⚠️ FREE'}
> 
> 📱 Nomor: *${angka}*
> ⚠️ Status: *Gagal dibadaki*
> 
> 🔥 *PENGEN GACOR?* Upgrade ke premium dulu!
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> @tuanmudakyzzy (owner)
> 
> ⚠️ *FREE USER = SABAR YA! JANGAN KOAR-KOAR!*`;
        
        await ctx.reply(failedText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('💎 UPGRADE PREMIUM', `https://t.me/tuanmudakyzzy`)],
                [Markup.button.callback('🔄 COBA LAGI', 'badak_lagi')]
            ])
        });
        updateUser(userId, { lastBadak: Date.now() });
    }
}

async function mybadakCommand(ctx) {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const badakList = user.badakList || [];
    const premium = isPremium(userId);
    const botUsername = ctx.botInfo.username;
    
    if (badakList.length === 0) {
        await ctx.reply(`> 📭 *DAFTAR NOMOR KEBAL*\n> \n> Kamu belum membadaki nomor apapun.\n> \n> Gunakan /badak <nomor> untuk mulai!`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🦏 Badak Sekarang', 'badak_lagi')],
                [Markup.button.url('🔥 Hubung Owner', 'https://t.me/tuanmudakyzzy')]
            ])
        });
        return;
    }
    
    let listMsg = `> 🛡️ *DAFTAR NOMOR KEBAL BADAK*\n> \n> Total: ${badakList.length} nomor\n> \n`;
    badakList.slice(-10).reverse().forEach((item, i) => {
        listMsg += `> ${i+1}. ${item.nomor}\n>    └ 📅 ${new Date(item.date).toLocaleDateString('id-ID')}\n`;
    });
    
    if (badakList.length > 10) {
        listMsg += `> \n> 📌 Menampilkan 10 terbaru dari ${badakList.length}`;
    }
    
    listMsg += `\n> \n> @tuanmudakyzzy (owner)`;
    
    await ctx.reply(listMsg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🦏 Badak Lagi', 'badak_lagi'), Markup.button.callback('🗑️ Hapus Semua', 'hapus_badak')],
            [Markup.button.url('🔥 Hubung Owner (GACOR)', 'https://t.me/tuanmudakyzzy')]
        ])
    });
}

module.exports = { badakCommand, mybadakCommand };