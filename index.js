const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const config = require('./config');
const { initDB, isPremium, setPremium, getAllUsers, getUser, updateUser } = require('./database');
const { badakCommand, mybadakCommand } = require('./badak');
const { cekumurCommand } = require('./cekumur');
const { checkMembership } = require('./middleware');

const bot = new Telegraf(config.token);
initDB();

// Middleware
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

let customCooldown = {
    free: 60000,
    premium: 0
};

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
        await ctx.reply(`> ⚠️ *ANDA DIBAN!*\n> \n> Anda tidak bisa menggunakan bot ini.\n> Hubung owner jika keberatan.`, { parse_mode: 'Markdown' });
        return;
    }
    return next();
}
bot.use(checkBanned);

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

// ==================== COMMANDS USER ====================

bot.command('start', async (ctx) => {
    const user = getUser(ctx.from.id);
    const premium = isPremium(ctx.from.id);
    
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
> ┃ └ C
