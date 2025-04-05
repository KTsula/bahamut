/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_ETHERSCAN_API_KEY: process.env.ETHERSCAN_API_KEY,
  },
}

module.exports = nextConfig 