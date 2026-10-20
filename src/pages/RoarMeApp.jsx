import { useEffect, useState } from 'react'
import RoarMePage from './RoarMePage.jsx'
import { cardHidden, hideCard, install, installOffer, isIOS, isStandalone, onInstallOffer } from '../lib/roarmeApp.js'
import { useIsMobile } from '../components/ui.jsx'

/* RoarMe as its own app (roarme/index.html, Alex 20 Oct): RoarMe on the whole screen with its own tabs, no hub bar,
   and, on a phone where it is not yet an app, a card at the foot to make it one: Chrome's Install, or on an iPhone
   the two steps of Add to Home Screen. Never while it already runs as an app (lib/roarmeApp.js). */
export default function RoarMeApp() {
  return (
    <>
      <RoarMePage full />
      <InstallCard />
    </>
  )
}

// the iPhone's Share icon: a square open at the top with an arrow rising out of it
const SHARE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.5v11" /><path d="m8 7.5 4-4 4 4" /><path d="M8.5 10.5H6.5a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8.5a1 1 0 0 0-1-1h-2" />
  </svg>
)
// Add to Home Screen's own icon: a rounded square with a plus
const ADD = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" /><path d="M12 8.5v7M8.5 12h7" />
  </svg>
)

function InstallCard() {
  const mobile = useIsMobile()
  const [offer, setOffer] = useState(installOffer)
  const [hidden, setHidden] = useState(cardHidden)
  useEffect(() => onInstallOffer(setOffer), [])

  if (!mobile || hidden || isStandalone()) return null
  const ios = isIOS()
  if (!ios && !offer) return null
  const close = (forGood) => { hideCard(forGood); setHidden(true) }

  return (
    <div className="rm-install" role="dialog" aria-label={ios ? 'Add RoarMe to your Home Screen' : 'Install RoarMe'}>
      <div className="rm-install-card">
        <img className="rm-install-icon" src="./apple-touch-icon.png" alt="" />
        {ios ? (
          <>
            <h2>Add RoarMe to your Home Screen</h2>
            <ol className="rm-install-steps">
              <li><span className="rm-install-ico">{SHARE}</span><span>Tap the <b>Share</b> icon at the foot of Safari</span></li>
              <li><span className="rm-install-ico">{ADD}</span><span>Choose <b>Add to Home Screen</b></span></li>
            </ol>
            <p className="rm-install-note">You will sign in once inside the app.</p>
            <div className="rm-install-acts">
              <button type="button" className="rm-install-btn" onClick={() => close(false)}>Not now</button>
              <button type="button" className="rm-install-btn main" onClick={() => close(true)}>Done</button>
            </div>
          </>
        ) : (
          <>
            <h2>Install RoarMe</h2>
            <p className="rm-install-note">RoarMe on your home screen, as an app of its own.</p>
            <div className="rm-install-acts">
              <button type="button" className="rm-install-btn" onClick={() => close(false)}>Not now</button>
              <button type="button" className="rm-install-btn main" onClick={async () => { if (await install()) close(true) }}>Install RoarMe</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
