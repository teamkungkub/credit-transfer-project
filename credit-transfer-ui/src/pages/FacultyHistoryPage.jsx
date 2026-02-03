// src/pages/FacultyHistoryPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { getRequestHistory, deleteTransferRequest } from '../services/api';
import AuthContext from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import './FacultyHistoryPage.css';

function FacultyHistoryPage() {
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, total: 0 });
  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchHistory = () => {
    getRequestHistory()
      .then(response => {
        setHistory(response.data);

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

  const handleDelete = async (requestId) => {
    if (window.confirm("คุณต้องการลบคำร้องนี้หรือไม่? การลบไม่สามารถย้อนกลับได้")) {
      try {
        await deleteTransferRequest(requestId);
        alert("ลบคำร้องสำเร็จ");
        fetchHistory();
      } catch (error) {
        alert("เกิดข้อผิดพลาดในการลบ");
      }
    }
  };

  return (
    <div className="faculty-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <h2 className="sidebar-title">ระบบเทียบโอน</h2>
        <nav>
          <Link to="/faculty/" className="sidebar-link">ย้อนกลับหน้าตรวจสอบ</Link>
        </nav>
        <div className="sidebar-footer">
          <p className="staff-name">👋 {user?.username || "เจ้าหน้าที่"}</p>
          <button onClick={logoutUser} className="logout-btn">ออกจากระบบ</button>
        </div>
      </aside>

      {/* Content */}
      <main className="main-content">
        <h1 className="page-title">ประวัติการเทียบโอนทั้งหมด</h1>

        {/* Stats */}
        <div className="stats-container">
          <div className="stats-card stats-total">
            <h3>คำร้องทั้งหมด</h3>
            <p>{stats.total}</p>
            <span>รายการ</span>
          </div>

          <div className="stats-card stats-approved">
            <h3>อนุมัติแล้ว</h3>
            <p>{stats.approved}</p>
            <span>รายการ</span>
          </div>

          <div className="stats-card stats-rejected">
            <h3>ปฏิเสธ</h3>
            <p>{stats.rejected}</p>
            <span>รายการ</span>
          </div>
        </div>

        <h2 className="section-title">รายการประวัติย้อนหลัง</h2>

        <div className="history-list">
          {history.length === 0 ? (
            <p className="no-history">ยังไม่มีประวัติการเทียบโอน</p>
          ) : (
            history.map(req => (
              <div key={req.id} className="history-card">
                <div className="history-left">
                  <h3>{req.student.first_name} {req.student.last_name}</h3>
                  <p className="meta">
                    รหัสนักศึกษา: {req.student.profile?.student_id || 'N/A'}  
                    | วันที่: {new Date(req.created_at).toLocaleDateString('th-TH')}
                  </p>

                  <div className="status-box">
                    <span className={`status-tag ${req.status}`}>
                      {req.status === "approved" ? "อนุมัติแล้ว" : "ปฏิเสธ"}
                    </span>
                  </div>
                </div>

                <div className="history-actions">
                  <button
                    className="btn-blue"
                    onClick={() => navigate(`/faculty/request/${req.id}/result`)}
                  >
                    ดู / พิมพ์ PDF
                  </button>

                  <button
                    className="btn-blue"
                    onClick={() => navigate(`/faculty/request/${req.id}/summary`)}
                  >
                    ดูสรุปผล / พิมพ์ PDF
                  </button>

                  <button
                    className="btn-red"
                    onClick={() => handleDelete(req.id)}
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
