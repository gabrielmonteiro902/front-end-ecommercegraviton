import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </div>
    </Router>
  )
}

function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800">
        Welcome to E-commerce Graviton
      </h1>
      <p className="mt-4 text-gray-600">
        Your React + Vite + TypeScript + Supabase application is ready!
      </p>
    </div>
  )
}

export default App
