const BASE_URL = "https://love-link-backend.onrender.com"

export const sendMessage = async (data) => {
  const res = await fetch(`${BASE_URL}/notify-message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })
  return res.json()
}
