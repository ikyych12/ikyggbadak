const config = require('./config');

async function checkMembership(ctx, next) {
    const userId = ctx.from.id;
    
    if (userId === config.owner) return next();
    
    try {
        const channel = await ctx.telegram.getChatMember(`@${config.requiredChannel}`, userId);
        const group = await ctx.telegram.getChatMember(`@${config.requiredGroup}`, userId);
        
        const inChannel = ['creator', 'administrator', 'member'].includes(channel.status);
        const inGroup = ['creator', 'administrator', 'member'].includes(group.status);
        
        if (!inChannel || !inGroup) {
            const text = 
`> ⚠️ *AKSES DITOLAK!*
> 
> Kamu harus join channel & grup dulu:
> 
> 📢 [Join Channel](${config.channelLink})
> 👥 [Join Grup](${config.groupLink})
> 
> ✅ Setelah join, klik /start lagi`;
            
            await ctx.reply(text, { parse_mode: 'Markdown', disable_web_page_preview: true });
            return;
        }
        
        return next();
    } catch (error) {
        await ctx.reply('❌ Error cek keanggotaan, coba lagi nanti.');
    }
}

module.exports = { checkMembership };