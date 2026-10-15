// TML Chat for Mac and Windows (Alex, 15 Oct): the hub's chat window, live from hub.themadlions.com,
// in an app of its own. Nothing of the chat is kept here, so every change to the hub reaches it on the
// next start without a new install. Links that leave the chat open in the computer's own browser.
const { app, BrowserWindow, shell, session } = require('electron')

const HUB = 'https://hub.themadlions.com/'
const START = `${HUB}chat.html#/chat-window`
const ALLOWED = ['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'display-capture']

let win = null

const onHub = (url) => {
  try { return new URL(url).origin === new URL(HUB).origin } catch { return false }
}
const inChat = (url) => onHub(url) && url.includes('#/chat-window')

if (!app.requestSingleInstanceLock()) app.quit()
app.on('second-instance', () => {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
})

function open() {
  win = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    title: 'TML Chat',
    backgroundColor: '#0b1018',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true },
  })
  win.loadURL(START)
  // a link to another room stays here; a file, a project page or any other site opens in the browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (inChat(url)) win.loadURL(url)
    else shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (e, url) => {
    if (!onHub(url)) { e.preventDefault(); shell.openExternal(url) }
  })
  win.on('page-title-updated', (e) => e.preventDefault())
  win.on('closed', () => { win = null })
}

app.whenReady().then(() => {
  // calls, voice messages, notifications and copy/paste, for the hub only
  session.defaultSession.setPermissionRequestHandler((contents, permission, done) => {
    done(ALLOWED.includes(permission) && onHub(contents.getURL()))
  })
  session.defaultSession.setPermissionCheckHandler((contents, permission) => ALLOWED.includes(permission) && (!contents || onHub(contents.getURL())))
  open()
  app.on('activate', () => {
    if (win) win.show()
    else open()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
