// src/services/api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://162.141.142.3/api',
});
// Interceptor ที่จะทำงานก่อนทุก Request
apiClient.interceptors.request.use((config) => {
  // ดึง authToken จาก Local Storage
  const authToken = localStorage.getItem('authToken')
    ? JSON.parse(localStorage.getItem('authToken'))
    : null;

  if (authToken) {
    // ถ้ามี Token ให้แนบไปกับ Header
    config.headers.Authorization = `Bearer ${authToken.access}`;
  }
  return config;
});


export const login = (username, password) => {
  return apiClient.post('/auth/login/', { username, password });
};

// เพิ่มฟังก์ชันสำหรับดึงข้อมูลสถาบัน (ตัวอย่าง API ที่ต้องใช้ Token)
export const getInstitutions = () => {
  return apiClient.get('/institutions/');
};
export const getCoursesByInstitution = (institutionId) => {
  // ส่ง institution_id ไปเป็น query parameter
  return apiClient.get(`/source-courses/?institution_id=${institutionId}`);
};
export const submitTransferRequest = (items, targetCurriculumId, file) => {
  const formData = new FormData();
  
  // ใส่ข้อมูลปกติ
  formData.append('target_curriculum', targetCurriculumId);
  
  // แปลงรายการวิชาเป็น JSON String แล้วยัดใส่ FormData
  formData.append('items', JSON.stringify(items));
  
  // ถ้ามีไฟล์ ให้แนบไปด้วย
  if (file) {
    formData.append('evidence_file', file);
  }

  return apiClient.post('/transfer-requests/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data', // สำคัญมาก!
    },
  });
};
export const getPendingRequests = () => {
  return apiClient.get('/admin/pending-requests/');
};
export const updateRequestStatus = (requestId, status) => {
  // status คือ 'approved' หรือ 'rejected'
  return apiClient.patch(`/admin/requests/${requestId}/`, { status });
};
export const getTargetCurriculums = () => {
  return apiClient.get('/target-curriculums/');
};
export const register = (userData) => {
  return apiClient.post('/register/', userData);
};

export const getNotifications = () => {
  return apiClient.get('/student/notifications/');
};

// --- เพิ่ม 2 ฟังก์ชันนี้ ---
export const getProfile = () => {
  return apiClient.get('/profile/');
};

export const updateProfile = (profileData) => {
  return apiClient.put('/profile/', profileData);
};
export const updateRequestItemStatus = (itemId, status) => {
  return apiClient.patch(`/admin/request-item/${itemId}/update/`, { status });
};
export const getRequestHistory = () => {
  return apiClient.get('/admin/history/');
};
export const downloadTransferReport = (requestId) => {
  return apiClient.get(`/admin/request/${requestId}/pdf/`, {
    responseType: 'blob', // สำคัญมาก! บอกว่ารับข้อมูลเป็นไฟล์ Binary
  });
};
export const getTransferRequestDetail = (requestId) => {
  return apiClient.get(`/admin/request/${requestId}/`);
};
export const recalculateScore = (originalCourseId, targetCourseId) => {
  return apiClient.post('/recalculate-score/', {
    original_course_id: originalCourseId,
    target_course_id: targetCourseId
  });
};
export const deleteTransferRequest = (requestId) => {
  return apiClient.delete(`/admin/request/${requestId}/delete/`);
};
export const downloadEvaluationReport = (requestId) => {
  return apiClient.get(`/admin/request/${requestId}/evaluation-pdf/`, {
    responseType: 'blob', // สำคัญ! บอกว่ารับข้อมูลเป็นไฟล์
  });
};
export const manageData = {
  getAll: (resource) => apiClient.get(`/manage/${resource}/`),
  create: (resource, data) => apiClient.post(`/manage/${resource}/`, data),
  update: (resource, id, data) => apiClient.put(`/manage/${resource}/${id}/`, data),
  delete: (resource, id) => apiClient.delete(`/manage/${resource}/${id}/`),
};

export const getStudentRequests = () => {
  return apiClient.get('/student/requests/'); // URL ตาม Backend ของคุณ
};

