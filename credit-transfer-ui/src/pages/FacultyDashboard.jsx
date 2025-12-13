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

// --- Component ไฮไลท์คำที่ตรงกัน ---
const HighlightedText = ({ text, compareWith }) => {
  if (!text) return <p className="desc-text">-ไม่มีข้อมูล-</p>;
  if (!compareWith) return <p className="desc-text">{text}</p>;

  const compareWords = new Set(
    compareWith.replace(/[^\w\sก-๙]/g, '').toLowerCase().split(/\s+/)
  );

  const words = text.split(/(\s+)/); 

  return (
    <div className="desc-text-container">
      {words.map((word, index) => {
        const clean = word.replace(/[^\w\sก-๙]/g, '').toLowerCase();
        if (clean.length > 1 && compareWords.has(clean)) {
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

  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState(null);

  const fetchRequests = () => {
    getPendingRequests()
      .then(response => {
        const data = response.data.map(req => ({
          ...req,
          items: req.items.map(item => ({
            ...item,
            initialStatus: item.status
          }))
        }));
        setRequests(data);
      })
      .catch(error => console.error("Failed to fetch requests", error));
  };

  useEffect(() => {
    fetchRequests();
  }, []);

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
    setRequests(prev =>
      prev.map(req => {
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

  const handleSaveChanges = async (request) => {
    const changedItems = request.items.filter(item => item.status !== item.initialStatus);
    if (changedItems.length === 0) {
      alert("กรุณาเลือกสถานะก่อนบันทึก");
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

  return (
    <div className="faculty-dashboard">

      {/* ===== HEADER ===== */}
     <header className="fd-header glass-blue shadow-md">

  {/* LEFT AREA (Logo + Title) */}
  <div className="fd-header-left">
    <img src="/logo.png" className="fd-logo" />
    <h1 className="fd-title">ระบบตรวจสอบคำร้องเทียบโอน</h1>
  </div>

  {/* RIGHT AREA */}
  <div className="fd-header-right">
    <Link to="/faculty/history" className="fd-history-link">
      ดูประวัติคำร้อง
    </Link>

    <span className="fd-user">
      👤 {user?.username || 'เจ้าหน้าที่'}
    </span>

    <button className="fd-logout-btn" onClick={logoutUser}>
      ออกจากระบบ
    </button>
  </div>

</header>


      {/* ===== MAIN ===== */}
      <main className="fd-main">
        <h2 className="fd-section-title">คำร้องที่รอการตรวจสอบ</h2>

        {requests.length === 0 ? (
          <div className="fd-empty">ไม่มีคำร้องที่รอการตรวจสอบ</div>
        ) : (
          <div className="fd-request-list">
            {requests.map(req => (
              <div key={req.id} className="fd-request-card glass-white">

                {/* = Header = */}
                <div className="fd-request-header">
                  <div>
                    <h3 className="fd-student-name">
                      {req.student.first_name} {req.student.last_name}
                    </h3>
                    <p className="fd-student-info">
                      รหัสนักศึกษา: {req.student.profile?.student_id || 'N/A'}
                      <span className="fd-major">
                        สาขาวิชา: {req.student.profile?.major || '-'}
                      </span>
                    </p>
                  </div>

                  <div className="fd-date">
                    {new Date(req.created_at).toLocaleString('th-TH')}
                  </div>
                </div>

                {/* = Body = */}
                <div className="fd-request-body">
                  <p className="fd-target">
                    <strong>หลักสูตรที่ต้องการเทียบโอน:</strong> {req.target_curriculum?.name || 'ไม่ได้ระบุ'}
                  </p>

                  {/* หลักฐาน */}
                  {req.evidence_file && (
                    <div className="fd-evidence">
                      <strong>หลักฐานแนบ:</strong>
                      <a 
                        href={req.evidence_file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fd-evidence-link"
                      >
                        📄 เปิดดูหลักฐาน
                      </a>
                    </div>
                  )}

                  {/* ตารางรายการวิชา */}
                  <table className="fd-table">
                    <thead>
                      <tr>
                        <th>รายวิชาเดิม</th>
                        <th>รายวิชาที่ AI แนะนำ</th>
                        <th>ความสอดคล้อง</th>
                        <th>สถานะ</th>
                      </tr>
                    </thead>

                    <tbody>
                      {req.items.map(item => (
                        <tr key={item.id}>
                          <td>
                            <div className="fd-course-info">
                              <strong>{item.original_course.course_code}</strong>
                              <div>{item.original_course.course_name_th}</div>
                              <small>จาก: {item.original_course.institution.name}</small>
                              <small>เกรด: {item.grade}</small>
                            </div>
                          </td>

                          <td>
                            {item.aicomparisonresult ? (
                              <div className="fd-ai-suggestion">
                                <div>
                                  <strong>{item.aicomparisonresult.suggested_course.course_code}</strong><br/>
                                  {item.aicomparisonresult.suggested_course.course_name_th}
                                </div>

                                <button 
                                  className="fd-info-btn"
                                  onClick={() => openReasonModal(item)}
                                >
                                  ℹ️
                                </button>
                              </div>
                            ) : (
                              <span className="fd-no-ai">-ไม่มีผลลัพธ์-</span>
                            )}
                          </td>

                          <td className="fd-score-cell">
                            {item.aicomparisonresult ? (
                              <span 
                                className={`fd-score ${
                                  item.aicomparisonresult.similarity_score > 0.8
                                    ? "score-green"
                                    : item.aicomparisonresult.similarity_score > 0.5
                                    ? "score-yellow"
                                    : "score-red"
                                }`}
                              >
                                {(item.aicomparisonresult.similarity_score * 100).toFixed(2)}%
                              </span>
                            ) : "N/A"}
                          </td>

                          <td>
                            <select
                              value={item.status}
                              onChange={(e) =>
                                handleItemStatusChange(req.id, item.id, e.target.value)
                              }
                              className="fd-status-select"
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

                {/* = Footer = */}
                <div className="fd-request-footer">
                  <button 
                    className="fd-save-btn"
                    onClick={() => handleSaveChanges(req)}
                  >
                    บันทึกการเปลี่ยนแปลง
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      {/* ===== MODAL ===== */}
      {showModal && modalContent && (
        <div className="modal-overlay">
          <div className="modal-content glass-white">

            <div className="modal-header">
              <h3>เปรียบเทียบคำอธิบายรายวิชา</h3>
              <span className="modal-score">
                ความสอดคล้อง: {(modalContent.score * 100).toFixed(2)}%
              </span>
            </div>

            <div className="comparison-grid">
              {/* เดิม */}
              <div className="course-box">
                <h4>{modalContent.original.course_code}</h4>
                <p>{modalContent.original.course_name_th}</p>
                <HighlightedText 
                  text={modalContent.original.course_description}
                  compareWith={modalContent.suggested.course_description}
                />
              </div>

              {/* เป้าหมาย */}
              <div className="course-box">
                <h4>{modalContent.suggested.course_code}</h4>
                <p>{modalContent.suggested.course_name_th}</p>
                <HighlightedText 
                  text={modalContent.suggested.course_description}
                  compareWith={modalContent.original.course_description}
                />
              </div>
            </div>

            <div className="ai-reason-box">
              <h4>🤖 บทวิเคราะห์จาก AI</h4>
              <p>{modalContent.reason}</p>
            </div>

            <div className="modal-footer">
              <button 
                onClick={() => setShowModal(false)}
                className="btn-close-modal"
              >
                ปิด
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default FacultyDashboard;
