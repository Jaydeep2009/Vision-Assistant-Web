"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [isCapturing, setIsCapturing] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Initialize speech synthesis
  useEffect(() => {
    speechSynthesisRef.current = new SpeechSynthesisUtterance()
    speechSynthesisRef.current.rate = 1
    speechSynthesisRef.current.pitch = 1

    // Announce the website is open
    speak("Welcome to Vision Assistant. Tap anywhere on the screen to capture and analyze your surroundings.")

    return () => {
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel()
      }
    }
  }, [])

  // Initialize camera when capturing starts
  useEffect(() => {
    if (isCapturing) {
      initCamera()
    } else {
      stopCamera()
    }
  }, [isCapturing])

  const speak = (text: string) => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel()
    }

    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.text = text
      speechSynthesis.speak(speechSynthesisRef.current)
    }
  }

  const initCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        speak("Camera is now active. Please point your camera at what you want to analyze.")
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      speak("Could not access the camera. Please make sure you've granted camera permissions.")
      setIsCapturing(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the current video frame to the canvas
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to base64 image
    const imageData = canvas.toDataURL("image/jpeg")

    // Stop camera after capturing
    setIsCapturing(false)

    // Analyze the image
    await analyzeImage(imageData)
  }

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true)
    speak("Analyzing your surroundings. Please wait a moment.")

    try {
      // Remove the data URL prefix to get just the base64 data
      const base64Image = imageData.split(",")[1]

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze image")
      }

      const data = await response.json()
      setResult(data.description)

      // Read the result aloud
      speak(data.description)
    } catch (error) {
      console.error("Error analyzing image:", error)
      speak("Sorry, there was an error analyzing the image. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleScreenTap = () => {
    if (isAnalyzing) return

    if (!isCapturing) {
      setIsCapturing(true)
    } else {
      captureImage()
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-100">
      <Card className="w-full max-w-md p-6 flex flex-col items-center space-y-6">
        <h1 className="text-2xl font-bold text-center">Vision Assistant</h1>

        <div
          className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
          onClick={handleScreenTap}
          role="button"
          aria-label="Tap to capture or analyze image"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleScreenTap()
            }
          }}
        >
          {isCapturing ? (
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {isAnalyzing ? (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              ) : (
                <p className="text-white text-center p-4">
                  {result ? "Tap to capture again" : "Tap anywhere to capture"}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Hidden canvas for image processing */}
        <canvas ref={canvasRef} className="hidden" />

        {result && (
          <div className="w-full">
            <h2 className="text-xl font-semibold mb-2">Analysis Result:</h2>
            <p className="text-gray-700">{result}</p>

            <Button className="w-full mt-4" onClick={() => speak(result)} aria-label="Read result aloud again">
              Read Aloud Again
            </Button>
          </div>
        )}
      </Card>
    </main>
  )
}
