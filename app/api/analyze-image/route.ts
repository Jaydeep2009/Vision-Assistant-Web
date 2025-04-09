import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image) {
      return NextResponse.json({ error: "Image data is required" }, { status: 400 })
    }

    // Create the prompt for Gemini
    const prompt =
      "Analyze this image and describe what you see in detail. This description will be read to a blind person to help them understand their surroundings. Be clear, concise, and focus on important elements like people, obstacles, text, and spatial relationships. Limit your response to 3-4 sentences."

    // Call Gemini API with the updated model
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-001:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY || "AIzaSyDCWCFRr8Xhl_MSc1AVXcNvtvbgDRQ9NQw",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: image,
                  },
                },
              ],
            },
          ],
          generation_config: {
            temperature: 0.4,
            max_output_tokens: 1024,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Gemini API error:", errorData)
      return NextResponse.json({ error: "Failed to analyze image with Gemini API" }, { status: 500 })
    }

    const data = await response.json()

    // Extract the description from Gemini's response
    const description =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to analyze the image. Please try again."

    return NextResponse.json({ description })
  } catch (error) {
    console.error("Error processing request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
