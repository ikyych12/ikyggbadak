const config = require('./config');

async function checkMembership(ctx, next) {
    const userId = ctx.from.id;
    
    // Owner tidak perlu join (biar bisa test)
    if (userId === config.owner) {
        return next();
    }
    
    try {
        // Cek keanggotaan channel
        const channel = await ctx.telegram.getChatMember(`@${config.requiredChannel}`, userId);
        const inChannel = ['creator', 'administrator', 'member'].includes(channel.status);
        
        // Cek keanggotaan grup
        const group = await ctx.telegram.getChatMember(`@${config.requiredGroup}`, userId);
        const inGroup = ['creator', 'administrator', 'member'].includes(group.status);
        
        if (!inChannel || !inGroup) {
            let missingText = '';
            if (!inChannel && !inGroup) {
                missingText = 'Channel dan Grup';
            } else if (!inChannel) {
                missingText = 'Channel';
            } else if (!inGroup) {
                missingText = 'Grup';
            }
            
            const text = 
`> ⚠️ *AKSES DITOLAK!*
> 
> Kamu belum join ${missingText} yang diwajibkan.
> 
> 📢 [Join Channel](${config.channelLink})
> 👥 [Join Grup](${config.groupLink})
> 
> ✅ Setelah join, klik tombol di bawah untuk verifikasi.`;
            
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
        
        // Jika error (misal bot tidak admin di channel/grup)
        const text = 
`> ⚠️ *ERROR VERIFIKASI*
> 
> Bot tidak bisa memverifikasi keanggotaan kamu.
> 
> Pastikan:
> 1️⃣ Bot adalah ADMIN di channel & grup
> 2️⃣ Channel & grup sudah benar di config
> 
> 📢 [Join Channel](${config.channelLink})
> 👥 [Join Grup](${config.groupLink})
> 
> Hubung owner jika masalah berlanjut.`;
        
        await ctx.reply(text, {
            parse_mode: 'Markdown',
            disable_web_page_preview: true
        });
    }
}

module.exports = { checkMembership };
