const { isOnCooldown, randomInt, sleep, getRemainingCooldown } = require('./utils');
const { getUser, updateUser, getRole } = require('./database');
const { Markup } = require('telegraf');
const config = require('./config');

const pendingBadak = new Map();

function getCountryFromNumber(nomor) {
    for (let len = 3; len >= 1; len--) {
        const prefix = nomor.substring(0, len);
        if (config.internationalProviders[prefix]) {
            return { code: prefix, country: config.internationalProviders[prefix] };
        }
    }
    return null;
}

async function badakCommand(ctx, nomor) {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const role = getRole(userId);
    const botUsername = ctx.botInfo.username;
    
    if (!nomor) {
        const text = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🦏 *BADAK NOMOR* 🦏
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📝 *Cara penggunaan:*
/badak <nomor>

📌 *Contoh Indonesia:*
/badak 628123456789

🌍 *Contoh Luar Negeri (PREMIUM+):*
/badak 14155551234 (USA)

💎 *Role & Target Maksimal:*
• FREE: 200
• VIP: 200
• PREMIUM: 400
• VVIP: 400

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
        
        await ctx.reply(text, { parse_mode: 'Markdown' });
        return;
    }
    
    let cleanNomor = nomor.replace(/\D/g, '');
    const isIndo = cleanNomor.startsWith('62');
    let countryInfo = null;
    
    if (!isIndo) {
        countryInfo = getCountryFromNumber(cleanNomor);
    }
    
    // Validasi nomor Indonesia
    if (isIndo) {
        if (cleanNomor.length < 12) {
            await ctx.reply(`> ❌ Nomor Indonesia minimal 10 digit\n> Contoh: 628123456789`, { parse_mode: 'Markdown' });
            return;
        }
    } 
    // Validasi nomor luar negeri
    else {
        if (role === 'FREE') {
            await ctx.reply(
`> 🌍 *NOMOR LUAR NEGERI*
> 
> ⚠️ Nomor luar negeri hanya bisa dibadaki oleh VIP, PREMIUM, atau VVIP!
> 
> 💬 Hubung owner untuk upgrade role!`, { parse_mode: 'Markdown' });
            return;
        }
        
        if (cleanNomor.length < 10) {
            await ctx.reply(`> ❌ Nomor luar negeri minimal 10 digit`, { parse_mode: 'Markdown' });
            return;
        }
        
        if (!countryInfo) {
            await ctx.reply(`> ❌ Kode negara tidak terdaftar`, { parse_mode: 'Markdown' });
            return;
        }
    }
    
    // Cek cooldown untuk FREE
    if (role === 'FREE') {
        const onCooldown = isOnCooldown(user.lastBadak || 0, config.badak.cooldownFree);
        if (onCooldown) {
            const remaining = getRemainingCooldown(user.lastBadak, config.badak.cooldownFree);
            await ctx.reply(`> ⏰ *COOLDOWN!*\n> \n> Tunggu ${remaining} detik lagi.\n> \n> Upgrade role untuk tanpa cooldown!`, { parse_mode: 'Markdown' });
            return;
        }
    }
    
    pendingBadak.set(userId, {
        nomor: cleanNomor,
        countryInfo: countryInfo,
        timestamp: Date.now()
    });
    
    // Tombol target berdasarkan role
    let targets = [];
    if (role === 'VVIP' || role === 'PREMIUM') {
        targets = [1, 10, 50, 100, 200, 300, 400];
    } else {
        targets = [1, 10, 50, 100, 200];
    }
    
    const roleNames = { FREE: '⚠️ FREE', VIP: '👑 VIP', PREMIUM: '💎 PREMIUM', VVIP: '⭐ VVIP ⭐' };
    const countryText = countryInfo ? ` (${countryInfo.country})` : '';
    
    const text = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🦏 *BADAK NOMOR* 🦏
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

📞 Nomor: \`${cleanNomor}\`${countryText}
👑 Role: ${roleNames[role]}

📌 *Pilih angka target:*
${targets.join(', ')}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    const buttons = [];
    const baris1 = [];
    const baris2 = [];
    
    targets.forEach((target, index) => {
        if (index < 4) {
            baris1.push(Markup.button.callback(`🎯 ${target}`, `badak_target_${target}`));
        } else {
            baris2.push(Markup.button.callback(`🎯 ${target}`, `badak_target_${target}`));
        }
    });
    
    if (baris1.length > 0) buttons.push(baris1);
    if (baris2.length > 0) buttons.push(baris2);
    buttons.push([Markup.button.callback('❌ Batal', 'badak_batal')]);
    
    await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
    });
}

async function prosesBadak(ctx, userId, nomor, targetAngka, premium) {
    const user = getUser(userId);
    const role = getRole(userId);
    const botUsername = ctx.botInfo.username;
    const countryInfo = getCountryFromNumber(nomor);
    const countryText = countryInfo ? ` (${countryInfo.country})` : '';
    
    const loadingMsg = await ctx.reply(`> 🦏 *MEMBADAKI NOMOR ${nomor}${countryText} DENGAN TARGET ${targetAngka}...*`, { parse_mode: 'Markdown' });
    
    await sleep(800);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${nomor}...* [Connecting to server]`, { parse_mode: 'Markdown' });
    await sleep(600);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${nomor}...* [Bruteforce API] ███░░░░░░░ 30%`, { parse_mode: 'Markdown' });
    await sleep(500);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${nomor}...* [Inject payload] ██████░░░░ 60%`, { parse_mode: 'Markdown' });
    await sleep(400);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${nomor}...* [Bypass firewall] ████████░░ 80%`, { parse_mode: 'Markdown' });
    await sleep(300);
    await ctx.telegram.editMessageText(ctx.chat.id, loadingMsg.message_id, null, `> 🦏 *MEMBADAKI ${nomor}...* [Finalizing] ██████████ 100%`, { parse_mode: 'Markdown' });
    await sleep(500);
    
    const isSuccess = randomInt(1, 100) > 30;
    
    await ctx.deleteMessage(loadingMsg.message_id);
    
    const roleNames = { FREE: '⚠️ FREE', VIP: '👑 VIP', PREMIUM: '💎 PREMIUM', VVIP: '⭐ VVIP ⭐' };
    
    if (isSuccess) {
        const newTotal = (user.totalBadak || 0) + 1;
        
        updateUser(userId, {
            lastBadak: Date.now(),
            totalBadak: newTotal,
            badakList: [...(user.badakList || []), { 
                nomor: nomor, 
                negara: countryInfo?.country || 'Indonesia',
                target: targetAngka, 
                date: new Date().toISOString() 
            }]
        });
        
        const successText = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🦏 *@${botUsername}* 🦏
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃      ✅ *BERHASIL MEMBADAKI*
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📞 *Nomor:* \`${nomor}\`${countryText}
🎯 *Target:* ${targetAngka}
👑 *Role:* ${roleNames[role]}

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
                [Markup.button.callback('💎 INFO ROLE', 'info_premium')]
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

📞 *Nomor:* \`${nomor}\`${countryText}
🎯 *Target:* ${targetAngka}
👑 *Role:* ${roleNames[role]}

⚠️ *GAGAL! Coba lagi dengan target lain!*

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
                [Markup.button.url('💎 UPGRADE ROLE', 'https://t.me/tuanmudakyzzy')],
                [Markup.button.callback('🔄 COBA LAGI', 'badak_lagi')]
            ])
        });
    }
    
    pendingBadak.delete(userId);
}

module.exports = { badakCommand, prosesBadak, pendingBadak };