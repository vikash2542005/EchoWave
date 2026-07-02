import React from 'react'
import "./landing.css"
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

 const landing = () => {
  const router = useNavigate();
  
  return (
    <div className='landingContainer'>
      <nav>
        <div className='logo'>
         <Link to='/home' style={{textDecoration:"none"}}>  </Link> 
         <h1>EchoWave</h1>
        </div>
        <div className='navButtons'>
          <p onClick={()=>{
            router('/joinasguest')
          }}>Join as Guest</p>

          <p onClick={()=>{
            router('/auth')
          }}>Login</p>

          <p onClick={()=>{
            router('/auth')
          }}>Sign Up</p>
        </div>
      </nav>

      <div className="landingMain">
        <div className="landingText fade-in">
          <h1 className="hero-title">Welcome to <span className="gradient-text">EchoWave</span></h1>
          <p className="hero-subtitle">Connect with your lovedones with Real-time communication platform for seamless video calls, meetings, and collaboration.</p>

          <button onClick={() => router('/home')} className="cta-button">
            Start Your First Call
          </button>
        </div>
        <div className="landingImage">
          <div className="image-container">
            <img src="/mobile.png" alt="EchoWave real-time video call interface" />
          </div>
        </div>
      </div>

    </div>
  )
}

export default landing
