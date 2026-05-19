const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'users.json');
const CACHE_UMUR_PATH = path.join(__dirname, 'cache_umur.json');

function initDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(CACHE_UMUR_PATH)) {
        fs.writeFileSync(CACHE_UMUR_PATH, JSON.stringify({}, null, 2));
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
            premium: false,
            premiumSince: null,
            premiumExpired: null,
            totalBadak: 0,
            badakList: [],
            lastBadak: 0
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

function isPremium(userId) {
    const user = getUser(userId);
    if (!user.premium) return false;
    if (user.premiumExpired && new Date(user.premiumExpired) < new Date()) {
        updateUser(userId, { premium: false, premiumExpired: null });
        return false;
    }
    return true;
}

function setPremium(userId, status, expiredAt = null) {
    updateUser(userId, {
        premium: status,
        premiumSince: status ? new Date().toISOString() : null,
        premiumExpired: expiredAt
    });
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
    initDB, getUser, updateUser, isPremium, setPremium,
    getAllUsers, getCekUmur, setCekUmur
};
