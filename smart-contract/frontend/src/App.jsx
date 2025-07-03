// React frontend entry point (to be filled)

import React, { useState, useEffect } from 'react';
import {
  ChakraProvider,
  Box,
  VStack,
  Heading,
  Text,
  Button,
  Input,
  useToast,
  Container,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  HStack,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { HashConnect } from '@hashpack/connect';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import moment from 'moment';

// Hedera USDC Token ID
const HEDERA_USDC = "0.0.456858";
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS"; // Thay thế bằng địa chỉ contract sau khi deploy

function App() {
  const [hashConnect, setHashConnect] = useState(null);
  const [accountId, setAccountId] = useState('');
  const [balance, setBalance] = useState(0);
  const [depositAmount, setDepositAmount] = useState('');
  const [pendingProfit, setPendingProfit] = useState(0);
  const [depositHistory, setDepositHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [investorInfo, setInvestorInfo] = useState(null);

  useEffect(() => {
    const initHashConnect = async () => {
      const hashConnect = new HashConnect();
      await hashConnect.init();
      setHashConnect(hashConnect);
    };
    initHashConnect();
  }, []);

  const connectWallet = async () => {
    try {
      const { accountId } = await hashConnect.connectToWallet();
      setAccountId(accountId);
      await updateBalances(accountId);
    } catch (error) {
      toast.error('Failed to connect wallet');
    }
  };

  const updateBalances = async (accountId) => {
    try {
      // Get USDC balance
      const balance = await hashConnect.getTokenBalance(accountId, HEDERA_USDC);
      setBalance(balance);

      // Get investor info
      const info = await hashConnect.callContract({
        contractId: CONTRACT_ADDRESS,
        method: 'getInvestorInfo',
        params: [accountId]
      });
      setInvestorInfo(info);

      // Get deposit history
      const history = await hashConnect.callContract({
        contractId: CONTRACT_ADDRESS,
        method: 'getDepositHistory',
        params: [accountId]
      });
      setDepositHistory(history);

      // Get pending profit
      const profit = await hashConnect.callContract({
        contractId: CONTRACT_ADDRESS,
        method: 'calculateProfit',
        params: [accountId]
      });
      setPendingProfit(profit);
    } catch (error) {
      toast.error('Failed to update balances');
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || depositAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setLoading(true);
      
      // First approve USDC transfer
      await hashConnect.approveToken({
        tokenId: HEDERA_USDC,
        spender: CONTRACT_ADDRESS,
        amount: depositAmount
      });

      // Then deposit
      await hashConnect.callContract({
        contractId: CONTRACT_ADDRESS,
        method: 'deposit',
        params: [depositAmount]
      });

      toast.success('Deposit successful!');
      await updateBalances(accountId);
      setDepositAmount('');
    } catch (error) {
      toast.error('Deposit failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMaxDeposit = async () => {
    setDepositAmount(balance.toString());
  };

  const handleClaim = async () => {
    try {
      setLoading(true);
      await hashConnect.callContract({
        contractId: CONTRACT_ADDRESS,
        method: 'claimProfit'
      });
      toast.success('Profit claimed successfully!');
      await updateBalances(accountId);
    } catch (error) {
      toast.error('Failed to claim profit');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    try {
      setLoading(true);
      await hashConnect.callContract({
        contractId: CONTRACT_ADDRESS,
        method: 'requestWithdrawal'
      });
      toast.success('Withdrawal requested successfully!');
      await updateBalances(accountId);
    } catch (error) {
      toast.error('Failed to request withdrawal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChakraProvider>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={8}>
          <Heading>Hedera Delegated Vault</Heading>
          
          {!accountId ? (
            <Button colorScheme="blue" onClick={connectWallet}>
              Connect HashPack Wallet
            </Button>
          ) : (
            <VStack spacing={4} w="full">
              <Box p={4} borderWidth={1} borderRadius="lg" w="full">
                <Text>Account: {accountId}</Text>
                <Text>USDC Balance: {balance}</Text>
                {investorInfo && (
                  <>
                    <Text>Total Deposits: {investorInfo.totalDeposits}</Text>
                    <Text>Last Deposit: {moment(investorInfo.lastDepositTime * 1000).format('YYYY-MM-DD HH:mm:ss')}</Text>
                    <Text>Claimed Profits: {investorInfo.claimedProfits}</Text>
                    <Text>Pending Profit: {pendingProfit}</Text>
                  </>
                )}
              </Box>

              <HStack w="full">
                <Input
                  type="number"
                  placeholder="Enter USDC amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <Button onClick={handleMaxDeposit}>MAX</Button>
                <Button
                  colorScheme="green"
                  onClick={handleDeposit}
                  isLoading={loading}
                >
                  Deposit
                </Button>
              </HStack>

              <HStack>
                <Button
                  colorScheme="blue"
                  onClick={handleClaim}
                  isLoading={loading}
                  isDisabled={pendingProfit <= 0}
                >
                  Claim Profit
                </Button>
                <Button
                  colorScheme="red"
                  onClick={handleWithdraw}
                  isLoading={loading}
                  isDisabled={!investorInfo?.totalDeposits}
                >
                  Request Withdrawal
                </Button>
              </HStack>

              <Box w="full">
                <Heading size="md" mb={4}>Deposit History</Heading>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Amount</Th>
                      <Th>Date</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {depositHistory.map((deposit, index) => (
                      <Tr key={index}>
                        <Td>{deposit.amount}</Td>
                        <Td>{moment(deposit.timestamp * 1000).format('YYYY-MM-DD HH:mm:ss')}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </VStack>
          )}
        </VStack>
      </Container>
      <ToastContainer />
    </ChakraProvider>
  );
}

export default App;
