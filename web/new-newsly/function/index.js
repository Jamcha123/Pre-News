import * as functions from 'firebase-functions'
import admin from 'firebase-admin'
import dotenv from 'dotenv'
import axios from 'axios'
import { OpenAI } from 'openai/client.js'
import fs from 'fs'
import {Ollama} from 'ollama'
import {Perplexity} from '@perplexity-ai/perplexity_ai'
import Stripe from 'stripe'
import { randomBytes } from 'crypto'

admin.initializeApp({
  projectId: "newsly-2"
});

dotenv.config()

const stripe = new Stripe(process.env["STRIPE"])

admin.firestore().settings({ignoreUndefinedProperties: true})

const ai = new OpenAI({apiKey: process.env["OPENAI"]})
const perplex = new Perplexity({apiKey: process.env["PERPLEXITY"]})

const searching = async (headline) => {
    const google = (await axios.get("https://www.googleapis.com/customsearch/v1?key=" + process.env["GOOGLE"] + "&cx=c42b716ffd1df45bd&q=news reports: " + headline))["data"]["items"]
    const brave = (await axios.get("https://api.search.brave.com/res/v1/news/search?q=news reports: " + headline, {headers: {"X-Subscription-Token": process.env["BRAVE"], "Accept-Encoding": "gzip", "Accept": "application/json"}}))["data"]["results"]
    const perplex1 = await perplex.search.create({
       query: "news reports: " + headline, 
       max_results: 10, 
       max_tokens: 1024 
    })

    let [ans1, ans2, ans3, ans4] = ["", "", "", ""]
    google.forEach((e) => {
        ans1 += e["title"] + " - " + e["snippet"] + " : " + e["link"]
    })
    brave.forEach((e) => {
        ans2 += e["title"] + " - " + e["description"] + " : " + e["url"]
    })
    perplex1.results.forEach((e) => {
        ans4 += e.title + " - " + e.snippet + " : " + e.url
    })

    return ["google news searches: " + ans1, "brave news searches: " + ans2, "perplexity news searches: " + ans4]
}

export const free_api = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {headline} = req.query
    const data = await searching(headline)

    const response = await ai.chat.completions.create({
        model: "gpt-4.1", 
        messages: [
            {
                role: "system", 
                content: "You Are A Analyst that summarizes news based on searches from " + data[0] + "," + data[1] + "," + data[2] 
            },
            {
                role: "user", 
                content: "Write a 100 word or less summary each of perplexity, google, brave?"
            }
        ]
    })
    res.status(200).json({"headline": headline, "date": new Date().toISOString(), "type": "free", "summary": response.choices[0].message["content"]})
    return res.end()
})

export const basic_api = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {headline} = req.query
    const {authorization} = req.headers

    const keys = (await admin.firestore().collection("auth").doc("auth_tokens").get()).get("tokens")
    let active = false
    for(let i = 0; i != keys.length; i++){
        if(keys[i] == authorization){
            active = true
        }
    }
    if(active === false){
        return res.status(200).send(authorization + " is the wrong key")
    }

    const tracK_usage = (await admin.firestore().collection("usage").doc("usage_tokens").get()).get("tokens")

    const arr = []
    for(let i = 0; i != tracK_usage.length; i++){
        if(tracK_usage[i][authorization] != undefined){
            if(tracK_usage[i][authorization] <= 0){
                return res.status(200).send("your ran out of requests, top up your balance")
            }

            let target = Number.parseFloat(Number.parseInt(Number.parseInt(tracK_usage[i][authorization] * 100) - 10) / 100)
            
            const obj = {}
            obj[authorization] = target

            arr.push(obj)
            continue
        }
        arr.push(tracK_usage[i])
    }
    await admin.firestore().collection("usage").doc("usage_tokens").set({"tokens": arr})

    const data = await searching(headline)

    const response = await ai.chat.completions.create({
        model: "gpt-4.1", 
        messages: [
            {
                role: "system", 
                content: "You Are A Analyst that summarizes news based on searches from " + data[0] + "," + data[1] + "," + data[2]
            },
            {
                role: "user", 
                content: "Write a short 30 word or more summary of every person mentioned and there roll in the story each?"
            }
        ]
    })
    const targets = response.choices[0].message["content"]

    return res.status(200).json({"headline": headline, "date": new Date().toISOString(), "type": "basic",  "people": ((targets).split("\n\n")).slice(1, targets.length-4)})
})

export const pros_api = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {headline, outcomes} = req.query
    const {authorization} = req.headers

    const keys = (await admin.firestore().collection("auth").doc("auth_tokens").get()).get("tokens")
    let active = false
    for(let i = 0; i != keys.length; i++){
        if(keys[i] == authorization){
            active = true
        }
    }
    if(active === false){
        return res.status(200).send(authorization + " is the wrong key")
    }

    const tracK_usage = (await admin.firestore().collection("usage").doc("usage_tokens").get()).get("tokens")

    const arr = []
    for(let i = 0; i != tracK_usage.length; i++){
        if(tracK_usage[i][authorization] != undefined){
            if(tracK_usage[i][authorization] <= 0){
                return res.status(200).send("your ran out of requests, top up your balance")
            }

            let target = Number.parseFloat(Number.parseInt(Number.parseInt(tracK_usage[i][authorization] * 100) - 20) / 100)
            
            const obj = {}
            obj[authorization] = target

            arr.push(obj)
            continue
        }
        arr.push(tracK_usage[i])
    }
    await admin.firestore().collection("usage").doc("usage_tokens").set({"tokens": arr})

    const data = await searching(headline)

    const arr_outcomes = []
    let ans = ""
    for(let i = 0; i != (outcomes.split(",")).length; i++){
        const response = await ai.chat.completions.create({
            model: "gpt-4.1", 
            messages: [
                {
                    role: "system", 
                    content: "You Are A Analyst that ranks these outcomes: " + (outcomes.split(","))[i] + " based on likelihood from these searches: " + data[0] + "," + data[1] + "," + data[2]
                },
                {
                    role: "user", 
                    content: "how likely is this outcome? (0 is 'when hell freezes over' and 10 is 'matter of time') in 50 words or less"
                }
            ]
        })
        const targets = response.choices[0].message["content"]
        ans += (i + 1).toString() + ". " + targets + "\n"
        arr_outcomes.push(targets)
        arr_outcomes.push("")
        arr_outcomes.push("")
    }
    const summary = await ai.chat.completions.create({
        model: "gpt-4.1", 
        messages: [
            {
                role: "system", 
                content: "You are a analyst that summarizes all these outcomes: " + ans + " based on these searches: " + data[0] + "," + data[1] + "," + data[2]
            },
            {
                role: "user", 
                content: "Summarize the outcomes in 50 words or less"
            }
        ]
    })
    arr_outcomes.push(summary.choices[0].message["content"])
    arr_outcomes.push("")
    arr_outcomes.push("")

    return res.status(200).json({"headline": headline, "date" : new Date().toISOString(), "type": "pro", "likelihood": arr_outcomes})
})

export const create_tokens = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {user} = req.query

    const {uid} = (await admin.auth().getUser(user)).toJSON()
    
    if(uid == undefined || uid == null){
        return res.status(200).send("user, not found")
    }

    const usage_tokens = (await admin.firestore().collection("usage").doc("usage_tokens").get()).get("tokens")
    const auth_tokens = (await admin.firestore().collection("auth").doc("auth_tokens").get()).get("tokens")

    let getToken = (await admin.firestore().collection("auth").doc(uid).get()).get("token")

    if(typeof(getToken) == undefined || getToken == undefined){
        const addToken = Buffer.concat([Buffer.from(uid, "hex"), Buffer.from(randomBytes(16).toString("hex"), "hex")]).toString("hex")
        await admin.firestore().collection("auth").doc(uid).set({"token": addToken})

        const obj = {}
        obj[addToken] = 1
        await admin.firestore().collection("usage").doc(uid).set(obj)
        
        const arr1 = []
        for(let i = 0; i != auth_tokens.length; i++){
            arr1.push(auth_tokens[i])
        }
        arr1.push(addToken)

        const arr2 = []
        for(let i = 0; i != usage_tokens.length; i++){
            arr2.push(usage_tokens[i])
        }
        arr2.push(obj)

        admin.firestore().collection("auth").doc("auth_tokens").set({"tokens": arr1})
        admin.firestore().collection("usage").doc("usage_tokens").set({"tokens": arr2})

        getToken = (await admin.firestore().collection("auth").doc(uid).get()).get("token")

        return res.status(200).send(getToken)
    }

    return res.status(200).send("token created")

})

export const refresh_token = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {user} = req.query
    const {uid} = (await (admin.auth().getUser(user))).toJSON()

    if(uid == null || uid == undefined){
        return res.status(200).send(user + ", not found")       
    }

    const old_auth_token = (await admin.firestore().collection("auth").doc(uid).get()).get("token")
    const old_auth_token_lists = (await admin.firestore().collection("auth").doc("auth_tokens").get()).get("tokens")

    const new_token = Buffer.concat([Buffer.from(uid, "hex"), Buffer.from(randomBytes(16).toString("hex"), "hex")]).toString("hex")
    
    const arr1 = []
    for(let i = 0; i != old_auth_token_lists.length; i++){
        if(old_auth_token_lists[i] == old_auth_token){
            arr1.push(new_token)
            continue
        }
        arr1.push(old_auth_token_lists[i])
    }

    const old_usage_token = (await admin.firestore().collection("usage").doc(uid).get()).get(old_auth_token)
    const old_usage_token_lists = (await admin.firestore().collection("usage").doc("usage_tokens").get()).get("tokens")


    const arr2 = []
    let true_usage = 0
    for(let i = 0; i != old_usage_token_lists.length; i++){
        if(old_usage_token_lists[i][old_auth_token] != undefined || old_usage_token_lists[i][old_auth_token] != null || typeof(old_usage_token_lists[i][old_auth_token]) != undefined){
            const obj = {}
            obj[new_token] = old_usage_token_lists[i][old_auth_token] 

            true_usage = old_usage_token_lists[i][old_auth_token] 
            
            arr2.push(obj)
            continue
        }
        arr2.push(old_usage_token_lists[i])
    }

    admin.firestore().collection("usage").doc("usage_tokens").set({"tokens": arr2})

    const obj1 = {}
    obj1[new_token] = true_usage

    admin.firestore().collection("usage").doc(uid).set(obj1)
    admin.firestore().collection("usage").doc("usage_tokens").set({"tokens": arr2})

    admin.firestore().collection("auth").doc("auth_tokens").set({"tokens": arr1})
    admin.firestore().collection("auth").doc(uid).set({"token": new_token})

    return res.status(200).send(old_auth_token + " is replaced with " + new_token)
})

export const checkout = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {user, amount} = req.query
    const session = await stripe.checkout.sessions.create({
        line_items: [{
            price: "price_1SelAfBJFXFW6fU3TLQ4e9hg", 
            quantity: Number.parseInt(amount)
        }],
        mode: "payment", 
        currency: "usd", 
        automatic_tax: {enabled: true}, 
        success_url: "https://add-balance-d2wfhntahq-uc.a.run.app?user=" + user + "&amount=" + amount, 
        cancel_url: "https://newsly.studio/"
    })
    res.redirect(301, session.url)
})

export const add_balance = functions.https.onRequest({cors: true, timeoutSeconds: 3600}, async (req, res) => {
    const {user, amount} = req.query

    const {uid} = (await admin.auth().getUser(user)).toJSON()
    if(uid == undefined || uid == null || typeof(uid) == undefined){
        return res.status(200).send("user, not found")
    }

    let usage = (await admin.firestore().collection("new_usage").doc(uid).get()).get("usage")
    usage = Number.parseFloat(Number.parseInt(usage * 100) + Number.parseInt(amount * 100)) / 100

    admin.firestore().collection("new_usage").doc(uid).set({"usage": usage})
    return res.redirect(301, "https://newsly.studio")
})

export const get_questions = functions.https.onRequest({cors: true}, async (req, res) => {
    const {headline} = req.query
    const {authorization} = req.headers

    const token = (await admin.firestore().collection("new_usage").doc(authorization).get()).get("usage")
    if(typeof(token) == undefined || token == undefined || token == null){
        admin.firestore().collection("new_usage").doc(authorization).set({"usage": 1})
    }else{
        if(token <= 0){
            return res.status(200).send("Your $$$ balance is less than or equal to 0, You need to top up your balance.")
        }
        let target = Number.parseFloat(Number.parseInt(Number.parseInt(token * 100) - 20) / 100)
        admin.firestore().collection("new_usage").doc(authorization).set({"usage": target})
    }

    const link = "https://gamma-api.polymarket.com/events/slug/" + headline

    const webby = (await axios.get(link))["data"]
    const data = (await searching(headline))

    res.status(200).json({"polymarket": webby, "searches": data})
    return res.end()
})
