function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isOnCooldown(lastUsed, cooldownMs) {
    return (Date.now() - lastUsed) < cooldownMs;
}

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRemainingCooldown(lastUsed, cooldownMs) {
    const remaining = cooldownMs - (Date.now() - lastUsed);
    return Math.ceil(remaining / 1000);
}

module.exports = { sleep, isOnCooldown, randomInt, getRemainingCooldown };