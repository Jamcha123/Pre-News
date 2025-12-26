import * as functions from 'firebase-functions'
import polymarket from "@polymarket/builder-signing-sdk";
import dotenv from 'dotenv'
import { ClobClient, Side } from "@polymarket/clob-client";
import {JsonRpcProvider, JsonRpcSigner, Wallet} from 'ethers'

const BUILDER_CREDS: polymarket.BuilderApiKeyCreds = {
    key: process.env.BUILDER_KEY!,
    secret: process.env.BUILDER_SECRET!,
    passphrase: process.env.BUILDER_PASS!,
}

const builderConfig: any = new polymarket.BuilderConfig({
  remoteBuilderConfig: { 
    url: "https://your-server.com/sign"
  }
});

export const polymarket_trading = functions.https.onRequest({cors: true}, async (req: any, res: any) => {
    const {address} = Wallet.createRandom()
    const provider = new JsonRpcProvider("https://polygon-rpc.com")
    const wallet = new Wallet("0x15Fca4126bA400D2976Ba45568dFE57ac028e462", provider)
    return res.status(200).send(address)

    const client = new ClobClient(
      "https://clob.polymarket.com",
      137,
      wallet, // ethers v5.x EOA signer
      BUILDER_CREDS, // User's API Credentials
      2, // signatureType for the Safe proxy wallet
      "0x488A6cCF3B0e4f32bEbfd3bf4A511614df68198C", // Safe proxy wallet address
      undefined, 
      false,
      builderConfig
    );
    const order = await client.createOrder({
        price: 0.50, 
        side: Side.BUY, 
        size: 1, 
        tokenID: "601697"
    })
    return res.status(200).send((await client.postOrder(order)))
})
