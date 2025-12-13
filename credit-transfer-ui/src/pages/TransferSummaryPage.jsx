// src/pages/TransferSummaryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTransferRequestDetail, downloadTransferReport } from '../services/api';
import './TransferSummaryPage.css';

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

  if (!request) return <div className="loading">กำลังโหลดข้อมูล...</div>;

  const approvedItems = request.items.filter(item => item.status === 'approved');

  return (
    <div className="ts-container">

      {/* Header */}
      <header className="ts-header">
        <h1>สรุปผลการเทียบโอนรายวิชา</h1>
        <Link to="/faculty/history" className="ts-backlink">
          ← กลับหน้าประวัติ
        </Link>
      </header>

      {/* Main Content */}
      <main className="ts-main">

        <div className="ts-card">

          {/* Header Section */}
          <div className="ts-card-top">
            <div className="ts-student-info">
              <h2>{request.student.first_name} {request.student.last_name}</h2>
              <p>รหัสนักศึกษา: {request.student.profile?.student_id}</p>
              <p>หลักสูตรเป้าหมาย: {request.target_curriculum?.name}</p>
            </div>

            <button className="ts-btn pdf" onClick={handleDownloadPDF}>
              🖨️ พิมพ์ PDF
            </button>
          </div>

          {/* Table */}
          <div className="ts-table-container">
            <h3>รายวิชาที่ผ่านการอนุมัติเทียบโอน</h3>

            <table className="ts-table">
              <thead>
                <tr>
                  <th>รายวิชาต้นทาง</th>
                  <th className="ts-arrow-col">→</th>
                  <th>รายวิชาปลายทาง (เทียบโอน)</th>
                </tr>
              </thead>
              <tbody>
                {approvedItems.length > 0 ? (
                  approvedItems.map(item => (
                    <tr key={item.id}>
                      <td>
                        <div className="ts-code">{item.original_course.course_code}</div>
                        <div>{item.original_course.course_name_th}</div>
                        <div className="ts-subtext">
                          หน่วยกิต: {item.original_course.credits} | เกรด: {item.grade}
                        </div>
                      </td>

                      <td className="ts-arrow">✓</td>

                      <td className="ts-target">
                        <div className="ts-code">
                          {item.aicomparisonresult?.suggested_course.course_code}
                        </div>
                        <div>{item.aicomparisonresult?.suggested_course.course_name_th}</div>
                        <div className="ts-subtext">
                          หน่วยกิต: {item.aicomparisonresult?.suggested_course.credits}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="ts-empty">
                      ไม่มีรายวิชาที่ผ่านการอนุมัติ
                    </td>
                  </tr>
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
