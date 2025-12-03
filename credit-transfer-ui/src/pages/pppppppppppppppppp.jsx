// src/pages/StudentDashboard.jsx
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
  const { user, logoutUser } = useContext(AuthContext);


  // States for data from API
  const [institutions, setInstitutions] = useState([]);
  const [targetCurriculums, setTargetCurriculums] = useState([]);
  const [courses, setCourses] = useState([]);
  
  // States for user's selections
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [selectedTargetCurriculum, setSelectedTargetCurriculum] = useState('');
  const [selectedCourses, setSelectedCourses] = useState({});

  // States for notifications
  const [notifications, setNotifications] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // States for Profile
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Fetch initial data on page load
    getInstitutions().then(res => setInstitutions(res.data)).catch(err => console.error("Error fetching institutions:", err));
    getTargetCurriculums().then(res => setTargetCurriculums(res.data)).catch(err => console.error("Error fetching curriculums:", err));
    getProfile().then(res => setProfile(res.data)).catch(err => console.error("Error fetching profile:", err));
    
    const fetchNotifications = () => {
      getNotifications()
        .then(res => setNotifications(res.data))
        .catch(err => console.error("Error fetching notifications:", err));
    };

    fetchNotifications(); // Initial fetch
    const interval = setInterval(fetchNotifications, 30000); // Fetch every 30 seconds

    return () => clearInterval(interval); // Cleanup on component unmount
  }, []);

  const handleInstitutionChange = (event) => {
    const institutionId = event.target.value;
    setSelectedInstitution(institutionId);
    setSelectedCourses({});
    
    if (institutionId) {
      getCoursesByInstitution(institutionId).then(res => setCourses(res.data)).catch(err => console.error(err));
    } else {
      setCourses([]);
    }
  };

  const handleCourseChange = (courseId, field, value) => {
    setSelectedCourses(prev => {
      const courseData = prev[courseId] || {};
      if (field === 'checked') {
        if (value === false) {
          const { [courseId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [courseId]: { ...courseData } };
      }
      return { ...prev, [courseId]: { ...courseData, [field]: value } };
    });
  };

  const handleSubmit = async () => {
    if (!selectedTargetCurriculum) {
      alert('กรุณาเลือกหลักสูตรที่ต้องการเทียบโอน');
      return;
    }
    const items = Object.keys(selectedCourses).map(courseId => ({
      original_course: parseInt(courseId),
      grade: selectedCourses[courseId].grade || '',
    }));
    if (items.length === 0) {
      alert('กรุณาเลือกรายวิชาอย่างน้อย 1 รายการ');
      return;
    }
    try {
      await submitTransferRequest(items, selectedTargetCurriculum);
      alert('ส่งคำร้องสำเร็จ!');
      setSelectedTargetCurriculum('');
      setSelectedInstitution('');
      setCourses([]);
      setSelectedCourses({});
    } catch (error) {
      console.error('Failed to submit request', error);
      alert('เกิดข้อผิดพลาดในการส่งคำร้อง');
    }
  };

  // --- Functions for Profile ---
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    if (name === 'student_id') {
      setProfile(prev => ({ ...prev, profile: { ...prev.profile, student_id: value } }));
    } else {
      setProfile(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleProfileSave = async () => {
    try {
      const response = await updateProfile(profile);
      setProfile(response.data);
      alert('บันทึกข้อมูลสำเร็จ!');
      setIsEditing(false);
    } catch (err) {
      alert('บันทึกข้อมูลไม่สำเร็จ');
      console.error("Failed to update profile", err);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>หน้าสำหรับนักศึกษา</h1>
        <div className="header-menu">
          <div className="notification-bell" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <span>🔔</span>
            {notifications.length > 0 && <span className="notification-badge">{notifications.length}</span>}
            
            {isDropdownOpen && (
              <div className="notification-dropdown">
                {notifications.length > 0 ? (
                  notifications.map(notif => (
                    <div key={notif.id} className="notification-item">
                      คำร้องสำหรับหลักสูตร <strong>{notif.target_curriculum?.name}</strong>
                      ได้รับการ <strong style={{color: notif.status === 'approved' ? 'green' : 'red'}}>
                        {notif.status === 'approved' ? 'อนุมัติ' : 'ปฏิเสธ'}
                      </strong>
                    </div>
                  ))
                ) : (
                  <div className="notification-item">ไม่มีการแจ้งเตือนใหม่</div>
                )}
              </div>
            )}
          </div>
          <span className="user-info">สวัสดี, {user?.username}</span>
          <button onClick={logoutUser} className="logout-button">ออกจากระบบ</button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* --- Card 1: ข้อมูลนักศึกษา --- */}
        <div className="card profile-section">
          <h3>ข้อมูลนักศึกษา</h3>
          {isEditing ? (
            <div className="profile-edit-form">
              <input name="first_name" value={profile?.first_name || ''} onChange={handleProfileChange} placeholder="ชื่อจริง"/>
              <input name="last_name" value={profile?.last_name || ''} onChange={handleProfileChange} placeholder="นามสกุล"/>
              <input name="student_id" value={profile?.profile?.student_id || ''} onChange={handleProfileChange} placeholder="รหัสนักศึกษา"/>
              <button onClick={handleProfileSave} className="btn btn-primary">บันทึก</button>
              <button onClick={() => setIsEditing(false)} className="btn">ยกเลิก</button>
            </div>
          ) : (
            <div className="profile-display">
              <p><strong>ชื่อ-นามสกุล:</strong> {profile?.first_name || '-'} {profile?.last_name || ''}</p>
              <p><strong>รหัสนักศึกษา:</strong> {profile?.profile?.student_id || 'ยังไม่ได้กรอก'}</p>
              <button onClick={() => setIsEditing(true)} className="btn btn-edit">แก้ไขข้อมูล</button>
            </div>
          )}
        </div>

        {/* --- Card 2: ยื่นคำร้อง --- */}
        <div className="card form-container">
            <h2>ยื่นคำร้องเทียบโอนผลการเรียน</h2>
            <div className="form-step-inner">
                <h3>ขั้นตอนที่ 1: เลือกหลักสูตรที่ต้องการเทียบโอน (หลักสูตรใหม่)</h3>
                <select className="custom-select" value={selectedTargetCurriculum} onChange={(e) => setSelectedTargetCurriculum(e.target.value)}>
                    <option value="">-- กรุณาเลือกหลักสูตร --</option>
                    {targetCurriculums.map(curr => <option key={curr.id} value={curr.id}>{curr.name}</option>)}
                </select>
            </div>
            <div className="form-step-inner">
                <h3>ขั้นตอนที่ 2: เลือกหลักสูตรที่จบจากสถาบันการศึกษาเดิม</h3>
                <select className="custom-select" value={selectedInstitution} onChange={handleInstitutionChange}>
                    <option value="">-- กรุณาเลือกสถาบัน --</option>
                    {institutions.map(inst => <option key={inst.id} value={inst.id}>{inst.name}</option>)}
                </select>
            </div>
            {courses.length > 0 && (
                <div className="form-step-inner">
                    <h3>ขั้นตอนที่ 3: เลือกรายวิชาและกรอกเกรด</h3>
                    <table className="course-table">
                        <thead>
                        <tr>
                            <th>เลือก</th>
                            <th>รหัสวิชา</th>
                            <th>ชื่อวิชา</th>
                            <th>หน่วยกิต</th>
                            <th>เกรดที่ได้รับ</th>
                        </tr>
                        </thead>
                        <tbody>
                        {courses.map((course) => (
                            <tr key={course.id}>
                            <td><input type="checkbox" checked={!!selectedCourses[course.id]} onChange={e => handleCourseChange(course.id, 'checked', e.target.checked)} /></td>
                            <td>{course.course_code}</td>
                            <td>{course.course_name_th}</td>
                            <td>{course.credits}</td>
                            <td><input type="text" className="grade-input" disabled={!selectedCourses[course.id]} value={selectedCourses[course.id]?.grade || ''} onChange={e => handleCourseChange(course.id, 'grade', e.target.value)} /></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    <button className="submit-button" onClick={handleSubmit}>ส่งคำร้อง</button>
                </div>
            )}
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;