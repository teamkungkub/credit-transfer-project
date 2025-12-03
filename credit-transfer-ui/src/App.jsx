// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import PrivateRoute from './components/PrivateRoute';
import AdminPage from './pages/AdminPage';
import FacultyHistoryPage from './pages/FacultyHistoryPage'; // <-- import ถูกต้อง
import ApprovalResultPage from './pages/ApprovalResultPage';
import TransferSummaryPage from './pages/TransferSummaryPage';
import OfficialReportPage from './pages/OfficialReportPage';
function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      
      <Route
        path="/student/dashboard"
        element={
          <PrivateRoute>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/faculty/dashboard"
        element={
          <PrivateRoute>
            <FacultyDashboard />
          </PrivateRoute>
        }
      />

      {/* --- เพิ่ม Route นี้เข้าไป --- */}
      <Route
        path="/faculty/history"
        element={
          <PrivateRoute>
            <FacultyHistoryPage />
          </PrivateRoute>
        }
      />
      <Route
    path="/faculty/request/:id/result"
    element={<PrivateRoute><ApprovalResultPage /></PrivateRoute>}
      />
      <Route
      path="/faculty/request/:id/summary"
      element={<PrivateRoute><TransferSummaryPage /></PrivateRoute>}
/>

          <Route
    path="/faculty/request/:id/official-report"
    element={<PrivateRoute><OfficialReportPage /></PrivateRoute>}
/>
   <Route 
        path="/admin/dashboard" 
        element={
          <PrivateRoute>
            <AdminPage />
          </PrivateRoute>
        } 
      />

    </Routes>

    
  );
}

export default App;