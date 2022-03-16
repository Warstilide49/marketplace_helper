import { connect, Contract, keyStores, WalletConnection } from 'near-api-js'
import getConfig from './config'

const nearConfig = getConfig('development') 

// Initialize contract & set global variables
export async function initContract() {
  // Initialize connection to the NEAR testnet
  const near = await connect(Object.assign({ deps: { keyStore: new keyStores.BrowserLocalStorageKeyStore() } }, nearConfig))
  window.walletConnection = new WalletConnection(near)

  window.accountId = window.walletConnection.getAccountId()

  window.nft_contract = await new Contract(window.walletConnection.account(), nearConfig.nftContract, {
    viewMethods: ['nft_metadata', 'nft_total_supply', 'nft_tokens_for_owner', 'nft_token'],
    changeMethods: ['nft_mint', 'nft_transfer', 'nft_approve', 'nft_revoke'],
  })

  
  //Just to check working on another contract from the same frontend
  window.marketplace_contract = await new Contract(window.walletConnection.account(), 'market.evin.testnet', {
    viewMethods: ['get_supply_sales', 'get_supply_by_owner_id', 'get_sales_by_nft_contract_id', 'get_supply_by_nft_contract_id','storage_minimum_balance'],
    changeMethods: ['offer'],
  })
  
}

export function logout() {
  window.walletConnection.signOut()
  // reload page
  window.location.replace(window.location.origin + window.location.pathname)
}

export function login() {
  window.walletConnection.requestSignIn(nearConfig.nftContract)
}
