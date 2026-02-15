import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Sidebar  from './components/sidebar'
import WelcomePage from './pages/WelcomePage'
import HomePage from './pages/HomePage'
import './index.css'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/graviton-home" element={
            <Sidebar>
            <HomePage />
            </Sidebar>
            } />  
        </Routes>
        </AuthProvider>
    </Router>
  )
}

export default App
