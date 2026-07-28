import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const apiKey = process.env.HYPERBEAM_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "missing_key", message: "Falta HYPERBEAM_API_KEY." }, { status: 501 })
  }
  let body = {}
  try { body = await request.json() } catch {}
  try {
    const res = await fetch("https://engine.hyperbeam.com/v0/vm", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        start_url: body.start_url || "https://www.google.com",
        width: 1280,
        height: 720,
        control_disable_default: false,
        adblock: true,
        ublock: true,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: "hyperbeam_error", message: data?.message }, { status: res.status })
    }
    return NextResponse.json({ session_id: data.session_id, embed_url: data.embed_url, admin_token: data.admin_token })
  } catch (err) {
    return NextResponse.json({ error: "network_error", message: String(err) }, { status: 500 })
  }
}
