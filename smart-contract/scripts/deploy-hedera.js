require("dotenv").config();
const { Client, PrivateKey, AccountId, FileCreateTransaction, ContractCreateTransaction, Hbar } = require("@hashgraph/sdk");
const fs = require("fs");

// Lấy thông tin từ .env
const operatorId = process.env.OPERATOR_ID;
const operatorKey = process.env.OPERATOR_KEY;

if (!operatorId || !operatorKey) {
    console.error("Vui lòng điền đầy đủ OPERATOR_ID và OPERATOR_KEY vào file .env");
    process.exit(1);
}

const client = Client.forTestnet().setOperator(AccountId.fromString(operatorId), PrivateKey.fromString(operatorKey));

async function main() {
  // Đọc bytecode đã compile từ Hardhat
  const bytecode = fs.readFileSync("artifacts/contracts/DelegatedVault.sol/DelegatedVault.bin");

  // Upload bytecode lên Hedera File Service
  const fileTx = new FileCreateTransaction()
    .setKeys([PrivateKey.fromString(operatorKey).publicKey])
    .setContents(bytecode)
    .setMaxTransactionFee(new Hbar(2));
  const fileSubmit = await fileTx.execute(client);
  const fileReceipt = await fileSubmit.getReceipt(client);
  const bytecodeFileId = fileReceipt.fileId;
  console.log("Bytecode file ID:", bytecodeFileId.toString());

  // Deploy contract
  const contractTx = new ContractCreateTransaction()
    .setBytecodeFileId(bytecodeFileId)
    .setGas(3000000)
    .setMaxTransactionFee(new Hbar(16));
  const contractSubmit = await contractTx.execute(client);
  const contractReceipt = await contractSubmit.getReceipt(client);
  const contractId = contractReceipt.contractId;
  console.log("Contract deployed! Contract ID:", contractId.toString());
}

main().catch(console.error); 