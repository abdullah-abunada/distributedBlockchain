const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const uuid = require('uuid')
const process = require('process');
const rp = require('request-promise');
const EC = require('elliptic').ec
const ec = new EC('secp256k1');
const cors = require('cors')
const {Transaction} = require('./Transaction')
// get port that passed from package.json
const port = process.argv[2];
// get current node url that passed from package.json
const currentNodeUrl = process.argv[3];

app.use(cors())

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

const {BlockChain} = require('./BlockChain');
const grads = new BlockChain(currentNodeUrl);

app.get('/blockchain', function (req, res) {
    res.send(grads);
});

app.post('/transactions', function (req, res) {
    // get teacher private key and get his public key from it
    let myKey = ec.keyFromPrivate(req.body.fromAddress);
    let myTeacherKey = myKey.getPublic('hex');
    // create new transaction
    let newTransaction = new Transaction(myTeacherKey, req.body.toAddress, req.body.course);
    // sign the transaction using teacher private key
    newTransaction.signTransaction(myKey);
    // add to pending transaction
    let blockIndex = grads.addTransaction(newTransaction);
    // return response
    res.json({
        note: `Transaction will be added in block ${blockIndex}.`
    });
});

app.post('/transactions/broadcast', function (req, res) {
    // get teacher private key and get his public key from it
    let myKey = ec.keyFromPrivate(req.body.fromAddress);
    let myTeacherKey = myKey.getPublic('hex');
    // create new transaction
    let newTransaction = new Transaction(myTeacherKey, req.body.toAddress, req.body.course);
    // sign the transaction using teacher private key
    newTransaction.signTransaction(myKey);
    //register transaction locally
    grads.pendingTransactions.push(newTransaction);
    // broadcast new transaction to all network nodes
    let requestPromises = []
    grads.netWorkNodes.forEach(networkUrl => {
        let requestOption = {
            uri: networkUrl + '/transactions',
            method: 'POST',
            body: newTransaction,
            json: true
        }
        requestPromises.push(rp(requestOption))
    });
    //
    Promise.all(requestPromises).then(data => {
        res.json({note: 'Transaction created and broadcast successfully.'});
    }).catch(error => {
        console.log('Error:', error.message);
    });
});

app.get('/mine', function (req, res) {
    // check if there is pending transactions needs mine
    if (!grads.pendingTransactions.length > 0) {
        res.json({
            note: "There is no any transactions needs to mine!",
        });
        return;
    }
    let lastBlock = grads.getLatestBlock();
    let previousBlockHash = lastBlock.hash;
    console.log(previousBlockHash);
    //
    let currentBlockData = {
        transactions: grads.pendingTransactions,
        index: lastBlock['index'] + 1
    };
    // hash block using proof of work methodology and get it
    let minedBlock = grads.miniePendingTransactions();
    // broadcast the block to all network nodes
    const requestPromises = [];
    grads.netWorkNodes.forEach(networkNode => {
        let requestOption = {
            uri: networkNode + '/receive-new-block',
            method: 'POST',
            body: {newBlock: minedBlock},
            json: true
        }
        requestPromises.push(rp(requestOption))
    });
    Promise.all(requestPromises).then(data => {
        console.log(data)
    }).catch(error => {
        console.log('Error:', error.message);
    });
    // return response
    res.json({
        note: "New block mined successfully",
        block: minedBlock
    })

});

app.post('/receive-new-block', function (req, res) {
    let newBlock = req.body.newBlock;
    let lastBlock = grads.getLatestBlock();
    //check if hash is correct
    let correctHash = lastBlock.hash === newBlock.previousHash;
    // check if new block has correct index
    let correctIndex = lastBlock['index'] + 1 === newBlock['index'];
    // check If the newBlock is legitimate
    if (correctHash && correctIndex) {
        grads.chain.push(newBlock);
        grads.pendingTransactions = [];
        res.json({
            note: 'New block received and accepted.',
            newBlock: newBlock
        })
    } else { // reject the new block
        res.json({
            note: 'New block rejected.',
            newBlock: newBlock
        });
    }
});

// network endpoints
app.post('/register-and-broadcast-node', function (req, res) {
    let newNodeUrl = req.body.newNodeUrl;
    // register new node if it not registered before
    if (grads.netWorkNodes.indexOf(newNodeUrl) === -1) {
        //1: register new node locally
        grads.netWorkNodes.push(newNodeUrl);
        //2: broadcast new node to all network
        let regNodesPromises = []
        grads.netWorkNodes.forEach(networkNode => {
            let requestOption = {
                uri: networkNode + '/register-node',
                method: 'POST',
                body: {newNodeUrl: newNodeUrl},
                json: true
            }
            regNodesPromises.push(rp(requestOption));
        });
        // register new node in our network then register our network in new node
        Promise.all(regNodesPromises).then(data => {
            let bulkRegisterOptions = {
                uri: newNodeUrl + '/register-nodes-bulk',
                method: 'POST',
                body: {
                    allNetworkNodes: [...grads.netWorkNodes, grads.currentNodeURL],
                },
                json: true
            }
            return rp(bulkRegisterOptions)
        }).then(data => {
            res.json({note: 'New Node registered with network successfully'});
        }).catch(error => {
            console.log(error)
        });
    }
})

app.post('/register-node', function (req, res) {
    let newNodeUrl = req.body.newNodeUrl;
    let nodeNotAlreadyPresent = grads.netWorkNodes.indexOf(newNodeUrl) === -1;
    let notCurrentNode = grads.currentNodeURL !== newNodeUrl
    //check if the new node is not registered before and is not the current node
    if (nodeNotAlreadyPresent && notCurrentNode)
        grads.netWorkNodes.push(newNodeUrl)

    res.json({note: 'New node registered successfully.'});

});

app.post('/register-nodes-bulk', function (req, res) {
    let allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        let nodeNotAlreadyPresent = grads.netWorkNodes.indexOf(networkNodeUrl) === -1;
        let notCurrentNode = grads.currentNodeURL !== networkNodeUrl
        console.log(networkNodeUrl)
        if (nodeNotAlreadyPresent && notCurrentNode)
            grads.netWorkNodes.push(networkNodeUrl);
    });

    res.json({note: 'Bulk registration successful.'});
});

// consensus endpoints
app.get('/consensus', function (req, res) {
    let requestPromises = [];
    grads.netWorkNodes.forEach(networkNode => {
        let requestOption = {
            uri: networkNode + '/blockchain',
            method: 'GET',
            json: true
        }
        requestPromises.push(rp(requestOption));
    });
    // get the blockchains from all network nodes
    Promise.all(requestPromises).then(blockchains => {
        let maxChainLength = grads.chain.length;
        let newLongestChain = null;
        let newPendingTransactions = null;
        blockchains.forEach(blockchain => {
            if (blockchain.chain.length > maxChainLength) {
                maxChainLength = blockchain.chain.length;
                newLongestChain = blockchain.chain;
                newPendingTransactions = blockchain.pendingTransactions;
            }
        });
        //if we need to replace the chain that is hosted on this current node.
        if (!newLongestChain || (newLongestChain && !grads.chainIsValid(newLongestChain))) {
            res.json({
                note: 'Current chain has not been replaced.',
                chain: grads.chain
            })
        } else {
            grads.chain = newLongestChain;
            grads.pendingTransactions = newPendingTransactions;
            res.json({
                note: 'This chain has been replaced.',
                chain: grads.chain
            })
        }
    }).catch(error => {
        console.log(error.message)
    })
});

// blockchain explorer endpoints
app.get('/blocks/:blockHash', function (req, res) {
    const blockHash = req.params.blockHash;
    let block = grads.getBlock(blockHash);
    res.json({
        block: block
    });
});

app.get('/transactions/:transactionId', function (req, res) {
    let transactionId = req.params.transactionId;
    let transactionData = grads.getTransaction(transactionId);
    res.json({
        block: transactionData
    });
});

app.get('/address/:address', function (req, res) {
    let address = req.params.address;
    let addressData = grads.getAddressData(address);
    res.json({
        transactions: addressData,
        gpa: grads.getGPAOfAddress(addressData)
    });
});

// start server
app.listen(port, function () {
    console.log(`server is listening on port ${port}`);
});