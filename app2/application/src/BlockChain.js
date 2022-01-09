let {Block} = require('./Block')
let {Transaction} = require('./Transaction')

class BlockChain {

    constructor(currentNodeURL) {
        // init array with genesis block
        this.chain = [this.createGenesisBlock()];
        this.currentNodeURL = currentNodeURL;
        this.netWorkNodes = [];
        this.dificulty = 2;
        this.pendingTransactions = [];
    }

    /**
     * create genesis block
     * @returns {Block}
     */
    createGenesisBlock() {
        return new Block(100,[], 0, 1, 1618679194470);
    }

    /**
     * get last block in blockchain
     * @returns {Block}
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * get block by hash from blockchain
     * @param blockHash
     * @returns {Block}
     */
    getBlock(blockHash) {
        return this.chain.find(block => {
            return block.hash === blockHash;
        })
    }

    /**
     * get transaction by transaction uuid from blockchain
     * @param transactionId
     * @returns {Block}
     */
    getTransaction(transactionId) {
        if (this.chain.length > 1) {
            return this.chain.find(block => {
                return block.transactions.find(transaction => {
                    return transaction.transactionId === transactionId;
                });
            })
        } else {
            return [];
        }
    }

    /**
     * Get transactions by address for a specific teacher or student
     * @param address
     * @returns {[]}
     */
    getAddressData(address) {
        let addressTransactions = [];
        this.chain.filter(block => {
            let transactions = block.transactions.filter(transaction => {
                return transaction.fromAddress === address || transaction.toAddress === address;
            });
            addressTransactions.push(transactions)
        });
        return addressTransactions.flat();
    }

    /**
     * mine pending transactions
     * @returns {Block}
     */
    miniePendingTransactions() {
        let block = new Block(this.dificulty, this.pendingTransactions, this.getLatestBlock().hash, this.chain.length + 1);
        block.mineBlock(this.dificulty);
        // reset pending transactions
        this.pendingTransactions = []
        // add the mined block to blockchain
        this.chain.push(block);
        //return the added block
        return block;
    }

    /**
     * add new transaction
     * @param transaction
     * @returns {*}
     */
    addTransaction(transaction) {
        if (!transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Transaction must have From and To address!')
        }
        if (!transaction.isValid()) {
            throw new Error('Cant add invalid transaction to chain');
        }
        this.pendingTransactions.push(transaction);
        // return the next block index that will contains the transaction
        return this.getLatestBlock()['index'] + 1;
    }

    /**
     * get GPA for a specific student
     * @param transactions
     * @returns {number}
     */
    getGPAOfAddress(transactions) {
        let totalMarks = 0;
        // calculate the summation of marks
        if(transactions.length > 0){
            totalMarks = transactions.reduce((accumulator, currentValue) => {
                return accumulator + parseInt(currentValue.course.finalMark)
            }, 0);
        }
        //calculate the summation of courses
        let totalCourses = transactions.length
        // return student gpa
        return totalMarks / totalCourses;
    }

    /**
     * check if chain is valid
     * @returns {boolean}
     */
    chainIsValid() {
        // we skip index 0 because is a genesis block
        for (let i = 1; i < this.chain.length; i++) {
            let currentBlock = this.chain[i];
            let previousBlock = this.chain[i - 1];
            //1: check if current block has valid transactions
            if (!currentBlock.hasValidTransactions()) {
                return false;
            }
            //2: check if current hash format is correct
            if (currentBlock.hash !== currentBlock.calculateHash()) {
                return false;
            }
            //3: check if current block points to previous block
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
        }
        // check if the genesis block has correct structure
        let genesisBlock = this.chain[0];
        let correctNonce = genesisBlock['nonce'] === 100;
        let correctPreviousBlockHash = genesisBlock['previousBlockHash'] === 0;
        let correctHash = genesisBlock['hash'] === 0;
        let correctTransactions = genesisBlock['transactions'].length === 0;
        if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions) {
            return false;
        }
        // return validation result
        return true
    }
}

module.exports.BlockChain = BlockChain;