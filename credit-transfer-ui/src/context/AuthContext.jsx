// src/context/AuthContext.jsx
import { createContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode'; // <-- **แก้ไขที่นี่**

const AuthContext = createContext();
export default AuthContext;

const getInitialAuthToken = () => {
  const tokenString = localStorage.getItem('authToken');
  if (tokenString) {
    try {
      const tokens = JSON.parse(tokenString);
      jwtDecode(tokens.access); // <-- **แก้ไขที่นี่**
      return tokens;
    } catch (error) {
      localStorage.removeItem('authToken');
      return null;
    }
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [authToken, setAuthToken] = useState(getInitialAuthToken);
  const [user, setUser] = useState(() => authToken ? jwtDecode(authToken.access) : null); // <-- **แก้ไขที่นี่**
  const navigate = useNavigate();

  const loginUser = (tokens) => {
    setAuthToken(tokens);
    localStorage.setItem('authToken', JSON.stringify(tokens));
    const decodedToken = jwtDecode(tokens.access); // <-- **แก้ไขที่นี่**
    setUser(decodedToken);

    // 1. ถ้าชื่อเป็น 'admin' ให้ไปหน้า AdminPage
    if (decodedToken.is_staff) {
        navigate('/admin/dashboard'); // หรือ '/admin/dashboard' ตามที่คุณตั้ง
    } 
    // 2. ถ้าเป็นอาจารย์ (ชื่อมีคำว่า faculty) -> ไปหน้าตรวจสอบคำร้อง
    else if (decodedToken.username.includes('faculty')) {
        navigate('/faculty/dashboard');
    } 
    // 3. นอกนั้น (นักศึกษา) -> ไปหน้ายื่นคำร้อง
    else {
        navigate('/student/dashboard');
    }
  };

  const logoutUser = () => {
    setAuthToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    navigate('/');
  };

  const contextData = {
    user: user,
    authToken: authToken,
    loginUser: loginUser,
    logoutUser: logoutUser,
  };

  return (
    <AuthContext.Provider value={contextData}>
      {children}
    </AuthContext.Provider>
  );
};