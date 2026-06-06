import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  // entry point of the app, wrapped in StrictMode for highlighting potential problems
  // this is the entry point of the app, where the App component is rendered into the DOM element with id 'root'
  <StrictMode>
    <App />
  </StrictMode>,
)