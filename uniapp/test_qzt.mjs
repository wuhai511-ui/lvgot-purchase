import axios from 'axios'
async function run() {
  const body = {
    app_id: "123",
    timestamp: "123",
    version: "4.0",
    sign: "abcd",
    service: "test",
    params: "{}"
  }
  try {
    const response = await axios.post("https://qztuat.xc-fintech.com/gateway/soa", body, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    })
    console.log(response.data)
  } catch(e) {
    if (e.response) {
      console.log('HTTP', e.response.status, e.response.data)
    } else {
      console.log('Error', e.message)
    }
  }
}
run()
