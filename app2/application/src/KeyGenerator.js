const EC = require('elliptic').ec
const ec = new EC('secp256k1');


let key = ec.genKeyPair();
let publicKey = key.getPublic('hex');
let privateKey = key.getPrivate('hex');

console.log('');
console.log('Public Key:', publicKey);

console.log('');
console.log('Private Key:', privateKey);