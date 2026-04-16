import { useState } from "react"
import { sendMessage } from "./services/api"

export default function App() {
  const [msg, setMsg] = useState("")

  const handleSend = async () => {
    try {
      await sendMessage({
        senderName: "You",
        text: msg,
        partnerFcmToken: "test"
      })
      alert("Sent!")
    } catch (err) {
      console.error(err)
      alert("Error sending message")
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Love Link 💕</h1>
      <input
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        placeholder="Type message"
      />
      <button onClick={handleSend}>Send</button>
    </div>
  )
    }
