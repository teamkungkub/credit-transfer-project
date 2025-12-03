// src/pages/FacultyHistoryPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { getRequestHistory, deleteTransferRequest } from '../services/api'; // Import delete
import AuthContext from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './FacultyDashboard.css';

function FacultyHistoryPage() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, total: 0 });
  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchHistory = () => {
    getRequestHistory()
      .then(response => {
        setHistory(response.data);
        
        // คำนวณสถิติ
        const approved = response.data.filter(req => req.status === 'approved').length;
        const rejected = response.data.filter(req => req.status === 'rejected').length;
        setStats({
            total: response.data.length,
            approved,
            rejected
        });
      })
      .catch(error => console.error("Failed to fetch history", error));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // --- ฟังก์ชันสำหรับลบคำร้อง ---
  const handleDelete = async (requestId) => {
    // แจ้งเตือนยืนยันก่อนลบ
    if (window.confirm("คุณแน่ใจหรือไม่ที่จะลบคำร้องนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
      try {
        await deleteTransferRequest(requestId);
        alert("ลบคำร้องเรียบร้อยแล้ว");
        fetchHistory(); // รีเฟรชข้อมูลใหม่
      } catch (error) {
        console.error("Failed to delete request", error);
        alert("เกิดข้อผิดพลาดในการลบคำร้อง");
      }
    }
  };

  return (
    <div className="faculty-dashboard">
      <header className="dashboard-header">
        <h1>ประวัติการเทียบโอนทั้งหมด</h1>
        <div className="header-menu">
          <Link to="/faculty/dashboard" style={{ textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            กลับไปหน้าตรวจสอบ
          </Link>
          <span className="user-info">สวัสดี, {user?.username || 'เจ้าหน้าที่'}</span>
          <button onClick={logoutUser} className="logout-button">ออกจากระบบ</button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* สรุปยอดรวม */}
        <div className="history-stats" style={{ display: 'flex', gap: '20px', marginBottom: '2rem' }}>
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '1.5rem', borderLeft: '5px solid #007bff' }}>
                <h3 style={{ margin: 0, color: '#666' }}>ดำเนินการแล้วทั้งหมด</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0', color: '#007bff' }}>{stats.total}</p>
                <small>คน</small>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '1.5rem', borderLeft: '5px solid #28a745' }}>
                <h3 style={{ margin: 0, color: '#666' }}>อนุมัติ</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0', color: '#28a745' }}>{stats.approved}</p>
                <small>คน</small>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center', padding: '1.5rem', borderLeft: '5px solid #dc3545' }}>
                <h3 style={{ margin: 0, color: '#666' }}>ปฏิเสธ</h3>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '10px 0 0 0', color: '#dc3545' }}>{stats.rejected}</p>
                <small>คน</small>
            </div>
        </div>

        <h2>รายการประวัติย้อนหลัง</h2>
        
        <div className="request-list">
          {history.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', marginTop: '2rem' }}>ยังไม่มีประวัติการเทียบโอน</p>
          ) : (
            history.map(req => (
              <div key={req.id} className="request-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
                {/* ข้อมูลฝั่งซ้าย */}
                <div>
                    <h3 style={{ margin: '0 0 5px 0' }}>{req.student.first_name} {req.student.last_name}</h3>
                    <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
                        รหัสนักศึกษา: {req.student.profile?.student_id || 'N/A'} | 
                        วันที่: {new Date(req.created_at).toLocaleDateString('th-TH')}
                    </p>
                    <div style={{ marginTop: '10px' }}>
                        สถานะ: 
                        <span style={{ 
                            marginLeft: '5px', 
                            fontWeight: 'bold', 
                            color: req.status === 'approved' ? 'green' : 'red',
                            padding: '2px 8px',
                            backgroundColor: req.status === 'approved' ? '#d4edda' : '#f8d7da',
                            borderRadius: '12px',
                            fontSize: '0.85rem'
                        }}>
                            {req.status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธ'}
                        </span>
                    </div>
                </div>

                {/* ปุ่มฝั่งขวา */}
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={() => navigate(`/faculty/request/${req.id}/result`)} 
                        className="btn btn-secondary"
                        style={{ backgroundColor: '#007bff' }}
                    >
                        ดู / พิมพ์ PDF
                    </button>
                    
                    <button 
                        onClick={() => navigate(`/faculty/request/${req.id}/summary`)}  // <-- แก้ไข URL ตรงนี้
                        className="btn btn-secondary"
                        style={{ backgroundColor: '#007bff' }}
                      >
                          ดูสรุปผล / พิมพ์ PDF
                    </button>


                    {/* --- ปุ่มลบ --- */}
                    <button 
                        onClick={() => handleDelete(req.id)} 
                        className="btn"
                        style={{ backgroundColor: '#dc3545', color: 'white' }}
                    >
                        ลบ
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export default FacultyHistoryPage;