import { useState } from "react"

export default function App() {
  const [msg, setMsg] = useState("")

  const sendMessage = async () => {
    await fetch("https://love-link-main.onrender.com//notify-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        senderName: "You",
        text: msg,
        partnerFcmToken: "test"
      })
    })
    alert("Sent!")
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Love Link 💕</h1>
      <input
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Type message"
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  )
}
