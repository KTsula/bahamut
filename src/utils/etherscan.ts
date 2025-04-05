/**
 * Fetches contract data from Etherscan API
 */
export async function fetchContractFromEtherscan(address: string, apiKey: string) {
  const url = `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;
  
  try {
    const res = await fetch(url);
    const data = await res.json();
    
    console.log("Raw Etherscan API response:", data);
    
    if (data.status !== '1' || !data.result || data.result.length === 0) {
      throw new Error(data.message || 'Failed to fetch contract data');
    }
    
    const contractInfo = data.result[0];
    console.log("Contract info fields:", Object.keys(contractInfo));
    
    // Some contracts might not have verified ABI
    const abi = contractInfo.ABI && contractInfo.ABI !== 'Contract source code not verified'
      ? JSON.parse(contractInfo.ABI)
      : null;
    
    // Etherscan may return the bytecode in different fields
    let bytecode = contractInfo.Bytecode || '';
    
    // If no bytecode in the primary field, try to find from implementation bytecode
    if (!bytecode && contractInfo.Implementation) {
      console.log("Using implementation bytecode instead");
      // For proxies, we can try to use the implementation contract bytecode
      bytecode = contractInfo.Implementation;
    }
    
    // If still no bytecode, we need to fetch it from separate endpoint
    if (!bytecode) {
      console.log("No bytecode in source code response, fetching from separate endpoint");
      const bytecodeUrl = `https://api.etherscan.io/api?module=proxy&action=eth_getCode&address=${address}&tag=latest&apikey=${apiKey}`;
      const bytecodeRes = await fetch(bytecodeUrl);
      const bytecodeData = await bytecodeRes.json();
      
      if (bytecodeData.result) {
        bytecode = bytecodeData.result;
      }
    }
      
    return {
      abi,
      bytecode,
      contractName: contractInfo.ContractName,
      sourceCode: contractInfo.SourceCode,
      compilerVersion: contractInfo.CompilerVersion,
      isVerified: contractInfo.ABI !== 'Contract source code not verified',
    };
  } catch (error) {
    console.error('Error fetching from Etherscan:', error);
    throw error;
  }
} 