// src/App.jsx
import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import PrivateRoute from './components/PrivateRoute';
import AdminPage from './pages/AdminPage';
import FacultyHistoryPage from './pages/FacultyHistoryPage';
import ApprovalResultPage from './pages/ApprovalResultPage';
import TransferSummaryPage from './pages/TransferSummaryPage';
import OfficialReportPage from './pages/OfficialReportPage';
import DataManagementPage from './pages/DataManagementPage';

function App() {
  return (
    <Routes>
      {/* --- Public Routes --- */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} /> {/* เผื่อคนพิมพ์ /login เอง */}
      <Route path="/register" element={<RegisterPage />} />
      
      {/* --- Student Routes --- */}
      {/* แก้ path เป็น /student เฉยๆ เพื่อให้ตรงกับ LoginPage */}
      <Route
        path="/student"
        element={
          <PrivateRoute>
            <StudentDashboard />
          </PrivateRoute>
        }
      />
      
      {/* --- Faculty Routes --- */}
      {/* แก้ path เป็น /faculty เฉยๆ เพื่อให้ตรงกับ LoginPage */}
      <Route
        path="/faculty"
        element={
          <PrivateRoute>
            <FacultyDashboard />
          </PrivateRoute>
        }
      />

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
        element={
          <PrivateRoute>
            <ApprovalResultPage />
          </PrivateRoute>
        }
      />
      
      <Route
        path="/faculty/request/:id/summary"
        element={
          <PrivateRoute>
            <TransferSummaryPage />
          </PrivateRoute>
        }
      />

      <Route
        path="/faculty/request/:id/official-report"
        element={
          <PrivateRoute>
            <OfficialReportPage />
          </PrivateRoute>
        }
      />

      {/* --- Admin Routes --- */}
      {/* ส่วน DataManagementPage ที่ Import มาแต่ลืมใส่ ผมใส่ไว้ให้ใน Admin นะครับ */}
      <Route 
        path="/admin/data-management" 
        element={
          <PrivateRoute>
            <DataManagementPage />
          </PrivateRoute>
        } 
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