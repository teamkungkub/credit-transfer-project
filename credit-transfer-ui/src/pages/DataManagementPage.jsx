// src/pages/DataManagementPage.jsx
import React, { useState, useEffect, useContext, useRef } from 'react';
import { manageData } from '../services/api';
import { Link } from 'react-router-dom';
import './FacultyDashboard.css'; // ใช้ CSS ร่วมกัน

function DataManagementPage() {
  // State
  const [activeTab, setActiveTab] = useState('institutions');
  const [items, setItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [allInstitutions, setAllInstitutions] = useState([]);

  // Ref สำหรับเลื่อนหน้าจอ (ตัวระบุตำแหน่งฟอร์ม)
  const formRef = useRef(null);

  // โหลดข้อมูล
  useEffect(() => {
    fetchData();
    if (activeTab === 'source-courses') {
        manageData.getAll('institutions')
            .then(res => setAllInstitutions(res.data))
            .catch(err => console.error("Failed to load institutions dropdown", err));
    }
  }, [activeTab]);

  const fetchData = () => {
    manageData.getAll(activeTab)
      .then(res => setItems(res.data))
      .catch(err => console.error("Error loading data", err));
  };

  // --- ฟังก์ชันเตรียมกดแก้ไข (แก้ไขใหม่) ---
  const handleEditClick = (item) => {
    setFormData(item);
    setIsEditing(true);
    
    // ใช้ setTimeout เพื่อรอให้ React สร้างฟอร์มเสร็จก่อน (100ms) แล้วค่อยเลื่อน
    setTimeout(() => {
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // โฟกัสไปที่ช่องแรกของฟอร์มด้วย (ถ้ามี)
            const firstInput = formRef.current.querySelector('input');
            if (firstInput) firstInput.focus();
        }
    }, 100);
  };

  const handleDelete = async (id) => {
    if (window.confirm("ยืนยันการลบข้อมูลนี้? (การกระทำนี้ไม่สามารถย้อนกลับได้)")) {
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
    
    // เตรียมข้อมูลก่อนส่ง
    const payload = { ...formData };
    if (payload.institution && typeof payload.institution === 'object') {
        payload.institution = payload.institution.id;
    }

    try {
      if (isEditing) {
        await manageData.update(activeTab, formData.id, payload);
      } else {
        await manageData.create(activeTab, payload);
      }
      alert("บันทึกสำเร็จ!");
      setIsEditing(false);
      setFormData({});
      fetchData();
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาด: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // --- ส่วนแสดงฟอร์ม ---
  const renderForm = () => {
    return (
      // ผูก ref={formRef} ไว้ที่นี่ เพื่อให้รู้ตำแหน่ง
      <div ref={formRef} className="request-card" style={{marginBottom: '20px', border: '2px solid #007bff', scrollMarginTop: '20px'}}>
        <div className="request-card-header" style={{background: '#e8f4fd'}}>
             <h3 style={{margin: 0}}>
                {isEditing ? `แก้ไขข้อมูล (ID: ${formData.id})` : '+ เพิ่มข้อมูลใหม่'}
             </h3>
        </div>
        <div className="request-card-body">
            <form onSubmit={handleSave}>
                
                {/* 1. ฟอร์มสำหรับ สถาบัน */}
                {activeTab === 'institutions' && (
                    <div style={{marginBottom: '10px'}}>
                        <label>ชื่อสถาบัน / มหาวิทยาลัย:</label>
                        <input 
                            className="status-select" 
                            name="name" 
                            value={formData.name || ''} 
                            onChange={handleChange} 
                            placeholder="ระบุชื่อสถาบันต้นทาง"
                            required 
                        />
                    </div>
                )}

                {/* 2. ฟอร์มสำหรับ รายวิชา */}
                {activeTab === 'source-courses' && (
                    <>
                        <div style={{display: 'flex', gap: '10px'}}>
                            <div style={{flex: 1, marginBottom: '10px'}}>
                                <label>รหัสวิชา:</label>
                                <input 
                                    className="status-select" 
                                    name="course_code" 
                                    value={formData.course_code || ''} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                            <div style={{flex: 2, marginBottom: '10px'}}>
                                <label>ชื่อวิชา (ไทย):</label>
                                <input 
                                    className="status-select" 
                                    name="course_name_th" 
                                    value={formData.course_name_th || ''} 
                                    onChange={handleChange} 
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div style={{marginBottom: '10px'}}>
                            <label>หน่วยกิต:</label>
                            <input 
                                type="number" 
                                className="status-select" 
                                style={{width: '100px'}} 
                                name="credits" 
                                value={formData.credits || ''} 
                                onChange={handleChange} 
                                required 
                            />
                        </div>

                        <div style={{marginBottom: '10px'}}>
                            <label>สังกัดสถาบัน:</label>
                            <select 
                                className="status-select" 
                                name="institution" 
                                value={
                                    (formData.institution && typeof formData.institution === 'object') 
                                    ? formData.institution.id 
                                    : (formData.institution || '')
                                } 
                                onChange={handleChange} 
                                required
                            >
                                <option value="">-- กรุณาเลือกสถาบัน --</option>
                                {allInstitutions.map(i => (
                                    <option key={i.id} value={i.id}>{i.name}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{marginBottom: '10px'}}>
                            <label>คำอธิบายรายวิชา (Course Description):</label>
                            <textarea 
                                className="status-select" 
                                rows="5" 
                                name="course_description" 
                                value={formData.course_description || ''} 
                                onChange={handleChange} 
                                placeholder="คัดลอกคำอธิบายรายวิชาฉบับเต็มมาวางที่นี่"
                            />
                        </div>
                    </>
                )}

                <div style={{marginTop: '15px'}}>
                    <button type="submit" className="btn btn-primary">
                        {isEditing ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูลใหม่'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => {setIsEditing(false); setFormData({})}} 
                        className="btn btn-secondary" 
                        style={{marginLeft: '10px'}}
                    >
                        ยกเลิก
                    </button>
                </div>
            </form>
        </div>
      </div>
    );
  };

  return (
    <div className="faculty-dashboard">
      <header className="dashboard-header">
        <h1>จัดการข้อมูลต้นทาง (สถาบันเดิม)</h1>
        <div className="header-menu">
            <Link to="/faculty/dashboard" style={{ marginRight: '15px', textDecoration: 'none', color: '#666' }}>กลับหน้าตรวจสอบ</Link>
            <span className="user-info" style={{color: '#007bff', fontWeight: 'bold'}}>Admin Mode</span>
        </div>
      </header>
      
      <main className="dashboard-main">
        
        {/* แถบเลือกหมวดหมู่ */}
        <div style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
            <button 
                className={`btn ${activeTab === 'institutions' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => {setActiveTab('institutions'); setIsEditing(false); setFormData({});}}
            >
                🏫 1. จัดการรายชื่อสถาบัน
            </button>
            <button 
                className={`btn ${activeTab === 'source-courses' ? 'btn-primary' : 'btn-secondary'}`} 
                onClick={() => {setActiveTab('source-courses'); setIsEditing(false); setFormData({});}}
            >
                📚 2. จัดการรายวิชาเดิม
            </button>
        </div>

        {/* ปุ่มเพิ่มข้อมูล */}
        {!isEditing && (
             <button className="btn btn-primary" style={{marginBottom: '20px'}} onClick={() => {setFormData({}); setIsEditing(true);}}>
                + เพิ่มข้อมูลใหม่
             </button>
        )}

        {/* ฟอร์ม (แสดงเมื่อกดเพิ่ม/แก้ไข) */}
        {isEditing && renderForm()}

        {/* ตารางแสดงข้อมูล */}
        <div className="request-card">
            <table className="course-table">
                <thead>
                    <tr>
                        <th style={{width: '10%'}}>ID</th>
                        <th>ข้อมูล</th>
                        <th style={{width: '20%'}}>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 ? (
                        <tr><td colSpan="3" style={{textAlign:'center', padding:'20px', color:'#999'}}>-- ยังไม่มีข้อมูลในระบบ --</td></tr>
                    ) : (
                        items.map(item => (
                            <tr key={item.id}>
                                <td>{item.id}</td>
                                <td>
                                    {/* แสดงข้อมูลสถาบัน */}
                                    {activeTab === 'institutions' && (
                                        <div style={{fontSize: '1.1rem', fontWeight: 'bold', color: '#333'}}>{item.name}</div>
                                    )}
                                    
                                    {/* แสดงข้อมูลรายวิชา */}
                                    {activeTab === 'source-courses' && (
                                        <div>
                                            <div style={{fontSize: '1.1rem', fontWeight: 'bold'}}>
                                                <span style={{color: '#007bff'}}>{item.course_code}</span> {item.course_name_th}
                                            </div>
                                            <div style={{fontSize: '0.9rem', color: '#666', marginTop: '5px'}}>
                                                หน่วยกิต: {item.credits} | 
                                                สถาบัน: {
                                                    allInstitutions.find(i => i.id === (typeof item.institution === 'object' ? item.institution.id : item.institution))?.name || 
                                                    (typeof item.institution === 'object' ? item.institution.name : item.institution)
                                                }
                                            </div>
                                        </div>
                                    )}
                                </td>
                                <td>
                                    {/* ปุ่มแก้ไข */}
                                    <button 
                                        className="btn" 
                                        style={{marginRight: '5px', background: '#ffc107', color: 'black', padding: '5px 10px', fontSize: '0.8rem'}} 
                                        onClick={() => handleEditClick(item)}
                                    >
                                        แก้ไข
                                    </button>
                                    {/* ปุ่มลบ */}
                                    <button 
                                        className="btn btn-reject" 
                                        style={{padding: '5px 10px', fontSize: '0.8rem'}} 
                                        onClick={() => handleDelete(item.id)}
                                    >
                                        ลบ
                                    </button>
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

export default DataManagementPage;