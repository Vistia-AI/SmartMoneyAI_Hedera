const { Wallet } = require("ethers");

// Thay mnemonic bên dưới bằng cụm từ của bạn
const mnemonic = "plug reduce outside omit road essence adjust grit visit more negative alpha discover acoustic vocal inmate crystal tone captain rubber grief cat chimney brave";

const wallet = Wallet.fromPhrase(mnemonic);
console.log("Private Key:", wallet.privateKey); 