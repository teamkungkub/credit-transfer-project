import React, { useState, useEffect, useContext } from 'react';
import {
  getInstitutions,
  getCoursesByInstitution,
  getTargetCurriculums,
  submitTransferRequest,
  getNotifications,
  getProfile,
  updateProfile
} from '../services/api';
import AuthContext from '../context/AuthContext';
import './StudentDashboard.css';

function StudentDashboard() {
  const [isSuccess, setIsSuccess] = useState(false);
  const { user, logoutUser } = useContext(AuthContext);

  const [searchTerm, setSearchTerm] = useState('');

  const [institutions, setInstitutions] = useState([]);
  const [targetCurriculums, setTargetCurriculums] = useState([]);
  const [courses, setCourses] = useState([]);
  const [evidenceFile, setEvidenceFile] = useState(null);

  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedTargetCurriculum, setSelectedTargetCurriculum] = useState('');
  const [selectedCourses, setSelectedCourses] = useState({});

  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // ✅ 1. กำหนดเกรดที่ให้เลือกได้ (เพิ่ม B+, C+ ได้ที่นี่ถ้าต้องการ)
  const VALID_GRADES = ['A', ,'B+','B',,'C+', 'C', , ];

  // 🔍 ฟิลเตอร์วิชา
  const filteredCourses = courses.filter(course =>
    course.course_name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.course_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    getInstitutions().then(res => setInstitutions(res.data));
    getTargetCurriculums().then(res => setTargetCurriculums(res.data));
    getProfile().then(res => setProfile(res.data));

    const fetchNotifications = () => {
      getNotifications()
        .then(res => setNotifications(res.data))
        .catch(err => console.error("Error fetching notifications:", err));
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleInstitutionChange = (event) => {
    const institutionId = event.target.value;
    setSelectedInstitution(institutionId);
    setSelectedCourses({});

    if (institutionId) {
      getCoursesByInstitution(institutionId)
        .then(res => setCourses(res.data))
        .catch(err => console.error(err));
    } else {
      setCourses([]);
    }
  };

  const handleCourseChange = (courseId, field, value) => {
    setSelectedCourses(prev => {
      const courseData = prev[courseId] || {};

      if (field === 'checked') {
        if (!value) {
          const { [courseId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [courseId]: { ...courseData } };
      }
      return { ...prev, [courseId]: { ...courseData, [field]: value } };
    });
  };

  const handleSubmit = async (e) => { 
    e.preventDefault(); 

    // 1. เช็คไฟล์ก่อนเป็นอันดับแรก!
    if (!evidenceFile) {
        alert("กรุณาแนบไฟล์หลักฐานก่อนส่งคำร้อง");
        return; 
    }

    // 2. เช็คหลักสูตร
    if (!selectedTargetCurriculum) {
      alert('กรุณาเลือกหลักสูตรที่ต้องการเทียบโอน');
      return;
    }

    // เตรียมข้อมูลรายวิชา
    const items = Object.keys(selectedCourses).map(id => ({
      original_course: parseInt(id),
      grade: selectedCourses[id].grade || '',
    }));

    if (items.length === 0) {
      alert('กรุณาเลือกรายวิชาอย่างน้อย 1 รายการ');
      return;
    }

    // 🔥 เช็คว่ามีวิชาไหนลืมกรอกเกรดหรือไม่?
    const incompleteItems = items.filter(item => !item.grade); 
    if (incompleteItems.length > 0) {
        alert(`กรุณากรอกเกรดให้ครบทุกวิชา (ยังขาดอยู่ ${incompleteItems.length} วิชา)`);
        return; 
    }

    // --- ส่วนส่งข้อมูล ---
    try {
      setIsLoading(true);
      
      // ส่งข้อมูลเข้า API
      await submitTransferRequest(items, selectedTargetCurriculum, evidenceFile);
      
      // ✅ 1. แจ้งเตือนแบบ Alert (แทนการเปลี่ยนหน้า)
      alert('ส่งคำร้องสำเร็จ!');

      // ✅ 2. ล้างค่าในฟอร์มให้กลับมาว่าง พร้อมกรอกใหม่
      setEvidenceFile(null); 
      setSelectedCourses({});
      setCourses([]);
      setSelectedTargetCurriculum(''); // (เลือกใส่หรือไม่ก็ได้) ล้างหลักสูตรที่เลือก
      setSelectedInstitution('');    // (เลือกใส่หรือไม่ก็ได้) ล้างสถาบันที่เลือก

      // ❌ เอา setIsSuccess ออกแล้ว

    } catch (error) {
      console.error(error);
      alert('เกิดข้อผิดพลาดในการส่งคำร้อง: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsLoading(false);
    }
  };
  const handleProfileChange = (e) => {
    const { name, value } = e.target;

    if (name === 'student_id' || name === 'major') {
      setProfile(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          [name]: value
        }
      }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProfileSave = async () => {
    try {
      const res = await updateProfile(profile);
      setProfile(res.data);
      alert('บันทึกข้อมูลสำเร็จ');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert('รหัสนักศึกษานี้มีผู้ใช้แล้ว');
    }
  };

  return (
    <div className="dashboard-container">

      {/* HEADER */}
      <header className="dashboard-header glass-header">
        <h1 className="header-title">📘 ระบบเทียบโอนผลการเรียน</h1>

        <div className="header-menu">
          <div className="notification-wrapper">
            <div
              className="notification-bell"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              🔔
              {notifications.length > 0 &&
                <span className="notification-badge">{notifications.length}</span>
              }
            </div>

            {isDropdownOpen && (
              <div className="notification-dropdown">
                {notifications.length ? notifications.map(n => (
                  <div key={n.id} className="notification-item">
                    คำร้องหลักสูตร <strong>{n.target_curriculum?.name}</strong> ถูก
                    <strong className={n.status === 'approved' ? "notif-success" : "notif-denied"}>
                      {n.status === 'approved' ? " อนุมัติ" : " ปฏิเสธ"}
                    </strong>
                  </div>
                )) : (
                  <div className="notification-item">ไม่มีการแจ้งเตือน</div>
                )}
              </div>
            )}
          </div>

          <span className="user-info">👋 {user?.username}</span>
          <button onClick={logoutUser} className="logout-button">ออกจากระบบ</button>
        </div>
      </header>

      {/* MAIN */}
      <main className="dashboard-main">

        {/* Profile card */}
        <div className="card profile-card glass">
          <h3>ข้อมูลนักศึกษา</h3>

          {isEditing ? (
            <div className="profile-edit-grid">
              <input name="first_name" value={profile?.first_name || ""} onChange={handleProfileChange} placeholder="ชื่อจริง" />
              <input name="last_name" value={profile?.last_name || ""} onChange={handleProfileChange} placeholder="นามสกุล" />
              <input name="student_id" value={profile?.profile?.student_id || ""} onChange={handleProfileChange} placeholder="รหัสนักศึกษา" />
              <input name="major" value={profile?.profile?.major || ""} onChange={handleProfileChange} placeholder="สาขา" />

              <button className="btn-primary" onClick={handleProfileSave}>บันทึก</button>
              <button className="btn-gray" onClick={() => setIsEditing(false)}>ยกเลิก</button>
            </div>
          ) : (
            <div className="profile-info">
              <p><strong>ชื่อ:</strong> {profile?.first_name} {profile?.last_name}</p>
              <p><strong>รหัสนักศึกษา:</strong> {profile?.profile?.student_id}</p>
              <p><strong>สาขาวิชา:</strong> {profile?.profile?.major}</p>

              <button className="btn-outline" onClick={() => setIsEditing(true)}>แก้ไขข้อมูล</button>
            </div>
          )}
        </div>

        {/* Form card */}
        <div className="card form-card glass">
          <h2 className="form-title">📄 ยื่นคำร้องเทียบโอนผลการเรียน</h2>

          {/* STEP 1 */}
          <div className="form-block">
            <label>ขั้นตอนที่ 1: หลักสูตรที่ต้องการเทียบโอน</label>
            <select value={selectedTargetCurriculum} onChange={e => setSelectedTargetCurriculum(e.target.value)}>
              <option value="">-- เลือกหลักสูตร --</option>
              {targetCurriculums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* STEP 2 */}
          <div className="form-block">
            <label>ขั้นตอนที่ 2: หลักสูตรสถาบันเดิม</label>
            <select value={selectedInstitution} onChange={handleInstitutionChange}>
              <option value="">-- เลือกสถาบัน --</option>
              {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </div>

          {/* STEP 3 */}
          {courses.length > 0 && (
            <div className="form-block">
              <label>ขั้นตอนที่ 3: เลือกรายวิชา</label>

              {/* 🔍 ช่องค้นหา */}
              <input
                type="text"
                className="course-search-input"
                placeholder="ค้นหารายวิชา หรือรหัสวิชา..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <table className="course-table premium-table">
                <thead>
                  <tr>
                    <th>✔</th>
                    <th>รหัส</th>
                    <th>ชื่อรายวิชา</th>
                    <th>หน่วยกิต</th>
                    <th>เกรด</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCourses.map(course => (
                    <tr key={course.id}>
                      <td><input type="checkbox"
                        checked={!!selectedCourses[course.id]}
                        onChange={e => handleCourseChange(course.id, 'checked', e.target.checked)}
                      /></td>
                      <td>{course.course_code}</td>
                      <td>{course.course_name_th}</td>
                      <td>{course.credits}</td>
                      <td>
                        {/* ✅ 2. เปลี่ยน Input เป็น Dropdown (Select) */}
                        <select
                          disabled={!selectedCourses[course.id]}
                          value={selectedCourses[course.id]?.grade || ''}
                          onChange={e => handleCourseChange(course.id, 'grade', e.target.value)}
                          className="grade-input"
                          style={{ padding: '8px', borderRadius: '4px' }}
                        >
                          <option value="">-- เลือก --</option>
                          {VALID_GRADES.map(grade => (
                            <option key={grade} value={grade}>{grade}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* FILE UPLOAD */}
<div className="upload-block">
  <label>
    แนบหลักฐาน <span style={{ color: 'red' }}>* (จำเป็นต้องแนบ)</span>
  </label>
  <input 
    type="file" 
    accept="image/*" 
    onChange={(e) => setEvidenceFile(e.target.files[0])} 
    required  // (ทางเลือก) เพิ่ม attribute นี้เพื่อให้ Browser ช่วยเตือน
  />
</div>

              <button className="submit-btn" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "ส่งข้อมูลสำเร็จ ระบบกำลังทำการประมวลผลด้วย AI..." : "ส่งคำร้อง"}
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default StudentDashboard;