# Hướng dẫn kết nối Bot Python với Smart Contract DelegatedVault

## 1. Cài đặt các thư viện cần thiết

```bash
pip install hedera-sdk-py
```

## 2. Khởi tạo kết nối với Hedera

```python
from hedera import (
    AccountId,
    PrivateKey,
    Client,
    ContractId,
    ContractExecuteTransaction
)

# Khởi tạo client
client = Client.forTestnet()
client.setOperator(
    AccountId.fromString("BOT_ACCOUNT_ID"),  # Thay thế bằng Account ID của bot
    PrivateKey.fromString("BOT_PRIVATE_KEY") # Thay thế bằng Private Key của bot
)

# Contract ID
contract_id = ContractId.fromString("YOUR_CONTRACT_ID")  # Thay thế bằng Contract ID của DelegatedVault
```

## 3. Các hàm tương tác với Smart Contract

### 3.1. Thực hiện trade
```python
def execute_trade(investor_address, token_in, token_out, amount_in, amount_out_min, path):
    """
    Thực hiện trade thông qua smart contract
    
    Parameters:
    - investor_address: Địa chỉ của nhà đầu tư
    - token_in: Địa chỉ token đầu vào
    - token_out: Địa chỉ token đầu ra
    - amount_in: Số lượng token đầu vào
    - amount_out_min: Số lượng token đầu ra tối thiểu
    - path: Mảng các địa chỉ token trong đường dẫn swap
    """
    try:
        transaction = ContractExecuteTransaction()\
            .setContractId(contract_id)\
            .setGas(1000000)\
            .setFunction(
                "executeTrade",
                investor_address,
                token_in,
                token_out,
                amount_in,
                amount_out_min,
                path
            )
        
        # Ký và gửi giao dịch
        tx_response = transaction.execute(client)
        receipt = tx_response.getReceipt(client)
        
        # Kiểm tra kết quả
        if receipt.status == 22:  # 22 là mã thành công
            print(f"Trade thành công: {receipt.transactionId}")
            return True
        else:
            print(f"Trade thất bại: {receipt.status}")
            return False
            
    except Exception as e:
        print(f"Lỗi khi thực hiện trade: {str(e)}")
        return False
```

### 3.2. Lấy lịch sử giao dịch
```python
def get_trade_history(investor_address, start=0, count=10):
    """
    Lấy lịch sử giao dịch của một nhà đầu tư
    
    Parameters:
    - investor_address: Địa chỉ của nhà đầu tư
    - start: Vị trí bắt đầu
    - count: Số lượng giao dịch cần lấy
    """
    try:
        transaction = ContractExecuteTransaction()\
            .setContractId(contract_id)\
            .setGas(100000)\
            .setFunction("getTradeHistory", investor_address, start, count)
        
        tx_response = transaction.execute(client)
        result = tx_response.getRecord(client)
        
        # Xử lý kết quả
        trades = result.contractFunctionResult.bytes
        return parse_trades(trades)  # Hàm parse_trades cần được implement
        
    except Exception as e:
        print(f"Lỗi khi lấy lịch sử giao dịch: {str(e)}")
        return None
```

### 3.3. Lấy thống kê nhà đầu tư
```python
def get_investor_stats(investor_address):
    """
    Lấy thống kê của một nhà đầu tư
    
    Parameters:
    - investor_address: Địa chỉ của nhà đầu tư
    """
    try:
        transaction = ContractExecuteTransaction()\
            .setContractId(contract_id)\
            .setGas(100000)\
            .setFunction("getInvestorStats", investor_address)
        
        tx_response = transaction.execute(client)
        result = tx_response.getRecord(client)
        
        # Xử lý kết quả
        stats = result.contractFunctionResult.bytes
        return parse_stats(stats)  # Hàm parse_stats cần được implement
        
    except Exception as e:
        print(f"Lỗi khi lấy thống kê: {str(e)}")
        return None
```

## 4. Ví dụ sử dụng

```python
# Ví dụ thực hiện trade
investor = "0x123..."  # Địa chỉ nhà đầu tư
token_in = "0x456..."  # Địa chỉ token đầu vào
token_out = "0x789..." # Địa chỉ token đầu ra
amount_in = 1000000    # Số lượng token đầu vào
amount_out_min = 900000 # Số lượng token đầu ra tối thiểu
path = [token_in, token_out]  # Đường dẫn swap

success = execute_trade(
    investor,
    token_in,
    token_out,
    amount_in,
    amount_out_min,
    path
)

if success:
    print("Trade thành công!")
else:
    print("Trade thất bại!")

# Lấy lịch sử giao dịch
trades = get_trade_history(investor)
if trades:
    for trade in trades:
        print(f"Trade: {trade}")

# Lấy thống kê
stats = get_investor_stats(investor)
if stats:
    print(f"Thống kê: {stats}")
```

## 5. Lưu ý quan trọng

1. **Bảo mật**:
   - Không bao giờ lưu trữ private key trong code
   - Sử dụng biến môi trường hoặc file cấu hình bảo mật
   - Kiểm tra kỹ các tham số đầu vào

2. **Xử lý lỗi**:
   - Luôn có cơ chế retry cho các giao dịch thất bại
   - Ghi log đầy đủ để debug
   - Xử lý các trường hợp timeout

3. **Giới hạn**:
   - Kiểm tra số tiền trade không vượt quá maxTradeAmount
   - Đảm bảo khoảng thời gian giữa các lần trade (tối thiểu 5 phút)
   - Kiểm tra số dư token trước khi trade

4. **Monitoring**:
   - Theo dõi trạng thái của các giao dịch
   - Ghi lại lịch sử giao dịch
   - Tính toán và theo dõi lợi nhuận

## 6. Cấu trúc thư mục đề xuất

```
bot/
├── config/
│   ├── config.py        # Cấu hình
│   └── constants.py     # Hằng số
├── src/
│   ├── hedera/
│   │   ├── client.py    # Khởi tạo client
│   │   └── contract.py  # Tương tác với smart contract
│   ├── trading/
│   │   ├── strategy.py  # Chiến lược trading
│   │   └── executor.py  # Thực thi trade
│   └── utils/
│       ├── logger.py    # Ghi log
│       └── helpers.py   # Các hàm tiện ích
├── logs/                # Thư mục chứa log
└── main.py             # Entry point
```

## 7. Môi trường phát triển

1. **Testnet**:
   - Sử dụng Hedera Testnet để phát triển và test
   - Lấy test token từ faucet
   - Test kỹ các trường hợp lỗi

2. **Mainnet**:
   - Triển khai từng bước nhỏ
   - Monitor kỹ các giao dịch
   - Có kế hoạch rollback

## 8. Tài liệu tham khảo

- [Hedera SDK Python Documentation](https://docs.hedera.com/hedera-sdks-and-tools/sdks/python)
- [Hedera Smart Contract Service](https://docs.hedera.com/hedera/smart-contracts/)
- [Hedera Token Service](https://docs.hedera.com/hedera/sdks-and-apis/sdks/token-service/) 