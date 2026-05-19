const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const config = require('./config');
const { getAllUsers, setPremium, getUser, updateUser, isPremium } = require('./database');

// Token userbot (buat bot baru di @BotFather khusus untuk owner)
const userbot = new Telegraf(config.userbotToken);
const OWNER_ID = config.owner;

// Ambil username bot utama dari config atau dari file
let BOT_UTAMA_USERNAME = "@badakkkkybot"; // Ganti dengan username bot utama kamu

// Fungsi ambil username bot utama (opsional)
async function getBotUtamaUsername() {
    try {
        const botInfo = await userbot.telegram.getMe();
        BOT_UTAMA_USERNAME = `@${botInfo.username}`;
    } catch (e) {}
}

// Middleware hanya owner
userbot.use(async (ctx, next) => {
    if (ctx.from.id !== OWNER_ID) {
        await ctx.reply('❌ Akses ditolak! Anda bukan owner.');
        return;
    }
    return next();
});

// ==================== MENU UTAMA ====================
userbot.command('start', async (ctx) => {
    await getBotUtamaUsername();
    
    const text = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🤖 *USERBOT KONTROL BOT* 🤖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *Bot Utama:* ${BOT_UTAMA_USERNAME}
> *Owner:* @${ctx.from.username || ctx.from.first_name}

📖 *Perintah Tersedia:*

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ *📋 LIST DATA*
┃ /listpremium - List user premium
┃ /listnomor - List nomor dibadaki
┃ /listuser - List semua user
┃
┃ *➕ MANAGE PREMIUM*
┃ /addpremium <id> [hari]
┃ /removepremium <id>
┃ /cekuser <id> - Detail user
┃
┃ *🛠️ UTILITY*
┃ /stats - Statistik bot
┃ /broadcast <pesan>
┃ /backup - Backup database
┃ /shutdown - Matikan bot utama
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(text, { parse_mode: 'Markdown' });
});

// ==================== LIST PREMIUM (TAMPILAN KEREN) ====================
userbot.command('listpremium', async (ctx) => {
    const users = getAllUsers();
    const premiumUsers = [];
    
    for (const [id, user] of Object.entries(users)) {
        if (user.premium) {
            premiumUsers.push({ 
                id, 
                name: user.name || 'Unknown', 
                expired: user.premiumExpired,
                since: user.premiumSince
            });
        }
    }
    
    if (premiumUsers.length === 0) {
        await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      💎 *DAFTAR PREMIUM* 💎
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> 📭 Belum ada user premium.

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
        return;
    }
    
    let msg = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      💎 *DAFTAR PREMIUM* 💎
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *Total:* ${premiumUsers.length} user
> *Bot:* ${BOT_UTAMA_USERNAME}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    
    premiumUsers.forEach((u, i) => {
        const expired = u.expired ? new Date(u.expired).toLocaleDateString('id-ID') : 'Permanent';
        const since = u.since ? new Date(u.since).toLocaleDateString('id-ID') : '-';
        msg += `┃ ${i+1}. 👤 *${u.name}*\n`;
        msg += `┃    ├ ID: \`${u.id}\`\n`;
        msg += `┃    ├ Aktif sejak: ${since}\n`;
        msg += `┃    └ Expired: ${expired}\n`;
        msg += `┃\n`;
    });
    
    msg += 
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ==================== LIST NOMOR ====================
userbot.command('listnomor', async (ctx) => {
    const users = getAllUsers();
    let allBadak = [];
    let totalNomor = 0;
    
    for (const [userId, user] of Object.entries(users)) {
        if (user.badakList && user.badakList.length > 0) {
            totalNomor += user.badakList.length;
            for (const badak of user.badakList) {
                allBadak.push({
                    userId: userId,
                    userName: user.name || 'Unknown',
                    nomor: badak.nomor,
                    range: badak.range,
                    tanggal: badak.date
                });
            }
        }
    }
    
    if (allBadak.length === 0) {
        await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      📋 *LIST NOMOR* 📋
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> 📭 Belum ada nomor yang dibadaki.

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
        return;
    }
    
    allBadak.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    let msg = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      📋 *LIST NOMOR DIBAKADAI* 📋
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *Total:* ${totalNomor} nomor
> *User:* ${Object.keys(users).length} user
> *Bot:* ${BOT_UTAMA_USERNAME}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    
    const displayCount = Math.min(15, allBadak.length);
    for (let i = 0; i < displayCount; i++) {
        const b = allBadak[i];
        const date = new Date(b.tanggal).toLocaleDateString('id-ID');
        msg += `┃ ${i+1}. 📞 \`${b.nomor}\`\n`;
        msg += `┃    └ 👤 ${b.userName} | ${b.range} | ${date}\n`;
        msg += `┃\n`;
    }
    
    if (allBadak.length > 15) {
        msg += `┃ 📌 *+${allBadak.length - 15} nomor lainnya*\n`;
        msg += `┃\n`;
    }
    
    msg += 
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ==================== LIST SEMUA USER ====================
userbot.command('listuser', async (ctx) => {
    const users = getAllUsers();
    const userList = Object.entries(users).map(([id, u]) => ({
        id, name: u.name || 'Unknown', premium: u.premium, totalBadak: u.totalBadak || 0
    }));
    
    userList.sort((a, b) => b.totalBadak - a.totalBadak);
    
    let msg = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      👥 *DAFTAR SEMUA USER* 👥
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *Total User:* ${userList.length} user
> *Bot:* ${BOT_UTAMA_USERNAME}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
    
    const displayCount = Math.min(20, userList.length);
    for (let i = 0; i < displayCount; i++) {
        const u = userList[i];
        const premiumIcon = u.premium ? '💎' : '⚠️';
        msg += `┃ ${i+1}. ${premiumIcon} *${u.name}*\n`;
        msg += `┃    ├ ID: \`${u.id}\`\n`;
        msg += `┃    └ Badak: ${u.totalBadak} nomor\n`;
        msg += `┃\n`;
    }
    
    msg += 
`┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// ==================== TAMBAH PREMIUM ====================
userbot.command('addpremium', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ❌ *ERROR* ❌
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> Cara penggunaan:
> /addpremium <user_id> [hari]

> Contoh:
> /addpremium 123456789 30

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const days = args[2] ? parseInt(args[2]) : 30;
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + days);
    
    const user = getUser(userId);
    setPremium(userId, true, expiredAt.toISOString());
    
    const expiredDate = expiredAt.toLocaleDateString('id-ID');
    
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ✅ *BERHASIL TAMBAH PREMIUM* ✅
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *User:* ${user.name || 'Unknown'}
> *ID:* \`${userId}\`
> *Durasi:* ${days} hari
> *Expired:* ${expiredDate}

> *Bot:* ${BOT_UTAMA_USERNAME}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    
    // Notifikasi ke user yang dapet premium
    try {
        await ctx.telegram.sendMessage(userId,
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🎉 *SELAMAT!* 🎉
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> Anda telah diupgrade menjadi *PREMIUM*!

> *Durasi:* ${days} hari
> *Expired:* ${expiredDate}

> 🎁 *Fitur Premium:*
> • Badak tanpa cooldown ⚡
> • Range 1-400 🎯
> • Cek nomor luar negeri 🌍

> *Bot:* ${BOT_UTAMA_USERNAME}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    } catch (e) {}
});

// ==================== HAPUS PREMIUM ====================
userbot.command('removepremium', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ❌ *ERROR* ❌
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> Cara penggunaan:
> /removepremium <user_id>

> Contoh:
> /removepremium 123456789

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const user = getUser(userId);
    setPremium(userId, false, null);
    
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ✅ *PREMIUM DIHAPUS* ✅
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *User:* ${user.name || 'Unknown'}
> *ID:* \`${userId}\`
> *Status:* FREE USER

> *Bot:* ${BOT_UTAMA_USERNAME}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    
    // Notifikasi ke user yang kehilangan premium
    try {
        await ctx.telegram.sendMessage(userId,
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ⚠️ *PREMIUM DICABUT* ⚠️
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> Status premium Anda telah dicabut.
> Anda kembali menjadi FREE user.

> Hubung owner untuk perpanjang premium.

> *Bot:* ${BOT_UTAMA_USERNAME}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    } catch (e) {}
});

// ==================== CEK DETAIL USER ====================
userbot.command('cekuser', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ❌ *ERROR* ❌
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> Cara penggunaan:
> /cekuser <user_id>

> Contoh:
> /cekuser 123456789

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const user = getUser(userId);
    const premium = isPremium(userId);
    
    const premiumStatus = premium ? '✅ AKTIF' : '❌ TIDAK';
    const expiredText = user.premiumExpired ? new Date(user.premiumExpired).toLocaleDateString('id-ID') : '-';
    const sinceText = user.premiumSince ? new Date(user.premiumSince).toLocaleDateString('id-ID') : '-';
    
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      👤 *DETAIL USER* 👤
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *Bot:* ${BOT_UTAMA_USERNAME}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🆔 ID: \`${user.id}\`
┃ 👤 Nama: ${user.name || 'Unknown'}
┃ 💎 Premium: ${premiumStatus}
┃ 📅 Aktif sejak: ${sinceText}
┃ ⏰ Expired: ${expiredText}
┃ 🦏 Total Badak: ${user.totalBadak || 0}
┃ 📋 List Badak: ${user.badakList ? user.badakList.length : 0} nomor
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
});

// ==================== STATISTIK BOT ====================
userbot.command('stats', async (ctx) => {
    const users = getAllUsers();
    const total = Object.keys(users).length;
    const premium = Object.values(users).filter(u => u.premium).length;
    
    let totalBadak = 0;
    let totalPremiumBadak = 0;
    for (const u of Object.values(users)) {
        totalBadak += (u.totalBadak || 0);
        if (u.premium) totalPremiumBadak += (u.totalBadak || 0);
    }
    
    // Load cooldown
    let cooldownFree = 60, cooldownPremium = 0;
    if (fs.existsSync('./cooldown.json')) {
        const cd = JSON.parse(fs.readFileSync('./cooldown.json', 'utf8'));
        cooldownFree = cd.free / 1000;
        cooldownPremium = cd.premium / 1000;
    }
    
    // Load banned
    let bannedCount = 0;
    if (fs.existsSync('./banned.json')) {
        const banned = JSON.parse(fs.readFileSync('./banned.json', 'utf8'));
        bannedCount = banned.length;
    }
    
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      📊 *STATISTIK BOT* 📊
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *Bot:* ${BOT_UTAMA_USERNAME}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 Total User: ${total}
┃ 💎 Premium User: ${premium}
┃ 🦏 Total Badakan: ${totalBadak}
┃ 💎 Premium Badakan: ${totalPremiumBadak}
┃ ⚙️ Cooldown Free: ${cooldownFree} detik
┃ ⚙️ Cooldown Premium: ${cooldownPremium} detik
┃ 🚫 Banned User: ${bannedCount}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
});

// ==================== RESET USER ====================
userbot.command('resetuser', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ /resetuser <user_id>`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const user = getUser(userId);
    
    updateUser(userId, {
        totalBadak: 0,
        badakList: [],
        lastBadak: 0
    });
    
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🔄 *RESET USER* 🔄
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *User:* ${user.name || 'Unknown'}
> *ID:* \`${userId}\`
> *Data badak telah direset!*

> *Bot:* ${BOT_UTAMA_USERNAME}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
});

// ==================== BROADCAST ====================
userbot.command('broadcast', async (ctx) => {
    const pesan = ctx.message.text.replace('/broadcast', '').trim();
    if (!pesan) {
        await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ❌ *ERROR* ❌
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> Cara penggunaan:
> /broadcast <pesan>

> Contoh:
> /broadcast Halo semua!

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
        return;
    }
    
    const users = getAllUsers();
    let sukses = 0, gagal = 0;
    
    const statusMsg = await ctx.reply(`📤 Mengirim broadcast ke ${Object.keys(users).length} user...`);
    
    for (const [id] of Object.entries(users)) {
        try {
            await ctx.telegram.sendMessage(id, 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      📢 *BROADCAST* 📢
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> ${pesan}

> *Bot:* ${BOT_UTAMA_USERNAME}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
            sukses++;
        } catch (e) { gagal++; }
        await new Promise(r => setTimeout(r, 50));
    }
    
    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null,
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ✅ *BROADCAST SELESAI* ✅
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> 📨 Sukses: ${sukses}
> ❌ Gagal: ${gagal}

> *Bot:* ${BOT_UTAMA_USERNAME}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
});

// ==================== BACKUP DATABASE ====================
userbot.command('backup', async (ctx) => {
    const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const backupName = `backup_${date}.json`;
    
    try {
        const users = getAllUsers();
        fs.writeFileSync(backupName, JSON.stringify(users, null, 2));
        await ctx.replyWithDocument({ source: backupName }, { 
            caption: `📦 Backup database ${date}\n📋 Bot: ${BOT_UTAMA_USERNAME}` 
        });
        fs.unlinkSync(backupName);
    } catch (e) {
        await ctx.reply(`❌ Backup gagal: ${e.message}`);
    }
});

// ==================== SHUTDOWN ====================
userbot.command('shutdown', async (ctx) => {
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🛑 *SHUTDOWN BOT* 🛑
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> Bot utama akan dimatikan.
> *Bot:* ${BOT_UTAMA_USERNAME}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    process.exit(0);
});

// ==================== HELP ====================
userbot.command('help', async (ctx) => {
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🤖 *USERBOT HELP* 🤖
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *Bot Utama:* ${BOT_UTAMA_USERNAME}

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📋 *LIST PERINTAH*
┃
┃ /start - Menu utama
┃ /listpremium - List user premium
┃ /listnomor - List nomor dibadaki
┃ /listuser - List semua user
┃ /addpremium <id> [hari]
┃ /removepremium <id>
┃ /cekuser <id>
┃ /resetuser <id>
┃ /stats - Statistik bot
┃ /broadcast <pesan>
┃ /backup - Backup database
┃ /shutdown - Matikan bot
┃ /help - Bantuan ini
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
});

// ==================== JALANKAN ====================
userbot.launch().then(() => {
    console.log('╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮');
    console.log('┃      🤖 USERBOT JALAN 🤖');
    console.log('┃      📋 Bot: ' + BOT_UTAMA_USERNAME);
    console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯');
});

process.once('SIGINT', () => userbot.stop('SIGINT'));
process.once('SIGTERM', () => userbot.stop('SIGTERM'));