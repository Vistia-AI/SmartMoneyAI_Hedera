# Hedera Trading Bot

A comprehensive cryptocurrency trading bot designed for the Hedera Hashgraph network. This bot implements automated trading strategies using RSI (Relative Strength Index) indicators and integrates with Hedera DEX protocols for swapping tokens.

## 🏗️ Project Structure

```
trading_bot/
├── __init__.py
├── README.md
├── main.py                      # Main entry point
├── requirements.txt             # Python dependencies
├── trade_bot.db                # SQLite database
├── configs/
│   ├── hedera_chain.yaml        # Network configurations
│   └── hedera_chain.yaml.example # Configuration template
├── db/                          # Database layer
│   ├── __init__.py
│   ├── connection.py            # Database connection management
│   └── models/                  # Data models
│       ├── __init__.py
│       ├── base.py              # Base ORM model
│       ├── order.py             # Order data model
│       └── trade.py             # Trade data model
└── lib/                         # Core trading logic
    ├── __init__.py
    ├── trading.py               # Trading engine and strategies
    └── broker/                  # Exchange brokers
        ├── __init__.py
        └── dex/                 # DEX implementations
            ├── __init__.py
            └── hedera_swap.py   # Hedera DEX broker
```

## 📚 Module Overview

### Core Modules

#### `main.py`
- **Purpose**: Main entry point for the trading bot
- **Functionality**: 
  - Initializes trading strategy and bot configuration
  - Sets up scheduled trading operations using APScheduler
  - Handles command line arguments for token selection
  - Manages bot execution lifecycle

#### `lib/trading.py`
- **Purpose**: Core trading engine with strategy framework
- **Key Classes**:
  - `Strategy`: Abstract base class for trading strategies
  - `TradingBot`: Main bot orchestrator managing trades and orders
  - `Order`: Individual order representation and management
  - `Trade`: Trade lifecycle management (open/close)
  - `BaseBroker`: Abstract broker interface

#### `lib/broker/dex/hedera_swap.py`
- **Purpose**: Hedera DEX integration broker
- **Functionality**:
  - Web3 connection management for Hedera network
  - Token swapping through Hedera router contracts
  - Balance checking and transaction execution
  - Smart contract interaction (ERC-20 tokens)

### Database Layer

#### `db/models/`
- **`order.py`**: Order persistence with fields like symbol, side, price, amounts
- **`trade.py`**: Trade tracking with entry/exit orders, profit calculation
- **`base.py`**: Base ORM functionality and database operations
- **`connection.py`**: Database connection and session management

### Configuration

#### `configs/hedera_chain.yaml`
- **Purpose**: Network and contract configuration
- **Contains**:
  - RPC endpoints for testnet/mainnet
  - Smart contract addresses and ABIs
  - Wallet configuration
  - Supported token definitions

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Hedera testnet/mainnet account with HBAR balance
- Valid wallet private key and address

### Installation

1. **Navigate to the trading bot directory:**
   ```bash
   cd ./trading_bot
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure your setup:**
   - Copy `configs/hedera_chain.yaml.example` to `configs/hedera_chain.yaml`
   - Add your wallet address and private key to the configuration
   - Configure network settings (testnet/mainnet)

### Running the Bot

**Basic usage:**
```bash
python main.py [BASE] [QUOTE]
```

**Parameters:**
- `BASE`: Base token to trade (e.g., WHBAR, SAUCE) - **Required**
- `QUOTE`: Quote currency (default: USDC) - **Optional**

**Examples:**
```bash
# Trade WHBAR against USDC (default)
python main.py WHBAR

# Trade SAUCE against USDC
python main.py SAUCE USDC
```

## 🎯 Trading Strategy

### Example Implementation: RSI-Based Strategy

The bot implements a Relative Strength Index (RSI) trading strategy:

**Buy Signals:**
- RSI < 30 (oversold condition) with upward momentum
- RSI < 30 with significant jump (> 10 points)

**Sell Signals:**
- RSI > 70 (overbought condition) with downward momentum  
- RSI > 70 with significant drop (> 10 points)

**Data Source:**
- Fetches 5-minute OHLCV data from GeckoTerminal API
- Calculates 14-period RSI using TA-Lib
- Analyzes last 60 candlesticks for trend detection

### Execution Schedule

- **Frequency**: Every 15 seconds
- **Data Update**: 5-minute intervals
- **Order Processing**: Automatic with 3-retry mechanism

## 🛠️ Key Features

### Trading Engine
- **Multi-token support**: Trade various Hedera-based tokens
- **Risk management**: Configurable investment amounts and budgets
- **Order management**: Automatic order placement and tracking
- **Database persistence**: All trades and orders stored in SQLite

### Broker Integration
- **Hedera DEX**: Native integration with Hedera router contracts
- **Web3 connectivity**: Multiple RPC endpoint support with failover
- **Gas optimization**: Configurable gas limits and pricing
- **Transaction monitoring**: Real-time transaction status tracking

### Strategy Framework
- **Modular design**: Easy to implement custom strategies
- **Data flexibility**: Support for multiple data sources and timeframes
- **Backtesting ready**: Framework supports historical data analysis

## ⚙️ Configuration Options

### Bot Parameters
- `call_budget`: Budget per trading call (default: 0.01)
- `invest_amount`: Total investment amount in quote
- `tokens`: List of tokens to trade
- `currency`: Base currency for trading pairs

### Network Configuration
- **Testnet**: `https://testnet.hashio.io/api`
- **Mainnet**: `https://mainnet.hashio.io/api`
- **Contracts**: Router, factory, and token contract addresses

## 📊 Monitoring and Logging

The bot provides comprehensive logging:
- Trade execution details
- Order status updates
- Balance and portfolio information
- Error handling and recovery

## ⚠️ Important Notes

### Security
- **Never commit private keys** to version control
- Use environment variables or secure key management
- Test thoroughly on testnet before mainnet deployment

### Risk Management
- Start with small amounts for testing
- Monitor bot performance closely
- Set appropriate stop-loss mechanisms
- Understand market volatility risks

### Network Considerations
- Hedera testnet for development and testing
- Mainnet for production trading
- Gas fees apply to all transactions
- Network congestion may affect execution timing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the terms specified in the LICENSE file.

## 🆘 Support

For issues and questions:
1. Check existing documentation
2. Review configuration settings
3. Test on Hedera testnet first
4. Create detailed issue reports with logs

---

**Disclaimer**: This trading bot is for educational and experimental purposes. Cryptocurrency trading involves significant risk of loss. Never trade with funds you cannot afford to lose.
