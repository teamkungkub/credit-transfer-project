# transfer/ai_comparator.py

from sentence_transformers import SentenceTransformer, util
from .models import SourceCourse, TargetCourse
import re # เพิ่ม library สำหรับจัดการข้อความ

# โมเดลเดิม: 'paraphrase-multilingual-MiniLM-L12-v2'
# โมเดลใหม่: 'intfloat/multilingual-e5-large'
# โหลดโมเดล AI
print("Loading AI Model (intfloat/multilingual-e5-large)... Please wait.")
model = SentenceTransformer('intfloat/multilingual-e5-large')

print("AI Model Loaded Successfully!")

def generate_reasoning(text1, text2):
    """
    วิเคราะห์หาคำสำคัญ (Keywords) ที่ปรากฏในคำอธิบายรายวิชาของทั้ง 2 ฝั่ง
    เพื่อใช้เป็นเหตุผลประกอบความสอดคล้อง
    """
    if not text1 or not text2:
        return "ไม่สามารถระบุเหตุผลได้ เนื่องจากข้อมูลคำอธิบายรายวิชาไม่เพียงพอ"

    # 1. ทำความสะอาดข้อความ: ลบตัวอักษรพิเศษ และเปลี่ยนเป็นตัวเล็ก (case-insensitive)
    def clean_text(text):
        # ลบเครื่องหมายวรรคตอน แต่เก็บ ก-ฮ, a-z, 0-9 และช่องว่างไว้
        text = re.sub(r'[^\w\s]', ' ', text) 
        return text.lower()

    clean_t1 = clean_text(text1)
    clean_t2 = clean_text(text2)

    # 2. แยกคำ (Tokenization) - ใช้การเว้นวรรคเป็นหลัก
    # หมายเหตุ: ภาษาไทยถ้าไม่มีการเว้นวรรค การตัดคำแบบนี้อาจได้ผลไม่ดีนัก 
    # แต่เพียงพอสำหรับจับคำทับศัพท์ภาษาอังกฤษหรือคำที่เว้นวรรคไว้
    words1 = set(clean_t1.split())
    words2 = set(clean_t2.split())
    
    # 3. หาคำที่ปรากฏทั้งสองฝั่ง (Intersection)
    common_words = words1.intersection(words2)
    
    # 4. กำหนดคำฟุ่มเฟือย (Stop words) ที่ไม่ควรนำมาเป็นเหตุผล
    stop_words = {
        # คำเชื่อมทั่วไป
        'การ', 'ความ', 'และ', 'ใน', 'ของ', 'ที่', 'ได้', 'ศึกษา', 'เกี่ยวกับ', 
        'เพื่อ', 'โดย', 'เป็น', 'มี', 'จาก', 'หลักการ', 'ทฤษฎี', 'เบื้องต้น',
        'ปฏิบัติ', 'ระบบ', 'งาน', 'ทาง', 'ด้าน', 'กระบวนการ', 'พื้นฐาน',
        'structure', 'introduction', 'basic', 'principle', 'system', 'analysis',
        'and', 'of', 'the', 'in', 'to', 'for', 'with', 'study', 'a', 'an'
    }
    
    # 5. กรองคำ
    keywords = [w for w in common_words if w not in stop_words and len(w) > 2]
    
    # 6. สรุปผล
    if keywords:
        # เรียงลำดับคำตามความยาว (คำยาวมักมีความหมายเฉพาะเจาะจงกว่า)
        keywords.sort(key=len, reverse=True)
        # เลือกมาแสดงสูงสุด 10 คำ
        top_keywords = keywords[:10]
        return (
            f"จากการวิเคราะห์คำอธิบายรายวิชา พบเนื้อหาและคำสำคัญที่ตรงกัน ได้แก่: "
            f"\"{', '.join(top_keywords)}\" "
            f"ซึ่งแสดงถึงความสอดคล้องในเนื้อหาหลักของรายวิชา"
        )
    
    return (
        "AI ตรวจพบความคล้ายคลึงในเชิงบริบทของประโยคและโครงสร้างเนื้อหา "
        "แม้จะไม่มีคำศัพท์เฉพาะที่ตรงกันเป๊ะ (อาจมีการใช้คำพ้องความหมาย)"
    )

def find_best_match(original_course, target_curriculum_id):
    """
    หาคอร์สที่ใกล้เคียงที่สุดในหลักสูตรเป้าหมาย
    """
    # ดึงรายวิชาทั้งหมดในหลักสูตรเป้าหมาย
    target_courses = TargetCourse.objects.filter(curriculum_id=target_curriculum_id)
    if not target_courses.exists():
        return None, 0, "ไม่พบรายวิชาในหลักสูตรเป้าหมาย"

    original_desc = original_course.course_description
    target_descs = [course.course_description for course in target_courses]

    # AI คำนวณความเหมือน (Vector Similarity)
    original_embedding = model.encode(original_desc, convert_to_tensor=True)
    target_embeddings = model.encode(target_descs, convert_to_tensor=True)

    cosine_scores = util.pytorch_cos_sim(original_embedding, target_embeddings)

    best_score_index = cosine_scores[0].argmax().item()
    best_score = cosine_scores[0][best_score_index].item()
    best_matching_course = target_courses[best_score_index]
    
    # สร้างเหตุผลประกอบจากคำอธิบายรายวิชา
    reason = generate_reasoning(original_desc, best_matching_course.course_description)

    return best_matching_course, best_score, reason

def calculate_similarity(course1, course2):
    """คำนวณคะแนนความเหมือนระหว่าง 2 วิชา"""
    if not course1 or not course2 or not course1.course_description or not course2.course_description:
        return 0
        
    descriptions = [course1.course_description, course2.course_description]
    embeddings = model.encode(descriptions, convert_to_tensor=True)
    cosine_score = util.pytorch_cos_sim(embeddings[0], embeddings[1])
    return cosine_score.item()