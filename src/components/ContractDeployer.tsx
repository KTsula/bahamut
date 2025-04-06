import { useState, useEffect } from 'react';
import { fetchContractFromEtherscan } from '../utils/etherscan';
import { deployContract, ensureChain } from '../utils/contract';
import { bahamutChain } from '../config/chains';
import { useWallet } from '../hooks/useWallet';

interface ContractDeployerProps {
  contractAddress: string;
  onClose: () => void;
  etherscanApiKey: string;
}

const ContractDeployer = ({ contractAddress, onClose, etherscanApiKey }: ContractDeployerProps) => {
  const [isLoadingContract, setIsLoadingContract] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [contractInfo, setContractInfo] = useState<any>(null);
  const [deployedContractAddress, setDeployedContractAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [showErrorPopup, setShowErrorPopup] = useState<boolean>(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState<string>('');
  
  const { account, isConnected, connectWallet } = useWallet();

  console.log("Etherscan API key:", etherscanApiKey);

  // Auto-fetch the contract when the component mounts
  useEffect(() => {
    handleFetchContract();
  }, []);

  const handleFetchContract = async () => {
    if (!contractAddress) {
      setError('No contract address provided');
      return;
    }

    setIsLoadingContract(true);
    setError(null);
    setShowErrorPopup(false);
    
    try {
      const info = await fetchContractFromEtherscan(contractAddress, etherscanApiKey);
      console.log("Contract info from Etherscan:", info);
      setContractInfo(info);
      
      // Check if the contract is verified but has no source code
      if (!info.isVerified || !info.abi || !info.bytecode) {
        setErrorPopupMessage(
          !info.isVerified 
            ? `Contract ${info.contractName || ''} is not verified on Etherscan.`
            : `Contract ${info.contractName || ''} doesn't have the required source code or ABI.`
        );
        setShowErrorPopup(true);
      }
      
      setSuccess(true);
    } catch (err: any) {
      console.error('Error fetching contract:', err);
      setError(err.message || 'Failed to fetch contract data');
      setErrorPopupMessage(err.message || 'Failed to fetch contract data');
      setShowErrorPopup(true);
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
        
        {/* Error Popup */}
        {showErrorPopup && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-lg animate-fade-in">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 mt-0.5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium mb-1">Unable to Deploy Contract</p>
                <p className="text-sm">{errorPopupMessage}</p>
                <p className="text-sm mt-2">Please verify your contract on Etherscan first or try a different contract.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowErrorPopup(false)}
              className="mt-3 bg-white border border-red-300 text-red-600 px-4 py-1.5 text-sm rounded-lg hover:bg-red-50"
            >
              Dismiss
            </button>
          </div>
        )}
        
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
          
          {isLoadingContract ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#E6007A] border-t-transparent rounded-full mb-2"></div>
              <p>Fetching contract information...</p>
            </div>
          ) : (
            <>
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
            </>
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
      
      {/* Add a CSS class for animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default ContractDeployer; 