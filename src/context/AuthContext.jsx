import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('token')
        const userData = localStorage.getItem('user')
        
        if (token && userData) {
          // Validate token format (basic check)
          const tokenParts = token.split('.')
          if (tokenParts.length === 3) {
            try {
              const parsedUser = JSON.parse(userData)
              if (parsedUser && parsedUser.id) {
                setIsAuthenticated(true)
                setUser(parsedUser)
                console.log('Auth restored from localStorage:', parsedUser.email)
              } else {
                // Invalid user data
                localStorage.removeItem('token')
                localStorage.removeItem('user')
              }
            } catch (parseError) {
              console.error('Error parsing user data:', parseError)
              localStorage.removeItem('token')
              localStorage.removeItem('user')
            }
          } else {
            // Invalid token format
            localStorage.removeItem('token')
            localStorage.removeItem('user')
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } finally {
        setLoading(false)
        setIsInitialized(true)
      }
    }

    initializeAuth()
  }, [])

  const login = (token, userData) => {
    try {
      if (!token || !userData) {
        throw new Error('Invalid login data')
      }

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(userData))
      setIsAuthenticated(true)
      setUser(userData)
      console.log('User logged in:', userData.email)
    } catch (error) {
      console.error('Error during login:', error)
      logout()
    }
  }

  const logout = () => {
    try {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      setIsAuthenticated(false)
      setUser(null)
      console.log('User logged out')
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  // Check if auth is valid (can be called by components)
  const validateAuth = () => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    
    if (!token || !userData) {
      logout()
      return false
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (!parsedUser || !parsedUser.id) {
        logout()
        return false
      }
      return true
    } catch (error) {
      logout()
      return false
    }
  }

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
    loading,
    isInitialized,
    validateAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}