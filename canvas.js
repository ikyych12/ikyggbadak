const { createCanvas } = require('canvas');

async function generateCekUmurThumbnail(data, username) {
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#0f0c29';
    ctx.fillRect(0, 0, width, height);
    
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 5;
    ctx.strokeRect(20, 20, width - 40, height - 40);
    
    ctx.font = 'bold 42px "Segoe UI"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('📱 HASIL CEK UMUR', 50, 100);
    
    ctx.font = '28px "Segoe UI"';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText(`Nomor: ${data.nomor}`, 50, 200);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Provider: ${data.provider}`, 50, 260);
    ctx.fillText(`Wilayah: ${data.wilayah}`, 50, 320);
    ctx.fillText(`Masa Aktif: ${data.masaAktif}`, 50, 380);
    ctx.fillText(`Status: ${data.status}`, 50, 440);
    ctx.fillText(`Tipe: ${data.tipe}`, 50, 500);
    
    ctx.font = '24px "Segoe UI"';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Dicek oleh: @${username}`, 50, height - 50);
    
    return canvas.toBuffer();
}

async function generateBadakThumbnail(nomor, username, totalBadak) {
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#0b3d0b';
    ctx.fillRect(0, 0, 1200, 630);
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 5;
    ctx.strokeRect(20, 20, 1160, 590);
    
    ctx.font = 'bold 56px "Segoe UI"';
    ctx.fillStyle = '#00ff00';
    ctx.fillText('✅ BERHASIL DIBADAKI!', 150, 150);
    
    ctx.font = '48px "Segoe UI"';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Nomor ${nomor}`, 150, 280);
    
    ctx.font = '36px "Segoe UI"';
    ctx.fillStyle = '#00ffcc';
    ctx.fillText('🛡️ STATUS: KEBAL BADAK', 150, 380);
    
    ctx.font = '28px "Segoe UI"';
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`Total Badakan: ${totalBadak} nomor`, 150, 480);
    
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`Dibadaki oleh: @${username}`, 50, 580);
    
    return canvas.toBuffer();
}

module.exports = { generateCekUmurThumbnail, generateBadakThumbnail };