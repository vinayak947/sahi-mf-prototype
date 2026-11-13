import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './tokens.css'
import './index.css'
import './screens.css'
import './mf/mf.css'
import './mf/sipdetail.css'
import './mf/baskets.css'
import './mf/home.css'

// Light / dark: the profile button on home flips it; ?theme=dark or ?theme=light also sets it. Remembered in this browser.
try {
  const q = new URLSearchParams(location.search).get('theme')
  if (q === 'dark' || q === 'light') localStorage.setItem('sahi-theme', q)
  if (localStorage.getItem('sahi-theme') === 'dark') document.documentElement.dataset.theme = 'dark'
} catch {
  /* storage can be blocked; the page stays light */
}

// The browser's status bar takes the page colour (--surface-L1), in whichever theme is on.
const syncStatusBar = () => {
  const c = getComputedStyle(document.documentElement).getPropertyValue('--surface-L1').trim()
  if (c) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c)
}
syncStatusBar()
new MutationObserver(syncStatusBar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
