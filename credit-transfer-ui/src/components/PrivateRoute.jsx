// src/components/PrivateRoute.jsx
import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { authToken } = useContext(AuthContext);

  // ถ้ามี Token (ล็อกอินแล้ว) ให้แสดงหน้าที่ต้องการ
  // ถ้าไม่มี ให้เด้งกลับไปหน้า Login
  return authToken ? children : <Navigate to="/" />;
};

export default PrivateRoute;