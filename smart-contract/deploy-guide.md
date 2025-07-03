# Hướng dẫn Deploy Smart Contract lên Hedera Testnet

## 1. Chuẩn bị môi trường

### 1.1. Cài đặt các công cụ cần thiết
```bash
# Cài đặt Node.js và npm (nếu chưa có)
# Cài đặt Truffle
npm install -g truffle

# Cài đặt Hedera CLI
npm install -g @hashgraph/cli
```

### 1.2. Tạo tài khoản Testnet
1. Truy cập [Hedera Portal](https://portal.hedera.com/)
2. Đăng ký tài khoản mới
3. Tạo ví mới trên Testnet
4. Lưu lại:
   - Account ID
   - Private Key
   - Public Key

### 1.3. Lấy Test HBAR
1. Truy cập [Hedera Testnet Faucet](https://portal.hedera.com/faucet)
2. Nhập Account ID của bạn
3. Nhận Test HBAR (khoảng 10,000 HBAR)

## 2. Cấu hình dự án

### 2.1. Tạo file cấu hình
Tạo file `.env` trong thư mục gốc của dự án:
```env
HEDERA_OPERATOR_ID=0.0.xxxxx
HEDERA_OPERATOR_KEY=302e020100300506032b657004220420xxxxxxxx
HEDERA_NETWORK=testnet
```

### 2.2. Cài đặt dependencies
```bash
npm install @hashgraph/sdk dotenv
```

### 2.3. Tạo script deploy
Tạo file `scripts/deploy.js`:

```javascript
require('dotenv').config();
const {
    AccountId,
    PrivateKey,
    Client,
    ContractCreateFlow,
    FileCreateTransaction,
    ContractId,
} = require("@hashgraph/sdk");
const fs = require('fs');

async function main() {
    // Khởi tạo client
    const operatorId = AccountId.fromString(process.env.HEDERA_OPERATOR_ID);
    const operatorKey = PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY);
    
    const client = Client.forTestnet();
    client.setOperator(operatorId, operatorKey);

    // Đọc bytecode của contract
    const bytecode = fs.readFileSync('./contracts/DelegatedVault.sol');

    // Tạo file contract
    const fileCreateTx = new FileCreateTransaction()
        .setContents(bytecode)
        .setKeys([operatorKey]);

    const fileCreateSubmit = await fileCreateTx.execute(client);
    const fileCreateReceipt = await fileCreateSubmit.getReceipt(client);
    const bytecodeFileId = fileCreateReceipt.fileId;

    console.log("Contract bytecode file: " + bytecodeFileId);

    // Deploy contract
    const contractCreate = new ContractCreateFlow()
        .setGas(100000)
        .setBytecodeFileId(bytecodeFileId)
        .setAdminKey(operatorKey)
        .setConstructorParameters(
            new ContractFunctionParameters()
                .addAddress("YOUR_HTS_TOKEN_ADDRESS")  // Thay thế bằng địa chỉ HTS token
                .addAddress("YOUR_HEDERA_TOKEN_SERVICE_ADDRESS")  // Thay thế bằng địa chỉ Hedera Token Service
        );

    const contractCreateSubmit = await contractCreate.execute(client);
    const contractCreateReceipt = await contractCreateSubmit.getReceipt(client);
    const contractId = contractCreateReceipt.contractId;

    console.log("Contract deployed successfully!");
    console.log("Contract ID: " + contractId);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
```

## 3. Deploy Contract

### 3.1. Biên dịch contract
```bash
# Biên dịch contract
npx hardhat compile
```

### 3.2. Deploy lên Testnet
```bash
# Chạy script deploy
node scripts/deploy.js
```

### 3.3. Lưu thông tin contract
Sau khi deploy thành công, lưu lại:
- Contract ID
- File ID của bytecode
- Gas used

## 4. Verify Contract

### 4.1. Truy cập Hedera Explorer
1. Truy cập [Hedera Explorer](https://testnet.dragonglass.me/)
2. Tìm kiếm Contract ID của bạn
3. Kiểm tra trạng thái và thông tin contract

### 4.2. Kiểm tra các hàm
Sử dụng Hedera Explorer để:
1. Kiểm tra các hàm có thể gọi
2. Xác minh constructor parameters
3. Kiểm tra events

## 5. Cập nhật Frontend

### 5.1. Cập nhật contract address
Trong file `frontend/src/App.jsx`:
```javascript
const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ID";
const HTS_TOKEN_ADDRESS = "YOUR_HTS_TOKEN_ADDRESS";
```

### 5.2. Test kết nối
1. Chạy frontend
2. Kết nối ví HashPack
3. Test các chức năng cơ bản

## 6. Lưu ý quan trọng

### 6.1. Bảo mật
- Không bao giờ commit file `.env`
- Bảo vệ private key
- Sử dụng biến môi trường

### 6.2. Gas và phí
- Testnet có giới hạn gas
- Cần đủ HBAR cho phí giao dịch
- Monitor gas usage

### 6.3. Testing
- Test kỹ trên Testnet trước
- Kiểm tra các edge cases
- Verify các events

## 7. Troubleshooting

### 7.1. Lỗi phổ biến
1. Insufficient HBAR
   - Giải pháp: Nạp thêm HBAR từ faucet

2. Gas limit exceeded
   - Giải pháp: Tăng gas limit trong script deploy

3. Invalid contract bytecode
   - Giải pháp: Kiểm tra lại quá trình biên dịch

### 7.2. Hỗ trợ
- [Hedera Documentation](https://docs.hedera.com/)
- [Hedera Discord](https://discord.gg/hedera)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/hedera) 