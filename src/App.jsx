import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ToastProvider } from './components/ui.jsx'
import { StoreProvider, useCurrentUser, useStore } from './lib/store.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CalendarAll from './pages/CalendarAll.jsx'
import Team from './pages/Team.jsx'
import Settings from './pages/Settings.jsx'
import Project, { useProject } from './pages/Project.jsx'
import Overview from './pages/project/Overview.jsx'
import Script from './pages/project/Script.jsx'
import Schedule from './pages/project/Schedule.jsx'
import People from './pages/project/People.jsx'
import Whiteboard from './pages/project/Whiteboard.jsx'
import Shots from './pages/project/Shots.jsx'
import TasksAll from './pages/TasksAll.jsx'
import Database from './pages/Database.jsx'
import Chat from './pages/Chat.jsx'
import MyWork from './pages/MyWork.jsx'
import Profile from './pages/Profile.jsx'
import Drives from './pages/Drives.jsx'
import PublicCallSheet from './pages/PublicCallSheet.jsx'
import PublicDelivery from './pages/PublicDelivery.jsx'
import Deliveries from './pages/Deliveries.jsx'
import PublicStatus from './pages/PublicStatus.jsx'
import PublicEstimate from './pages/PublicEstimate.jsx'
import PublicInvoice from './pages/PublicInvoice.jsx'
import Finance from './pages/Finance.jsx'
import Budget from './pages/project/Budget.jsx'
import Reports from './pages/project/Reports.jsx'
import Post from './pages/project/Post.jsx'

function Loading() {
  return (
    <div className="login">
      <div className="login-card">
        <p className="muted">Loading your workspace…</p>
      </div>
    </div>
  )
}

function RequireUser() {
  const user = useCurrentUser()
  const { ready } = useStore()
  if (!ready) return <Loading />
  return user ? <Outlet /> : <Navigate to="/login" replace />
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
  return user ? <Navigate to="/" replace /> : <Login />
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginGate />} />
            <Route path="/s/:token" element={<PublicCallSheet />} />
            <Route path="/d/:token" element={<PublicDelivery />} />
            <Route path="/ps/:token" element={<PublicStatus />} />
            <Route path="/e/:token" element={<PublicEstimate />} />
            <Route path="/inv/:token" element={<PublicInvoice />} />
            <Route element={<RequireUser />}>
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
                <Route path="share" element={<Deliveries />} />
                <Route path="database/:tab" element={<Database />} />
                <Route path="database" element={<Navigate to="/database/locations" replace />} />
                <Route path="people" element={<Navigate to="/database/cast" replace />} />
                <Route path="locations" element={<Navigate to="/database/locations" replace />} />
                <Route path="finance" element={<Finance />} />
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
        </HashRouter>
      </ToastProvider>
    </StoreProvider>
  )
}
