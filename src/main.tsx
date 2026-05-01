import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { getRouter } from './router' // Pulls the logic from your router.tsx
import './styles.css' // Ensures your Tailwind/CSS loads

// 1. Initialize the router
const router = getRouter()

// 2. Find the "root" div in your index.html
const rootElement = document.getElementById('root')!

// 3. Render the application
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
}