const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const config = require('./config');
const { initDB, isPremium, setPremium, getAllUsers, getUser, updateUser, getRole, setRole, getSellPrice, canSellRole, getTransactions } = require('./database');
const { badakCommand, prosesBadak, pendingBadak } = require('./badak');
const { cekumurCommand } = require('./cekumur');
const { checkMembership } = require('./middleware');
const bot = new Telegraf(config.token);
initDB();
bot.use(checkMembership);

// ==================== VARIABLE GLOBAL ====================
const bannedUsers = new Set();
const BANNED_FILE = './banned.json';

function loadBannedUsers() {
    if (fs.existsSync(BANNED_FILE)) {
        const data = JSON.parse(fs.readFileSync(BANNED_FILE, 'utf8'));
        data.forEach(id => bannedUsers.add(id));
    }
}
function saveBannedUsers() {
    fs.writeFileSync(BANNED_FILE, JSON.stringify([...bannedUsers], null, 2));
}

let customCooldown = { free: 60000, premium: 0 };
const COOLDOWN_FILE = './cooldown.json';

function loadCooldown() {
    if (fs.existsSync(COOLDOWN_FILE)) {
        customCooldown = JSON.parse(fs.readFileSync(COOLDOWN_FILE, 'utf8'));
    }
}
function saveCooldown() {
    fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(customCooldown, null, 2));
}

loadBannedUsers();
loadCooldown();

async function checkBanned(ctx, next) {
    if (bannedUsers.has(ctx.from.id)) {
        await ctx.reply(`> ⚠️ *ANDA DIBAN!*\n> \n> Anda tidak bisa menggunakan bot ini.`, { parse_mode: 'Markdown' });
        return;
    }
    return next();
}
bot.use(checkBanned);

// ==================== ACTION BUTTONS ====================
bot.action('badak_lagi', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`> 🦏 *MASUKKAN NOMOR*\n> \n> Contoh: /badak 628123456789`, { parse_mode: 'Markdown' });
});

bot.action('mybadak', async (ctx) => {
    await ctx.answerCbQuery();
    const userId = ctx.from.id;
    const user = getUser(userId);
    const badakList = user.badakList || [];
    
    if (badakList.length === 0) {
        await ctx.reply(`> 📭 *DAFTAR NOMOR KEBAL*\n> \n> Kamu belum membadaki nomor apapun.`, { parse_mode: 'Markdown' });
        return;
    }
    
    let listMsg = `> 🛡️ *DAFTAR NOMOR KEBAL BADAK*\n> \n> Total: ${badakList.length} nomor\n> \n`;
    badakList.slice(-10).reverse().forEach((item, i) => {
        listMsg += `> ${i+1}. ${item.nomor}\n>    └ Range ${item.range} | 📅 ${new Date(item.date).toLocaleDateString('id-ID')}\n`;
    });
    
    await ctx.reply(listMsg, { parse_mode: 'Markdown' });
});

bot.action('hapus_badak', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    
    if (user.badakList && user.badakList.length > 0) {
        updateUser(userId, { badakList: [], totalBadak: 0 });
        await ctx.answerCbQuery('✅ Semua daftar badak telah dihapus!');
        await ctx.reply(`> ✅ *DAFTAR BADAK DIHAPUS*\n> \n> Semua nomor kebal kamu sudah direset.`, { parse_mode: 'Markdown' });
    } else {
        await ctx.answerCbQuery('📭 Tidak ada daftar badak');
    }
});

bot.action('info_premium', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(
`> 💎 *INFO PREMIUM*
> 
> *Keuntungan Premium:*
> 
> • Badak tanpa cooldown ⚡
> • Range angka 1-400 🎯
> • Bisa cek nomor luar negeri 🌍
> • Prioritas support 🚀
> 
> *Harga:*
> 7 hari = 10k
> 30 hari = 25k
> 60 hari = 50k
> 
> @tuanmudakyzzy (owner)`,
        { parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
              [Markup.button.url('💎 HUBUNG OWNER', 'https://t.me/tuanmudakyzzy')]
          ])
        }
    );
});

bot.action('cekumur_lagi', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`> 🔍 *MASUKKAN NOMOR*\n> \n> Contoh: /cekumur 628123456789`, { parse_mode: 'Markdown' });
});

bot.action('contoh_badak', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`> 📝 *CONTOH BADAK*\n> \n> /badak 628123456789\n> \n> Hasilnya akan membuat nomor tersebut KEBAL BADAK!`, { parse_mode: 'Markdown' });
});
// Handler untuk tombol target angka
bot.action(/badak_target_(.+)/, async (ctx) => {
    await ctx.answerCbQuery();
    const targetAngka = parseInt(ctx.match[1]);
    const userId = ctx.from.id;
    const premium = isPremium(userId);
    
    const pending = pendingBadak.get(userId);
    if (!pending) {
        await ctx.reply(`> ⏰ *SESI HABIS*\n> \n> Silahkan ketik /badak <nomor> lagi.`, { parse_mode: 'Markdown' });
        return;
    }
    
    const waktu = pending.timestamp;
    if (Date.now() - waktu > 60000) {
        pendingBadak.delete(userId);
        await ctx.reply(`> ⏰ *SESI EXPIRED*\n> \n> Waktu habis. Silahkan ketik /badak <nomor> lagi.`, { parse_mode: 'Markdown' });
        return;
    }
    
    await prosesBadak(ctx, userId, pending.nomor, targetAngka, premium);
});

// ==================== VERIFIKASI JOIN ====================
bot.action('verify_join', async (ctx) => {
    await ctx.answerCbQuery('Memverifikasi...');
    const userId = ctx.from.id;
    
    if (userId === config.owner) {
        await ctx.reply(`> ✅ *VERIFIKASI BERHASIL*\n> \n> Selamat datang owner!`, { parse_mode: 'Markdown' });
        return;
    }
    
    try {
        const channel = await ctx.telegram.getChatMember(`@${config.requiredChannel}`, userId);
        const group = await ctx.telegram.getChatMember(`@${config.requiredGroup}`, userId);
        
        const inChannel = ['creator', 'administrator', 'member'].includes(channel.status);
        const inGroup = ['creator', 'administrator', 'member'].includes(group.status);
        
        if (inChannel && inGroup) {
            await ctx.reply(`> ✅ *VERIFIKASI BERHASIL!*\n> \n> Kamu sudah join channel dan grup.\n> Sekarang bisa menggunakan bot.\n> \n> Ketik /start untuk memulai.`, { parse_mode: 'Markdown' });
        } else {
            let missing = [];
            if (!inChannel) missing.push('Channel');
            if (!inGroup) missing.push('Grup');
            
            await ctx.reply(`> ❌ *VERIFIKASI GAGAL*\n> \n> Kamu masih belum join: ${missing.join(' dan ')}\n> \n> Silahkan join dulu lalu klik tombol verifikasi lagi.`, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url('📢 Join Channel', config.channelLink)],
                    [Markup.button.url('👥 Join Grup', config.groupLink)],
                    [Markup.button.callback('✅ Coba lagi', 'verify_join')]
                ])
            });
        }
    } catch (error) {
        await ctx.reply(`> ❌ *ERROR VERIFIKASI*\n> \n> Pastikan bot adalah admin di channel & grup.`, { parse_mode: 'Markdown' });
    }
});

// ==================== BOT COMMANDS ====================
bot.command('start', async (ctx) => {
    const user = getUser(ctx.from.id);
    const premium = isPremium(ctx.from.id);
    const isOwnerUser = ctx.from.id === config.owner;
    
    updateUser(ctx.from.id, { name: ctx.from.first_name });
    
    const username = ctx.from.username || ctx.from.first_name;
    const totalBadak = user.totalBadak || 0;
    const statusIcon = premium ? '💎 PREMIUM ✅' : '⚠️ FREE';
    
    const text = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🦏 *@${ctx.botInfo.username}* 🦏
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

> *SELAMAT DATANG @${username}*
> 
> ╭━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ┃ 📊 *STATUS KAMU*
> ┃
> ┃ ├ Nama: @${username}
> ┃ ├ Status: ${statusIcon}
> ╰━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 📖 *PERINTAH TERSEDIA*
> 
> 🦏 /badak <nomor> - Buat nomor jadi kebal
> 🔍 /cekumur <nomor> - Cek provider & masa aktif
> 💎 /premium - Cek status premium
> 📋 /harga - Lihat harga  role
> 
> ⚡ *Tips:* Kirim /badak 628xxx untuk mulai!
> 
> ╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
> ┃  👑 @tuanmudakyzzy
> ╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    const keyboard = [
        [Markup.button.callback('🦏 BADAK SEKARANG', 'badak_lagi'), Markup.button.callback('🔍 CEK UMUR', 'cekumur_lagi')],
        [Markup.button.callback('💎 INFO PREMIUM', 'info_premium'), Markup.button.callback('📋 HARGA ROLE', 'Harga')],
        [Markup.button.url('🔥 HUBUNG OWNER', 'https://t.me/tuanmudakyzzy')]
    ];
    
    if (isOwnerUser) {
        keyboard.push([Markup.button.callback('👑 MENU ADMIN', 'admin_menu')]);
    }
    
    await ctx.reply(text, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(keyboard)
    });
});

bot.command('premium', async (ctx) => {
    const userId = ctx.from.id;
    const premium = isPremium(userId);
    const user = getUser(userId);
    
    let text;
    if (premium) {
        text = 
`> 💎 *STATUS PREMIUM*
> 
> ✅ *Anda adalah user PREMIUM!*
> 
> ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ┃ 📅 Aktif sejak: ${new Date(user.premiumSince).toLocaleDateString('id-ID')}
> ┃ ⏰ Expired: ${user.premiumExpired ? new Date(user.premiumExpired).toLocaleDateString('id-ID') : 'Permanent'}
> ┃
> ┃ 🎁 *Fitur Premium:*
> ┃ ├ Badak tanpa cooldown
> ┃ ├ Range angka 1-400
> ┃ └ Bisa cek nomor luar negeri
> ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> Terima kasih sudah menjadi premium! 🦏`;
    } else {
        text = 
`> 💎 *STATUS PREMIUM*
> 
> ❌ *Anda adalah FREE user*
> 
> ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ┃ 📊 *Perbedaan Free vs Premium*
> ┃
> ┃ *Free User*
> ┃ ├ Badak: cooldown 60 detik
> ┃ ├ Range: 1-200
> ┃ └ Cekumur: Indonesia only
> ┃
> ┃ *Premium User*
> ┃ ├ Badak: tanpa cooldown
> ┃ ├ Range: 1-400
> ┃ └ Cekumur: bisa nomor LN
> ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 💬 Hubung owner untuk info upgrade premium!
> 
> @tuanmudakyzzy (owner)`;
    }
    
    await ctx.reply(text, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.url('💎 HUBUNG OWNER (PREMIUM)', 'https://t.me/tuanmudakyzzy')]
        ])
    });
});

bot.command('badak', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const nomor = args[1];
    await badakCommand(ctx, nomor);
});

bot.command('mybadak', async (ctx) => {
    const userId = ctx.from.id;
    const user = getUser(userId);
    const badakList = user.badakList || [];
    
    if (badakList.length === 0) {
        await ctx.reply(`> 📭 *DAFTAR NOMOR KEBAL*\n> \n> Kamu belum membadaki nomor apapun.\n> \n> Gunakan /badak <nomor> untuk mulai!`, { parse_mode: 'Markdown' });
        return;
    }
    
    let listMsg = `> 🛡️ *DAFTAR NOMOR KEBAL BADAK*\n> \n> Total: ${badakList.length} nomor\n> \n`;
    badakList.slice(-10).reverse().forEach((item, i) => {
        listMsg += `> ${i+1}. ${item.nomor}\n>    └ Range ${item.range} | 📅 ${new Date(item.date).toLocaleDateString('id-ID')}\n`;
    });
    
    if (badakList.length > 10) {
        listMsg += `> \n> 📌 Menampilkan 10 terbaru dari ${badakList.length}`;
    }
    
    await ctx.reply(listMsg, { parse_mode: 'Markdown' });
});

bot.command('cekumur', async (ctx) => {
    const args = ctx.message.text.split(' ');
    const nomor = args[1];
    await cekumurCommand(ctx, nomor);
});

// ==================== OWNER COMMANDS ====================
async function isOwner(userId) {
    return userId === config.owner;
}

// MENU ADMIN
bot.action('admin_menu', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    
    const text = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      👑 *MENU ADMIN* 👑
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Pilih fitur di bawah ini:`;
    
    await ctx.reply(text, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('💎 LIST PREMIUM', 'admin_listpremium'), Markup.button.callback('📋 LIST NOMOR', 'admin_listnomor')],
            [Markup.button.callback('➕ TAMBAH PREMIUM', 'admin_addpremium'), Markup.button.callback('➖ HAPUS PREMIUM', 'admin_removepremium')],
            [Markup.button.callback('🚫 BAN USER', 'admin_ban'), Markup.button.callback('✅ UNBAN USER', 'admin_unban')],
            [Markup.button.callback('📊 STATS', 'admin_stats'), Markup.button.callback('🔍 CEK USER', 'admin_cekuser')],
            [Markup.button.callback('🗑️ RESET USER', 'admin_resetuser'), Markup.button.callback('⚙️ SET COOLDOWN', 'admin_cooldown')],
            [Markup.button.callback('📢 BROADCAST', 'admin_broadcast'), Markup.button.callback('💾 BACKUP', 'admin_backup')],
            [Markup.button.callback('🛑 SHUTDOWN', 'admin_shutdown'), Markup.button.callback('❌ TUTUP', 'close_admin_menu')]
        ])
    });
});

bot.action('close_admin_menu', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.deleteMessage();
});

// LIST PREMIUM
bot.action('admin_listpremium', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    
    const users = getAllUsers();
    const premiumUsers = [];
    
    for (const [id, user] of Object.entries(users)) {
        if (user.premium) {
            premiumUsers.push({ id, name: user.name || 'Unknown', expired: user.premiumExpired });
        }
    }
    
    if (premiumUsers.length === 0) {
        await ctx.reply(`> 📭 *DAFTAR PREMIUM*\n> \n> Belum ada user premium.`, { parse_mode: 'Markdown' });
        return;
    }
    
    let msg = `> 💎 *DAFTAR USER PREMIUM* (${premiumUsers.length})\n> \n`;
    premiumUsers.forEach((u, i) => {
        const expired = u.expired ? new Date(u.expired).toLocaleDateString('id-ID') : 'Permanent';
        msg += `> ${i+1}. ${u.name}\n>    └ ID: ${u.id} | Expired: ${expired}\n`;
    });
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// LIST NOMOR
bot.action('admin_listnomor', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    
    const users = getAllUsers();
    let allBadak = [];
    
    for (const [userId, user] of Object.entries(users)) {
        if (user.badakList && user.badakList.length > 0) {
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
        await ctx.reply(`> 📭 *LIST NOMOR*\n> \n> Belum ada nomor yang dibadaki.`, { parse_mode: 'Markdown' });
        return;
    }
    
    allBadak.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
    
    let msg = `> 📋 *SEMUA NOMOR YANG DIBAKADAI*\n> \n> Total: ${allBadak.length} nomor\n> \n`;
    
    const displayCount = Math.min(20, allBadak.length);
    for (let i = 0; i < displayCount; i++) {
        const b = allBadak[i];
        const date = new Date(b.tanggal).toLocaleDateString('id-ID');
        msg += `> ${i+1}. 📞 \`${b.nomor}\`\n`;
        msg += `>    └ 👤 ${b.userName} (${b.userId}) | ${b.range} | ${date}\n`;
    }
    
    if (allBadak.length > 20) {
        msg += `> \n> 📌 Menampilkan 20 terbaru dari ${allBadak.length} nomor`;
    }
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// TAMBAH PREMIUM
bot.action('admin_addpremium', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(`> 💎 *TAMBAH PREMIUM*\n> \n> Kirim perintah:\n> /addpremium <userId> [hari]\n> \n> Contoh: /addpremium 123456789 30`, { parse_mode: 'Markdown' });
});

bot.command('addpremium', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ *CARA PENGGUNAAN*\n> \n> /addpremium <userId> [days]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const days = args[2] ? parseInt(args[2]) : 30;
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + days);
    
    setPremium(userId, true, expiredAt.toISOString());
    
    await ctx.reply(`> ✅ *PREMIUM ADDED*\n> \n> User ID: ${userId}\n> Durasi: ${days} hari\n> Expired: ${expiredAt.toLocaleDateString('id-ID')}`, { parse_mode: 'Markdown' });
});

// HAPUS PREMIUM
bot.action('admin_removepremium', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(`> 🗑️ *HAPUS PREMIUM*\n> \n> Kirim perintah:\n> /removepremium <userId>\n> \n> Contoh: /removepremium 123456789`, { parse_mode: 'Markdown' });
});

bot.command('removepremium', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ *CARA PENGGUNAAN*\n> \n> /removepremium <userId>`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    setPremium(userId, false, null);
    
    await ctx.reply(`> ✅ *PREMIUM REMOVED*\n> \n> User ID: ${userId}\n> Status: FREE USER`, { parse_mode: 'Markdown' });
});

// BAN USER
bot.action('admin_ban', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(`> 🚫 *BAN USER*\n> \n> Kirim perintah:\n> /ban <userId> [alasan]\n> \n> Contoh: /ban 123456789 Spam`, { parse_mode: 'Markdown' });
});

bot.command('ban', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ *CARA PENGGUNAAN*\n> \n> /ban <userId> [alasan]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const reason = args.slice(2).join(' ') || 'Tidak ada alasan';
    
    bannedUsers.add(userId);
    saveBannedUsers();
    
    await ctx.reply(`> ✅ *USER DIBAN*\n> \n> User ID: ${userId}\n> Alasan: ${reason}`, { parse_mode: 'Markdown' });
});

// UNBAN USER
bot.action('admin_unban', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(`> ✅ *UNBAN USER*\n> \n> Kirim perintah:\n> /unban <userId>\n> \n> Contoh: /unban 123456789`, { parse_mode: 'Markdown' });
});

bot.command('unban', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ *CARA PENGGUNAAN*\n> \n> /unban <userId>`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    bannedUsers.delete(userId);
    saveBannedUsers();
    
    await ctx.reply(`> ✅ *USER UNBAN*\n> \n> User ID: ${userId} sudah bisa menggunakan bot lagi.`, { parse_mode: 'Markdown' });
});

// STATS
bot.action('admin_stats', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    
    const users = getAllUsers();
    const total = Object.keys(users).length;
    const premium = Object.values(users).filter(u => u.premium).length;
    
    let totalBadak = 0;
    for (const u of Object.values(users)) {
        totalBadak += (u.totalBadak || 0);
    }
    
    await ctx.reply(
`> 📊 *STATISTIK BOT*
> 
> 👥 Total User: ${total}
> 💎 Premium User: ${premium}
> 🦏 Total Badakan: ${totalBadak}
> ⚙️ Cooldown Free: ${customCooldown.free / 1000} detik
> ⚙️ Cooldown Premium: ${customCooldown.premium / 1000} detik
> 🚫 Banned User: ${bannedUsers.size}`,
        { parse_mode: 'Markdown' }
    );
});



// ==================== SISTEM JUAL BELI ROLE ====================

// Daftar harga
bot.command('harga', async (ctx) => {
    let msg = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      💰 *DAFTAR HARGA ROLE* 💰
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`;
    
    for (const [key, role] of Object.entries(config.roles)) {
        msg += `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n`;
        msg += `┃ ${role.name}\n`;
        msg += `┃ 💵 Harga: Rp ${role.price.toLocaleString()}\n`;
        msg += `┃ 📅 Durasi: ${role.days} hari\n`;
        msg += `┃\n`;
        msg += `┃ 🎁 *Benefits:*\n`;
        role.benefits.forEach(b => {
            msg += `┃ ${b}\n`;
        });
        msg += `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`;
    }
    
    msg += 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// Cek role sendiri
bot.command('myrole', async (ctx) => {
    const userId = ctx.from.id;
    const role = getRole(userId);
    const user = getUser(userId);
    
    const roleNames = { VIP: '👑 VIP', PREMIUM: '💎 PREMIUM', VVIP: '⭐ VVIP ⭐', FREE: '⚠️ FREE' };
    const expired = user.roleExpired ? new Date(user.roleExpired).toLocaleDateString('id-ID') : '-';
    const benefits = config.roles[role]?.benefits || ['• Fitur dasar FREE (cooldown 60 detik)'];
    
    let msg = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      👤 *ROLE KAMU* 👤
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Role: ${roleNames[role]}
Expired: ${expired}
Sales: ${user.salesCount || 0} transaksi

🎁 *Benefits:*
${benefits.map(b => `┃ ${b}`).join('\n')}

💬 Mau beli atau jual akses? Kirim /jual atau /beli

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// Beli role (pembeli)
bot.command('beli', async (ctx) => {
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(
`> ❌ *CARA PENGGUNAAN*
> 
> /beli <role>
> 
> Role: VIP, PREMIUM, VVIP
> 
> Contoh:
> /beli VIP
> 
> Pembayaran transfer ke owner.
> 
> Atau cari reseller dengan /reseller`, { parse_mode: 'Markdown' });
        return;
    }
    
    const targetRole = args[1].toUpperCase();
    if (!['VIP', 'PREMIUM', 'VVIP'].includes(targetRole)) {
        await ctx.reply('❌ Role tidak valid! Pilih: VIP, PREMIUM, VVIP');
        return;
    }
    
    const price = config.roles[targetRole]?.price || 0;
    
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      💰 *BELI ${targetRole}* 💰
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Role: ${targetRole}
Harga: Rp ${price.toLocaleString()}
Durasi: 30 hari

📌 *Cara Bayar:*
1. Transfer ke:
   Bank BCA: 1234567890
   a.n. Badak Bot
2. Screenshot bukti transfer
3. Kirim ke @tuanmudakyzzy
4. Tunggu konfirmasi owner

💡 Mau cari yang lebih murah? /reseller

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
});

// Jual role (reseller)
bot.command('jual', async (ctx) => {
    const sellerId = ctx.from.id;
    const sellerRole = getRole(sellerId);
    
    if (sellerRole === 'FREE') {
        await ctx.reply(
`> ❌ *TIDAK BISA JUAL*
> 
> Role FREE tidak bisa menjual akses.
> 
> Upgrade ke VIP, PREMIUM, atau VVIP dulu!
> 
> /harga untuk lihat harga upgrade`, { parse_mode: 'Markdown' });
        return;
    }
    
    const canSell = config.roles[sellerRole]?.canSell || [];
    
    let msg = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      💰 *JUAL AKSES* 💰
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Role kamu: ${config.roles[sellerRole]?.name}
Kamu bisa menjual role: ${canSell.join(', ')}

📌 *Cara menjual:*
/jualkan <userId> <role> [hari]

Contoh:
/jualkan 123456789 VIP 30
/jualkan 123456789 PREMIUM 30

💵 Kamu bisa menentukan harga sendiri!
📊 Komisi: 10-20% dari harga jual

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// Jualkan (reseller menjual ke user lain)
bot.command('jualkan', async (ctx) => {
    const sellerId = ctx.from.id;
    const sellerRole = getRole(sellerId);
    
    if (sellerRole === 'FREE') {
        await ctx.reply('❌ Role FREE tidak bisa menjual akses!');
        return;
    }
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply(
`> ❌ *CARA PENGGUNAAN*
> 
> /jualkan <userId> <role> [hari]
> 
> Contoh:
> /jualkan 123456789 VIP 30
> 
> Role yang bisa kamu jual: ${config.roles[sellerRole]?.canSell.join(', ')}`, { parse_mode: 'Markdown' });
        return;
    }
    
    const buyerId = parseInt(args[1]);
    const targetRole = args[2].toUpperCase();
    const days = args[3] ? parseInt(args[3]) : 30;
    
    // Cek apakah seller boleh jual role ini
    if (!config.roles[sellerRole]?.canSell?.includes(targetRole)) {
        await ctx.reply(`❌ Kamu tidak bisa menjual role ${targetRole}! Kamu hanya bisa jual: ${config.roles[sellerRole]?.canSell.join(', ')}`);
        return;
    }
    
    // Cek apakah buyer sudah punya role lebih tinggi
    const buyerRole = getRole(buyerId);
    const roleLevel = { FREE: 0, VIP: 1, PREMIUM: 2, VVIP: 3 };
    
    if (roleLevel[targetRole] <= roleLevel[buyerRole]) {
        await ctx.reply(`❌ User sudah memiliki role ${buyerRole} yang sama atau lebih tinggi!`);
        return;
    }
    
    // Proses jual
    setRole(buyerId, targetRole, days, sellerId);
    
    const price = getSellPrice(targetRole, sellerId);
    const seller = getUser(sellerId);
    
    await ctx.reply(
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      ✅ *TRANSAKSI BERHASIL* ✅
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

👤 Pembeli: ${buyerId}
👑 Penjual: @${ctx.from.username || ctx.from.first_name}
🎁 Role: ${targetRole}
📅 Durasi: ${days} hari
💵 Harga jual: Rp ${price.toLocaleString()}

📊 Komisi penjual: Rp ${Math.floor(price * 0.1).toLocaleString()}

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    
    // Notifikasi ke pembeli
    try {
        await ctx.telegram.sendMessage(buyerId,
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🎉 *ROLE DIUPDATE!* 🎉
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Role baru: ${config.roles[targetRole]?.name}
Durasi: ${days} hari
Penjual: @${ctx.from.username || ctx.from.first_name}

🎁 *Benefits:*
${config.roles[targetRole]?.benefits.map(b => `• ${b}`).join('\n')}

Nikmati fiturnya! 🦏

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    } catch(e) {}
});

// List reseller
bot.command('reseller', async (ctx) => {
    const users = getAllUsers();
    let resellers = [];
    
    for (const [id, user] of Object.entries(users)) {
        const role = getRole(parseInt(id));
        if (role !== 'FREE' && user.salesCount > 0) {
            resellers.push({
                id: id,
                name: user.name || 'Unknown',
                role: role,
                sales: user.salesCount
            });
        }
    }
    
    if (resellers.length === 0) {
        await ctx.reply('📭 Belum ada reseller terdaftar.');
        return;
    }
    
    let msg = 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🤝 *DAFTAR RESELLER* 🤝
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

`;
    
    resellers.forEach((r, i) => {
        msg += `┃ ${i+1}. ${r.name}\n`;
        msg += `┃    Role: ${r.role}\n`;
        msg += `┃    Penjualan: ${r.sales} transaksi\n`;
        msg += `┃\n`;
    });
    
    msg += 
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;
    
    await ctx.reply(msg, { parse_mode: 'Markdown' });
});

// Owner: set role langsung
bot.command('setrole', async (ctx) => {
    if (ctx.from.id !== config.owner) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply(
`> ❌ *CARA PENGGUNAAN*
> 
> /setrole <userId> <role> [hari]
> 
> Role: FREE, VIP, PREMIUM, VVIP
> 
> Contoh:
> /setrole 123456789 VIP 30`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const role = args[2].toUpperCase();
    const days = args[3] ? parseInt(args[3]) : 30;
    
    if (!['FREE', 'VIP', 'PREMIUM', 'VVIP'].includes(role)) {
        await ctx.reply('❌ Role tidak valid! Pilih: FREE, VIP, PREMIUM, VVIP');
        return;
    }
    
    setRole(userId, role, days);
    
    const roleNames = { VIP: '👑 VIP', PREMIUM: '💎 PREMIUM', VVIP: '⭐ VVIP ⭐', FREE: '⚠️ FREE' };
    
    await ctx.reply(
`> ✅ *ROLE UPDATED*
> 
> User ID: ${userId}
> Role: ${roleNames[role]}
> Durasi: ${days} hari`, { parse_mode: 'Markdown' });
    
    try {
        await ctx.telegram.sendMessage(userId,
`╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃      🎉 *ROLE DIUPDATE!* 🎉
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

Role baru: ${roleNames[role]}
Durasi: ${days} hari

Nikmati fiturnya! 🦏

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  👑 @tuanmudakyzzy
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`, { parse_mode: 'Markdown' });
    } catch(e) {}
});

// CEK USER
bot.action('admin_cekuser', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(`> 🔍 *CEK USER*\n> \n> Kirim perintah:\n> /cekuser <userId>\n> \n> Contoh: /cekuser 123456789`, { parse_mode: 'Markdown' });
});

bot.command('cekuser', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ *CARA PENGGUNAAN*\n> \n> /cekuser <userId>`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const user = getUser(userId);
    
    await ctx.reply(
`> 📋 *INFO USER*
> 
> ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ┃ 🆔 ID: ${user.id}
> ┃ 👤 Nama: ${user.name || 'Tidak ada'}
> ┃ 💎 Premium: ${user.premium ? '✅ AKTIF' : '❌ TIDAK'}
> ┃ 🦏 Total Badak: ${user.totalBadak || 0}
> ┃ 📋 Daftar Badak: ${user.badakList ? user.badakList.length : 0} nomor
> ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        { parse_mode: 'Markdown' }
    );
});

// RESET USER
bot.action('admin_resetuser', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(`> 🔄 *RESET USER*\n> \n> Kirim perintah:\n> /resetuser <userId>\n> \n> Contoh: /resetuser 123456789`, { parse_mode: 'Markdown' });
});

bot.command('resetuser', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ *CARA PENGGUNAAN*\n> \n> /resetuser <userId>`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    
    updateUser(userId, {
        totalBadak: 0,
        badakList: [],
        lastBadak: 0
    });
    
    await ctx.reply(`> ✅ *USER DATA RESET*\n> \n> User ID: ${userId}\n> Data badak telah direset.`, { parse_mode: 'Markdown' });
});

// SET COOLDOWN
bot.action('admin_cooldown', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(
`> ⚙️ *SET COOLDOWN*
> 
> Kirim perintah:
> /setcooldown <free/premium> <detik>
> 
> Contoh:
> /setcooldown free 30
> /setcooldown premium 0
> 
> 📊 *Cooldown Saat Ini:*
> Free: ${customCooldown.free / 1000} detik
> Premium: ${customCooldown.premium / 1000} detik`,
        { parse_mode: 'Markdown' }
    );
});

bot.command('setcooldown', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 3) {
        await ctx.reply(`> ❌ *CARA PENGGUNAAN*\n> \n> /setcooldown <free/premium> <detik>`, { parse_mode: 'Markdown' });
        return;
    }
    
    const type = args[1].toLowerCase();
    const seconds = parseInt(args[2]);
    
    if (isNaN(seconds) || seconds < 0) {
        await ctx.reply(`> ❌ *ERROR*\n> \n> Detik harus angka positif!`, { parse_mode: 'Markdown' });
        return;
    }
    
    const cooldownMs = seconds * 1000;
    
    if (type === 'free') {
        customCooldown.free = cooldownMs;
        saveCooldown();
        await ctx.reply(`> ✅ *COOLDOWN FREE UPDATED*\n> \n> Cooldown free user: ${seconds} detik`, { parse_mode: 'Markdown' });
    } else if (type === 'premium') {
        customCooldown.premium = cooldownMs;
        saveCooldown();
        await ctx.reply(`> ✅ *COOLDOWN PREMIUM UPDATED*\n> \n> Cooldown premium user: ${seconds} detik`, { parse_mode: 'Markdown' });
    } else {
        await ctx.reply(`> ❌ *ERROR*\n> \n> Type harus 'free' atau 'premium'!`, { parse_mode: 'Markdown' });
    }
});

// BROADCAST
bot.action('admin_broadcast', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(`> 📢 *BROADCAST*\n> \n> Kirim perintah:\n> /broadcast <pesan>\n> \n> Contoh: /broadcast Halo semua!`, { parse_mode: 'Markdown' });
});

bot.command('broadcast', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) {
        await ctx.reply(`> ❌ *CARA PENGGUNAAN*\n> \n> /broadcast <pesan>`, { parse_mode: 'Markdown' });
        return;
    }
    
    const users = getAllUsers();
    let success = 0, fail = 0;
    
    const statusMsg = await ctx.reply(`> 📤 *BROADCAST*\n> \n> Mengirim ke ${Object.keys(users).length} user...`, { parse_mode: 'Markdown' });
    
    for (const [id] of Object.entries(users)) {
        try {
            await bot.telegram.sendMessage(id, 
`> 📢 *BROADCAST*
> 
> ${message}
> 
> — Badak Bot 🦏`, { parse_mode: 'Markdown' });
            success++;
        } catch (e) {
            fail++;
        }
        await new Promise(r => setTimeout(r, 50));
    }
    
    await ctx.telegram.editMessageText(ctx.chat.id, statusMsg.message_id, null, 
`> ✅ *BROADCAST SELESAI*
> 
> 📨 Berhasil: ${success}
> ❌ Gagal: ${fail}`, { parse_mode: 'Markdown' });
});

// BACKUP
bot.action('admin_backup', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    
    const date = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const backupName = `backup_${date}.json`;
    
    try {
        const users = getAllUsers();
        fs.writeFileSync(backupName, JSON.stringify(users, null, 2));
        await ctx.replyWithDocument({ source: backupName }, { caption: `📦 Backup database ${date}` });
        fs.unlinkSync(backupName);
    } catch (e) {
        await ctx.reply(`> ❌ *BACKUP GAGAL*\n> \n> ${e.message}`, { parse_mode: 'Markdown' });
    }
});

// SHUTDOWN
bot.action('admin_shutdown', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    await ctx.answerCbQuery();
    await ctx.reply(`> 🛑 *BOT SHUTDOWN*\n> \n> Bot akan dimatikan.`, { parse_mode: 'Markdown' });
    process.exit(0);
});

// ==================== START BOT ====================
bot.launch().then(() => {
    console.log('╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮');
    console.log('┃      🦏 BADAK BOT JALAN 🦏');
    console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯');
    console.log(`📋 Owner ID: ${config.owner}`);
    console.log(`⚙️ Cooldown Free: ${customCooldown.free / 1000} detik`);
    console.log(`⚙️ Cooldown Premium: ${customCooldown.premium / 1000} detik`);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));