import React, { useState, useContext } from 'react';
import { login } from '../services/api';
import { Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import './LoginPage.css';

import logo from "../images/logo.png"; // ../ ขึ้น 1 ชั้นจาก pages ไป images
function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { loginUser } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await login(username, password);
      loginUser(response.data);
    } catch (err) {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="login-main">

      {/* LEFT GRADIENT PANEL */}
      <div className="left-box">
  {/* ใช้รูปโลโก้จริง */}
  <div className="logo-circle">
    <img
  src={logo}
  alt="Company Logo"
  style={{
    width: "450px",
    height: "150px",
    objectFit: "contain"
  }}
/>

  </div>

  <h1>Welcome to Page</h1>
  <p>Sign in to continue access</p>
  <span className="website-link">www.skc.rmuti.ac.th</span>
</div>

      {/* RIGHT FORM PANEL */}
      <div className="right-box">
        <div className="form-container">
          <h2>Login</h2>

          {error && <p className="error-text">{error}</p>}

          <form onSubmit={handleSubmit}>

            <div className="input-field">
              <i className="icon">👤</i>
              <input
                type="text"
                placeholder="Type your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="input-field">
              <i className="icon">🔒</i>
              <input
                type="password"
                placeholder="Type your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="forgot-link">
              <Link to="/register">ลงทะเบียนใช้งาน</Link>
            </div>

            <button type="submit" className="gradient-btn">LOGIN</button>

            <p className="signup-text">Or Sign Up Using</p>

            <div className="social-icons">
              <span className="circle fb"></span>
              <span className="circle google"></span>
              <span className="circle twitter"></span>
              <span className="circle insta"></span>
            </div>

          </form>
        </div>
      </div>

    </div>
  );
}

export default LoginPage;
