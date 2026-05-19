const config = require('./config');
const { Markup } = require('telegraf');

async function checkMembership(ctx, next) {
    // Cek apakah pesan dari user (bukan dari channel)
    if (!ctx.from) {
        return next();
    }
    
    const userId = ctx.from.id;
    
    if (userId === config.owner) return next();
    
    try {
        const channel = await ctx.telegram.getChatMember(`@${config.requiredChannel}`, userId);
        const group = await ctx.telegram.getChatMember(`@${config.requiredGroup}`, userId);
        
        const inChannel = ['creator', 'administrator', 'member'].includes(channel.status);
        const inGroup = ['creator', 'administrator', 'member'].includes(group.status);
        
        if (!inChannel || !inGroup) {
            let missing = [];
            if (!inChannel) missing.push('Channel');
            if (!inGroup) missing.push('Grup');
            
            const text = 
`> ⚠️ *AKSES DITOLAK!*
> 
> Kamu belum join: ${missing.join(' dan ')}
> 
> 📢 [Join Channel](${config.channelLink})
> 👥 [Join Grup](${config.groupLink})
> 
> ✅ Setelah join, klik tombol di bawah.`;
            
            await ctx.reply(text, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true,
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('✅ Saya sudah join', 'verify_join')]
                ])
            });
            return;
        }
        
        return next();
    } catch (error) {
        console.error('Error cek membership:', error.message);
        return next();
    }
}

module.exports = { checkMembership };