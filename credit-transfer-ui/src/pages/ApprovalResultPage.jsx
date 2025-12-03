// src/pages/ApprovalResultPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
    getTransferRequestDetail, 
    downloadTransferReport,     // ปริ้นแบบย่อ
    downloadEvaluationReport    // ปริ้นแบบเต็ม (แนวนอน) <-- Import เพิ่ม
} from '../services/api';
import './FacultyDashboard.css';

function ApprovalResultPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getTransferRequestDetail(id)
      .then(res => setRequest(res.data))
      .catch(err => console.error("Failed to load request", err));
  }, [id]);

  // ฟังก์ชันสำหรับดาวน์โหลด PDF ทั่วไป (Helper Function)
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

  if (!request) return <div style={{padding: '2rem', textAlign: 'center'}}>กำลังโหลดข้อมูล...</div>;

  return (
    <div className="faculty-dashboard">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
                onClick={() => navigate(-1)} 
                style={{ 
                    background: 'none', border: 'none', color: '#007bff', 
                    cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' 
                }}
                title="ย้อนกลับ"
            >
                &#8592;
            </button>
            <h1>สรุปผลการพิจารณา</h1>
        </div>
        
        <div className="header-menu">
          <Link to="/faculty/dashboard" style={{ textDecoration: 'none', color: '#666' }}>กลับหน้าหลัก</Link>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="request-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div style={{ backgroundColor: '#f8f9fa', color: '#333', padding: '1rem', borderRadius: '8px 8px 0 0', borderBottom: '1px solid #e0e0e0', textAlign: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem' }}>รายละเอียดคำร้อง #{request.id}</h2>
          </div>
          
          <div className="request-card-body">
            <h3>ข้อมูลนักศึกษา</h3>
            <p><strong>ชื่อ-นามสกุล:</strong> {request.student.first_name} {request.student.last_name}</p>
            <p><strong>รหัสนักศึกษา:</strong> {request.student.profile?.student_id}</p>
            <p><strong>หลักสูตร:</strong> {request.target_curriculum?.name}</p>

            <hr style={{ margin: '1.5rem 0', border: '0', borderTop: '1px solid #eee' }} />

            <h3>สรุปรายการวิชา</h3>
            <table className="course-table">
              <thead>
                <tr>
                  <th>วิชาเดิม -&gt; วิชาเทียบ</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {request.items.map(item => (
                  <tr key={item.id}>
                    <td>
                        <div>{item.original_course.course_code} {item.original_course.course_name_th}</div>
                        <div style={{ color: '#666', fontSize: '0.9rem' }}>⬇️ เทียบเป็น</div>
                        <div style={{ fontWeight: 'bold' }}>
                            {item.aicomparisonresult?.suggested_course.course_code} {item.aicomparisonresult?.suggested_course.course_name_th}
                        </div>
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{
                        fontWeight: 'bold',
                        padding: '5px 10px',
                        borderRadius: '15px',
                        backgroundColor: item.status === 'approved' ? '#d4edda' : (item.status === 'rejected' ? '#f8d7da' : '#fff3cd'),
                        color: item.status === 'approved' ? '#155724' : (item.status === 'rejected' ? '#721c24' : '#856404')
                      }}>
                        {item.status === 'approved' ? 'อนุมัติ' : (item.status === 'rejected' ? 'ปฏิเสธ' : 'รอตรวจสอบ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="request-card-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '2rem', alignItems: 'center' }}>
            
            {/* กลุ่มปุ่มพิมพ์ */}
            <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                    onClick={() => downloadPDF(downloadTransferReport, 'transfer_report')} 
                    className="btn"
                    style={{ backgroundColor: '#6c757d', color: 'white', padding: '0.8rem 1.5rem', fontSize: '1rem' }}
                >
                    🖨️ พิมพ์ PDF (แบบย่อ)
                </button>

                <button 
                    onClick={() => downloadPDF(downloadEvaluationReport, 'transfer_evaluation')} 
                    className="btn"
                    style={{ backgroundColor: '#17a2b8', color: 'white', padding: '0.8rem 1.5rem', fontSize: '1rem' }}
                >
                    📄 พิมพ์แบบประเมิน (แบบเต็ม)
                </button>
            </div>

            {/* ปุ่มย้อนกลับ */}
            <button 
                onClick={() => navigate(-1)} 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', padding: '0.8rem 3rem', fontSize: '1.1rem', marginTop: '1rem' }}
            >
                เสร็จสิ้น / ย้อนกลับ
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ApprovalResultPage;