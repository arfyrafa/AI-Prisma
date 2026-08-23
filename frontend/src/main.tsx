import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { App } from './App'
import { ProcessProvider } from './hooks/useProcessContext'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Elemen #root tidak ditemukan.')

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <ProcessProvider processId={1}>
        <App />
      </ProcessProvider>
    </BrowserRouter>
  </StrictMode>,
)
