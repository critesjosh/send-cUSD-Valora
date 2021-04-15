import React from 'react'
import './global'
import { web3, kit } from './root'
import { Image, StyleSheet, Text, TextInput, Button, View } from 'react-native'
import {   
  requestTxSig,
  waitForSignedTxs,
  requestAccountAddress,
  waitForAccountAuth,
  FeeCurrency
} from '@celo/dappkit'
import { toTxResult } from "@celo/connect"
import * as Linking from 'expo-linking'
import { registerRootComponent } from 'expo';

export default class App extends React.Component {

  // Set the defaults for the state
  state = {
    address: 'Not logged in',
    phoneNumber: 'Not logged in',
    cUSDBalance: 'Not logged in',
    helloWorldContract: {},
    contractName: '',
    amount: '',
    stableToken: {}
  }

  // This function is called when the page successfully renders
  componentDidMount = async () => {
    
    // Check the Celo network ID
    const networkId = await web3.eth.net.getId();
    
    // Get the deployed HelloWorld contract info for the appropriate network ID
    const deployedNetwork = HelloWorldContract.networks[networkId];

    // Create a new contract instance with the HelloWorld contract info
    const instance = new web3.eth.Contract(
      HelloWorldContract.abi,
      deployedNetwork && deployedNetwork.address
    );

    // Save the contract instance
    this.setState({ helloWorldContract: instance })
  }

  login = async () => {
    
    // A string you can pass to DAppKit, that you can use to listen to the response for that request
    const requestId = 'login'
    
    // A string that will be displayed to the user, indicating the DApp requesting access/signature
    const dappName = 'Hello Celo'
    
    // The deeplink that the Celo Wallet will use to redirect the user back to the DApp with the appropriate payload.
    const callback = Linking.makeUrl('/my/path')
  
    // Ask the Celo Alfajores Wallet for user info
    requestAccountAddress({
      requestId,
      dappName,
      callback,
    })
  
    // Wait for the Celo Wallet response
    const dappkitResponse = await waitForAccountAuth(requestId)

    // Set the default account to the account returned from the wallet
    kit.defaultAccount = dappkitResponse.address

    // Get the stabel token contract
    const stableToken = await kit.contracts.getStableToken()

    // Get the user account balance (cUSD)
    const cUSDBalanceBig = await stableToken.balanceOf(kit.defaultAccount)
    
    // Convert from a big number to a string
    let cUSDBalance = cUSDBalanceBig.toString()
    
    // Update state
    this.setState({ cUSDBalance, 
                    isLoadingBalance: false,
                    address: dappkitResponse.address, 
                    phoneNumber: dappkitResponse.phoneNumber
                  })
  }

  read = async () => {
    
    const stableToken = await kit.contracts.getStableToken();
    const cUSDBalanceBig = await stableToken.balanceOf(kit.defaultAccount)
    
    // Update state
    this.setState({ cUSDBalance: cUSDBalanceBig.toString() })
  }

  write = async () => {
    const requestId = 'transfer'
    const dappName = 'Hello Celo'
    const callback = Linking.makeUrl('/my/path')

    let anAddress = '0xD86518b29BB52a5DAC5991eACf09481CE4B0710d'

    const stableToken = await kit.contracts.getStableToken();

    // Create a transaction object to update the contract with the 'textInput'

    const txObject = await stableToken.transfer(anAddress, this.state.amount).txo

    // Send a request to the Celo wallet to send an update transaction to the HelloWorld contract
    requestTxSig(
      kit,
      [
        {
          from: this.state.address,
          to: stableToken.contract.options.address,
          tx: txObject,
          feeCurrency: FeeCurrency.cUSD
        }
      ],
      { requestId, dappName, callback }
    )

    // Get the response from the Celo wallet
    const dappkitResponse = await waitForSignedTxs(requestId)
    const tx = dappkitResponse.rawTxs[0]
    
    // Get the transaction result, once it has been included in the Celo blockchain
    let result = await toTxResult(kit.web3.eth.sendSignedTransaction(tx)).waitReceipt()

    console.log(`cUSD tx receipt: `, result)  
    console.log(`https://alfajores-blockscout.celo-testnet.org/tx/${result.transactionHash}/`) 
  }

  onChangeText = async (text) => {
    this.setState({amount: text})
  }

  render(){
    return (
      <View style={styles.container}>
        <Image resizeMode='contain' source={require("./assets/white-wallet-rings.png")}></Image>
        <Text>Open up client/App.js to start working on your app!</Text>
        
        <Text style={styles.title}>Login first</Text>
        <Button title="login()" 
          onPress={()=> this.login()} />
                <Text style={styles.title}>Account Info:</Text>
        <Text>Current Account Address:</Text>
        <Text>{this.state.address}</Text>
        <Text>Phone number: {this.state.phoneNumber}</Text>
        <Text>cUSD Balance: {this.state.cUSDBalance}</Text>
        
        <Text style={styles.title}>Send cUSD</Text>
        <Text>Amount:</Text>
        <TextInput
          style={{  borderColor: 'black', borderWidth: 1, backgroundColor: 'white' }}
          placeholder="amount of cUSD to send"
          onChangeText={text => this.onChangeText(text)}
          value={this.state.amount}
          />
        <Button style={{padding: 30}} title="send amount" 
          onPress={()=> this.write()} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#35d07f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginVertical: 8, 
    fontSize: 20, 
    fontWeight: 'bold'
  }
});

registerRootComponent(App)