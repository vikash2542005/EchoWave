import React from 'react'
import { Routes, Route} from 'react-router-dom';
import Landing from './pages/landingPage/landing';
import Authantication from './pages/authantication';
import Home from './pages/HomePage/Home';
import { AuthProvider } from './contexts/AuthContext';
import VideoComponent from './pages/VideoComponent/VideoComponent';


const App = () => {
  return (
   <>
     <AuthProvider>


      <Routes>

        <Route path='/' element={<Landing />} />

        <Route path='/auth' element={<Authantication/>} />

        <Route path='/home' element={<Home />} />

        <Route path='/:url' element={<VideoComponent/>} />

      </Routes>


      </AuthProvider>

   </>
  )
}

export default App