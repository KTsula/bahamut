// Add type declaration for window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}

/**
 * Bahamut Horizon Testnet Chain Configuration
 */
export const bahamutChain = {
  id: 2552,
  name: 'Bahamut Horizon',
  nativeCurrency: {
    name: 'FTN',
    symbol: 'FTN',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc1-horizon.bahamut.io'],
    },
    public: {
      http: ['https://rpc1-horizon.bahamut.io'],
    },
  },
  blockExplorers: {
    default: {
      name: 'FTNScan',
      url: 'https://horizon.ftnscan.com',
    },
  },
};

/**
 * Function to add Bahamut chain to MetaMask
 */
export async function addBahamutToMetaMask() {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
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
    
    return true;
  } catch (error) {
    console.error('Error adding Bahamut to MetaMask:', error);
    throw error;
  }
} 