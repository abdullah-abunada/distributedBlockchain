const SHA256 = require("crypto-js/sha256");

class Block {

    constructor(nonce, transactions, previousHash = '', index = 1, timestamp= Date.now()) {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.hash = this.calculateHash();
        this.nonce = nonce
    }

    /**
     * calculate hash for this block
     * @returns {*}
     */
    calculateHash() {
        return SHA256(this.timestamp + this.previousHash + JSON.stringify(this.transactions) + this.nonce).toString();
    }

    /**
     * Get nonce number that give us hash starts with 0000 (proofOfWork)
     * @param difficulty
     * @returns {*}
     */
    mineBlock(difficulty) {
        while (this.hash.substring(0, difficulty) !== Array(difficulty + 1).join("0")) {
            this.nonce++;
            this.hash = this.calculateHash();
        }
        return this.nonce;
    }

    /**
     * check if the transactions in this block are valid
     * @returns {boolean}
     */
    hasValidTransactions() {
        for (let tex of this.transactions) {
            if (!tex.isValid()) {
                return false;
            }
        }
        return true;
    }
}

module.exports.Block = Block;