import 'regenerator-runtime/runtime'

import { initContract, login, logout } from './utils'

import getConfig from './config'

const GAS_FEE= `100000000000000`
const NEAR_IN_YOCTO=1000000000000000000000000;

const { networkId } = getConfig('development')

const submitButton = document.querySelector('form button')

//mint
document.getElementById('mint_form').onclick = async (event) => {
  const button = event.target
  button.disabled = true

  let d=new Date()
  const tokenId= "token"+d.getTime()

  const title=document.getElementById("title").value;
  const description=document.getElementById("description").value;
  const media=document.getElementById("media").value;

  if (!title){
    alert("No title found!");
    button.disabled = false
    return;
  }
  try {
    // make an update call to the smart nft_contract
    await window.nft_contract.nft_mint({"token_id": tokenId, 
                                    "metadata": {"title": title, "description": description, "media": media}, 
                                    "receiver_id": window.accountId},
                                  "300000000000000",
                                  "100000000000000000000000");
  } catch (e) {
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  } finally {
    // re-enable the form, whether the call succeeded or failed
    button.disabled = false
  }
}

//query token using nft_tokens_for_account
document.getElementById('find-token').onclick = async (event) => {
  const button = event.target
  button.disabled = true

  let result;
  const account=document.getElementById("account-id").value;

  try {
    // make an update call to the smart nft_contract
    result= await window.nft_contract.nft_tokens_for_owner({account_id:account, limit:10});
    tokenModal(result);
    
  } catch (e) {
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  } finally {
    // re-enable the form, whether the call succeeded or failed
    button.disabled = false
  }

}

function tokenModal(result){
  if (result.length==0){
    alert("Invalid account id or no tokens available! Mint to get started")
    return;
  }
  let json_notation=JSON.stringify(result,undefined, 4)

  let {container,modal}= createModal("60vw","100%", "token_info");
  let body=document.body;
  body.append(container);
  body.classList.add('modal-open');
  modal.innerHTML=`<div>
                    <h3>Token metadata</h3>
                    <pre id="token-data">${json_notation}</pre>
                  </div>
                  <div>
                    <h3>Media</h3>
                    <div id="imgs"></div>
                  </div>
                  <div>
                    <h3>Transfer</h3>
                    <h5>(Must be owner or approved)</h5>
                    <div>
                      <input class="modal_inputs" id="receiver" placeholder="Enter receiver id">
                      <input class="modal_inputs" id="token_id" placeholder="Enter token id to transfer">
                      <button id="transfer">Transfer</button>
                    </div>
                  </div>
                  <button id="close_modal">Close</button>`

  for(let i=0; i<result.length; i++){
    let img=document.createElement("img");
    img.src=result[i].metadata.media;
    img.style.height="300px"
    img.style.width="auto"
    document.getElementById('imgs').appendChild(img);
  }

  modal.querySelector("#transfer").addEventListener("click", async(e)=>{
    const button = event.target
    button.disabled = true
    
    let receiver_id=modal.querySelector("#receiver").value;
    let token_id=modal.querySelector("#token_id").value;
    let approved_account_id= 0;

    for(let i=0;i<result.length;i++){
      if (result[i].token_id==token_id){
        if (window.accountId in result[i].approved_account_ids){
          approved_account_id=result[i].approved_account_ids[window.accountId];
        }
      }
    }

    try{
      await window.nft_contract.nft_transfer({"receiver_id":receiver_id,
                                      "token_id":token_id,
                                      "approval_id":approved_account_id},
                                      "300000000000000",
                                      "1")
    }
    catch (e) {
      alert(
        'Something went wrong! ' +
        'Maybe you need to sign out and back in? ' +
        'Check your browser console for more info.'
      )
      throw e
    } 
    finally {
      button.disabled = false
    }
  })

  modal.querySelector("#close_modal").addEventListener("click", ()=>{
    body.classList.remove('modal-open')
    container.remove();
  })
}

function createModal(width, height, modalId){
  let container=document.createElement("div");
  container.classList.add('modal_bg')

  let modal=document.createElement("div")
  modal.classList.add("modal");
  modal.id=modalId;
  modal.style.height=height;
  modal.style.width=width;

  container.appendChild(modal);
  return {container,modal}
}

//Showing sales available
async function populateSales(){
  let sales_content=document.getElementById('sales_content');

  try{
    let sales=await window.marketplace_contract.get_sales_by_nft_contract_id({'nft_contract_id':'royalties.evin.testnet','limit':10});
    let token_ids=sales.map(sale=>sale.token_id);
    
    let tokens=[];
    for(let i=0;i<token_ids.length;i++){
      let token=await window.nft_contract.nft_token({'token_id': token_ids[i]})
      tokens.push(token);
    }

    let container=createSalesDOM(sales, tokens)
    if(!sales_content.isEqualNode(container)){
      sales_content.textContent="";
      sales_content.appendChild(container);
    }
    
  }
  catch(e){
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  }    
}

function createSalesDOM(sales, tokens){
  let container=document.createElement('div')
  container.id="sales_container"

  for(let i=0;i<sales.length;i+=1){
    container.appendChild(createSaleFromObject(sales[i], tokens[i]))
  }

  return container;
}

function createSaleFromObject(sale, token){
  let saleDOM=document.createElement('div')
  saleDOM.id="sale";

  saleDOM.innerHTML=`<div>
                  <img src=${token.metadata.media} style="height:300px;width:auto;">
                  <button id="buy_sale">Buy!</button> 
                  <h3>Price:${(sale.sale_conditions/1000000000000000000000000).toFixed(2)}</h3>
                  </div>`;
  
  let button=saleDOM.querySelector('button');
  button.token_id=sale.token_id;
  button.owner_id=sale.owner_id;
  button.price=sale.sale_conditions;
  button.addEventListener('click', buy);
  
  return saleDOM;
}

async function buy(e){
  if(window.accountId==e.target.owner_id){
    alert('Cant buy your own token!');
    return;
  }
  try{
    await window.marketplace_contract.offer({"nft_contract_id":"royalties.evin.testnet", 
                                              "token_id":e.target.token_id},
                                              "300000000000000",
                                              e.target.price);
  }
  catch(e){
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  }
}

//Deposit storage on marketplace
document.getElementById('deposit_storage').onclick=async()=>{

  const amount=parseFloat(document.getElementById('storage_amount').value);

  if (!amount){
    alert("Please fill the field appropriately.");
    return;
  }

  if(typeof(amount)!="number")
    alert("Deposit must be a number")

  const deposit=(amount*NEAR_IN_YOCTO).toLocaleString('fullwide', {useGrouping:false});

  try{
    await window.marketplace_contract.storage_deposit({},
                                              "300000000000000",
                                              deposit);
  }
  catch(e){
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  } 
}

//check balance of how much has been deposited
document.getElementById('check_balance').onclick=async()=>{

  const storage_content=document.getElementById('storage_content');

  try{
    let result= await window.marketplace_contract.storage_balance_of({"account_id":window.accountId})
    storage_content.textContent=`${(result/10**24).toFixed(2)} NEAR`;
  }
  catch(e){
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  }
}

//withdraw excessive storage or when you dont have any sales up
document.getElementById('withdraw_storage').onclick=async()=>{
  try{
    await window.marketplace_contract.storage_withdraw({},
                                              "300000000000000",
                                              "1");
  }
  catch(e){
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  }

}

document.getElementById('approve_for_marketplace').onclick = async (event) => {
  const button = event.target
  button.disabled = true

  const tokenId=document.getElementById("approval_token_id").value;
  const sale_price=parseFloat(document.getElementById("sale_price").value);

  if (!tokenId || !sale_price){
    alert("Please fill the fields appropriately.");
    button.disabled = false
    return;
  }

  if(typeof(sale_price)!="number")
    alert("Sale must be a number")

  const sale_conditions=(sale_price*NEAR_IN_YOCTO).toLocaleString('fullwide', {useGrouping:false});

  try {
    // make an update call to the smart nft_contract
    await window.nft_contract.nft_approve({"token_id": tokenId,
                                    "account_id":"market.evin.testnet",   //Using the contract name explicitly
                                    "msg":JSON.stringify({sale_conditions})},
                                  GAS_FEE,
                                  (NEAR_IN_YOCTO/10).toLocaleString('fullwide', {useGrouping:false}) ) ;
  } catch (e) {
    alert(
      'Something went wrong! ' +
      'Maybe you need to sign out and back in? ' +
      'Check your browser console for more info.'
    )
    throw e
  } finally {
    // re-enable the form, whether the call succeeded or failed
    button.disabled = false
  }
  
}

setInterval(populateSales, 1000);

document.querySelector('#sign-in-button').onclick = login
document.querySelector('#sign-out-button').onclick = logout

// Display the signed-out-flow container
function signedOutFlow() {
  document.querySelector('#signed-out-flow').style.display = 'flex'
  console.log("hello")
}

// Displaying the signed in flow container and fill in account-specific data
function signedInFlow() {
  document.querySelector('#signed-in-flow').style.display = 'flex'
}

// `nearInitPromise` gets called on page load
window.nearInitPromise = initContract()
  .then(() => {
    if (window.walletConnection.isSignedIn()) signedInFlow()
    else signedOutFlow()
  })
  .catch(console.error)

