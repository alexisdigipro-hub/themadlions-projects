import { createRoot } from 'react-dom/client'
import { api } from './api'
import './styles.css'
import './roarme.css'
import App from './App'
import { apply } from './settings'
import { scrollbarsWhileScrolling } from './ui'

document.documentElement.dataset.platform = api.platform
apply()
scrollbarsWhileScrolling()
createRoot(document.getElementById('root')!).render(<App />)
