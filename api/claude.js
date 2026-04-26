export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: body.model || 'claude-sonnet-4-5',
        max_tokens: body.max_tokens || 4000,
        system: body.system,
        messages: body.messages,
      }),
    })

    const responseText = await anthropicResponse.text()
    
    try {
      const json = JSON.parse(responseText)
      return new Response(JSON.stringify(json), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    } catch {
      return new Response(JSON.stringify({ 
        error: { message: responseText } 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  } catch (err) {
    return new Response(JSON.stringify({ 
      error: { message: err.message } 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}