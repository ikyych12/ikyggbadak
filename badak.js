const { isOnCooldown, randomInt, sleep, getRemainingCooldown } = require('./utils');
const { getUser, updateUser, isPremium } = require('./database');
const { Markup } = require('telegraf');
const config = require('./config');

const pendingBadak = new Map();

async function badakCommand(ctx, nomor) {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const premium = isPremium(userId);
    const botUsername = ctx.botInfo.username;
    
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
    
    const cleanNomor = nomor.replace(/\D/g, '');
    if (cleanNomor.length < 10) {
        await ctx.reply(`> ❌ *NOMOR TIDAK VALID*\n> \n> Masukkan nomor telepon yang benar.\n> Contoh: 628123456789`, { parse_mode: 'Markdown' });
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
    
    pendingBadak.set(userId, {
        nomor: cleanNomor,
        timestamp: Date.now()
    });
    
    const maxRange = premium ? config.badak.premiumRange.max : config.badak.freeRange.max;
    const ranges = [];
    
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
    
    const [min, max] = range.split('-').map(Number);
    const targetAngka = randomInt(min, max);
    
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
    
    const isSuccess = randomInt(1, 100) > 30;
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    if (isSuccess) {
        const newTotal = (user.totalBadak || 0) + 1;
        
        updateUser(userId, {
            lastBadak: Date.now(),
            totalBadak: newTotal,
            badakList: [...(user.badakList || []), { nomor: nomor, range: range, angka: targetAngka, date: new Date().toISOString() }]
        });
        
        const successText = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🦏 *@${botUsername}* 🦏
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      ✅ *BERHASIL MEMBADAKI*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📞 *Nomor:* \`${nomor}\`
🎯 *Range:* ${range}
🔢 *Angka kena:* ${targetAngka}
📊 *Status:* ${premium ? '💎 PREMIUM' : '⚠️ FREE'}

🛡️ *NOMOR ${nomor} SEKARANG KEBAL!*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 *BIAR MAKIN GACOR @${ctx.from.username || ctx.from.first_name}*

📌 *AYO IKUTIN YANG DIBAWAH:*

1️⃣ Pastikan nokos mu jangan dipake chatan dulu
2️⃣ Pake foto profil dan bio
3️⃣ Pasang 2FA
4️⃣ Masuk GB dan CH bebas
5️⃣ Pasang proxy di pengaturan WA (1.1.1.1)
6️⃣ Diamkan 3-7 jam
7️⃣ Coba dulu chatan 1-10 chat. Jika kena limit, pasang lagi proxy
8️⃣ Tunggu sampai bisa ya!

✅ *JIKA UDA SELAMAT! WA MU UDA BADAK (OPSIONAL)*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ *GA IKUTIN CARA? KENON JANGAN KOAR-KOAR NGENTOT!*

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        await ctx.reply(successText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('🔥 HUBUNG OWNER', 'https://t.me/tuanmudakyzzy')],
                [Markup.button.callback('🦏 BADAK LAGI', 'badak_lagi')],
                [Markup.button.callback('💎 UPGRADE PREMIUM', 'info_premium')]
            ])
        });
        
    } else {
        updateUser(userId, { lastBadak: Date.now() });
        
        const failedText = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🦏 *@${botUsername}* 🦏
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      ❌ *GAGAL MEMBADAKI*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📞 *Nomor:* \`${nomor}\`
🎯 *Range:* ${range}
🔢 *Angka target:* ${targetAngka}
📊 *Status:* ${premium ? '💎 PREMIUM' : '⚠️ FREE'}

⚠️ *GAGAL! Coba lagi dengan range lain atau ikuti tips di bawah!*

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔥 *TIPS GACOR:*
• Pake proxy 1.1.1.1
• Diamkan 3-7 jam
• Jangan chatan dulu
• Pasang 2FA dan foto profil

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        await ctx.reply(failedText, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('💎 UPGRADE PREMIUM', 'https://t.me/tuanmudakyzzy')],
                [Markup.button.callback('🔄 COBA LAGI', 'badak_lagi')]
            ])
        });
    }
    
    pendingBadak.delete(userId);
}

module.exports = { badakCommand, prosesBadak, pendingBadak };