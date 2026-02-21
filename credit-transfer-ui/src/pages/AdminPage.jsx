// src/pages/AdminPage.jsx
import React, { useState, useEffect, useContext } from 'react';
import { manageData } from '../services/api';
import AuthContext from '../context/AuthContext';
import './FacultyDashboard.css';
import './AdminPage.css';

function AdminPage() {
  const { user, logoutUser } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState('institutions');
  const [items, setItems] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [allInstitutions, setAllInstitutions] = useState([]);

  useEffect(() => {
    fetchData();
    if (activeTab === 'source-courses') {
      manageData.getAll('institutions')
        .then(res => setAllInstitutions(res.data))
        .catch(err => console.error("Failed to load institutions", err));
    }
  }, [activeTab]);

  const fetchData = () => {
    manageData.getAll(activeTab)
      .then(res => setItems(res.data))
      .catch(err => console.error("Error loading data", err));
  };

  const handleDelete = async (id) => {
    if (window.confirm("ยืนยันการลบข้อมูลนี้?")) {
      try {
        await manageData.delete(activeTab, id);
        alert("ลบข้อมูลเรียบร้อย");
        fetchData();
      } catch (err) {
        alert("ลบไม่สำเร็จ (ข้อมูลอาจถูกใช้งานอยู่)");
      }
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (formData.id) {
        await manageData.update(activeTab, formData.id, formData);
      } else {
        await manageData.create(activeTab, formData);
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

  // -------------------------------------------------------------
  // ฟอร์ม (ไม่แตะต้องลอจิก)
  // -------------------------------------------------------------
  const renderForm = () => {
    return (
      <div className="request-card" style={{ marginBottom: '20px', border: '2px solid #dc3545' }}>
        <div className="request-card-header" style={{ background: '#fff5f5' }}>
          <h3 style={{ margin: 0 }}>{isEditing ? 'แก้ไขข้อมูล' : 'เพิ่มข้อมูลใหม่'}</h3>
        </div>
        <div className="request-card-body">
          <form onSubmit={handleSave}>

            {/* ฟอร์มสถาบัน */}
            {activeTab === 'institutions' && (
              <div style={{ marginBottom: '10px' }}>
                <label>ชื่อสถาบัน / หลักสูตรเดิม:</label>
                <input
                  className="status-select"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            {/* ฟอร์มรายวิชา */}
            {activeTab === 'source-courses' && (
              <>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1, marginBottom: '10px' }}>
                    <label>รหัสวิชา:</label>
                    <input
                      className="status-select"
                      name="course_code"
                      value={formData.course_code || ''}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div style={{ flex: 2, marginBottom: '10px' }}>
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

                <div style={{ marginBottom: '10px' }}>
                  <label>หน่วยกิต:</label>
                  <input
                    type="number"
                    className="status-select"
                    style={{ width: '100px' }}
                    name="credits"
                    value={formData.credits || ''}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>สังกัดสถาบัน:</label>
                  <select
                    className="status-select"
                    name="institution"
                    value={formData.institution || ''}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- กรุณาเลือก --</option>
                    {allInstitutions.map(i => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label>คำอธิบายรายวิชา:</label>
                  <textarea
                    className="status-select"
                    rows="5"
                    name="course_description"
                    value={formData.course_description || ''}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            <div style={{ marginTop: '15px' }}>
              <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#dc3545' }}>
                บันทึก (Admin)
              </button>
              <button
                type="button"
                onClick={() => { setIsEditing(false); setFormData({}) }}
                className="btn btn-secondary"
                style={{ marginLeft: '10px' }}
              >
                ยกเลิก
              </button>
            </div>

          </form>
        </div>
      </div>
    );
  };

  // -------------------------------------------------------------
  // UI หลัก
  // -------------------------------------------------------------
  return (
    <div className="faculty-dashboard">

      <header className="dashboard-header" style={{ borderBottom: '3px solid #dc3545' }}>
        <h1 style={{ color: '#dc3545' }}>ผู้ดูแลระบบ (Super Admin)</h1>

        <div className="header-menu">
          <span className="user-info">Login as: {user?.username}</span>
          <button onClick={logoutUser} className="logout-button">ออกจากระบบ</button>
        </div>
      </header>

      <main className="dashboard-main">
        
        {/* ------------------ WRAPPER เพิ่มความกว้าง ------------------ */}
        <div className="dashboard-content-wrapper">

          {/* ปุ่มสลับแท็บ */}
          <div className="tab-group">
            <button
              className={`btn ${activeTab === 'institutions' ? 'btn-primary' : 'btn-secondary'}`}
              style={activeTab === 'institutions' ? { backgroundColor: '#dc3545' } : {}}
              onClick={() => { setActiveTab('institutions'); setIsEditing(false); }}
            >
              🏫 จัดการสถาบัน
            </button>

            <button
              className={`btn ${activeTab === 'source-courses' ? 'btn-primary' : 'btn-secondary'}`}
              style={activeTab === 'source-courses' ? { backgroundColor: '#dc3545' } : {}}
              onClick={() => { setActiveTab('source-courses'); setIsEditing(false); }}
            >
              📚 จัดการรายวิชา
            </button>
          </div>

          {/* ปุ่มเพิ่มข้อมูล */}
          {!isEditing && (
            <button
              className="btn btn-primary btn-add-small"
              style={{ marginBottom: '20px', backgroundColor: '#dc3545' }}
              onClick={() => { setFormData({}); setIsEditing(true); }}
            >
              + เพิ่มข้อมูลใหม่
            </button>
          )}

          {/* ฟอร์ม */}
          {isEditing && renderForm()}

          {/* ตารางข้อมูล */}
          <div className="request-card">
            <table className="course-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>ID</th>
                  <th>ข้อมูล</th>
                  <th style={{ width: '20%' }}>จัดการ</th>
                </tr>
              </thead>

              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
                      -- ไม่พบข้อมูล --
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id}>
                      <td>{item.id}</td>

                      <td>
                        {/* สถาบัน */}
                        {item.name && (
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                            {item.name}
                          </div>
                        )}

                        {/* รายวิชา */}
                        {item.course_code && (
                          <div>
                            <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                              {item.course_code}
                            </span> {item.course_name_th}
                            <br />
                            <small style={{ color: '#666' }}>
                              หน่วยกิต: {item.credits} |
                              สถาบัน: {allInstitutions.find(i => i.id === item.institution)?.name || item.institution}
                            </small>
                          </div>
                        )}

                      </td>

                      <td>
                        <button
                          className="btn"
                          style={{
                            marginRight: '5px',
                            background: '#ffc107',
                            color: 'black',
                            padding: '5px 10px',
                            fontSize: '0.8rem'
                          }}
                          onClick={() => { setFormData(item); setIsEditing(true); }}
                        >
                          แก้ไข
                        </button>

                        <button
                          className="btn btn-reject"
                          style={{ padding: '5px 10px', fontSize: '0.8rem' }}
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

        </div>
        {/* ---------------- END WRAPPER ---------------- */}
        
      </main>
    </div>
  );
}

export default AdminPage;
