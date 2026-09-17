import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import { ToastProvider } from './components/ui.jsx'
import { StoreProvider, useCurrentUser } from './lib/store.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CalendarAll from './pages/CalendarAll.jsx'
import Team from './pages/Team.jsx'
import Settings from './pages/Settings.jsx'
import Project from './pages/Project.jsx'
import Overview from './pages/project/Overview.jsx'
import Script from './pages/project/Script.jsx'
import Breakdown from './pages/project/Breakdown.jsx'
import Schedule from './pages/project/Schedule.jsx'
import CallSheets from './pages/project/CallSheets.jsx'
import ProjectCalendar from './pages/project/Calendar.jsx'
import Locations from './pages/project/Locations.jsx'
import People from './pages/project/People.jsx'
import Notes from './pages/project/Notes.jsx'
import Shots from './pages/project/Shots.jsx'
import Tasks from './pages/project/Tasks.jsx'
import TasksAll from './pages/TasksAll.jsx'

function RequireUser() {
  const user = useCurrentUser()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function LoginGate() {
  const user = useCurrentUser()
  return user ? <Navigate to="/" replace /> : <Login />
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginGate />} />
            <Route element={<RequireUser />}>
              <Route element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="calendar" element={<CalendarAll />} />
                <Route path="tasks" element={<TasksAll />} />
                <Route path="team" element={<Team />} />
                <Route path="settings" element={<Settings />} />
                <Route path="p/:id" element={<Project />}>
                  <Route index element={<Overview />} />
                  <Route path="script" element={<Script />} />
                  <Route path="breakdown" element={<Breakdown />} />
                  <Route path="shots" element={<Shots />} />
                  <Route path="schedule" element={<Schedule />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="callsheets" element={<CallSheets />} />
                  <Route path="calendar" element={<ProjectCalendar />} />
                  <Route path="locations" element={<Locations />} />
                  <Route path="people" element={<People />} />
                  <Route path="notes" element={<Notes />} />
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
