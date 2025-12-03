// src/pages/TransferSummaryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTransferRequestDetail, downloadTransferReport } from '../services/api';
import './FacultyDashboard.css';

function TransferSummaryPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);

  useEffect(() => {
    getTransferRequestDetail(id)
      .then(res => setRequest(res.data))
      .catch(err => console.error("Failed to load request", err));
  }, [id]);

  const handleDownloadPDF = async () => {
    try {
      const response = await downloadTransferReport(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `transfer_report_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      alert("เกิดข้อผิดพลาดในการดาวน์โหลด PDF");
    }
  };

  if (!request) return <div style={{padding: '2rem', textAlign: 'center'}}>กำลังโหลดข้อมูล...</div>;

  // กรองเฉพาะรายการที่อนุมัติแล้ว
  const approvedItems = request.items.filter(item => item.status === 'approved');

  return (
    <div className="faculty-dashboard">
      <header className="dashboard-header">
        <h1>สรุปผลการเทียบโอนรายวิชา</h1>
        <div className="header-menu">
          <Link to="/faculty/history" style={{ textDecoration: 'none', color: '#666' }}>กลับหน้าประวัติ</Link>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="request-card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <div className="request-card-header">
             <div>
                <h3>ผู้ยื่นคำร้อง: {request.student.first_name} {request.student.last_name}</h3>
                <p className="student-info">รหัสนักศึกษา: {request.student.profile?.student_id}</p>
                <p className="student-info">หลักสูตรเป้าหมาย: {request.target_curriculum?.name}</p>
             </div>
             {/* ปุ่มพิมพ์ PDF อยู่ข้างบนขวา คู่กับข้อมูลส่วนตัว */}
             <button 
                onClick={handleDownloadPDF} 
                className="btn"
                style={{ backgroundColor: '#6c757d', color: 'white', padding: '0.6rem 1.2rem', height: 'fit-content' }}
            >
                🖨️ พิมพ์ PDF
            </button>
          </div>

          <div className="request-card-body">
            <h3>รายวิชาที่ผ่านการอนุมัติเทียบโอน</h3>
            <table className="course-table" style={{ marginTop: '1rem' }}>
              <thead>
                <tr>
                  <th style={{ width: '45%', backgroundColor: '#e9ecef' }}>รายวิชาที่นำมาเทียบโอน (ต้นทาง)</th>
                  <th style={{ width: '10%', textAlign: 'center', backgroundColor: '#e9ecef' }}>➡️</th>
                  <th style={{ width: '45%', backgroundColor: '#d4edda' }}>รายวิชาที่เทียบโอนในหลักสูตร (ปลายทาง)</th>
                </tr>
              </thead>
              <tbody>
                {approvedItems.length > 0 ? (
                    approvedItems.map(item => (
                      <tr key={item.id}>
                        <td style={{ verticalAlign: 'top' }}>
                            <div style={{ fontWeight: 'bold' }}>{item.original_course.course_code}</div>
                            <div>{item.original_course.course_name_th}</div>
                            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                หน่วยกิต: {item.original_course.credits} | เกรด: {item.grade}
                            </div>
                        </td>
                        <td style={{ textAlign: 'center', verticalAlign: 'middle', fontSize: '1.5rem', color: '#28a745' }}>
                            ✓
                        </td>
                        <td style={{ verticalAlign: 'top', backgroundColor: '#f8fff9' }}>
                            <div style={{ fontWeight: 'bold' }}>{item.aicomparisonresult?.suggested_course.course_code}</div>
                            <div>{item.aicomparisonresult?.suggested_course.course_name_th}</div>
                             <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                หน่วยกิต: {item.aicomparisonresult?.suggested_course.credits}
                            </div>
                        </td>
                      </tr>
                    ))
                ) : (
                    <tr><td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>ไม่มีรายวิชาที่ผ่านการอนุมัติ</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default TransferSummaryPage;