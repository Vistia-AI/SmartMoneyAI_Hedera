const { Wallet } = require("ethers");
const { PrivateKey } = require("@hashgraph/sdk");
require("dotenv").config();

// Lấy mnemonic và account id từ .env
const mnemonic = process.env.MNEMONIC;
const accountId = process.env.HEDERA_OPERATOR_ID;

if (!mnemonic || !accountId) {
    console.error("Vui lòng điền MNEMONIC và HEDERA_OPERATOR_ID vào file .env");
    process.exit(1);
}

// Lấy private key hex từ mnemonic
const wallet = Wallet.fromPhrase(mnemonic);
const hexPrivateKey = wallet.privateKey;
console.log("Account ID:", accountId);
console.log("Private Key (hex, dùng cho Hardhat):", hexPrivateKey);

// Chuyển sang DER (dùng cho Hedera SDK)
try {
    const derPrivateKey = PrivateKey.fromStringECDSA(hexPrivateKey).toString();
    console.log("Private Key (DER, dùng cho Hedera SDK):", derPrivateKey);
} catch (e) {
    console.error("Lỗi chuyển đổi sang DER:", e.message);
} 