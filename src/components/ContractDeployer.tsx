import { useState } from 'react';
import { fetchContractFromEtherscan } from '../utils/etherscan';
import { deployContract, ensureChain } from '../utils/contract';
import { bahamutChain } from '../config/chains';
import { useWallet } from '../hooks/useWallet';

interface ContractDeployerProps {
  contractAddress: string;
  onClose: () => void;
}

const ContractDeployer = ({ contractAddress, onClose }: ContractDeployerProps) => {
  const [etherscanApiKey, setEtherscanApiKey] = useState('');
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [contractInfo, setContractInfo] = useState<any>(null);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  const { account, isConnected, connectWallet } = useWallet();

  const handleFetchContract = async () => {
    if (!contractAddress || !etherscanApiKey) {
      setError('Please provide both contract address and Etherscan API key');
      return;
    }

    setIsLoadingContract(true);
    setError(null);
    
    try {
      const info = await fetchContractFromEtherscan(contractAddress, etherscanApiKey);
      console.log("Contract info from Etherscan:", info);
      setContractInfo(info);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error fetching contract:', err);
      setError(err.message || 'Failed to fetch contract data');
    } finally {
      setIsLoadingContract(false);
    }
  };

  const handleDeploy = async () => {
    if (!contractInfo || !contractInfo.abi || !contractInfo.bytecode) {
      setError('Please fetch a valid contract first');
      return;
    }

    if (!isConnected) {
      try {
        await connectWallet();
      } catch (err) {
        setError('Please connect your wallet first');
        return;
      }
    }

    setIsDeploying(true);
    setError(null);
    
    try {
      // First ensure we're on the right chain
      await ensureChain();
      
      // Deploy the contract
      const result = await deployContract({
        abi: contractInfo.abi,
        bytecode: contractInfo.bytecode,
        // You might want to add UI for constructor arguments
        constructorArgs: [],
      });
      
      setDeployedContractAddress(result.address);
      setSuccess(true);
    } catch (err: any) {
      console.error('Error deploying contract:', err);
      setError(err.message || 'Failed to deploy contract');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-center text-[#E6007A]">Deploy to Bahamut</h2>
        
        <div className="space-y-6">
          {!isConnected && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-700 mb-2 font-medium">Connect your wallet</p>
              <p className="text-sm text-blue-600 mb-3">Connect your wallet to deploy this contract to Bahamut</p>
              <button 
                onClick={connectWallet}
                className="bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium"
              >
                Connect Wallet
              </button>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Address
            </label>
            <input 
              type="text"
              value={contractAddress}
              disabled
              className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etherscan API Key
            </label>
            <input 
              type="password"
              value={etherscanApiKey}
              onChange={(e) => setEtherscanApiKey(e.target.value)}
              placeholder="Your Etherscan API key"
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <button 
            onClick={handleFetchContract}
            disabled={isLoadingContract || !etherscanApiKey}
            className={`w-full py-2 rounded-lg font-medium ${
              isLoadingContract 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-[#E6007A] text-white hover:bg-[#F31994]'
            }`}
          >
            {isLoadingContract ? 'Fetching...' : 'Fetch Contract'}
          </button>
          
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          {contractInfo && (
            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Name:</span>
                <span className="ml-2">{contractInfo.contractName || 'Unknown'}</span>
              </div>
              
              <div>
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                  contractInfo.isVerified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {contractInfo.isVerified ? 'Verified' : 'Unverified'}
                </span>
              </div>
              
              {contractInfo && contractInfo.abi && contractInfo.bytecode && (
                <button 
                  onClick={handleDeploy}
                  disabled={isDeploying || !isConnected}
                  className={`w-full py-2 rounded-lg font-medium ${
                    isDeploying || !isConnected
                      ? 'bg-gray-300 cursor-not-allowed' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isDeploying ? 'Deploying...' : 'Deploy to Bahamut'}
                </button>
              )}
              
              {contractInfo && (!contractInfo.abi || !contractInfo.bytecode) && (
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg">
                  {!contractInfo.abi 
                    ? "This contract doesn't have a verified ABI. Deployment is not possible."
                    : "No bytecode available for this contract. Deployment is not possible."}
                </div>
              )}
            </div>
          )}
          
          {isDeploying && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#E6007A] border-t-transparent rounded-full mb-2"></div>
              <p>Deploying contract to Bahamut... Please confirm in MetaMask.</p>
            </div>
          )}
          
          {deployedContractAddress && (
            <div className="p-4 bg-green-50 text-green-800 rounded-lg space-y-3">
              <p className="font-medium">Contract Deployed!</p>
              <p>Your contract was successfully deployed to Bahamut.</p>
              <div className="bg-white p-2 rounded border border-green-200 font-mono text-sm overflow-x-auto">
                {deployedContractAddress}
              </div>
              {bahamutChain.blockExplorers?.default.url && (
                <a 
                  href={`${bahamutChain.blockExplorers.default.url}/address/${deployedContractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline inline-block mt-2"
                >
                  View on Block Explorer
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContractDeployer; 