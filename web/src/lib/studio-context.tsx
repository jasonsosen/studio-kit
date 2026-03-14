"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

interface Studio {
  id: string
  name: string
  features?: string
  target_audience?: string
  instagram_handle?: string
  tone?: string
  hashtags?: string
}

interface StudioContextType {
  studios: Studio[]
  currentStudio: Studio | null
  currentStudioId: string | null
  setCurrentStudioId: (id: string) => void
  isLoading: boolean
  refreshStudios: () => Promise<void>
}

const StudioContext = createContext<StudioContextType>({
  studios: [],
  currentStudio: null,
  currentStudioId: null,
  setCurrentStudioId: () => {},
  isLoading: true,
  refreshStudios: async () => {},
})

export function StudioProvider({ children }: { children: ReactNode }) {
  const [studios, setStudios] = useState<Studio[]>([])
  const [currentStudioId, setCurrentStudioId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  const fetchStudios = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStudios([])
        setCurrentStudioId(null)
        return
      }

      const { data, error } = await supabase
        .from("studios")
        .select("*")
        .order("created_at", { ascending: true })

      if (error) throw error

      setStudios(data || [])
      
      // Set current studio from localStorage or use first one
      const savedStudioId = localStorage.getItem("currentStudioId")
      const validStudioId = data?.find(s => s.id === savedStudioId)?.id || data?.[0]?.id
      
      if (validStudioId) {
        setCurrentStudioId(validStudioId)
      }
    } catch (error) {
      console.error("Error fetching studios:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStudios()
  }, [])

  useEffect(() => {
    if (currentStudioId) {
      localStorage.setItem("currentStudioId", currentStudioId)
    }
  }, [currentStudioId])

  const currentStudio = studios.find(s => s.id === currentStudioId) || null

  return (
    <StudioContext.Provider
      value={{
        studios,
        currentStudio,
        currentStudioId,
        setCurrentStudioId,
        isLoading,
        refreshStudios: fetchStudios,
      }}
    >
      {children}
    </StudioContext.Provider>
  )
}

export function useStudio() {
  return useContext(StudioContext)
}
