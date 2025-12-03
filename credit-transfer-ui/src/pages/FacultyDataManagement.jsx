// src/pages/FacultyDataManagement.jsx
import React, { useState, useEffect, useContext } from 'react';
import { manageData } from '../services/api';
import AuthContext from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './FacultyDashboard.css';

function FacultyDataManagement() {
  const { user, logoutUser } = useContext(AuthContext);
  
  const [activeTab, setActiveTab] = useState('institutions'); 
  const [items, setItems] = useState([]);
  
  // State สำหรับฟอร์ม
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  // State สำหรับ Dropdown (ตัวเลือกต่างๆ)
  const [allInstitutions, setAllInstitutions] = useState([]);
  const [allCurriculums, setAllCurriculums] = useState([]);

  // โหลดข้อมูลหลักเมื่อเปลี่ยน Tab
  useEffect(() => {
    fetchData();
    // โหลดตัวเลือกมารอไว้เสมอ (สำหรับ Dropdown)
    manageData.getAll('institutions').then(res => setAllInstitutions(res.data));
    manageData.getAll('curriculums').then(res => setAllCurriculums(res.data));
  }, [activeTab]);

  const fetchData = () => {
    manageData.getAll(activeTab)
      .then(res => setItems(res.data))
      .catch(err => console.error("Error loading data", err));
  };

  const handleDelete = async (id) => {
    if (window.confirm("ยืนยันการลบข้อมูลนี้? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
      try {
        await manageData.delete(activeTab, id);
        alert("ลบข้อมูลเรียบร้อย");
        fetchData();
      } catch (err) {
        alert("ลบไม่สำเร็จ (ข้อมูลอาจถูกใช้งานอยู่ในคำร้องอื่น)");
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await manageData.update(activeTab, formData.id, formData);
      } else {
        await manageData.create(activeTab, formData);
      }
      alert("บันทึกสำเร็จ!");
      setIsEditing(false);
      setFormData({});
      fetchData(); // รีเฟรชตาราง
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาด: กรุณาตรวจสอบข้อมูลให้ครบถ้วน");
    }
  };

  // ฟังก์ชันช่วยจัดการ Input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ฟอร์มกรอกข้อมูล (Dynamic Form)
  const renderForm = () => {
    return (
      <div className="request-card" style={{marginBottom: '20px', border: '2px solid #007bff'}}>
        <div className="request-card-header" style={{background: '#e8f4fd'}}>
             <h3 style={{margin: 0}}>{isEditing ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</h3>
        </div>
        <div className="request-card-body">
            <form onSubmit={handleSave}>
                
                {/* --- ฟอร์ม: สถาบัน --- */}
                {activeTab === 'institutions' && (
                    <>
                        <div style={{marginBottom: '10px'}}>
                            <label>ชื่อสถาบัน:</label>
                            <input className="status-select" name="name" value={formData.name || ''} onChange={handleChange} required />
                        </div>
                        <div style={{marginBottom: '10px'}}>
                            <label>
                                <input type="checkbox" name="is_home_institution" checked={formData.is_home_institution || false} onChange={handleChange} />
                                &nbsp; เป็นสถาบันหลัก (สถาบันของเรา)
                            </label>
                        </div>
                    </>
                )}

                {/* --- ฟอร์ม: หลักสูตร --- */}
                {activeTab === 'curriculums' && (
                    <>
                        <div style={{marginBottom: '10px'}}>
                            <label>ชื่อหลักสูตร:</label>
                            <input className="status-select" name="name" value={formData.name || ''} onChange={handleChange} required />
                        </div>
                        {/* (Optional) ถ้าอยากให้เลือกสถาบันได้ด้วย ให้เพิ่ม Dropdown ตรงนี้ */}
                    </>
                )}

                {/* --- ฟอร์ม: รายวิชา (ทั้งต้นทางและเป้าหมาย) --- */}
                {(activeTab === 'target-courses' || activeTab === 'source-courses') && (
                    <>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <div style={{flex: 1, marginBottom: '10px'}}>
                                <label>รหัสวิชา:</label>
                                <input className="status-select" name="course_code" value={formData.course_code || ''} onChange={handleChange} required />
                            </div>
                            <div style={{flex: 2, marginBottom: '10px'}}>
                                <label>ชื่อวิชา (ไทย):</label>
                                <input className="status-select" name="course_name_th" value={formData.course_name_th || ''} onChange={handleChange} required />
                            </div>
                        </div>
                        
                        <div style={{marginBottom: '10px'}}>
                            <label>หน่วยกิต:</label>
                            <input type="number" className="status-select" style={{width: '100px'}} name="credits" value={formData.credits || ''} onChange={handleChange} required />
                        </div>

                        {/* เลือกสังกัด (ขึ้นอยู่กับ Tab) */}
                        {activeTab === 'target-courses' ? (
                            <div style={{marginBottom: '10px'}}>
                                <label>สังกัดหลักสูตร:</label>
                                <select className="status-select" name="curriculum" value={formData.curriculum || ''} onChange={handleChange} required>
                                    <option value="">-- กรุณาเลือกหลักสูตร --</option>
                                    {allCurriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        ) : (
                            <div style={{marginBottom: '10px'}}>
                                <label>สังกัดสถาบัน:</label>
                                <select className="status-select" name="institution" value={formData.institution || ''} onChange={handleChange} required>
                                    <option value="">-- กรุณาเลือกสถาบัน --</option>
                                    {allInstitutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                </select>
                            </div>
                        )}

                        <div style={{marginBottom: '10px'}}>
                            <label>คำอธิบายรายวิชา:</label>
                            <textarea className="status-select" rows="5" name="course_description" value={formData.course_description || ''} onChange={handleChange} />
                        </div>
                    </>
                )}

                <div style={{marginTop: '15px'}}>
                    <button type="submit" className="btn btn-primary">บันทึก</button>
                    <button type="button" onClick={() => {setIsEditing(false); setFormData({})}} className="btn btn-secondary" style={{marginLeft: '10px'}}>ยกเลิก</button>
                </div>
            </form>
        </div>
      </div>
    );
  };

  return (
    <div className="faculty-dashboard">
      <header className="dashboard-header">
        <h1>ระบบจัดการข้อมูลหลักสูตร</h1>
        <div className="header-menu">
          <Link to="/faculty/dashboard" style={{ marginRight: '15px', textDecoration: 'none', color: '#666' }}>กลับหน้าตรวจสอบ</Link>
          <span className="user-info">สวัสดี, {user?.username}</span>
          <button onClick={logoutUser} className="logout-button">ออกจากระบบ</button>
        </div>
      </header>

      <main className="dashboard-main">
        
        {/* ปุ่มเลือกหมวดหมู่ */}
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap'}}>
            <button className={`btn ${activeTab === 'institutions' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => {setActiveTab('institutions'); setIsEditing(false);}}>สถาบันการศึกษา</button>
            <button className={`btn ${activeTab === 'curriculums' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => {setActiveTab('curriculums'); setIsEditing(false);}}>หลักสูตร</button>
            <button className={`btn ${activeTab === 'target-courses' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => {setActiveTab('target-courses'); setIsEditing(false);}}>รายวิชาเป้าหมาย (ของเรา)</button>
            <button className={`btn ${activeTab === 'source-courses' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => {setActiveTab('source-courses'); setIsEditing(false);}}>รายวิชาต้นทาง (สถาบันอื่น)</button>
        </div>

        {/* ส่วนฟอร์ม (แสดงเมื่อกดเพิ่ม/แก้ไข) */}
        {isEditing ? renderForm() : (
             <button className="btn btn-primary" style={{marginBottom: '20px'}} onClick={() => {setFormData({}); setIsEditing(true);}}>+ เพิ่มข้อมูลใหม่</button>
        )}

        {/* ตารางแสดงข้อมูล */}
        <div className="request-card">
            <table className="course-table">
                <thead>
                    <tr>
                        <th style={{width: '5%'}}>ID</th>
                        <th>ชื่อ / รายละเอียด</th>
                        <th style={{width: '20%'}}>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr><td colSpan="3" style={{textAlign:'center', padding:'20px'}}>ไม่พบข้อมูล</td></tr>
                    ) : (
                        items.map(item => (
                            <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>
                                    {item.name && <strong>{item.name}</strong>}
                                    
                                    {/* กรณีเป็นรายวิชา */}
                                    {item.course_code && (
                                        <div>
                                            <strong>{item.course_code}</strong> {item.course_name_th} <br/>
                                            <small style={{color: '#666'}}>หน่วยกิต: {item.credits}</small>
                                        </div>
                                    )}
                                    
                                    {/* รายละเอียดเพิ่มเติม */}
                                    {item.is_home_institution !== undefined && (
                                        <div style={{fontSize:'0.85rem', color: item.is_home_institution ? 'green' : '#666'}}>
                                            {item.is_home_institution ? '✅ สถาบันหลัก' : 'ทั่วไป'}
                                        </div>
                                    )}
                                    {item.curriculum && typeof item.curriculum === 'number' && (
                                         <div style={{fontSize:'0.85rem', color:'#666'}}>
                                            รหัสหลักสูตร: {item.curriculum} 
                                            {/* (ถ้าอยากโชว์ชื่อ ต้องแก้ Serializer ให้ส่งชื่อมาด้วย แต่ตอนนี้โชว์ ID ไปก่อน) */}
                                         </div>
                                    )}
                                </td>
                                <td>
                                    <button className="btn" style={{marginRight: '5px', background: '#ffc107', color: 'black', padding: '5px 10px'}} onClick={() => {setFormData(item); setIsEditing(true);}}>แก้ไข</button>
                                    <button className="btn btn-reject" style={{padding: '5px 10px'}} onClick={() => handleDelete(item.id)}>ลบ</button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

      </main>
    </div>
  );
}

export default FacultyDataManagement;