const { Telegraf, Markup } = require('telegraf');
const config = require('./config');
const { initDB, isPremium, setPremium, getAllUsers, getUser } = require('./database');
const { badakCommand, mybadakCommand } = require('./badak');
const { cekumurCommand } = require('./cekumur');
const { checkMembership } = require('./middleware');

const bot = new Telegraf(config.token);
initDB();

bot.use(checkMembership);

// ==================== ACTION BUTTON HANDLERS ====================

bot.action('badak_lagi', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply(`> 🦏 *MASUKKAN NOMOR*\n> \n> Contoh: /badak 628123456789`, { parse_mode: 'Markdown' });
});

bot.action('mybadak', async (ctx) => {
    await ctx.answerCbQuery();
    await mybadakCommand(ctx);
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
> 30 hari = 10k
> 60 hari = 15k
> 90 hari = 20k
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

// ==================== COMMANDS ====================

bot.command('start', async (ctx) => {
    const user = getUser(ctx.from.id);
    const premium = isPremium(ctx.from.id);
    const botUsername = ctx.botInfo.username;
    
    updateUser(ctx.from.id, { name: ctx.from.first_name });
    
    const text = 
`> 🦏 *SELAMAT DATANG DI BADAK BOT*
> 
> Hai *${ctx.from.first_name}*! Selamat datang di Badak Bot.
> 
> ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━
> ┃ 📊 *Status Kamu*
> ┃ ├ Premium: ${premium ? '✅ AKTIF' : '❌ FREE'}
> ┃ └ Badakan: ${user.totalBadak || 0} nomor
> ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━
> 
> 📖 *Perintah Tersedia*
> 
> 🦏 /badak <nomor> - Buat nomor jadi kebal
> 📋 /mybadak - Lihat daftar nomor kebalmu
> 🔍 /cekumur <nomor> - Cek provider & masa aktif
> 💎 /premium - Cek status premium
> 
> ⚡ Tips: Kirim /badak 628xxx untuk mulai!
> 
> @tuanmudakyzzy (owner)`;
    
    await ctx.reply(text, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.callback('🦏 BADAK SEKARANG', 'badak_lagi'), Markup.button.callback('🔍 CEK UMUR', 'cekumur_lagi')],
            [Markup.button.callback('💎 INFO PREMIUM', 'info_premium'), Markup.button.url('🔥 HUBUNG OWNER', 'https://t.me/tuanmudakyzzy')]
        ])
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
    await mybadakCommand(ctx);
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

bot.command('addpremium', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ *ERROR*\n> \n> Usage: /addpremium <userId> [days]`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    const days = args[2] ? parseInt(args[2]) : 30;
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + days);
    
    setPremium(userId, true, expiredAt.toISOString());
    
    await ctx.reply(`> ✅ *PREMIUM ADDED*\n> \n> User ID: ${userId}\n> Durasi: ${days} hari\n> Expired: ${expiredAt.toLocaleDateString('id-ID')}`, { parse_mode: 'Markdown' });
    
    try {
        await bot.telegram.sendMessage(userId, 
`> 🎉 *SELAMAT!*
> 
> Anda telah diupgrade menjadi *PREMIUM* selama ${days} hari!
> 
> 🎁 *Fitur yang didapat:*
> • Badak tanpa cooldown
> • Range angka 1-400
> • Bisa cek nomor luar negeri
> 
> Nikmati fitur premium! 🦏`, { parse_mode: 'Markdown' });
    } catch (e) {}
});

bot.command('removepremium', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const args = ctx.message.text.split(' ');
    if (args.length < 2) {
        await ctx.reply(`> ❌ *ERROR*\n> \n> Usage: /removepremium <userId>`, { parse_mode: 'Markdown' });
        return;
    }
    
    const userId = parseInt(args[1]);
    setPremium(userId, false, null);
    
    await ctx.reply(`> ✅ *PREMIUM REMOVED*\n> \n> User ID: ${userId}\n> Status: FREE USER`, { parse_mode: 'Markdown' });
});

bot.command('listpremium', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
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

bot.command('broadcast', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
    const message = ctx.message.text.replace('/broadcast', '').trim();
    if (!message) {
        await ctx.reply(`> ❌ *ERROR*\n> \n> Usage: /broadcast <pesan>`, { parse_mode: 'Markdown' });
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

bot.command('stats', async (ctx) => {
    if (!await isOwner(ctx.from.id)) return;
    
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
> 🤖 Bot aktif sejak: ${new Date().toLocaleDateString('id-ID')}
> 
> @tuanmudakyzzy (owner)`, { parse_mode: 'Markdown' });
});

// ==================== START BOT ====================

bot.launch().then(() => {
    console.log('✅ Badak Bot jalan...');
    console.log('📋 Owner ID:', config.owner);
    console.log('🦏 Fitur badak aktif');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));