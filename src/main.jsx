import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import WorkTracker from './WorkTracker.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <WorkTracker />
  </StrictMode>,
)
