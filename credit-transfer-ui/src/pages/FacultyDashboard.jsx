// src/pages/FacultyDashboard.jsx
import React, { useState, useEffect, useContext } from 'react';
import { 
  getPendingRequests, 
  updateRequestItemStatus, 
  recalculateScore, 
  downloadTransferReport 
} from '../services/api';
import AuthContext from '../context/AuthContext';
import './FacultyDashboard.css';
import { Link, useNavigate } from 'react-router-dom';

// --- Component ช่วยไฮไลท์คำที่เหมือนกันในคำอธิบายรายวิชา ---
const HighlightedText = ({ text, compareWith }) => {
  if (!text) return <p className="desc-text">-ไม่มีข้อมูล-</p>;
  if (!compareWith) return <p className="desc-text">{text}</p>;

  // 1. แยกคำจากข้อความคู่เทียบ (เพื่อเอามาเป็นคีย์เวิร์ด)
  // ตัดตัวอักษรพิเศษออก และแยกด้วยช่องว่าง
  const compareWords = new Set(
    compareWith.replace(/[^\w\sก-๙]/g, '').toLowerCase().split(/\s+/)
  );

  // 2. แยกคำจากข้อความหลักที่จะแสดง
  const words = text.split(/(\s+)/); 

  return (
    <div className="desc-text-container">
      {words.map((word, index) => {
        const cleanWord = word.replace(/[^\w\sก-๙]/g, '').toLowerCase();
        // ไฮไลท์ถ้าคำยาวกว่า 1 ตัวอักษร และมีอยู่ในอีกข้อความ
        if (cleanWord.length > 1 && compareWords.has(cleanWord)) {
          return <span key={index} className="highlight-word">{word}</span>;
        }
        return <span key={index}>{word}</span>;
      })}
    </div>
  );
};

function FacultyDashboard() {
  const [requests, setRequests] = useState([]);
  const { user, logoutUser } = useContext(AuthContext);
  const navigate = useNavigate();

  // State สำหรับ Modal
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  const fetchRequests = () => {
    getPendingRequests()
      .then(response => {
        const data = response.data.map(req => ({
          ...req,
          items: req.items.map(item => ({...item, initialStatus: item.status}))
        }));
        setRequests(data);
      })
      .catch(error => console.error("Failed to fetch requests", error));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // --- ฟังก์ชันเปิดหน้าต่างเปรียบเทียบคำอธิบาย ---
  const openReasonModal = (item) => {
    setModalContent({
        original: item.original_course,
        suggested: item.aicomparisonresult.suggested_course,
        score: item.aicomparisonresult.similarity_score,
        reason: item.aicomparisonresult.explanation
    });
    setShowModal(true);
  };

  const handleItemStatusChange = (reqId, itemId, newStatus) => {
    setRequests(prevRequests => 
      prevRequests.map(req => {
        if (req.id === reqId) {
          const updatedItems = req.items.map(item => 
            item.id === itemId ? { ...item, status: newStatus } : item
          );
          return { ...req, items: updatedItems };
        }
        return req;
      })
    );
  };

  const handleCourseSelectionChange = async (reqId, itemId, originalCourseId, newTargetCourseId) => {
    // ... (Logic การเปลี่ยนวิชา - ถ้ามี) ...
    // (ถ้าไม่ได้ใช้ฟังก์ชันเปลี่ยนวิชาในหน้านี้ สามารถละไว้ได้ หรือใช้โค้ดเดิม)
  };

  const handleSaveChanges = async (request) => {
    const changedItems = request.items.filter(item => item.status !== item.initialStatus);
    if (changedItems.length === 0) {
      alert("กรุณาเลือกสถานะ (อนุมัติ/ปฏิเสธ) ก่อนบันทึก");
      return;
    }

    try {
      await Promise.all(
        changedItems.map(item => updateRequestItemStatus(item.id, item.status))
      );
      navigate(`/faculty/request/${request.id}/result`);
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    }
  };

  const handleDownloadPDF = async (requestId) => {
     // ... (Logic PDF เดิม) ...
  };

  return (
    <div className="faculty-dashboard">
      <header className="dashboard-header">
        <h1>หน้าสำหรับเจ้าหน้าที่</h1>
        <div className="header-menu">
          <Link to="/faculty/history" style={{ marginRight: '15px', textDecoration: 'none', color: '#007bff', fontWeight: 'bold' }}>
            ดูประวัติคำร้อง
          </Link>
          <span className="user-info">สวัสดี, {user?.username || 'เจ้าหน้าที่'}</span>
          <button onClick={logoutUser} className="logout-button">ออกจากระบบ</button>
        </div>
      </header>

      <main className="dashboard-main">
        <h2>คำร้องที่รอการตรวจสอบ</h2>
        {requests.length === 0 ? (
          <p style={{textAlign: 'center', marginTop: '2rem', color: '#666'}}>ไม่มีคำร้องที่รอการตรวจสอบ</p>
        ) : (
          <div className="request-list">
            {requests.map(req => (
              <div key={req.id} className="request-card">
                <div className="request-card-header">
                  <div>
                    <h3>{req.student.first_name} {req.student.last_name}</h3>
                    <p className="student-info">รหัสนักศึกษา: {req.student.profile?.student_id || 'N/A'}</p>
                  </div>
                  <div className="request-date">{new Date(req.created_at).toLocaleString('th-TH')}</div>
                </div>
                <div className="request-card-body">
                  <p><strong>ต้องการเทียบโอนเข้าหลักสูตร:</strong> {req.target_curriculum?.name || 'ไม่ได้ระบุ'}</p>
                  
                  <table className="course-table">
                    <thead>
                      <tr>
                        <th style={{width: '30%'}}>รายวิชาและสถาบันเดิม</th>
                        <th style={{width: '35%'}}>รายวิชาที่ AI แนะนำ</th>
                        <th style={{width: '15%', textAlign: 'center'}}>ความสอดคล้อง</th>
                        <th style={{width: '20%'}}>การตัดสินใจ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.items.map(item => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.original_course.course_code}</strong><br/>
                            {item.original_course.course_name_th}
                            <br/><small>จาก: {item.original_course.institution.name}</small>
                            <br/><small>เกรด: {item.grade}</small>
                          </td>
                          <td>
                             {item.aicomparisonresult ? (
                                <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between'}}>
                                    <div>
                                        <strong>{item.aicomparisonresult.suggested_course.course_code}</strong><br/>
                                        {item.aicomparisonresult.suggested_course.course_name_th}
                                    </div>
                                    {/* ปุ่มดูรายละเอียดคำอธิบายรายวิชา */}
                                    <button 
                                        onClick={() => openReasonModal(item)}
                                        className="btn-info-icon"
                                        title="คลิกเพื่อดูคำอธิบายรายวิชาเปรียบเทียบ"
                                    >
                                        ℹ️
                                    </button>
                                </div>
                             ) : ( <span className="no-result">-ไม่พบผลการเปรียบเทียบ-</span> )}
                          </td>
                          <td className="score-cell">
                            {item.aicomparisonresult ? (
                                <span style={{ 
                                    color: item.aicomparisonresult.similarity_score > 0.8 ? 'green' : 
                                           item.aicomparisonresult.similarity_score > 0.5 ? 'orange' : 'red' 
                                }}>
                                    {`${(item.aicomparisonresult.similarity_score * 100).toFixed(2)}%`}
                                </span>
                            ) : 'N/A'}
                          </td>
                          <td>
                            <select 
                              value={item.status} 
                              onChange={(e) => handleItemStatusChange(req.id, item.id, e.target.value)}
                              className="status-select"
                              style={{
                                  borderColor: item.status === 'approved' ? 'green' : 
                                               item.status === 'rejected' ? 'red' : '#ccc',
                                  color: item.status === 'approved' ? 'green' : 
                                         item.status === 'rejected' ? 'red' : 'black'
                              }}
                            >
                              <option value="pending">รอตรวจสอบ</option>
                              <option value="approved">อนุมัติ</option>
                              <option value="rejected">ปฏิเสธ</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="request-card-actions">
                  <button onClick={() => handleSaveChanges(req)} className="btn btn-primary">บันทึกการเปลี่ยนแปลง</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- Modal แสดงเปรียบเทียบคำอธิบายรายวิชา --- */}
      {showModal && modalContent && (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>เปรียบเทียบคำอธิบายรายวิชา (Course Description)</h3>
                    <span className="modal-score">
                        ความสอดคล้อง: {(modalContent.score * 100).toFixed(2)}%
                    </span>
                </div>
                
                <div className="comparison-grid">
                    {/* กล่องซ้าย: วิชาเดิม */}
                    <div className="course-box original">
                        <div className="box-header">
                            <h4>{modalContent.original.course_code} (สถาบันเดิม)</h4>
                            <span>{modalContent.original.course_name_th}</span>
                        </div>
                        <div className="box-body">
                            {/* แสดงคำอธิบายพร้อมไฮไลท์ */}
                            <HighlightedText 
                                text={modalContent.original.course_description} 
                                compareWith={modalContent.suggested.course_description} 
                            />
                        </div>
                    </div>

                    {/* กล่องขวา: วิชาเป้าหมาย */}
                    <div className="course-box suggested">
                        <div className="box-header">
                            <h4>{modalContent.suggested.course_code} (เป้าหมาย)</h4>
                            <span>{modalContent.suggested.course_name_th}</span>
                        </div>
                        <div className="box-body">
                            {/* แสดงคำอธิบายพร้อมไฮไลท์ */}
                            <HighlightedText 
                                text={modalContent.suggested.course_description} 
                                compareWith={modalContent.original.course_description} 
                            />
                        </div>
                    </div>
                </div>
                
                <div className="ai-reason-box">
                    <h4>🤖 บทวิเคราะห์จาก AI:</h4>
                    <p>{modalContent.reason}</p>
                </div>

                <div style={{textAlign: 'right', marginTop: '1.5rem'}}>
                    <button onClick={() => setShowModal(false)} className="btn btn-secondary">ปิดหน้าต่าง</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

export default FacultyDashboard;