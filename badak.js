const { isOnCooldown, randomInt, sleep, getRemainingCooldown } = require('./utils');
const { getUser, updateUser, isPremium } = require('./database');
const { Markup } = require('telegraf');
const config = require('./config');

// Store sementara untuk nomor yang akan dibadaki
const pendingBadak = new Map();

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
> 📝 *Contoh:*
> /badak 628123456789
> 
> ℹ️ Setelah itu pilih range angka yang ingin dibadaki.`;
        
        await ctx.reply(text, { parse_mode: 'Markdown' });
        return;
    }
    
    // Validasi nomor (harus angka)
    const cleanNomor = nomor.replace(/\D/g, '');
    if (cleanNomor.length < 10) {
        await ctx.reply(`> ❌ *NOMOR TIDAK VALID*\n> \n> Masukkan nomor telepon yang benar.\n> Contoh: 628123456789`, { parse_mode: 'Markdown' });
        return;
    }
    
    // Cek cooldown (khusus free)
    if (!premium) {
        const freeCooldown = config.badak.cooldownFree;
        const onCooldown = isOnCooldown(user.lastBadak || 0, freeCooldown);
        if (onCooldown) {
            const remaining = getRemainingCooldown(user.lastBadak, freeCooldown);
            await ctx.reply(`> ⏰ *COOLDOWN!*\n> \n> Tunggu ${remaining} detik lagi.\n> \n> 💎 Premium = tanpa cooldown`, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('💎 Upgrade Premium', 'info_premium')]
                ])
            });
            return;
        }
    }
    
    // Simpan nomor untuk sesi ini
    pendingBadak.set(userId, {
        nomor: cleanNomor,
        timestamp: Date.now()
    });
    
    // Tampilkan pilihan range
    const maxRange = premium ? config.badak.premiumRange.max : config.badak.freeRange.max;
    const ranges = [];
    
    // Buat range berdasarkan maxRange
    if (maxRange === 400) {
        ranges.push(
            { label: '🌏 1-100', value: '1-100' },
            { label: '🌏 101-200', value: '101-200' },
            { label: '🌏 201-300', value: '201-300' },
            { label: '🌏 301-400', value: '301-400' }
        );
    } else {
        ranges.push(
            { label: '📱 1-50', value: '1-50' },
            { label: '📱 51-100', value: '51-100' },
            { label: '📱 101-150', value: '101-150' },
            { label: '📱 151-200', value: '151-200' }
        );
    }
    
    const text = 
`> 🦏 *BADAK NOMOR*
> 
> 📞 Nomor: \`${cleanNomor}\`
> 
> 📊 *Pilih range angka:*
> ${premium ? '💎 Premium user (1-400)' : '⚠️ Free user (1-200)'}
> 
> Pilih salah satu range di bawah untuk mulai membadaki:`;
    
    const buttons = [];
    for (let i = 0; i < ranges.length; i += 2) {
        const row = [];
        row.push(Markup.button.callback(ranges[i].label, `badak_range_${ranges[i].value}`));
        if (ranges[i+1]) {
            row.push(Markup.button.callback(ranges[i+1].label, `badak_range_${ranges[i+1].value}`));
        }
        buttons.push(row);
    }
    
    buttons.push([Markup.button.callback('❌ Batal', 'badak_batal')]);
    
    await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
}

async function prosesBadak(ctx, userId, nomor, range, premium) {
    const user = getUser(userId);
    const botUsername = ctx.botInfo.username;
    
    // Parse range
    const [min, max] = range.split('-').map(Number);
    const targetAngka = randomInt(min, max);
    
    // Loading effect
    const loadingMsg = await ctx.reply(`> 🦏 *MEMBADAKI NOMOR ${nomor}...*`, { parse_mode: 'Markdown' });
    
    await sleep(800);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI NOMOR ${nomor}...* [Connecting to server]`, { parse_mode: 'Markdown' });
    await sleep(600);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI NOMOR ${nomor}...* [Bruteforce API] ███░░░░░░░ 30%`, { parse_mode: 'Markdown' });
    await sleep(500);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI NOMOR ${nomor}...* [Inject payload] ██████░░░░ 60%`, { parse_mode: 'Markdown' });
    await sleep(400);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI NOMOR ${nomor}...* [Bypass firewall] ████████░░ 80%`, { parse_mode: 'Markdown' });
    await sleep(300);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI NOMOR ${nomor}...* [Finalizing] ██████████ 100%`, { parse_mode: 'Markdown' });
    await sleep(500);
    
    const isSuccess = randomInt(1, 100) > 30; // 70% sukses
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    if (isSuccess) {
        const newTotal = (user.totalBadak || 0) + 1;
        
        updateUser(userId, {
            lastBadak: Date.now(),
            totalBadak: newTotal,
            badakList: [...(user.badakList || []), { nomor: nomor, range: range, angka: targetAngka, date: new Date().toISOString() }]
        });
        
        const successText = 
`> ✅ *BERHASIL MEMBADAKI!*
> 
> @${botUsername}
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 📞 Nomor: \`${nomor}\`
> 🎯 Range: ${range}
> 🔢 Angka kena: ${targetAngka}
> 
> 📊 *STATUS KAMU:* ${premium ? '💎 PREMIUM' : '⚠️ FREE'}
> 
> 🛡️ *NOMOR ${nomor} SEKARANG KEBAL BADAK!*
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> @tuanmudakyzzy (owner)`;
        
        await ctx.reply(successText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('🔥 HUBUNG OWNER', 'https://t.me/tuanmudakyzzy')],
                [Markup.button.callback('🦏 BADAK LAGI', 'badak_lagi'), Markup.button.callback('📋 LIST BADAK', 'mybadak')]
            ])
        });
        
    } else {
        updateUser(userId, { lastBadak: Date.now() });
        
        const failedText = 
`> ❌ *GAGAL MEMBADAKI!*
> 
> @${botUsername}
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 📞 Nomor: \`${nomor}\`
> 🎯 Range: ${range}
> 🔢 Angka target: ${targetAngka}
> 
> 📊 *STATUS KAMU:* ${premium ? '💎 PREMIUM' : '⚠️ FREE'}
> 
> ⚠️ *GAGAL! Coba lagi dengan range lain.*
> 
> ━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> @tuanmudakyzzy (owner)`;
        
        await ctx.reply(failedText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('💎 UPGRADE PREMIUM', 'https://t.me/tuanmudakyzzy')],
                [Markup.button.callback('🔄 COBA LAGI', 'badak_lagi')]
            ])
        });
    }
    
    // Hapus pending
    pendingBadak.delete(userId);
}

async function mybadakCommand(ctx) {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const badakList = user.badakList || [];
    
    if (badakList.length === 0) {
        await ctx.reply(`> 📭 *DAFTAR NOMOR KEBAL*\n> \n> Kamu belum membadaki nomor apapun.\n> \n> Gunakan /badak <nomor> untuk mulai!`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🦏 Badak Sekarang', 'badak_lagi')]
            ])
        });
        return;
    }
    
    let listMsg = `> 🛡️ *DAFTAR NOMOR KEBAL BADAK*\n> \n> Total: ${badakList.length} nomor\n> \n`;
    badakList.slice(-10).reverse().forEach((item, i) => {
        listMsg += `> ${i+1}. ${item.nomor}\n>    └ Range ${item.range} | 📅 ${new Date(item.date).toLocaleDateString('id-ID')}\n`;
    });
    
    if (badakList.length > 10) {
        listMsg += `> \n> 📌 Menampilkan 10 terbaru dari ${badakList.length}`;
    }
    
    await ctx.reply(listMsg, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🦏 Badak Lagi', 'badak_lagi'), Markup.button.callback('🗑️ Hapus Semua', 'hapus_badak')]
        ])
    });
}

module.exports = { badakCommand, mybadakCommand, prosesBadak, pendingBadak };
