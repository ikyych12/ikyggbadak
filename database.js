const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.json');
const CACHE_UMUR_PATH = path.join(__dirname, 'cache_umur.json');
const TRANSACTIONS_PATH = path.join(__dirname, 'transactions.json');

function initDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(CACHE_UMUR_PATH)) {
        fs.writeFileSync(CACHE_UMUR_PATH, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(TRANSACTIONS_PATH)) {
        fs.writeFileSync(TRANSACTIONS_PATH, JSON.stringify({}, null, 2));
    }
}

function getUsers() {
    initDB();
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveUsers(users) {
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));
}

function getUser(userId) {
    const users = getUsers();
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            name: '',
            role: 'FREE',
            roleExpired: null,
            roleSince: null,
            balance: 0,
            totalBadak: 0,
            badakList: [],
            lastBadak: 0,
            referredBy: null,
            salesCount: 0
        };
        saveUsers(users);
    }
    return users[userId];
}

function updateUser(userId, data) {
    const users = getUsers();
    users[userId] = { ...users[userId], ...data };
    saveUsers(users);
    return users[userId];
}

function getRole(userId) {
    const user = getUser(userId);
    const role = user.role || 'FREE';
    
    if (role !== 'FREE' && user.roleExpired && new Date(user.roleExpired) < new Date()) {
        updateUser(userId, { role: 'FREE', roleExpired: null });
        return 'FREE';
    }
    return role;
}

function setRole(userId, role, days = null, sellerId = null) {
    const data = { role: role };
    
    if (days && role !== 'FREE') {
        const expired = new Date();
        expired.setDate(expired.getDate() + days);
        data.roleExpired = expired.toISOString();
        data.roleSince = new Date().toISOString();
    } else {
        data.roleExpired = null;
        data.roleSince = null;
    }
    
    updateUser(userId, data);
    
    if (sellerId) {
        const transactions = getTransactions();
        const transId = Date.now();
        transactions[transId] = {
            id: transId,
            buyer: userId,
            seller: sellerId,
            role: role,
            days: days,
            date: new Date().toISOString()
        };
        saveTransactions(transactions);
        
        const seller = getUser(sellerId);
        updateUser(sellerId, { salesCount: (seller.salesCount || 0) + 1 });
    }
}

function getTransactions() {
    initDB();
    return JSON.parse(fs.readFileSync(TRANSACTIONS_PATH, 'utf8'));
}

function saveTransactions(transactions) {
    fs.writeFileSync(TRANSACTIONS_PATH, JSON.stringify(transactions, null, 2));
}

function canSellRole(sellerId, targetRole) {
    const sellerRole = getRole(sellerId);
    const config = require('./config');
    
    if (sellerRole === 'FREE') return false;
    return config.roles[sellerRole]?.canSell?.includes(targetRole) || false;
}

function getSellPrice(role, sellerId) {
    const config = require('./config');
    const basePrice = config.roles[role]?.price || 0;
    const sellerRole = getRole(sellerId);
    
    const discounts = { VIP: 0.9, PREMIUM: 0.85, VVIP: 0.8 };
    const discount = discounts[sellerRole] || 1;
    
    return Math.floor(basePrice * discount);
}

function isPremium(userId) {
    const role = getRole(userId);
    return role === 'VIP' || role === 'PREMIUM' || role === 'VVIP';
}

function getAllUsers() {
    return getUsers();
}

function getCekUmur(nomor) {
    const cache = JSON.parse(fs.readFileSync(CACHE_UMUR_PATH, 'utf8'));
    return cache[nomor] || null;
}

function setCekUmur(nomor, data) {
    const cache = JSON.parse(fs.readFileSync(CACHE_UMUR_PATH, 'utf8'));
    cache[nomor] = data;
    fs.writeFileSync(CACHE_UMUR_PATH, JSON.stringify(cache, null, 2));
}

module.exports = {
    initDB, getUser, updateUser, getRole, setRole,
    isPremium, getAllUsers, getCekUmur, setCekUmur,
    getTransactions, canSellRole, getSellPrice
};