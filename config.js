module.exports = {
    // ========== BOT UTAMA (TOKEN DARI @BotFather) ==========
    token: "8923762099:AAEmDIEF-eKnQZf2hhiB8LQb18qXHSpZzy8",",
    
    // ========== USERBOT (API DARI my.telegram.org) ==========
    api_id: 1234567,
    api_hash: "your_api_hash_here",
    
    // ========== OWNER ==========
    owner: 8696784568,
    
    // ========== CHANNEL & GRUP ==========
    requiredChannel: "kyzzybadak",
    requiredGroup: "kyzzybadakk",
    channelLink: "https://t.me/kyzzybadak",
    groupLink: "https://t.me/kyzzybadakk",
    
    // ========== FITUR BADAK ==========
    badak: {
        freeRange: { min: 1, max: 200 },
        premiumRange: { min: 1, max: 400 },
        cooldownFree: 60000,
        cooldownPremium: 0,
        loadingTime: 3000
    },
    
    // Provider Indonesia
    providers: {
        "62811": "Telkomsel", "62812": "Telkomsel", "62813": "Telkomsel",
        "62814": "Telkomsel", "62815": "Indosat", "62816": "Indosat",
        "62817": "Indosat", "62818": "XL", "62819": "XL", "62821": "Telkomsel",
        "62822": "Telkomsel", "62823": "Telkomsel", "62831": "Axis",
        "62832": "Axis", "62833": "Axis", "62838": "Axis", "62851": "Smartfren",
        "62852": "Smartfren", "62853": "Smartfren", "62881": "Tri",
        "62882": "Tri", "62883": "Tri", "62895": "Tri", "62896": "Tri",
        "62897": "Tri", "62898": "Tri", "62899": "Tri"
    },
    
    internationalProviders: {
        "1": "USA/Canada", "44": "UK", "81": "Japan", "82": "South Korea",
        "86": "China", "91": "India", "60": "Malaysia", "65": "Singapore",
        "66": "Thailand", "61": "Australia", "49": "Germany", "33": "France"
    },
    
    internationalRegions: {
        "1": ["New York", "California", "Texas", "Florida"],
        "44": ["London", "Manchester", "Liverpool"],
        "81": ["Tokyo", "Osaka", "Yokohama"],
        "82": ["Seoul", "Busan", "Incheon"],
        "86": ["Beijing", "Shanghai", "Guangzhou"]
    }
};