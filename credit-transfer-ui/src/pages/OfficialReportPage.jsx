// src/pages/OfficialReportPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTransferRequestDetail } from '../services/api';
import './OfficialReportPage.css';

function OfficialReportPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);

  useEffect(() => {
    getTransferRequestDetail(id)
      .then(res => setRequest(res.data))
      .catch(err => console.error("Failed to load request", err));
  }, [id]);

  if (!request) return <div style={{padding:'20px'}}>กำลังโหลดข้อมูล...</div>;

  // กรองเฉพาะวิชาที่อนุมัติ
  const approvedItems = request.items.filter(item => item.status === 'approved');

  return (
    <div>
      {/* --- ปุ่มควบคุม (จะหายไปตอนปริ้น) --- */}
      <div className="print-controls">
        <Link to={`/faculty/request/${id}/result`} className="btn-back">⬅️ ย้อนกลับ</Link>
        <button onClick={() => window.print()} className="btn-print">🖨️ สั่งพิมพ์ / บันทึกเป็น PDF</button>
      </div>

      {/* --- หน้ากระดาษ A4 --- */}
      <div className="report-container">
        
        {/* หัวกระดาษ */}
        <div className="report-header">
            <h3>แบบประเมินผลการเทียบโอนผลการเรียน</h3>
            <h4>คณะอุตสาหกรรมและเทคโนโลยี มหาวิทยาลัยเทคโนโลยีราชมงคลอีสาน วิทยาเขตสกลนคร</h4>
        </div>

        {/* ข้อมูลนักศึกษา */}
        <div style={{marginBottom: '20px', lineHeight: '1.8'}}>
            <div>
                <strong>ชื่อ-สกุล:</strong> {request.student.first_name} {request.student.last_name} &nbsp;&nbsp;
                <strong>รหัสนักศึกษา:</strong> {request.student.profile?.student_id || '-'}
            </div>
            <div>
                <strong>หลักสูตรเทียบเข้า:</strong> {request.target_curriculum?.name}
            </div>
        </div>

        {/* ตารางข้อมูล */}
        <table className="report-table">
            <thead>
                <tr>
                    <th colSpan="4" style={{width: '45%'}}>รายวิชาที่นำมาเทียบโอน (ต้นทาง)</th>
                    <th colSpan="4" style={{width: '45%'}}>รายวิชาที่เทียบโอนในหลักสูตร (เป้าหมาย)</th>
                    <th colSpan="1" style={{width: '10%'}}>ผลการพิจารณา</th>
                </tr>
                <tr>
                    <th style={{width: '10%'}}>รหัสวิชา</th>
                    <th style={{width: '25%'}}>ชื่อวิชา</th>
                    <th style={{width: '5%'}}>นก.</th>
                    <th style={{width: '5%'}}>เกรด</th>
                    
                    <th style={{width: '10%'}}>รหัสวิชา</th>
                    <th style={{width: '25%'}}>ชื่อวิชา</th>
                    <th style={{width: '5%'}}>นก.</th>
                    <th style={{width: '5%'}}>สภาพ</th> <th>ผ่าน</th>
                </tr>
            </thead>
            <tbody>
                {approvedItems.map((item, index) => (
                    <tr key={item.id}>
                        {/* ฝั่งซ้าย: วิชาต้นทาง */}
                        <td class="text-center">{item.original_course.course_code}</td>
                        <td class="text-left">{item.original_course.course_name_th}</td>
                        <td class="text-center">{item.original_course.credits}</td>
                        <td class="text-center">{item.grade}</td>

                        {/* ฝั่งขวา: วิชาเป้าหมาย (AI แนะนำ) */}
                        <td class="text-center">{item.aicomparisonresult?.suggested_course.course_code}</td>
                        <td class="text-left">{item.aicomparisonresult?.suggested_course.course_name_th}</td>
                        <td class="text-center">{item.aicomparisonresult?.suggested_course.credits}</td>
                        <td class="text-center">-</td> {/* ช่องสภาพวิชา (ยังไม่มีข้อมูล) */}

                        {/* ผลการพิจารณา */}
                        <td class="text-center">✓</td>
                    </tr>
                ))}
                
                {/* เติมแถวว่างให้เต็มหน้า (Optional) */}
                {[...Array(5)].map((_, i) => (
                    <tr key={`empty-${i}`}>
                        <td style={{height: '25px'}}></td><td></td><td></td><td></td>
                        <td></td><td></td><td></td><td></td>
                        <td></td>
                    </tr>
                ))}
            </tbody>
        </table>

        {/* ส่วนลายเซ็น */}
        <div className="signatures-section">
            <div className="sig-box">
                <div className="sig-line"></div>
                <div>(.......................................................)</div>
                <div>ประธานกรรมการบริหารหลักสูตร</div>
            </div>
            <div className="sig-box">
                <div className="sig-line"></div>
                <div>(.......................................................)</div>
                <div>หัวหน้าสาขาวิชา</div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default OfficialReportPage;