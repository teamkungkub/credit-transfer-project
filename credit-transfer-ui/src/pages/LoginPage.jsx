import React, { useState, useContext } from 'react';
import { login } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import './LoginPage.css';

import logo from "../images/logo.png";

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const { loginUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // 1. เรียก API Login
      const response = await login(username, password);
      console.log("LOGIN RESPONSE:", response); // เช็คข้อมูลที่ได้จากการ Login

      // 2. ดึง Token (เขียนเผื่อไว้หลายแบบ กันพลาด)
      // บางที axios อาจจะแกะ data มาให้แล้ว หรือบางทีต้องเข้า .data อีกชั้น
      const token = response.data?.access || response.access || response.token;

      if (!token) {
        console.error("Token missing!", response);
        setError('เข้าระบบสำเร็จ แต่ไม่ได้รับ Token ยืนยันตัวตน');
        return;
      }

      // เก็บ Token ลง Context
      loginUser(response.data || response);

      // 3. เอา Token ไปดึง Profile เพื่อดูสิทธิ์
      const profileResponse = await fetch('/api/profile/', {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`, // ต้องเว้นวรรคหลัง Bearer
              'Content-Type': 'application/json'
          }
      });

      if (profileResponse.ok) {
          const userData = await profileResponse.json();
          console.log("USER ROLE:", userData);

          // 4. แยกหน้าตามสิทธิ์
          if (userData.is_superuser === true) {
              navigate('/admin/dashboard');
          } 
          
          else if (userData.is_faculty === true) {
              navigate('/faculty'); 
          } 
          else {
              navigate('/student'); 
          }
      } else {
          // ถ้า 401 หรือ Error อื่นๆ
          const errorData = await profileResponse.json();
          console.error("PROFILE ERROR:", errorData);
          setError('ไม่สามารถดึงข้อมูลผู้ใช้ได้: ' + (errorData.detail || 'Unknown error'));
      }

    } catch (err) {
      console.error("LOGIN FAILED:", err);
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="login-main">
      <div className="left-box">
        <div className="logo-circle">
          <img
            src={logo}
            alt="Company Logo"
            style={{ width: "450px", height: "150px", objectFit: "contain" }}
          />
        </div>
        <h1>Welcome to Page</h1>
        <p>Sign in to continue access</p>
        <span className="website-link">www.skc.rmuti.ac.th</span>
      </div>

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