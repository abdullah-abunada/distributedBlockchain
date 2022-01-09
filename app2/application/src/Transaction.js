const SHA256 = require("crypto-js/sha256");
const EC = require('elliptic').ec
const ec = new EC('secp256k1');
const uuid = require('uuid')

class Transaction {
    constructor(fromAddress, toAddress, course) {
        this.transactionId = uuid.v4().split('-').join('')
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.course = course;
    }

    /**
     * calculate hash for transaction
     * @returns {*}
     */
    calculateHash() {
        return SHA256(this.fromAddress + this.toAddress + this.course).toString();
    }

    /**
     * sign transaction using a teacher public key
     * @param signingKey
     */
    signTransaction(signingKey) {
        if (signingKey.getPublic('hex') !== this.fromAddress) {
            throw new Error('You cant sign transactions for other wallets!');
        }
        let hashTx = this.calculateHash()
        let sign = signingKey.sign(hashTx, 'base64');
        this.signature = sign.toDER('hex');
    }

    /**
     * check if this transaction is valid
     * @returns {*}
     */
    isValid() {
        // check if there is no signature
        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction!')
        }
        // check if course marks is valid
        if (!this.course.finalMark || this.course.finalMark > 100) {
            throw new Error('The final mark must be less than or equal 100!')
        }
        // check if hash key sign using the fromAddress public key
        let publicKey = ec.keyFromPublic(this.fromAddress, 'hex');
        return publicKey.verify(this.calculateHash(), this.signature);
    }
}

module.exports.Transaction = Transaction