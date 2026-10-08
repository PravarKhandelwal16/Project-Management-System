import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './Experience.css'
import ConfirmationProvider from './components/ConfirmationProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfirmationProvider><App /></ConfirmationProvider>
  </StrictMode>,
)
