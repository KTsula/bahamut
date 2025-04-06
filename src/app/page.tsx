'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import ContractDeployer from '../components/ContractDeployer';

// Define transaction interface
interface Transaction {
  blockNumber: string;
  gasUsed: string;
  timeStamp: string;
  [key: string]: any; // For other properties that may exist but aren't needed explicitly
}

// Define CSV data interface
interface GasData {
  Date: string;
  Value: string;
}

export default function Home() {
  const [contractAddress, setContractAddress] = useState('');
  const [transactionCount, setTransactionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [contractCode, setContractCode] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [activeTab, setActiveTab] = useState('analyze');
  const [totalGasUsed, setTotalGasUsed] = useState<number | null>(null);
  const [gasUsageGrowth, setGasUsageGrowth] = useState<number | null>(null);
  const [csvData, setCsvData] = useState<GasData[]>([]);
  const [potentialBahamutEarnings, setPotentialBahamutEarnings] = useState<number | null>(null);
  const [potentialEarningsUsd, setPotentialEarningsUsd] = useState<number | null>(null);
  const [showDeployer, setShowDeployer] = useState(false);
  const [contractTooNew, setContractTooNew] = useState(false);
  const [contractCreationDate, setContractCreationDate] = useState<string | null>(null);
  const [lastAnalyzedAddress, setLastAnalyzedAddress] = useState<string>('');

  // Constants for conversion
  const GWEI_TO_FTN = 1 / 2300000;  // Conversion rate from gwei to FTN
  const FTN_TO_DOLLARS = 4.04;      // FTN price in USD

  useEffect(() => {
    // Load CSV data on component mount
    loadCsvData();
  }, []);

  // Function to load the CSV data
  const loadCsvData = async () => {
    try {
      const response = await fetch('/total_gas_usage.csv');
      const text = await response.text();
      
      // Parse the CSV manually
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      
      const data: GasData[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = lines[i].split(',');
        data.push({
          Date: values[0],
          Value: values[1]
        });
      }
      
      setCsvData(data);
      console.log(`Loaded ${data.length} CSV entries`);
    } catch (err) {
      console.error('Error loading CSV data:', err);
    }
  };

  // Function to find gas usage for a specific date
  const findGasUsageForDate = (date: string): number | null => {
    if (!csvData.length) return null;
    
    // Find exact match
    const exactMatch = csvData.find(entry => entry.Date === date);
    if (exactMatch) {
      return parseInt(exactMatch.Value);
    }
    
    // If date is earlier than our first CSV entry, use the first entry
    if (date < csvData[0].Date) {
      console.log(`Date ${date} is earlier than our first CSV entry ${csvData[0].Date}, using first entry`);
      return parseInt(csvData[0].Value);
    }
    
    // If no exact match, find the closest previous date
    let closestEntry = null;
    for (const entry of csvData) {
      if (entry.Date < date) {
        closestEntry = entry;
      } else {
        break; // CSV is ordered by date, so stop once we pass our target date
      }
    }
    
    return closestEntry ? parseInt(closestEntry.Value) : null;
  };

  // Function to calculate gas growth
  const calculateGasGrowth = (fromDate: string) => {
    if (!csvData.length) return null;
    
    const fromValue = findGasUsageForDate(fromDate);
    if (fromValue === null) return null;
    
    // Get the most recent value
    const mostRecent = csvData[csvData.length - 1];
    const mostRecentValue = parseInt(mostRecent.Value);
    
    const growth = mostRecentValue - fromValue;
    console.log(`Gas usage on ${fromDate}: ${fromValue}`);
    console.log(`Most recent gas usage (${mostRecent.Date}): ${mostRecentValue}`);
    console.log(`Growth: ${growth}`);
    
    return growth;
  };

  // Function to calculate potential earnings on Bahamut
  const calculateBahamutEarnings = (totalGas: number, networkGrowth: number) => {
    if (!totalGas || !networkGrowth) return null;
    
    // Calculate (totalGasUsed)² / gasGrowth
    const gasRatio = (totalGas * totalGas) / networkGrowth;
    
    // Convert to FTN and then to USD
    const earningsInFTN = gasRatio * GWEI_TO_FTN;
    const earningsInUSD = earningsInFTN * FTN_TO_DOLLARS;
    
    console.log(`Gas ratio: ${gasRatio}`);
    console.log(`Earnings in FTN: ${earningsInFTN}`);
    console.log(`Earnings in USD: ${earningsInUSD}`);
    
    return {
      ftn: earningsInFTN,
      usd: earningsInUSD
    };
  };

  // Format large numbers with commas and abbreviate if needed
  const formatLargeNumber = (num: number): string => {
    if (num === 0) return '0';
    
    // For extremely small numbers, use scientific notation with 6 decimal places
    if (num < 0.000001) {
      return num.toExponential(6);
    }
    
    // For small numbers, show more decimal places to avoid displaying as zero
    if (num < 0.1) {
      return num.toFixed(8);
    }
    
    // For medium small numbers, show fewer decimal places
    if (num < 1) {
      return num.toFixed(6);
    }
    
    // For normal small numbers
    if (num < 10) {
      return num.toFixed(4);
    }
    
    // For larger numbers, use abbreviations
    if (num >= 1e12) {
      return (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    } else {
      return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  };

  const getTransactionCount = async () => {
    if (!contractAddress) {
      setError('Please enter a contract address');
      return;
    }

    setLoading(true);
    setError('');
    // Reset all previous data
    setTransactionCount(null);
    setTotalGasUsed(null);
    setGasUsageGrowth(null);
    setContractTooNew(false);
    setContractCreationDate(null);
    setPotentialBahamutEarnings(null);
    setPotentialEarningsUsd(null);
    
    try {
      let totalTransactions = 0;
      let hasMoreTransactions = true;
      let pageSize = 1000; // Maximum offset size to stay below the limit
      let startBlock = 0;
      let gasUsedSum = 0;
      let earliestTimestamp = Number.MAX_SAFE_INTEGER;
      
      while (hasMoreTransactions) {
        const response = await axios.get(`https://api.etherscan.io/api`, {
          params: {
            module: 'account',
            action: 'txlist',
            address: contractAddress,
            startblock: startBlock,
            endblock: 99999999,
            page: 1,       // Always request page 1
            offset: pageSize, // Number of records to retrieve
            sort: 'asc',
            apikey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY
          }
        });
        // console.log(response.data.result)
        if (response.data.status === '1') {
          const transactions = response.data.result;
          
          // Process transactions based on the response structure
          // The API can return either an array or an object with numeric keys
          if (Array.isArray(transactions)) {
            // Handle array response
            totalTransactions += transactions.length;
            
            transactions.forEach((tx: any) => {
              if (tx && typeof tx === 'object') {
                // Process normal transaction object
                if (tx.gasUsed) {
                  gasUsedSum += parseInt(tx.gasUsed);
                }
                
                // Track the earliest timestamp
                if (tx.timeStamp && parseInt(tx.timeStamp) < earliestTimestamp) {
                  earliestTimestamp = parseInt(tx.timeStamp);
                }
              }
            });
            
            // Update startBlock for pagination
            if (transactions.length > 0 && transactions[transactions.length - 1].blockNumber) {
              const lastBlockNumber = parseInt(transactions[transactions.length - 1].blockNumber);
              startBlock = lastBlockNumber + 1;
            }
            
            // Check if we've reached the end
            hasMoreTransactions = transactions.length >= pageSize;
          } else if (typeof transactions === 'object') {
            // Handle object response with numeric keys
            const txEntries = Object.entries(transactions);
            totalTransactions += txEntries.length;
            
            txEntries.forEach(([key, value]: [string, any]) => {
              if (value && typeof value === 'object') {
                console.log(" VALUEEE - " ,value)
                // Handle nested transaction object
                if (value.gasUsed) {
                  gasUsedSum += parseInt(value.gasUsed);
                }
                
                // Track the earliest timestamp
                if (value.timeStamp && parseInt(value.timeStamp) < earliestTimestamp) {
                  earliestTimestamp = parseInt(value.timeStamp);
                }
              }
            });
            
            // Find the last transaction to update startBlock
            const numericKeys = Object.keys(transactions)
              .filter(key => !isNaN(Number(key)))
              .map(Number)
              .sort((a, b) => b - a);
              
            if (numericKeys.length > 0) {
              const lastKey = numericKeys[0].toString();
              const lastTx = transactions[lastKey];
              
              if (lastTx && lastTx.blockNumber) {
                const lastBlockNumber = parseInt(lastTx.blockNumber);
                startBlock = lastBlockNumber + 1;
              }
            }
            
            // Check if we've reached the end
            hasMoreTransactions = Object.keys(transactions).length >= pageSize;
          }
        } else {
          // Handle rate limits or other API errors
          if (response.data.message && response.data.message.includes('rate limit')) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
            continue;
          }
          
          setError(response.data.message || 'Failed to fetch transaction count');
          hasMoreTransactions = false;
        }
      }
      
      // Convert earliest timestamp to a date if found
      if (earliestTimestamp !== Number.MAX_SAFE_INTEGER) {
        const date = new Date(earliestTimestamp * 1000); // Convert seconds to milliseconds
        
        // Format date as YYYY-MM-DD
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        console.log(`Earliest transaction timestamp: ${earliestTimestamp}`);
        console.log(`Earliest transaction date: ${formattedDate}`);
        
        // Save contract creation date
        setContractCreationDate(formattedDate);
        
        // Check if the contract is less than 2 days old
        const twoDaysAgo = new Date();
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        
        if (date > twoDaysAgo) {
          console.log("Contract is too new (less than 2 days old)");
          setContractTooNew(true);
        } else {
          // Calculate gas usage growth from this date to the most recent date
          const growth = calculateGasGrowth(formattedDate);
          if (growth !== null) {
            setGasUsageGrowth(growth);
            
            // Calculate potential Bahamut earnings
            const earnings = calculateBahamutEarnings(gasUsedSum, growth);
            if (earnings !== null) {
              setPotentialBahamutEarnings(earnings.ftn);
              setPotentialEarningsUsd(earnings.usd);
            }
          }
        }
      }
    
      setTransactionCount(totalTransactions);
      setTotalGasUsed(gasUsedSum);
      // Always update the last analyzed address, even for contracts with no transactions
      setLastAnalyzedAddress(contractAddress);
      
      // Handle case when no transactions are found
      if (totalTransactions === 0) {
        console.log("No transactions found for this contract");
        // Reset source code if no transactions found
        setContractCode(null);
        setShowCode(false);
      }
    } catch (err) {
      setError('Error fetching transaction count');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getContractCode = async () => {
    if (!contractAddress) {
      setError('Please enter a contract address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Fetching contract code for address:', contractAddress);
      
      // Use the public environment variable
      const apiKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "None";
      
      const response = await axios.get(`https://api.etherscan.io/api`, {
        params: {
          module: 'contract',
          action: 'getsourcecode',
          address: contractAddress,
          apikey: apiKey
        }
      });

      console.log('API response:', response.data);

      if (response.data.status === '1' && response.data.result && response.data.result.length > 0) {
        const sourceCode = response.data.result[0].SourceCode;
        console.log('Source code length:', sourceCode ? sourceCode.length : 0);
        
        if (!sourceCode || sourceCode.trim() === '') {
          setError('No source code available for this contract');
        } else {
          setContractCode(sourceCode);
          setShowCode(true);
          setActiveTab('code');
        }
      } else {
        // Instead of showing API error message, use a more user-friendly message
        if (response.data.message && response.data.message.includes('NOTOK')) {
          setError('No verified source code available for this contract');
        } else {
          setError(response.data.message || 'Failed to fetch contract code');
        }
      }
    } catch (err) {
      console.error('Error fetching contract code:', err);
      setError('Unable to retrieve source code. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const analyzeContract = async () => {
    setActiveTab('analyze');
    
    // Only rerun analysis if the contract address has changed or no analysis was run before
    if (contractAddress !== lastAnalyzedAddress) {
      console.log(`Running analysis for new contract: ${contractAddress} (previously analyzed: ${lastAnalyzedAddress})`);
      await getTransactionCount();
    } else {
      console.log(`Skipping analysis for already analyzed contract: ${contractAddress}`);
    }
  };

  const viewSourceCode = async () => {
    setActiveTab('code');
    if (!contractCode) {
      setLoading(true);
      await getContractCode();
    }
  };

  const handleDeployClick = () => {
    setShowDeployer(true);
  };

  const handleCloseDeployer = () => {
    setShowDeployer(false);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#E6007A] to-[#9B4BE7] text-transparent bg-clip-text py-4">
              Contract Analytics
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          {/* Input Section */}
          <div className="space-y-6">
            <div>
              <label htmlFor="contractAddress" className="block text-[#E6007A] text-sm font-medium mb-2">
                Contract Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="contractAddress"
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  className="w-full bg-white border border-gray-200 text-gray-900 px-4 py-3 rounded-lg focus:ring-2 focus:ring-[#E6007A] focus:border-transparent transition-all"
                  placeholder="0x..."
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                onClick={analyzeContract}
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'analyze' 
                    ? 'bg-gradient-to-r from-[#E6007A] to-[#9B4BE7] text-white' 
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
              >
                {loading && activeTab === 'analyze' ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Analyze Contract'
                )}
              </button>
              <button
                onClick={viewSourceCode}
                disabled={loading}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  activeTab === 'code' 
                    ? 'bg-gradient-to-r from-[#E6007A] to-[#9B4BE7] text-white' 
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                } ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
              >
                {loading && activeTab === 'code' ? 'Processing...' : 'View Source Code'}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* Results Section */}
          {activeTab === 'analyze' && transactionCount !== null && (
            <div className="mt-8 space-y-6">
              {/* Contract Too New Error */}
              {contractTooNew && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-yellow-800 shadow-sm">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 mr-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-medium mb-2">Contract Too New to Evaluate</h3>
                      <p className="mb-2">This contract was created {contractCreationDate ? `on ${contractCreationDate}` : 'recently'} and is less than 2 days old.</p>
                      <p>Potential earnings calculations require at least 2 days of historical data to provide accurate estimates.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* No Transactions Found Message */}
              {transactionCount === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-gray-700 shadow-sm">
                  <div className="flex items-start">
                    <svg className="w-6 h-6 mr-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-medium mb-2">No Transaction History</h3>
                      <p>This contract address has no transaction history on the Ethereum network.</p>
                      <p className="mt-2">Double-check the address or try a different contract.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Potential Bahamut Earnings - Main highlighted stat */}
              {potentialBahamutEarnings !== null && !contractTooNew && transactionCount > 0 && (
                <div className="bg-gradient-to-r from-[#E6007A] to-[#9B4BE7] rounded-xl p-8 text-white text-center shadow-lg">
                  <h3 className="text-xl font-medium mb-2">Potential Earnings on Bahamut</h3>
                  <p className="text-5xl font-bold mb-2">{formatLargeNumber(potentialBahamutEarnings)} FTN</p>
                  {potentialEarningsUsd !== null && (
                    <p className="text-2xl font-semibold mb-4">${formatLargeNumber(potentialEarningsUsd)}</p>
                  )}
                  <p className="opacity-80 mt-2">This is what you could earn by deploying this contract on Bahamut</p>
                  
                  {/* Deploy to Bahamut button */}
                  <button
                    onClick={handleDeployClick}
                    className="bg-white text-[#E6007A] hover:bg-gray-100 mt-4 px-6 py-3 rounded-lg font-medium transition-all"
                  >
                    Deploy to Bahamut
                  </button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="text-[#9B4BE7] text-sm font-medium mb-2">Transaction Count</h3>
                  <p className="text-3xl font-bold text-gray-900">{transactionCount.toLocaleString()}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                  <h3 className="text-[#9B4BE7] text-sm font-medium mb-2">Total Gas Used</h3>
                  <p className="text-3xl font-bold text-gray-900">{totalGasUsed ? totalGasUsed.toLocaleString() : '0'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div className="mt-8">
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <h3 className="text-[#9B4BE7] text-sm font-medium mb-4">Contract Source Code</h3>
                {contractCode ? (
                  <pre className="bg-white border border-gray-200 p-4 rounded-lg overflow-x-auto text-gray-700 text-sm">
                    <code>{contractCode}</code>
                  </pre>
                ) : (
                  <div className="bg-white border border-gray-200 p-8 rounded-lg text-center text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="mb-2 font-medium">No Source Code Available</p>
                    <p className="text-sm">
                      {error || 'This contract does not have verified source code on Etherscan.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stats Section - Only visible when not on code tab */}
        {activeTab !== 'code' && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-gray-900">6.99M</p>
              <p className="text-sm text-gray-600 mt-1">Accounts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-gray-900">68.42M</p>
              <p className="text-sm text-gray-600 mt-1">Transactions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-gray-900">5.1M</p>
              <p className="text-sm text-gray-600 mt-1">Total Blocks</p>
            </div>
            <div className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-gray-900">$1.74B</p>
              <p className="text-sm text-gray-600 mt-1">Market Cap</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Contract Deployer Modal */}
      {showDeployer && (
        <ContractDeployer 
          contractAddress={contractAddress}
          onClose={handleCloseDeployer}
          etherscanApiKey={process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY || "8RCZA2F3E194XJ2NU6GBNYWZU54IPQHTJC"}
        />
      )}
    </main>
  );
} 