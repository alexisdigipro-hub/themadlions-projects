import { Suspense, lazy } from 'react'
import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ToastProvider } from './components/ui.jsx'
import { StoreProvider, useCurrentUser, useStore } from './lib/store.jsx'
import { CallProvider } from './lib/calls.jsx'
import Login from './pages/Login.jsx'
import Project, { useProject } from './pages/Project.jsx'

// Each page is its own file, fetched the first time it is opened, so opening the app downloads
// a fraction of the code. A tab left open across a deploy asks for page files the new build no
// longer has; reload once to pick up the new build instead of failing on a blank page.
const RELOAD_KEY = 'tml_chunk_reload'
const session = (fn) => { try { return fn(window.sessionStorage) } catch { return null } }
function lazyPage(load) {
  return lazy(() => load().then(
    (m) => { session((s) => s.removeItem(RELOAD_KEY)); return m },
    (err) => {
      if (session((s) => s.getItem(RELOAD_KEY))) throw err
      session((s) => s.setItem(RELOAD_KEY, '1'))
      window.location.reload()
      return new Promise(() => {})
    },
  ))
}

// Home is where everyone lands: start fetching it right away, alongside the workspace data.
const dashboardFile = import('./pages/Dashboard.jsx')
const Dashboard = lazyPage(() => dashboardFile)
const CalendarAll = lazyPage(() => import('./pages/CalendarAll.jsx'))
const Team = lazyPage(() => import('./pages/Team.jsx'))
const Settings = lazyPage(() => import('./pages/Settings.jsx'))
const Overview = lazyPage(() => import('./pages/project/Overview.jsx'))
const Script = lazyPage(() => import('./pages/project/Script.jsx'))
const Schedule = lazyPage(() => import('./pages/project/Schedule.jsx'))
const People = lazyPage(() => import('./pages/project/People.jsx'))
const Whiteboard = lazyPage(() => import('./pages/project/Whiteboard.jsx'))
const Shots = lazyPage(() => import('./pages/project/Shots.jsx'))
const TasksAll = lazyPage(() => import('./pages/TasksAll.jsx'))
const Database = lazyPage(() => import('./pages/Database.jsx'))
const Chat = lazyPage(() => import('./pages/Chat.jsx'))
// the chat alone in a window of its own (the ⧉ button on the chat list), no side menu
const ChatWindow = lazyPage(() => import('./pages/Chat.jsx').then((m) => ({ default: m.ChatWindow })))
const MyWork = lazyPage(() => import('./pages/MyWork.jsx'))
const Profile = lazyPage(() => import('./pages/Profile.jsx'))
const Drives = lazyPage(() => import('./pages/Drives.jsx'))
const Office = lazyPage(() => import('./pages/Office.jsx'))
const PublicCallSheet = lazyPage(() => import('./pages/PublicCallSheet.jsx'))
const PublicDelivery = lazyPage(() => import('./pages/PublicDelivery.jsx'))
const Deliveries = lazyPage(() => import('./pages/Deliveries.jsx'))
const PublicStatus = lazyPage(() => import('./pages/PublicStatus.jsx'))
const PublicEstimate = lazyPage(() => import('./pages/PublicEstimate.jsx'))
const PublicInvoice = lazyPage(() => import('./pages/PublicInvoice.jsx'))
const PublicShotList = lazyPage(() => import('./pages/PublicShotList.jsx'))
const PublicDeck = lazyPage(() => import('./pages/PublicDeck.jsx'))
const Finance = lazyPage(() => import('./pages/Finance.jsx'))
const Invoices = lazyPage(() => import('./pages/Invoices.jsx'))
const Budget = lazyPage(() => import('./pages/project/Budget.jsx'))
const Reports = lazyPage(() => import('./pages/project/Reports.jsx'))
const Post = lazyPage(() => import('./pages/project/Post.jsx'))
const Presentation = lazyPage(() => import('./pages/project/Presentation.jsx'))

// The company name while the workspace loads (Alex). Nothing is loaded yet, so the name is typed
// here rather than read from settings; the logo image arrives with the workspace a moment later.
function Loading() {
  return (
    <div className="login">
      <div className="login-card boot-card">
        <strong className="boot-name">THE MAD LIONS</strong>
      </div>
    </div>
  )
}

function RequireUser() {
  const user = useCurrentUser()
  const { ready } = useStore()
  if (!ready) return <Loading />
  // calls ring wherever the app is open, the chat window included
  return user ? <CallProvider><Outlet /></CallProvider> : <Navigate to="/login" replace />
}

// The project's own Chat tab is gone (its room already lives in the sidebar's Chat), but an old
// link should still land on that same room rather than a dead page.
function ProjectChatRedirect() {
  const { project } = useProject()
  return <Navigate to={`/chat/p:${project.id}`} replace />
}

function LoginGate() {
  const user = useCurrentUser()
  const { ready } = useStore()
  if (!ready) return <Loading />
  // TML Chat (chat.html) signs in on its own on an iPhone, and must land back on the chat, not on Home
  return user ? <Navigate to={/chat\.html$/.test(window.location.pathname) ? '/chat-window' : '/'} replace /> : <Login />
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<LoginGate />} />
            <Route path="/s/:token" element={<PublicCallSheet />} />
            <Route path="/d/:token" element={<PublicDelivery />} />
            <Route path="/ps/:token" element={<PublicStatus />} />
            <Route path="/e/:token" element={<PublicEstimate />} />
            <Route path="/inv/:token" element={<PublicInvoice />} />
            <Route path="/sl/:token" element={<PublicShotList />} />
            <Route path="/pr/:token" element={<PublicDeck />} />
            <Route element={<RequireUser />}>
              <Route path="chat-window" element={<ChatWindow />} />
              <Route path="chat-window/:room" element={<ChatWindow />} />
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="calendar" element={<CalendarAll />} />
                <Route path="tasks" element={<TasksAll />} />
                <Route path="chat" element={<Chat />} />
                <Route path="chat/:room" element={<Chat />} />
                <Route path="mywork" element={<MyWork />} />
                <Route path="me" element={<Profile mine />} />
                <Route path="u/:id" element={<Profile />} />
                <Route path="drives" element={<Drives />} />
                <Route path="office" element={<Office />} />
                <Route path="office/:pid/:fileid" element={<Office />} />
                <Route path="share" element={<Deliveries />} />
                <Route path="database/:tab" element={<Database />} />
                <Route path="database" element={<Navigate to="/database/locations" replace />} />
                <Route path="people" element={<Navigate to="/database/cast" replace />} />
                <Route path="locations" element={<Navigate to="/database/locations" replace />} />
                <Route path="finance" element={<Finance />} />
                <Route path="invoices" element={<Invoices />} />
                {/* Home and Projects are the same page now; keep old bookmarks alive */}
                <Route path="home" element={<Navigate to="/" replace />} />
                <Route path="team" element={<Team />} />
                <Route path="settings" element={<Settings />} />
                <Route path="p/:id" element={<Project />}>
                  <Route index element={<Overview />} />
                  {/* The project's own Chat tab is gone; the same room lives in the sidebar's Chat */}
                  <Route path="chat" element={<ProjectChatRedirect />} />
                  {/* The song map moved into Script (a music video's "script" is the song) */}
                  <Route path="music" element={<Navigate to="../script" replace />} />
                  <Route path="script" element={<Script />} />
                  {/* Breakdown is now framed inside Script */}
                  <Route path="breakdown" element={<Navigate to="../script" replace />} />
                  <Route path="shots" element={<Shots />} />
                  <Route path="schedule" element={<Schedule />} />
                  {/* Tasks is now on Overview */}
                  <Route path="tasks" element={<Navigate to=".." replace />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="budget" element={<Budget />} />
                  {/* Equipment is now a section inside People (Project Database); keep old links alive */}
                  <Route path="gear" element={<Navigate to="../people" replace />} />
                  <Route path="post" element={<Post />} />
                  <Route path="presentation" element={<Presentation />} />
                  {/* Call sheets is now framed inside Schedule */}
                  <Route path="callsheets" element={<Navigate to="../schedule" replace />} />
                  {/* The project calendar is gone; the global Calendar in the sidebar covers it */}
                  <Route path="calendar" element={<Navigate to=".." replace />} />
                  {/* Locations is now a sub-tab inside People (Crew, Locations & Cast); keep old links alive */}
                  <Route path="locations" element={<Navigate to="../people?tab=locations" replace />} />
                  <Route path="people" element={<People />} />
                  <Route path="whiteboard" element={<Whiteboard />} />
                  {/* Files & notes is now framed on Overview */}
                  <Route path="notes" element={<Navigate to=".." replace />} />
                </Route>
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}
