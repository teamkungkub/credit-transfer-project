// src/pages/ApprovalResultPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  getTransferRequestDetail, 
  downloadTransferReport,
  downloadEvaluationReport
} from '../services/api';
import './ApprovalResultPage.css';

function ApprovalResultPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getTransferRequestDetail(id)
      .then(res => setRequest(res.data))
      .catch(err => console.error("Failed to load request", err));
  }, [id]);

  const downloadPDF = async (apiFunction, fileNamePrefix) => {
    try {
      const response = await apiFunction(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${fileNamePrefix}_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด PDF (กรุณาล็อกอินใหม่หาก Token หมดอายุ)");
    }
  };

  if (!request) {
    return (
      <div className="loading-container">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  return (
    <div className="approval-container">
      {/* Top bar */}
      <header className="approval-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate(-1)} title="ย้อนกลับ">
            ←
          </button>
          <h1>สรุปผลการพิจารณา</h1>
        </div>
        <div className="header-right">
          <Link to="/faculty/dashboard" className="link-dashboard">กลับหน้าหลัก</Link>
        </div>
      </header>

      {/* Content */}
      <main className="approval-main">
        <div className="card request-card">
          <div className="card-header">
            <h2>คำร้อง #{request.id}</h2>
          </div>
          <div className="card-body">
            <section className="student-info">
              <h3>ข้อมูลนักศึกษา</h3>
              <p><strong>ชื่อ-นามสกุล:</strong> {request.student.first_name} {request.student.last_name}</p>
              <p><strong>รหัสนักศึกษา:</strong> {request.student.profile?.student_id || '-'}</p>
              <p><strong>หลักสูตร:</strong> {request.target_curriculum?.name || '-'}</p>
            </section>

            <hr />

            <section className="course-comparison">
              <h3>สรุปรายการวิชา</h3>
              <div className="table-wrapper">
                <table className="course-table">
                  <thead>
                    <tr>
                      <th>วิชาเดิม → วิชาเทียบ</th>
                      <th className="text-center">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {request.items.map(item => (
                      <tr key={item.id}>
                        <td>
                          <div className="orig-course">
                            {item.original_course.course_code} {item.original_course.course_name_th}
                          </div>
                          <div className="arrow">⬇️ เทียบเป็น</div>
                          <div className="new-course">
                            {item.aicomparisonresult?.suggested_course.course_code} {item.aicomparisonresult?.suggested_course.course_name_th}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`status-tag ${item.status}`}>
                            {item.status === 'approved' ? 'อนุมัติ' : (item.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ')}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <div className="card-actions">
            <div className="btn-group">
              <button
                className="btn-secondary"
                onClick={() => downloadPDF(downloadTransferReport, 'transfer_report')}
              >
                🖨️ พิมพ์ PDF (แบบย่อ)
              </button>
              <button
                className="btn-info"
                onClick={() => downloadPDF(downloadEvaluationReport, 'transfer_evaluation')}
              >
                📄 พิมพ์แบบประเมิน (แบบเต็ม)
              </button>
            </div>

            <button className="btn-primary" onClick={() => navigate(-1)}>
              เสร็จสิ้น / ย้อนกลับ
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ApprovalResultPage;
