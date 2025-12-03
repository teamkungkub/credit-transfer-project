// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // ตรวจสอบว่ากรอกข้อมูลครบหรือไม่
    if (!formData.username || !formData.password) {
      setError('กรุณากรอก Username และ Password');
      return;
    }
    try {
      // ส่งแค่ username และ password ไปยัง API
      await register({
        username: formData.username,
        password: formData.password
      });
      alert('ลงทะเบียนสำเร็จ! กรุณาล็อกอิน');
      navigate('/');
    } catch (err) {
      setError('ลงทะเบียนไม่สำเร็จ (Username นี้อาจถูกใช้แล้ว)');
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>ลงทะเบียนผู้ใช้งานใหม่</h2>
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">ชื่อผู้ใช้ (Username)</label>
            <input 
              name="username" 
              id="username"
              placeholder="กรอกชื่อผู้ใช้" 
              onChange={handleChange} 
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">รหัสผ่าน (Password)</label>
            <input 
              name="password" 
              id="password"
              type="password" 
              placeholder="กรอกรหัสผ่าน" 
              onChange={handleChange} 
            />
          </div>
          <button type="submit" className="login-button">ลงทะเบียน</button>
          <p style={{textAlign: 'center', marginTop: '1rem'}}>
            มีบัญชีอยู่แล้ว? <Link to="/">เข้าสู่ระบบที่นี่</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
export default RegisterPage;