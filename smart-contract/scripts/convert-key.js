const { PrivateKey } = require("@hashgraph/sdk");

// Thay thế YOUR_PRIVATE_KEY_HERE bằng private key từ Hedera Portal
const hederaPrivateKey = "YOUR_PRIVATE_KEY_HERE";

try {
    const privateKey = PrivateKey.fromString(hederaPrivateKey);
    const hardhatPrivateKey = "0x" + privateKey.toStringRaw();
    console.log("Hardhat Private Key:", hardhatPrivateKey);
} catch (error) {
    console.error("Error converting private key:", error.message);
} 