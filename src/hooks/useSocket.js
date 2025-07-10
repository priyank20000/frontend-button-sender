import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export const useSocket = ({ token, onConnect, onDisconnect, onError }) => {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef(null)
  const isConnectingRef = useRef(false)

  useEffect(() => {
    // Don't connect if no token or already connecting
    if (!token || isConnectingRef.current) {
      return
    }

    // Clean up existing connection
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setIsConnected(false)
    }

    console.log('Initializing socket connection with token:', token.substring(0, 10) + '...')
    isConnectingRef.current = true

    // Create socket connection
    const socket = io('https://whatsapp.recuperafly.com', {
      query: {
        token: token,
        userId: token // Backend expects userId
      },
      transports: ['websocket', 'polling'],
      reconnection: false, // Disable auto-reconnection to prevent loops
      timeout: 20000,
      forceNew: true,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('Socket connected successfully:', socket.id)
      setIsConnected(true)
      isConnectingRef.current = false
      if (onConnect) onConnect()
    })

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setIsConnected(false)
      isConnectingRef.current = false
      if (onDisconnect) onDisconnect(reason)
    })

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setIsConnected(false)
      isConnectingRef.current = false
      if (onError) onError(error)
    })

    socket.on('error', (error) => {
      console.error('Socket error:', error)
      isConnectingRef.current = false
      if (onError) onError(error)
    })

    // Handle authentication errors
    socket.on('unauthorized', (error) => {
      console.error('Socket unauthorized:', error)
      setIsConnected(false)
      isConnectingRef.current = false
      if (onError) onError(new Error('Authentication failed: ' + error.message))
    })

    // Cleanup function
    return () => {
      console.log('Cleaning up socket connection')
      isConnectingRef.current = false
      if (socket) {
        socket.disconnect()
        setIsConnected(false)
      }
    }
  }, [token]) // Only depend on token

  const emit = (event, data) => {
    if (socketRef.current?.connected) {
      console.log('Emitting event:', event, data)
      socketRef.current.emit(event, data)
    } else {
      console.warn('Socket not connected, cannot emit event:', event)
    }
  }

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback)
    }
  }

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off
  }
}