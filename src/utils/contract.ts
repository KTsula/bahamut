import { ethers } from 'ethers';
import { bahamutChain } from '../config/chains';

/**
 * Deploy a contract using ethers.js
 */
export async function deployContract({ 
  abi, 
  bytecode, 
  constructorArgs = [] 
}: { 
  abi: any[];
  bytecode: string;
  constructorArgs?: any[];
}) {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  if (!bytecode) {
    throw new Error('Bytecode is required for deployment');
  }

  if (!abi) {
    throw new Error('ABI is required for deployment');
  }

  console.log("Deploying contract with:", { 
    bytecodeLength: bytecode.length,
    abiLength: abi.length,
    constructorArgs
  });

  // Ensure bytecode has 0x prefix
  const processedBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;
  
  try {
    // Get provider and signer
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    console.log("Using signer address:", await signer.getAddress());
    
    // Create contract factory
    const factory = new ethers.ContractFactory(abi, processedBytecode, signer);
    
    console.log("Created contract factory, deploying...");
    
    // Deploy the contract
    const contract = await factory.deploy(...constructorArgs);
    console.log("Contract deployment transaction:", contract.deploymentTransaction());
    
    // Wait for the transaction to be mined
    console.log("Waiting for transaction to be mined...");
    const receipt = await contract.deploymentTransaction()?.wait();
    console.log("Deployment complete, receipt:", receipt);
    
    return {
      address: contract.target as string,
      deployTransaction: contract.deploymentTransaction(),
      receipt,
    };
  } catch (error) {
    console.error('Error deploying contract:', error);
    throw error;
  }
}

/**
 * Ensure the correct chain is selected in MetaMask
 */
export async function ensureChain() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    // Get the current chain ID
    const chainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
    const chainId = parseInt(chainIdHex, 16);
    
    // If not on Bahamut, try to switch
    if (chainId !== bahamutChain.id) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${bahamutChain.id.toString(16)}` }],
        });
      } catch (switchError: any) {
        // If the chain hasn't been added to MetaMask, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${bahamutChain.id.toString(16)}`,
              chainName: bahamutChain.name,
              nativeCurrency: bahamutChain.nativeCurrency,
              rpcUrls: [bahamutChain.rpcUrls.default.http[0]],
              blockExplorerUrls: bahamutChain.blockExplorers?.default.url 
                ? [bahamutChain.blockExplorers.default.url] 
                : undefined,
            }],
          });
        } else {
          throw switchError;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring correct chain:', error);
    throw error;
  }
} 