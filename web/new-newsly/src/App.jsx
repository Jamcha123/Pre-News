import { useState, useEffect, useRef, useCallback } from 'react'
import {motion} from 'framer-motion'
import axios from 'axios'
import './App.css'
import { initializeApp } from 'firebase/app'
import { getAI, GenerativeModel, getGenerativeModel, VertexAIBackend, GoogleAIBackend } from 'firebase/ai'
import { getStorage } from 'firebase/storage'
import $ from 'jquery'
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { deleteUser, getAuth, GithubAuthProvider, GoogleAuthProvider, linkWithPopup, onAuthStateChanged, signInAnonymously, signInWithPopup } from 'firebase/auth'

const config = {
  apiKey: "AIzaSyAThpvTF06xHxKTod3MLC8uN0fy_B4Y3LE",
  authDomain: "newsly-2.firebaseapp.com",
  projectId: "newsly-2",
  storageBucket: "newsly-2.firebasestorage.app",
  messagingSenderId: "680724334186",
  appId: "1:680724334186:web:a02c110036f3ef4ce22c13",
  measurementId: "G-GHP8PK2LNQ"
}

const app = initializeApp(config)

const appcheck = initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("6LcepS8sAAAAAFKruEPVSFQLZ7aUYDvVGUG0q-vZ"), 
  isTokenAutoRefreshEnabled: true
})

const auth = getAuth(app)
auth.useDeviceLanguage()

const ai = getAI(app, {backend: new GoogleAIBackend()})

const model = getGenerativeModel(ai, {model: "gemini-2.5-flash"})

const db = getFirestore(app)

const storage = getStorage(app)

const google = new GoogleAuthProvider()

const github = new GithubAuthProvider()

const items = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if(user == null){
      signInAnonymously(auth).then((value) => {
        resolve(value.user.uid)
      })
    }else{
      resolve(user.uid)
    }
  })
})
await items

function AddBackground(){
  return(
    <div className="fixed -z-2 w-full h-full p-0 m-auto bg-transparent top-0 left-0 ">
      <div className="fixed -z-2 w-full h-full p-0 m-auto bg-linear-60 from-violet-600 via-pink-600 to-purple-600 top-0 left-0 colours "></div>
      <div className="fixed -z-1 w-full h-full p-0 m-auto bg-slate-950 top-0 left-0 opacity-[0.9] "></div>
    </div>
  )
}

export default function App(){
  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if(user.isAnonymous === false){
        document.getElementById("login1").style.display = "none"
        document.getElementById("login2").style.display = "none"

        document.getElementById("checkout").style.display = "flex"
        document.getElementById("logout").style.display = "flex"
      }else{
        document.getElementById("login1").style.display = "flex"
        document.getElementById("login2").style.display = "flex"

        document.getElementById("checkout").style.display = "none"
        document.getElementById("logout").style.display = "none"
      }
    })

    onAuthStateChanged(auth, async (user) => {
      const usage = (await getDoc(doc(db, "new_usage/" + user.uid))).get("usage")
      if(usage == undefined || typeof(usage) == undefined || usage == null){
        setDoc(doc(db, "new_usage/" + user.uid), {"usage": 1}).then((value) => window.location.reload())
      }else{
        document.getElementById("usage").innerText = "Total Balance: $" + usage 
      }
    })


    const news = document.getElementById("news")
    const headline = document.getElementById("headline")
    
    news.addEventListener("submit", async (e) => {
      e.preventDefault()
      $("#option_container").empty()

      let container = document.createElement("div")
      container.classList.add("loading_container")

      Array(9).fill().forEach((e) => {
        let dots = document.createElement("div")
        dots.classList.add("dots")
        
        container.appendChild(dots)
      })
      document.getElementById("option_container").appendChild(container)

      let ans = ""
      for(let i = 0; i != headline.value.length; i++){
        if(headline.value[i] == " "){
          ans += "-"
          continue
        }
        ans += headline.value[i].toLowerCase()
      }
      const link = "https://get-questions-d2wfhntahq-uc.a.run.app?headline=" + ans
      const webby = new Promise((resolve) => {
        axios.get(link, {headers: {Authorization: auth.currentUser.uid}}).then((value) => {
          resolve(value)
        }).catch((err) => {
          alert(ans + " isn't a polymarket topic\nplease re-enter a topic from Polymarket")
        })
      })

      const data = await webby

      if(data["data"] == "Your $$$ balance is less than or equal to 0, You need to top up your balance."){
        alert("Your $$$ balance is less than or equal to 0, Login (google or github) and Buy more usage")
        return
      }
      const [title, questions, searches] = [data["data"]["polymarket"]["slug"], data["data"]["polymarket"]["markets"], data["data"]["searches"]]
      let outcomes = []

      const tags = document.createElement("div")
      tags.classList.add("tags")

      $("#option_container").empty()
      for(let i = 0; i != questions.length; i++){
        if(((questions[i]["question"]).split(" "))[1] == "Person"){
          continue
        }
        const prompt = "what is the likelihood of this event happening (0 is never and 10 is guarented): " + questions[i]["question"] + " (100 words or less), here are the searches: " + searches
        const results = await model.generateContent(prompt)
        outcomes.push([questions[i]["id"], "$" + questions[i]["volume"], questions[i]["question"], results.response.text()])

        let option_container = document.createElement("div")
        option_container.classList.add("items")

        let option_title = document.createElement("h1")
        option_title.classList.add("title")
        option_title.innerText = questions[i]["question"]
        option_container.appendChild(option_title)

        let option_summary = document.createElement("p")
        option_summary.classList.add("text")
        option_summary.innerText = results.response.text()
        option_container.appendChild(option_summary)
        
        let option_volume = document.createElement("p")
        option_volume.classList.add("text")
        option_volume.innerText = "Trading Volume: $" + questions[i]["volume"]
        option_container.appendChild(option_volume)
        
        let option_rows = document.createElement("div")
        option_rows.classList.add("rows1")

        let option_prices = document.createElement("div")
        option_prices.classList.add("rows2")

        let option_yes = document.createElement("button")
        option_yes.classList.add("button2")
        option_yes.setAttribute("id", "yes")
        option_yes.innerText = "Yes, Buy YES shares"
        option_rows.appendChild(option_yes)

        let option_no = document.createElement("button")
        option_no.classList.add("button1")
        option_no.setAttribute("id", "no")
        option_no.innerText = "No, Buy No shares"
        option_rows.appendChild(option_no)

        let option_price_1 = document.createElement("p")
        option_price_1.classList.add("price1")
        option_price_1.innerText = "YES Share Price: $"
        option_prices.appendChild(option_price_1)

        let option_price_2 = document.createElement("p")
        option_price_2.classList.add("price2")
        option_price_2.innerText = "NO Share Price: $"
        option_prices.appendChild(option_price_2)

        option_container.appendChild(option_rows)
        option_container.appendChild(option_prices)

        document.getElementById("option_container").appendChild(option_container)

        const usage = (await getDoc(doc(db, "new_usage/" + auth.currentUser.uid))).get("usage")
        document.getElementById("usage").innerText = "Total Balance: $" + usage 

      }
    })
  })
  return(
    <div className="relative w-screen h-screen m-auto p-0 bg-transparent flex flex-col lg:flex-row align-middle justify-center text-center gap-5 ">
      <AddBackground></AddBackground>
      <nav className="relative w-full lg:w-[20%] lg:h-screen h-[20vh] m-auto p-0 bg-slate-950 flex flex-row lg:flex-col align-middle justify-center text-center ">
        <ul className="relative w-[25%] lg:w-full h-full lg:h-[25%] m-auto p-0 flex flex-row lg:flex-col align-middle justify-center text-center ">
          <h1>Newsly</h1>
        </ul>
        <ul className="relative w-[75%] lg:w-full h-full lg:h-[75%] m-auto p-0 flex flex-row lg:flex-col align-middle text-end justify-end ">
          <div className="relative gap-5 w-[30%] lg:w-full h-full lg:h-[30%] m-auto mt-0 mb-0 p-0 bg-transparent flex flex-row lg:flex-col align-middle justify-center text-center">
            <h1 id="usage" className="text-2xl text-white font-light flex flex-col align-middle justify-center text-center">
              Total Balance: $0
            </h1>
          </div>
          <div className="relative gap-5 w-[50%] lg:w-full h-full lg:h-[20%] m-auto mt-0 mb-0 lg:mb-[30%] p-0 bg-transparent flex flex-row lg:flex-col align-middle justify-center text-center ">
            <motion.button id="login1" onClick={() => {linkWithPopup(auth.currentUser, google).then(value => window.location.reload()).catch(err => alert(err))}} whileHover={{scale: 0.9}} initial={{scale: 1}} whileTap={{scale: 1.1}} transition={{type: "spring", duration: 1}} className="relative w-[15em] lg:w-[90%] h-[75%] lg:h-[20em] border-white border-2 m-auto p-0 bg-linear-60 from-slate-800 via-slate-700 to-slate-600 text-green-400 cursor-pointer text-xl flex flex-col align-middle justify-center text-center ">
              Google Login
            </motion.button>
            <motion.button id="login2" onClick={() => {linkWithPopup(auth.currentUser, github).then(value => window.location.reload()).catch(err => alert(err))}}  whileHover={{scale: 0.9}} initial={{scale: 1}} whileTap={{scale: 1.1}} transition={{type: "spring", duration: 1}}  className="relative w-[15em] lg:w-[90%] h-[75%] lg:h-[20em] border-white border-2 m-auto p-0 bg-linear-60 from-slate-800 via-slate-700 to-slate-600 text-lime-400 cursor-pointer text-xl flex flex-col align-middle justify-center text-center ">
              Github Login
            </motion.button>
            <motion.button id="checkout" onClick={() => {const amount = prompt("How much do you want to add to your balance: $$$"); window.location.href = "https://checkout-d2wfhntahq-uc.a.run.app?user=" + auth.currentUser.uid + "&amount=" + amount}} whileHover={{scale: 0.9}} initial={{scale: 1}} whileTap={{scale: 1.1}} transition={{type: "spring", duration: 1}} className="relative w-[15em] lg:w-[90%] h-[75%] lg:h-[20em] border-white border-2 m-auto p-0 bg-linear-60 from-slate-800 via-slate-700 to-slate-600 text-green-400 cursor-pointer text-xl flex flex-col align-middle justify-center text-center ">
              + Buy Usage
            </motion.button>
            <motion.button id="logout" onClick={() => {deleteUser(auth.currentUser).then(value => window.location.reload()).catch(err => alert(err))}} whileHover={{scale: 0.9}} initial={{scale: 1}} whileTap={{scale: 1.1}} transition={{type: "spring", duration: 1}} className="relative w-[15em] lg:w-[90%] h-[75%] lg:h-[20em] border-white border-2 m-auto p-0 bg-linear-60 from-slate-800 via-slate-700 to-slate-600 text-lime-400 cursor-pointer text-xl flex flex-col align-middle justify-center text-center ">
              Logout
            </motion.button>
          </div>
        </ul>
      </nav>
      <section className="relative w-screen lg:w-[80%] m-auto h-[90vh] lg:h-screen p-0 bg-transparent flex flex-col align-middle justify-center text-center ">
        <div className="relative w-full h-[10%] m-auto mb-[3%] p-0 bg-transparent flex flex-col align-middle justify-center text-center ">
          <h1 className="text-2xl text-white font-medium">
            Newsly - Analyze Polymarket Questions Seperately
          </h1>
        </div>
        <div id="option_container" className="relative w-[75%] h-[40%] min-h-[55%] max-h-[55%] m-auto p-0 bg-transparent flex flex-col align-middle gap-10 overflow-x-hidden overflow-y-auto ">
          <div className="items">
            <h1 className="title">Polymarket Option 1</h1>
            <p className="text">Lorem ipsum, dolor sit amet consectetur adipisicing elit. Laborum repellendus ad odio, sit atque tenetur totam est exercitationem eveniet eligendi ut nemo quidem, officia vitae, commodi maiores explicabo dignissimos inventore?</p>
            <p className="text">Trading Volume: $100000</p>
            <div className="rows">
              <motion.button id="yes" className="button2 ">Yes, Buy YES shares</motion.button>
              <motion.button id="no" className="button1 ">NO, Buy NO shares</motion.button>
            </div>
          </div>
          <div className="items">
            <h1 className="title">Polymarket Option 2</h1>
            <p className="text">Lorem ipsum, dolor sit amet consectetur adipisicing elit. Laborum repellendus ad odio, sit atque tenetur totam est exercitationem eveniet eligendi ut nemo quidem, officia vitae, commodi maiores explicabo dignissimos inventore?</p>
            <p className="text">Trading Volume: $100000</p>
            <div className="rows">
              <motion.button id="yes" className="button2 ">Yes, Buy YES shares</motion.button>
              <motion.button id="no" className="button1 ">NO, Buy NO shares</motion.button>
            </div>
          </div>
          <div className="items">
            <h1 className="title">Polymarket Option 3</h1>
            <p className="text">Lorem ipsum, dolor sit amet consectetur adipisicing elit. Laborum repellendus ad odio, sit atque tenetur totam est exercitationem eveniet eligendi ut nemo quidem, officia vitae, commodi maiores explicabo dignissimos inventore?</p>
            <p className="text">Trading Volume: $100000</p>
            <div className="rows">
              <motion.button id="yes" className="button2 ">Yes, Buy YES shares</motion.button>
              <motion.button id="no" className="button1 ">NO, Buy NO shares</motion.button>
            </div>
          </div>
          <div className="items">
            <h1 className="title">Polymarket Option 4</h1>
            <p className="text">Lorem ipsum, dolor sit amet consectetur adipisicing elit. Laborum repellendus ad odio, sit atque tenetur totam est exercitationem eveniet eligendi ut nemo quidem, officia vitae, commodi maiores explicabo dignissimos inventore?</p>
            <p className="text">Trading Volume: $100000</p>
            <div className="rows">
              <motion.button id="yes" className="button2 ">Yes, Buy YES shares</motion.button>
              <motion.button id="no" className="button1 ">NO, Buy NO shares</motion.button>
            </div>
          </div>
        </div>
        <div className="relative w-[75%] h-[30%] m-auto mt-0 mb-0 p-0 bg-transparent flex flex-col align-middle justify-center text-center ">
          <form id='news' action="" method="get" className="relative w-full h-[75%] m-auto mt-0 mb-0 p-0 bg-slate-800 border-slate-950 border-2 flex flex-col align-middle justify-center text-center ">
            <input required type="text" id="headline" placeholder="Enter A News Event From The Polymarket Event URL e.g after /event/" className="relative border-2 border-black w-full h-[55%] m-auto p-0 flex flex-col align-middle justify-center text-center text-xl text-white " />
            <div className="relative w-full h-[45%] m-auto p-0 flex flex-row align-middle justify-center text-center text-xl text-white">
              <div className="relative w-[75%] h-full m-auto p-0 bg-transparent flex flex-row align-middle justify-evenly text-center ">
                <h1 className="text-xl text-gray-300 font-light flex flex-col align-middle justify-center text-center">Be Patient, Gemini API takes time, also only the title after /event/</h1>
              </div>
              <motion.button initial={{scale: 1}} whileHover={{scale: 1.1}} whileTap={{scale: 0.9}} transition={{type: "spring", duration: 1}} className="relative w-[25%] border-2 border-white h-full m-auto p-0 bg-transparent flex flex-col align-middle justify-center text-gray-300 text-center cursor-pointer ">
                Submit
              </motion.button>
            </div>
          </form>
        </div>
        <div className="relative w-[75%] h-[20%] m-auto mt-0 mb-0 p-0 bg-transparent flex flex-col align-middle justify-center text-center"></div>
      </section>
    </div>
  )
}