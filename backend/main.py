import os
import sqlite3
import random
import time
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Depends, Header, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

app = FastAPI(title="Antigravity Health API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "health.db")

def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        full_name TEXT,
        phone TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Medicines table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        medicine_id TEXT UNIQUE,
        name TEXT NOT NULL,
        generic_name TEXT,
        category TEXT NOT NULL,
        description TEXT,
        indications TEXT,
        contraindications TEXT,
        prescription_required INTEGER DEFAULT 0,
        price REAL NOT NULL,
        stock INTEGER NOT NULL DEFAULT 100,
        dosage_information TEXT,
        warnings TEXT,
        tag TEXT,
        image TEXT
    );
    """)

    # Addresses table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        address_id TEXT UNIQUE,
        user_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        mobile TEXT NOT NULL,
        building TEXT NOT NULL,
        street TEXT NOT NULL,
        city TEXT NOT NULL,
        district TEXT NOT NULL,
        state TEXT NOT NULL,
        pincode TEXT NOT NULL,
        address_type TEXT DEFAULT 'Home',
        is_default INTEGER DEFAULT 0
    );
    """)

    # Orders table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT UNIQUE,
        user_id TEXT NOT NULL,
        user_email TEXT,
        address_json TEXT NOT NULL,
        subtotal REAL NOT NULL,
        delivery_fee REAL NOT NULL,
        total_amount REAL NOT NULL,
        payment_status TEXT DEFAULT 'Paid',
        payment_method TEXT DEFAULT 'Demo UPI / Card',
        order_status TEXT DEFAULT 'Order Placed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Order items table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id TEXT NOT NULL,
        medicine_id TEXT NOT NULL,
        medicine_name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL
    );
    """)

    # Doctors table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        doctor_id TEXT UNIQUE,
        name TEXT NOT NULL,
        qualification TEXT NOT NULL,
        specialization TEXT NOT NULL,
        experience TEXT NOT NULL,
        consultation_fee REAL DEFAULT 0.0,
        availability TEXT DEFAULT 'Available Today',
        status TEXT DEFAULT 'Online',
        rating REAL DEFAULT 4.9,
        review_count INTEGER DEFAULT 1000,
        about TEXT,
        image TEXT
    );
    """)

    # Consultations table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consultations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        consultation_id TEXT UNIQUE,
        user_id TEXT NOT NULL,
        doctor_id TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        specialization TEXT NOT NULL,
        consultation_type TEXT DEFAULT 'Chat',
        status TEXT DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Chat messages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE,
        consultation_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        sender_type TEXT NOT NULL,
        message TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Prescriptions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        prescription_id TEXT UNIQUE,
        user_id TEXT NOT NULL,
        patient_name TEXT NOT NULL,
        medication TEXT NOT NULL,
        dosage TEXT NOT NULL,
        doctor_id TEXT DEFAULT 'DOC-201',
        doctor_name TEXT DEFAULT 'Dr. Rajesh Kumar',
        doctor_specialization TEXT DEFAULT 'General Physician',
        diagnosis TEXT DEFAULT 'General Clinical Assessment',
        medicines_json TEXT,
        instructions TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Check and add missing columns to prescriptions table if existing
    cursor.execute("PRAGMA table_info(prescriptions);")
    existing_cols = [c[1] for c in cursor.fetchall()]
    new_cols = [
        ("doctor_id", "TEXT DEFAULT 'DOC-201'"),
        ("doctor_specialization", "TEXT DEFAULT 'General Physician'"),
        ("diagnosis", "TEXT DEFAULT 'General Clinical Assessment'"),
        ("medicines_json", "TEXT"),
        ("instructions", "TEXT")
    ]
    for col_name, col_type in new_cols:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE prescriptions ADD COLUMN {col_name} {col_type};")

    conn.commit()

    # Seed Medicines if empty
    cursor.execute("SELECT COUNT(*) FROM medicines;")
    if cursor.fetchone()[0] == 0:
        default_meds = [
            ("MED-001", "Astra-Zen Clear", "Paracetamol & Phenylephrine", "Flu & Fever", "Rapid relief from flu, fever & nasal congestion.", "Fever, cold, body ache", "Severe hepatic impairment", 0, 200.0, 100, "1 tablet twice daily after meals", "Do not exceed recommended dose", "Fast Delivery", "images/med_astra_zen.png"),
            ("MED-002", "Neuro-Sync", "Ginkgo Biloba & Piracetam", "Headache & Focus", "Focus enhancement & chronic headache relief formula.", "Tension headache, mental fatigue", "Bleeding disorders", 1, 360.0, 50, "1 capsule daily with water", "Prescription required. Consult doctor before use", "Prescription Required", "images/med_neuro_sync.png"),
            ("MED-003", "Gravity-Fix", "Diclofenac Gel", "Muscle & Joint", "Topical recovery gel for muscle aches, sprains & joint stiffness.", "Muscle pain, strain, arthritis", "Open wounds or cut skin", 0, 240.0, 80, "Apply thin layer 3 times daily", "For external use only", "Fast Delivery", "images/med_gravity_fix.png"),
            ("MED-004", "BioShield-X", "Amoxicillin 500mg", "Antibiotic", "Broad-spectrum antibiotic capsules for bacterial infections.", "Bacterial respiratory & throat infections", "Penicillin allergy", 1, 304.0, 40, "1 capsule every 8 hours for 5 days", "Finish full course as directed by doctor", "Prescription Required", "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=320&h=200&fit=crop&auto=format"),
            ("MED-005", "PainAway Pro", "Ibuprofen & Paracetamol", "Pain & Inflammation", "Advanced pain & inflammation relief for moderate body pain.", "Headache, dental pain, muscle pain", "Active stomach ulcer", 0, 176.0, 120, "1 tablet every 6 hours after meals", "Take with food to prevent gastric upset", "Fast Delivery", "https://images.unsplash.com/photo-1550572017-edd951b55104?w=320&h=200&fit=crop&auto=format"),
            ("MED-006", "GlucoBalance", "Metformin 500mg", "Diabetes", "Daily blood sugar regulation tablets for type 2 diabetes.", "Hyperglycemia, type 2 diabetes", "Severe renal dysfunction", 1, 440.0, 60, "1 tablet with morning meal", "Regular blood glucose monitoring recommended", "Prescription Required", "https://images.unsplash.com/photo-1631549916768-4119b2e5f926?w=320&h=200&fit=crop&auto=format"),
            ("MED-007", "CalmWave", "Ashwagandha & L-Theanine", "Anxiety & Stress", "Natural relaxation & anxiety management formulation.", "Mild anxiety, nervous strain, stress", "Pregnancy without medical consult", 1, 480.0, 30, "1 tablet before bedtime", "May cause slight drowsiness", "Prescription Required", "https://images.unsplash.com/photo-1576671081837-49000212a370?w=320&h=200&fit=crop&auto=format"),
            ("MED-008", "AllerShield", "Cetirizine 10mg", "Allergy Relief", "24-hour non-drowsy antihistamine allergy relief.", "Allergic rhinitis, hives, skin itching", "Hypersensitivity to cetirizine", 0, 144.0, 150, "1 tablet once daily in evening", "Avoid alcohol while taking antihistamines", "Fast Delivery", "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=320&h=200&fit=crop&auto=format"),
            ("MED-009", "VitaCore Plus", "Multivitamins & Minerals", "Vitamins & Immunity", "Complete daily multivitamin & zinc immunity booster complex.", "Nutritional deficiency, fatigue, immunity support", "Hypervitaminosis", 0, 160.0, 200, "1 tablet daily after breakfast", "Dietary supplement — not a medicine replacement", "Fast Delivery", "https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?w=320&h=200&fit=crop&auto=format"),
            ("MED-010", "Paracetamol 500mg", "Paracetamol", "Fever & Pain Relief", "Relieves mild to moderate fever & pain. Safe OTC tablet.", "Fever, mild headache, cold body ache", "Severe liver condition", 0, 25.0, 500, "1-2 tablets every 4-6 hours", "Maximum 4000mg per 24 hours", "Fast Delivery", "images/med_paracetamol.png"),
            ("MED-011", "Dolo 650", "Paracetamol 650mg", "Fever & Body Ache", "650mg paracetamol — trusted fever & body ache relief.", "High fever, dengue/flu body ache", "Severe hepatic impairment", 0, 31.0, 400, "1 tablet 3 times a day after food", "Do not combine with other paracetamol products", "Fast Delivery", "images/med_dolo_650.png"),
            ("MED-012", "Crocin Advance", "Fast-Release Paracetamol", "Fever & Headache", "Fast-acting fever & headache relief by GSK.", "Headache, fever, toothache", "Allergy to paracetamol", 0, 42.0, 300, "1 tablet every 4 hours as needed", "Starts working in 5 minutes", "Fast Delivery", "images/med_crocin.png"),
            ("MED-013", "Digene Gel", "Magaldrate & Simethicone", "Acidity & Digestion", "Soothing antacid liquid gel for fast heartburn & acid reflux relief.", "Acidity, heartburn, bloating, stomach gas", "Kidney failure", 0, 115.0, 0, "2 teaspoons after meals and at bedtime", "Out of stock item demonstration", "Out of Stock", "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=320&h=200&fit=crop&auto=format")
        ]
        cursor.executemany("""
        INSERT INTO medicines (medicine_id, name, generic_name, category, description, indications, contraindications, prescription_required, price, stock, dosage_information, warnings, tag, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, default_meds)

    # Seed All Doctors with 100% Unique Profile Photos & Diverse Specializations
    all_docs = [
        ("DOC-201", "Dr. Rajesh Kumar", "MBBS, MD (General Medicine)", "General Physician (Fever, Cold, Cough & Viral Flu)", "15+ Years", 0.0, "Available Today", "Online", 4.9, 6100, "Expert General Physician specializing in viral fever, acute cold, persistent cough, tension headache, seasonal infections & preventive care.", "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop"),
        ("DOC-202", "Dr. Sunita Sharma", "MBBS, DNB (Internal Medicine)", "General Practitioner (Stomach Pain, Gastric & Acidity)", "12+ Years", 0.0, "Available Today", "Online", 4.9, 4800, "Specialist in stomach pain, abdominal cramps, gastric reflux, heartburn, bloating, indigestion & nausea care.", "https://images.unsplash.com/photo-1594824813566-78853679014b?w=400&h=400&fit=crop"),
        ("DOC-203", "Dr. Amit Patel", "MBBS, MD (Family Medicine)", "Family Physician (Headache, Body Ache & Muscle Pain)", "10+ Years", 0.0, "Available Today", "Online", 4.8, 3900, "Primary care practitioner for acute headache, migraine, generalized body aches, muscle fatigue & overall wellness guidance.", "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&h=400&fit=crop"),
        ("DOC-204", "Dr. Sneha Kulkarni", "MBBS, MD (General Medicine)", "General Physician (Fever, Headache & Weakness)", "11+ Years", 0.0, "Available Today", "Online", 4.9, 3200, "Expert in seasonal fever, shivering, severe headaches, chronic fatigue, weakness & nutritional assessment.", "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop"),
        ("DOC-205", "Dr. Vikram Malhotra", "MBBS, MS (General Medicine)", "General Medicine (Cold, Cough, Sore Throat & Body Pain)", "16+ Years", 0.0, "Available Today", "Online", 4.9, 4500, "Senior physician handling upper respiratory infections, chest congestion, sore throat, sneezing, dry cough & body pain.", "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop"),
        ("DOC-206", "Dr. Pooja Deshmukh", "MBBS, DNB (Family Health)", "Gastroenterologist & Digestive Care", "9+ Years", 0.0, "Available Today", "Online", 4.8, 2800, "Dedicated to treating stomach ache, food poisoning, gastritis, IBS, acidity, constipation & gut wellness.", "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=400&h=400&fit=crop"),
        ("DOC-101", "Dr. Naresh Trehan", "MBBS, MS, MCh (Cardiothoracic)", "Cardiologist (Heart & Blood Pressure)", "35+ Years", 0.0, "Available Today", "Online", 4.9, 5200, "Pioneer in cardiac surgery, heart wellness, hypertension control & cardiovascular disease prevention.", "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop"),
        ("DOC-102", "Dr. Ashok Seth", "MD, DM (Cardiology), FRCP", "Cardiologist (Interventional Cardiology)", "30+ Years", 0.0, "Available Today", "Online", 4.9, 4200, "Renowned cardiologist specializing in coronary health, ECG analysis, angina & cardiac therapy.", "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=400&fit=crop"),
        ("DOC-103", "Dr. Sandeep Vaishya", "MBBS, MS, MCh (Neurosurgery)", "Neurologist (Brain & Spine Care)", "25+ Years", 0.0, "Available Today", "Online", 4.8, 3800, "Expert neurosurgeon dealing with brain tumor, spine surgery & deep brain stimulation.", "https://images.unsplash.com/photo-1638202993928-7267aad84c31?w=400&h=400&fit=crop"),
        ("DOC-104", "Dr. Meera Iyer", "MD (Neurology), DM", "Neurologist (Headache & Migraines)", "18+ Years", 0.0, "Available Today", "Online", 4.9, 2900, "Specialist in chronic migraine, tension headaches, insomnia, epilepsy, nerve numbness & neurological health.", "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&h=400&fit=crop"),
        ("DOC-105", "Dr. Priya Sharma", "MD (Pediatrics), DCH", "Pediatrician (Child & Infant Health)", "14+ Years", 0.0, "Available Today", "Online", 4.9, 3100, "Compassionate child specialist for infant nutrition, growth milestones, childhood fevers, allergies & vaccinations.", "https://images.unsplash.com/photo-1623854767648-e7bb8009f0db?w=400&h=400&fit=crop"),
        ("DOC-106", "Dr. Anjali Mehta", "MD (Dermatology), DNB", "Dermatologist (Skin, Hair & Acne)", "16+ Years", 0.0, "Available Today", "Online", 4.9, 4700, "Expert in clinical dermatology, acne, eczema, fungal infections, skin rashes, hair fall & scalp treatment.", "https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&h=400&fit=crop"),
        ("DOC-107", "Dr. Rajiv Verma", "MS (Orthopedics), MCh", "Orthopedic (Bone, Joint & Spine)", "20+ Years", 0.0, "Available Today", "Online", 4.8, 3300, "Joint replacement, lower back pain, knee arthritis, posture correction & sports injury rehab.", "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=400&h=400&fit=crop"),
        ("DOC-108", "Dr. Sunita Rao", "MD (Psychiatry), DPM", "Psychiatrist & Mental Health", "15+ Years", 0.0, "Available Today", "Online", 4.9, 2200, "Holistic mental wellness specialist treating anxiety, panic attacks, depression, chronic stress & sleep disorders.", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop"),
        ("DOC-109", "Dr. Amol Kulkarni", "MD, DM (Endocrinology)", "Diabetologist & Endocrinologist", "19+ Years", 0.0, "Available Today", "Online", 4.8, 1800, "Specialist in type 1 & 2 diabetes management, thyroid disorders (hypo/hyperthyroidism) & hormonal balance.", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop"),
        ("DOC-110", "Dr. Farhan Qureshi", "MD (Pulmonology), FCCP", "Pulmonologist (Lungs & Asthma)", "17+ Years", 0.0, "Available Today", "Online", 4.9, 2000, "Chest & respiratory consultant for chronic cough, asthma, bronchitis, wheezing & seasonal lung allergies.", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop"),
        ("DOC-111", "Dr. Kavitha Nair", "MD (Obstetrics & Gynecology)", "Gynecologist & Women's Health", "22+ Years", 0.0, "Available Today", "Online", 4.9, 3600, "Women's health, menstrual irregularities, PCOS/PCOD care, prenatal wellness & hormonal guidance.", "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop"),
        ("DOC-112", "Dr. Arvinder Singh Soin", "MS, FRCS (Edin)", "General Physician & Organ Care", "28+ Years", 0.0, "Available Today", "Online", 4.9, 2500, "Senior physician expert in general diagnosis, preventive health, liver function & metabolic care.", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop"),
        ("DOC-113", "Dr. Rohan Sengupta", "MS (ENT), DLO", "ENT Specialist (Ear, Nose & Throat)", "13+ Years", 0.0, "Available Today", "Online", 4.8, 2100, "Treatment for ear pain, sinusitis, tonsillitis, nasal polyps, tinnitus & throat infections.", "https://images.unsplash.com/photo-1622902046580-2b47f47f5471?w=400&h=400&fit=crop"),
        ("DOC-114", "Dr. Shalini Gupta", "MS (Ophthalmology), DNB", "Ophthalmologist (Eye Specialist)", "15+ Years", 0.0, "Available Today", "Online", 4.9, 2700, "Eye strain care, dry eye syndrome, conjunctivitis, vision assessment & computer vision syndrome.", "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop"),
        ("DOC-115", "Dr. Vivek Chawla", "BDS, MDS (Oral & Dental)", "Dentist & Dental Surgeon", "12+ Years", 0.0, "Available Today", "Online", 4.8, 2300, "Dental hygiene, severe toothache, gum bleeding, cavity consultation & post-dental care.", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop"),
        ("DOC-116", "Dr. Ananya Roy", "M.Sc (Clinical Nutrition), RD", "Dietitian & Clinical Nutritionist", "10+ Years", 0.0, "Available Today", "Online", 4.9, 3100, "Personalized diet plans for weight loss, diabetes control, high cholesterol, immunity & gut health.", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop"),
        ("DOC-117", "Dr. Deepak Nambiar", "MS, MCh (Urology)", "Urologist & Kidney Specialist", "18+ Years", 0.0, "Available Today", "Online", 4.9, 1900, "Specialist in kidney stones, urinary tract infections (UTI), prostate health & renal wellness.", "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop"),
        ("DOC-118", "Dr. Neha Bhatt", "BAMS, MD (Ayurveda)", "Ayurvedic & Holistic Physician", "14+ Years", 0.0, "Available Today", "Online", 4.8, 1700, "Natural immunity boosters, chronic digestion issues, joint wellness & herbal healing protocols.", "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400&h=400&fit=crop")
    ]
    cursor.executemany("""
    INSERT OR REPLACE INTO doctors (doctor_id, name, qualification, specialization, experience, consultation_fee, availability, status, rating, review_count, about, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    """, all_docs)

    conn.commit()
    conn.close()

init_db()

# ── Schemas ───────────────────────────────────────────────
class UserAuth(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class SymptomInput(BaseModel):
    symptoms: str
    category: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None

class AddressSchema(BaseModel):
    full_name: str
    mobile: str
    building: str
    street: str
    city: str
    district: str
    state: str
    pincode: str
    address_type: Optional[str] = "Home"
    is_default: Optional[bool] = False

class OrderItemSchema(BaseModel):
    medicine_id: str
    medicine_name: str
    price: float
    quantity: int

class OrderCreateSchema(BaseModel):
    user_id: str
    user_email: str
    address_id: str
    items: List[OrderItemSchema]
    payment_method: Optional[str] = "Demo UPI / Card"

class ConsultationCreateSchema(BaseModel):
    user_id: str
    doctor_id: str
    consultation_type: Optional[str] = "Chat"

class MessageSchema(BaseModel):
    sender_id: str
    sender_type: str  # 'user' or 'doctor'
    message: str

class MedicineItemSchema(BaseModel):
    name: str
    dosage: Optional[str] = "1 tablet"
    frequency: Optional[str] = "Twice daily after food (1-0-1)"
    duration: Optional[str] = "5 days"
    instructions: Optional[str] = "Take with warm water after meals"

class PrescriptionSchema(BaseModel):
    user_id: str
    patient_name: str
    doctor_id: Optional[str] = "DOC-201"
    doctor_name: Optional[str] = "Dr. Rajesh Kumar"
    doctor_specialization: Optional[str] = "General Physician"
    diagnosis: Optional[str] = "Clinical Assessment"
    medicines: Optional[List[MedicineItemSchema]] = []
    medication: Optional[str] = None
    dosage: Optional[str] = None
    instructions: Optional[str] = "Take prescribed medicines on time. Drink plenty of water and get adequate rest."

# ── API Routes ─────────────────────────────────────────────

@app.get("/api/status")
def get_status():
    return {"status": "operational", "system": "Antigravity Health Engine v2.0", "timestamp": datetime.now().isoformat()}

# AUTH APIs
@app.post("/api/auth/register")
def register_user(data: UserAuth, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (data.email,))
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Account with this email already exists.")
    
    uid = f"usr_{int(time.time()*1000)}"
    full_name = data.full_name or data.email.split("@")[0]
    cursor.execute("INSERT INTO users (uid, email, password, full_name) VALUES (?, ?, ?, ?)",
                   (uid, data.email, data.password, full_name))
    db.commit()
    return {"status": "success", "user": {"uid": uid, "email": data.email, "full_name": full_name}}

@app.post("/api/auth/login")
def login_user(data: UserAuth, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT uid, email, password, full_name FROM users WHERE email = ?", (data.email,))
    row = cursor.fetchone()
    if not row or row["password"] != data.password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {"status": "success", "user": {"uid": row["uid"], "email": row["email"], "full_name": row["full_name"]}}

# MEDICINE APIs
@app.get("/api/medicines")
def list_medicines(category: Optional[str] = None, q: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    query = "SELECT * FROM medicines WHERE 1=1"
    params = []
    if category and category != "All":
        query += " AND category LIKE ?"
        params.append(f"%{category}%")
    if q:
        query += " AND (name LIKE ? OR generic_name LIKE ? OR category LIKE ? OR description LIKE ?)"
        params.extend([f"%{q}%", f"%{q}%", f"%{q}%", f"%{q}%"])
    query += " ORDER BY id ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    return [dict(r) for r in rows]

@app.get("/api/medicines/{medicine_id}")
def get_medicine(medicine_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM medicines WHERE medicine_id = ? OR id = ?", (medicine_id, medicine_id))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return dict(row)

# ADDRESS APIs
@app.get("/api/addresses")
def get_addresses(user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC", (user_id,))
    return [dict(r) for r in cursor.fetchall()]

@app.post("/api/addresses")
def add_address(data: AddressSchema, user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    if not data.full_name or not data.mobile or not data.building or not data.pincode:
        raise HTTPException(status_code=400, detail="Please fill in all mandatory address fields.")
    if len(data.mobile) < 10 or not data.mobile.isdigit():
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")
    if len(data.pincode) < 6 or not data.pincode.isdigit():
        raise HTTPException(status_code=400, detail="Please enter a valid 6-digit PIN code.")

    address_id = f"addr_{int(time.time()*1000)}"
    if data.is_default:
        cursor.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", (user_id,))
    
    cursor.execute("""
    INSERT INTO addresses (address_id, user_id, full_name, mobile, building, street, city, district, state, pincode, address_type, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (address_id, user_id, data.full_name, data.mobile, data.building, data.street, data.city, data.district, data.state, data.pincode, data.address_type, 1 if data.is_default else 0))
    db.commit()
    return {"status": "success", "address_id": address_id}

@app.delete("/api/addresses/{address_id}")
def delete_address(address_id: str, user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("DELETE FROM addresses WHERE address_id = ? AND user_id = ?", (address_id, user_id))
    db.commit()
    return {"status": "deleted"}

@app.put("/api/addresses/{address_id}/default")
def set_default_address(address_id: str, user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("UPDATE addresses SET is_default = 0 WHERE user_id = ?", (user_id,))
    cursor.execute("UPDATE addresses SET is_default = 1 WHERE address_id = ? AND user_id = ?", (address_id, user_id))
    db.commit()
    return {"status": "default_updated"}

# ORDER APIs
@app.post("/api/orders")
def create_order(data: OrderCreateSchema, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    if not data.user_id:
        raise HTTPException(status_code=401, detail="User authentication required to place order.")
    if not data.items:
        raise HTTPException(status_code=400, detail="Cart is empty.")
    
    # Fetch address
    cursor.execute("SELECT * FROM addresses WHERE address_id = ? AND user_id = ?", (data.address_id, data.user_id))
    addr_row = cursor.fetchone()
    if not addr_row:
        raise HTTPException(status_code=400, detail="Invalid or missing delivery address. Please select a valid address.")
    
    addr_dict = dict(addr_row)
    address_str = f"{addr_dict['full_name']}, {addr_dict['building']}, {addr_dict['street']}, {addr_dict['city']}, {addr_dict['district']}, {addr_dict['state']} - {addr_dict['pincode']} (Ph: {addr_dict['mobile']})"
    
    # Validate items & calculate total on backend (prevent price tampering)
    subtotal = 0.0
    verified_items = []
    
    for item in data.items:
        cursor.execute("SELECT * FROM medicines WHERE medicine_id = ? OR name = ?", (item.medicine_id, item.medicine_name))
        med = cursor.fetchone()
        if not med:
            raise HTTPException(status_code=400, detail=f"Medicine '{item.medicine_name}' is not available.")
        if med["stock"] < item.quantity:
            raise HTTPException(status_code=400, detail=f"'{med['name']}' is out of stock (Available: {med['stock']}).")
        
        real_price = float(med["price"])
        subtotal += real_price * item.quantity
        verified_items.append({
            "medicine_id": med["medicine_id"],
            "medicine_name": med["name"],
            "price": real_price,
            "quantity": item.quantity
        })

    delivery_fee = 30.0 if subtotal > 0 else 0.0
    total_amount = subtotal + delivery_fee
    order_id = f"AGY-ORD-{random.randint(100000, 999999)}"

    cursor.execute("""
    INSERT INTO orders (order_id, user_id, user_email, address_json, subtotal, delivery_fee, total_amount, payment_status, payment_method, order_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'Paid (Demo)', ?, 'Order Placed')
    """, (order_id, data.user_id, data.user_email, address_str, subtotal, delivery_fee, total_amount, data.payment_method))

    for item in verified_items:
        cursor.execute("""
        INSERT INTO order_items (order_id, medicine_id, medicine_name, price, quantity)
        VALUES (?, ?, ?, ?, ?)
        """, (order_id, item["medicine_id"], item["medicine_name"], item["price"], item["quantity"]))
        
        # Deduct stock
        cursor.execute("UPDATE medicines SET stock = stock - ? WHERE medicine_id = ?", (item["quantity"], item["medicine_id"]))

    db.commit()
    return {
        "status": "success",
        "order_id": order_id,
        "total_amount": total_amount,
        "delivery_address": address_str,
        "message": "Order placed successfully! Arriving in ~30 mins."
    }

@app.get("/api/orders")
def list_user_orders(user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY id DESC", (user_id,))
    orders = [dict(r) for r in cursor.fetchall()]
    
    for ord_obj in orders:
        cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (ord_obj["order_id"],))
        ord_obj["items"] = [dict(i) for i in cursor.fetchall()]
        
    return orders

@app.get("/api/orders/{order_id}")
def get_order_details(order_id: str, user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM orders WHERE order_id = ? AND user_id = ?", (order_id, user_id))
    ord_row = cursor.fetchone()
    if not ord_row:
        raise HTTPException(status_code=404, detail="Order not found.")
    
    res = dict(ord_row)
    cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    res["items"] = [dict(i) for i in cursor.fetchall()]
    return res

@app.post("/api/orders/{order_id}/cancel")
def cancel_order(order_id: str, user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM orders WHERE order_id = ? AND user_id = ?", (order_id, user_id))
    ord_row = cursor.fetchone()
    if not ord_row:
        raise HTTPException(status_code=404, detail="Order not found.")
    
    if ord_row["order_status"] in ["Shipped", "Delivered"]:
        raise HTTPException(status_code=400, detail="Cannot cancel an order that has already been shipped or delivered.")
    
    cursor.execute("UPDATE orders SET order_status = 'Cancelled', payment_status = 'Refunded (Demo)' WHERE order_id = ?", (order_id,))
    
    # Restore stock
    cursor.execute("SELECT * FROM order_items WHERE order_id = ?", (order_id,))
    items = cursor.fetchall()
    for item in items:
        cursor.execute("UPDATE medicines SET stock = stock + ? WHERE medicine_id = ?", (item["quantity"], item["medicine_id"]))
        
    db.commit()
    return {"status": "cancelled", "message": "Order has been cancelled successfully."}

# DOCTORS APIs
@app.get("/api/doctors")
def list_doctors(specialty: Optional[str] = None, q: Optional[str] = None, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    query = "SELECT * FROM doctors WHERE 1=1"
    params = []
    if specialty and specialty != "All":
        query += " AND (specialization LIKE ? OR about LIKE ?)"
        params.extend([f"%{specialty}%", f"%{specialty}%"])
    if q:
        q_clean = f"%{q.strip()}%"
        query += " AND (name LIKE ? OR qualification LIKE ? OR specialization LIKE ? OR about LIKE ?)"
        params.extend([q_clean, q_clean, q_clean, q_clean])
    query += " ORDER BY id ASC"
    cursor.execute(query, params)
    return [dict(r) for r in cursor.fetchall()]

@app.get("/api/doctors/{doctor_id}")
def get_doctor(doctor_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM doctors WHERE doctor_id = ? OR id = ?", (doctor_id, doctor_id))
    doc = cursor.fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return dict(doc)

# CONSULTATIONS & CHAT APIs
@app.post("/api/consultations")
def start_consultation(data: ConsultationCreateSchema, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM doctors WHERE doctor_id = ?", (data.doctor_id,))
    doc = cursor.fetchone()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
    
    consultation_id = f"CNS-{random.randint(100000, 999999)}"
    cursor.execute("""
    INSERT INTO consultations (consultation_id, user_id, doctor_id, doctor_name, specialization, consultation_type, status)
    VALUES (?, ?, ?, ?, ?, ?, 'Active')
    """, (consultation_id, data.user_id, data.doctor_id, doc["name"], doc["specialization"], data.consultation_type))

    # Add welcome message from doctor
    consult_type_label = "Video Consultation" if data.consultation_type == "Video Call" else "Chat Consultation"
    welcome_msg = f"Hello! I am {doc['name']} ({doc['specialization']}). Welcome to your {consult_type_label}. How can I assist you with your symptoms or health concern today?"
    msg_id = f"msg_{int(time.time()*1000)}"
    cursor.execute("""
    INSERT INTO messages (message_id, consultation_id, sender_id, sender_type, message)
    VALUES (?, ?, ?, 'doctor', ?)
    """, (msg_id, consultation_id, data.doctor_id, welcome_msg))

    db.commit()
    return {
        "status": "success", 
        "consultation_id": consultation_id, 
        "doctor_id": doc["doctor_id"],
        "doctor_name": doc["name"], 
        "specialization": doc["specialization"],
        "consultation_type": data.consultation_type
    }

@app.get("/api/consultations")
def get_user_consultations(user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM consultations WHERE user_id = ? ORDER BY id DESC", (user_id,))
    return [dict(r) for r in cursor.fetchall()]

@app.get("/api/consultations/{consultation_id}/messages")
def get_chat_messages(consultation_id: str, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM messages WHERE consultation_id = ? ORDER BY id ASC", (consultation_id,))
    return [dict(r) for r in cursor.fetchall()]

@app.post("/api/consultations/{consultation_id}/messages")
def send_chat_message(consultation_id: str, data: MessageSchema, db: sqlite3.Connection = Depends(get_db)):
    cursor = db.cursor()
    cursor.execute("SELECT * FROM consultations WHERE consultation_id = ?", (consultation_id,))
    c_row = cursor.fetchone()
    if not c_row:
        raise HTTPException(status_code=404, detail="Consultation session not found")
    
    # Save user message
    user_msg_id = f"msg_{int(time.time()*1000)}"
    cursor.execute("""
    INSERT INTO messages (message_id, consultation_id, sender_id, sender_type, message)
    VALUES (?, ?, ?, ?, ?)
    """, (user_msg_id, consultation_id, data.sender_id, data.sender_type, data.message))

    # Auto-generate contextual doctor response in Demo Mode
    doc_reply_id = f"msg_{int(time.time()*1000)+1}"
    user_text_lower = data.message.lower()
    
    if any(w in user_text_lower for w in ["fever", "temperature", "chills"]):
        reply_text = f"I understand you are experiencing fever. Monitor your temperature every 4-6 hours, drink plenty of warm fluids, and take Paracetamol / Dolo 650 if fever exceeds 100°F. I will prepare your Digital Prescription summary."
    elif any(w in user_text_lower for w in ["headache", "migraine", "head pain"]):
        reply_text = f"For your headache, ensure you are well hydrated and rest in a quiet, dark room. I recommend a mild analgesic like Crocin Advance or Paracetamol 500mg. Let me generate a digital prescription for you."
    elif any(w in user_text_lower for w in ["cold", "cough", "throat", "sneeze"]):
        reply_text = f"For cold and cough symptoms, warm saline gargles, steam inhalation, and anti-histamine/decongestant formulations like Astra-Zen Clear provide rapid relief. You can find this in your prescription."
    elif any(w in user_text_lower for w in ["stomach", "acidity", "gas", "nausea", "abdomen", "cramp"]):
        reply_text = f"Noted regarding your stomach discomfort. Avoid oily and spicy foods today. An antacid formulation like Digene Gel and light meals will help soothe gastric irritation."
    elif any(w in user_text_lower for w in ["body pain", "muscle", "back", "joint", "ache"]):
        reply_text = f"For body and muscle aches, rest adequately. Topical Diclofenac gel (Gravity-Fix) or PainAway Pro will help relieve muscular inflammation."
    elif any(w in user_text_lower for w in ["prescription", "rx", "medicine", "tablet", "dose"]):
        reply_text = "I have reviewed your symptoms and prepared the Digital Prescription for you with the appropriate dosage, frequency, and duration. Click 'Create Digital Prescription' to view and order directly from our pharmacy."
    elif "thank" in user_text_lower or "ok" in user_text_lower:
        reply_text = "You are most welcome! Stay well hydrated, take your medicines on schedule, and reach out if symptoms persist."
    else:
        reply_text = f"Thank you for sharing your symptoms with me. I am noting down your condition. Could you mention how long you've had these symptoms, and if you have any drug allergies?"

    cursor.execute("""
    INSERT INTO messages (message_id, consultation_id, sender_id, sender_type, message)
    VALUES (?, ?, ?, 'doctor', ?)
    """, (doc_reply_id, consultation_id, c_row["doctor_id"], reply_text))

    db.commit()
    return {"status": "sent", "reply": reply_text}

# PRESCRIPTION APIs
@app.get("/api/prescriptions")
def get_prescriptions(user_id: str = Query(...), db: sqlite3.Connection = Depends(get_db)):
    import json
    cursor = db.cursor()
    cursor.execute("SELECT * FROM prescriptions WHERE user_id = ? ORDER BY id DESC", (user_id,))
    rows = cursor.fetchall()
    results = []
    for r in rows:
        d = dict(r)
        if d.get("medicines_json"):
            try:
                d["medicines"] = json.loads(d["medicines_json"])
            except Exception:
                d["medicines"] = []
        else:
            d["medicines"] = [{
                "name": d.get("medication") or "Prescribed Medication",
                "dosage": d.get("dosage") or "1 tablet",
                "frequency": "Twice daily after food",
                "duration": "5 days",
                "instructions": "Follow doctor advice"
            }]
        results.append(d)
    return results

@app.get("/api/prescriptions/{prescription_id}")
def get_single_prescription(prescription_id: str, db: sqlite3.Connection = Depends(get_db)):
    import json
    cursor = db.cursor()
    cursor.execute("SELECT * FROM prescriptions WHERE prescription_id = ? OR id = ?", (prescription_id, prescription_id))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Prescription not found")
    d = dict(row)
    if d.get("medicines_json"):
        try:
            d["medicines"] = json.loads(d["medicines_json"])
        except Exception:
            d["medicines"] = []
    else:
        d["medicines"] = [{
            "name": d.get("medication") or "Prescribed Medication",
            "dosage": d.get("dosage") or "1 tablet",
            "frequency": "Twice daily after food",
            "duration": "5 days",
            "instructions": "Follow doctor advice"
        }]
    return d

@app.post("/api/prescriptions")
def create_prescription(data: PrescriptionSchema, db: sqlite3.Connection = Depends(get_db)):
    import json
    cursor = db.cursor()
    rx_id = f"RX-{random.randint(100000, 999999)}"
    
    med_list = []
    if data.medicines and len(data.medicines) > 0:
        med_list = [m.dict() for m in data.medicines]
        med_summary = ", ".join([m["name"] for m in med_list])
        dose_summary = "; ".join([f"{m['name']}: {m.get('dosage','')} ({m.get('frequency','')})" for m in med_list])
    else:
        med_summary = data.medication or "Astra-Zen Clear"
        dose_summary = data.dosage or "1 tablet twice daily after meals"
        med_list = [{
            "name": med_summary,
            "dosage": dose_summary,
            "frequency": "Twice daily after food (1-0-1)",
            "duration": "5 days",
            "instructions": data.instructions or "Take with warm water after food"
        }]
    
    meds_json_str = json.dumps(med_list)
    doctor_name = data.doctor_name or "Dr. Rajesh Kumar"
    doc_spec = data.doctor_specialization or "General Physician"
    diagnosis = data.diagnosis or "Viral Flu & General Clinical Assessment"
    instructions = data.instructions or "Take prescribed medicines on time. Stay hydrated and rest."
    
    cursor.execute("""
    INSERT INTO prescriptions (
        prescription_id, user_id, patient_name, medication, dosage, 
        doctor_id, doctor_name, doctor_specialization, diagnosis, 
        medicines_json, instructions
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        rx_id, data.user_id, data.patient_name, med_summary, dose_summary,
        data.doctor_id or "DOC-201", doctor_name, doc_spec, diagnosis,
        meds_json_str, instructions
    ))
    db.commit()
    return {
        "status": "success",
        "prescription_id": rx_id,
        "patient_name": data.patient_name,
        "doctor_name": doctor_name,
        "doctor_specialization": doc_spec,
        "diagnosis": diagnosis,
        "medicines": med_list,
        "instructions": instructions
    }

@app.post("/api/prescriptions/{prescription_id}/match-pharmacy")
def match_prescription_pharmacy(prescription_id: str, db: sqlite3.Connection = Depends(get_db)):
    import json
    cursor = db.cursor()
    cursor.execute("SELECT * FROM prescriptions WHERE prescription_id = ?", (prescription_id,))
    rx_row = cursor.fetchone()
    if not rx_row:
        raise HTTPException(status_code=404, detail="Prescription not found")
    
    rx_dict = dict(rx_row)
    med_items = []
    if rx_dict.get("medicines_json"):
        try:
            med_items = json.loads(rx_dict["medicines_json"])
        except Exception:
            med_items = []
    if not med_items and rx_dict.get("medication"):
        med_items = [{"name": rx_dict["medication"], "dosage": rx_dict.get("dosage", "")}]
    
    matched_items = []
    for item in med_items:
        med_name = item.get("name", "").strip()
        # Look for match in medicines table
        cursor.execute("SELECT * FROM medicines WHERE name LIKE ? OR generic_name LIKE ? LIMIT 1", (f"%{med_name}%", f"%{med_name}%"))
        med_db = cursor.fetchone()
        if med_db:
            m = dict(med_db)
            matched_items.append({
                "medicine_id": m["medicine_id"],
                "name": m["name"],
                "generic_name": m["generic_name"],
                "price": float(m["price"]),
                "stock": m["stock"],
                "image": m["image"],
                "prescription_required": m["prescription_required"],
                "dosage_instruction": (item.get("dosage", "") + " · " + item.get("frequency", "")).strip(" ·"),
                "duration": item.get("duration", "5 days"),
                "instructions": item.get("instructions", ""),
                "qty": 1,
                "is_available": m["stock"] > 0
            })
        else:
            # Fallback default matching item
            matched_items.append({
                "medicine_id": f"RX-MED-{random.randint(100,999)}",
                "name": med_name,
                "generic_name": "Prescribed Clinical Formulation",
                "price": 180.0,
                "stock": 50,
                "image": "images/med_astra_zen.png",
                "prescription_required": 1,
                "dosage_instruction": item.get("dosage", ""),
                "duration": item.get("duration", "5 days"),
                "instructions": item.get("instructions", ""),
                "qty": 1,
                "is_available": True
            })
    return {
        "status": "success",
        "prescription_id": prescription_id,
        "patient_name": rx_dict.get("patient_name"),
        "doctor_name": rx_dict.get("doctor_name"),
        "diagnosis": rx_dict.get("diagnosis"),
        "matched_items": matched_items
    }

# ── AI SYMPTOM CHECKER API ────────────────────────────────
@app.post("/api/analyze-symptoms")
def analyze_symptoms(data: SymptomInput, db: sqlite3.Connection = Depends(get_db)):
    symptoms_text = data.symptoms.strip()
    symptoms_lower = symptoms_text.lower()
    selected_category = (data.category or "").strip().lower()
    history = data.history or []

    # Reconstruct previous context from conversation history
    prev_user_queries = [h.get("content", "").lower() for h in history if h.get("role") == "user"]
    all_context_text = " ".join(prev_user_queries + [symptoms_lower])

    if not symptoms_text:
        return {
            "advice": "Please describe your symptoms, discomfort, or health question so our clinical engine can evaluate your condition.",
            "recommend_consultation": False,
            "is_emergency": False,
            "possible_conditions": [],
            "suggested_specialist": "General Physician",
            "recommended_doctor": None,
            "follow_up_questions": ["I have a fever and body chills", "I have a severe headache", "I have stomach pain and gas", "I have a cold and persistent cough"],
            "recommended_medicines": []
        }

    # 1. Emergency Red Flags Check
    emergency_keywords = [
        "chest pain", "shortness of breath", "cannot breathe", "difficulty breathing",
        "coughing blood", "paralysis", "slurred speech", "stroke", "heart attack",
        "unconscious", "passed out", "severe bleeding", "poison", "choking", "seizure",
        "crushing pressure in chest"
    ]
    if any(kw in symptoms_lower for kw in emergency_keywords):
        return {
            "advice": "🚨 <strong>URGENT MEDICAL EMERGENCY ALERT</strong><br>Your description mentions symptoms that may indicate a life-threatening critical emergency. <strong>Do NOT wait or attempt self-medication.</strong> Please call <strong>112</strong> immediately or visit the nearest emergency trauma center.",
            "recommend_consultation": True,
            "is_emergency": True,
            "possible_conditions": ["Acute Medical Emergency", "Urgent Hospital Care Required"],
            "suggested_specialist": "Emergency Physician / Cardiologist",
            "recommended_doctor": {
                "doctor_id": "DOC-101",
                "name": "Dr. Naresh Trehan",
                "specialization": "Senior Cardiologist & Emergency Specialist",
                "image": "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&h=400&fit=crop"
            },
            "follow_up_questions": ["Call 112 for emergency ambulance", "Find nearest emergency room"],
            "recommended_medicines": []
        }

    # 2. Dynamic Clinical Rule & Context Matching
    advice_parts = []
    possible_conditions = []
    matched_med_names = []
    follow_up_questions = []
    rec_doctor_id = "DOC-201" # Default General Physician

    # Check for duration / severity mentions
    is_long_duration = any(k in all_context_text for k in ["3 days", "4 days", "5 days", "week", "weeks", "persistent", "chronic", "severe", "high"])
    is_high_fever = any(k in all_context_text for k in ["101", "102", "103", "104", "high fever", "shivering", "chills"])
    has_cough = any(k in all_context_text for k in ["cough", "phlegm", "mucus", "sore throat", "throat"])
    has_acidity = any(k in all_context_text for k in ["acid", "acidity", "heartburn", "burning", "gerd", "reflux"])
    has_cramps = any(k in all_context_text for k in ["cramp", "diarrhea", "loose motion", "vomit", "food poison", "nausea"])
    has_migraine = any(k in all_context_text for k in ["migraine", "one side", "throbbing", "light sensitive", "nausea with headache"])

    # ── Category / Symptom Trees ──────────────────────────────
    if any(k in all_context_text for k in ["fever", "temperature", "pyrexia", "bukhar", "hot body"]):
        possible_conditions.extend(["Acute Viral Fever", "Seasonal Infection", "Flu Syndrome"])
        if is_high_fever or is_long_duration:
            advice_parts.append("🌡️ <strong>High / Persistent Fever Assessment:</strong> Since your fever is high or has persisted, we strongly advise consulting our General Physician. Keep yourself hydrated with oral fluids and light meals. Maintain regular temperature charting.")
            rec_doctor_id = "DOC-201"
            follow_up_questions = ["Fever is above 101°F with chills", "Having weakness and body pain", "Fever started today"]
        else:
            advice_parts.append("🌡️ <strong>Fever Management:</strong> Stay well-hydrated with warm water or electrolyte fluids. Ensure adequate bed rest. OTC anti-pyretics like <em>Dolo 650</em> or <em>Paracetamol 500mg</em> can help manage mild temperature.")
            follow_up_questions = ["Fever has lasted more than 2 days", "Also have shivering and chills", "Cough and throat pain present"]
        
        matched_med_names.extend(["Dolo 650", "Paracetamol 500mg", "Astra-Zen Clear"])
        rec_doctor_id = "DOC-201"

    if any(k in all_context_text for k in ["headache", "head pain", "migraine", "sar dard", "throbbing head"]):
        if has_migraine:
            possible_conditions.extend(["Migraine Cephalea", "Vascular Headache"])
            advice_parts.append("🧠 <strong>Migraine Care:</strong> Rest in a darkened, silent room. Apply cold compresses over your forehead and avoid bright screens. <em>Neuro-Sync</em> or <em>PainAway Pro</em> can assist in acute relief.")
            rec_doctor_id = "DOC-104"
            follow_up_questions = ["Throbbing pain on one side of head", "Triggered by screen time / stress", "Accompanied by nausea"]
        else:
            possible_conditions.extend(["Tension Headache", "Stress / Fatigue Cephalea", "Sinus Headache"])
            advice_parts.append("🧠 <strong>Headache & Tension Relief:</strong> Ensure sufficient water intake and gentle neck relaxation. Gentle temple massage and fast-acting <em>Crocin Advance</em> can help relieve pressure.")
            rec_doctor_id = "DOC-203"
            follow_up_questions = ["Tight band feeling around head", "Pain behind the eyes", "Occurring after long working hours"]
        
        matched_med_names.extend(["Crocin Advance", "Neuro-Sync", "PainAway Pro"])

    if any(k in all_context_text for k in ["cold", "cough", "sore throat", "runny nose", "sneezing", "congestion", "phlegm", "khasi"]):
        possible_conditions.extend(["Upper Respiratory Tract Infection", "Allergic Rhinitis", "Bronchial Irritation"])
        if "dry" in all_context_text:
            advice_parts.append("🫁 <strong>Dry Cough & Throat Care:</strong> Inhale steam 2-3 times daily. Honey with warm water and <em>Astra-Zen Clear</em> provides soothing anti-inflammatory action for nasal and throat irritation.")
        elif "phlegm" in all_context_text or "wet" in all_context_text or "productive" in all_context_text:
            advice_parts.append("🫁 <strong>Productive Cough & Congestion:</strong> Drink warm herbal fluids to thin secretions. Consult a doctor if mucus is discolored or chest tightness develops.")
            rec_doctor_id = "DOC-205"
        else:
            advice_parts.append("🫁 <strong>Cold & Airway Relief:</strong> Gargle with warm salt water twice daily. <em>AllerShield</em> (Cetirizine 10mg) relieves sneezing and runny nose effectively.")
        
        matched_med_names.extend(["Astra-Zen Clear", "AllerShield", "Paracetamol 500mg"])
        rec_doctor_id = "DOC-205"
        follow_up_questions = ["It is a dry hacking cough", "Producing thick yellow/green phlegm", "Severe sore throat while swallowing"]

    if any(k in all_context_text for k in ["stomach", "abdomen", "pet dard", "acidity", "gastric", "gas", "indigestion", "bloating", "diarrhea", "vomit", "cramps"]):
        if has_acidity:
            possible_conditions.extend(["Acute Gastric Hyperacidity", "GERD / Heartburn", "Dyspepsia"])
            advice_parts.append("🫄 <strong>Gastric & Acid Reflux Guidance:</strong> Avoid spicy, oily food and carbonated drinks. Do not lie down immediately after meals. Antacid formulations like <em>Digene Gel</em> provide fast heartburn neutralization.")
            rec_doctor_id = "DOC-202"
            follow_up_questions = ["Burning sensation in upper chest/stomach", "Worse after spicy or late dinner", "Bloating and frequent burping"]
        elif has_cramps:
            possible_conditions.extend(["Acute Gastroenteritis", "Food-Borne Indigestion", "Spasmodic Enteritis"])
            advice_parts.append("🫄 <strong>Stomach Cramps & Digestive Care:</strong> Sip oral rehydration solution (ORS) continuously. Eat bland foods like curd rice and bananas. Consult our specialist if vomiting or cramping persists.")
            rec_doctor_id = "DOC-206"
            follow_up_questions = ["Severe stomach cramps and loose stools", "Started after eating restaurant/outside food", "Mild bloating after lunch"]
        else:
            possible_conditions.extend(["Functional Dyspepsia", "Digestive Imbalance", "Abdominal Discomfort"])
            advice_parts.append("🫄 <strong>Digestive Support:</strong> Drink plenty of warm water. Avoid heavy dairy or fried meals.")
            rec_doctor_id = "DOC-202"
            follow_up_questions = ["Feeling bloated with gas", "Stomach pain on empty stomach", "Nausea after meals"]
        
        matched_med_names.extend(["Digene Gel", "VitaCore Plus"])

    if any(k in all_context_text for k in ["body pain", "body ache", "muscle pain", "joint pain", "back pain", "knee pain", "weakness", "fatigue", "tiredness"]):
        possible_conditions.extend(["Myalgia / Muscle Strain", "Viral Fatigue Syndrome", "Post-Stress Body Pain"])
        advice_parts.append("💪 <strong>Body Ache & Muscle Recovery:</strong> Apply topical pain relief gel like <em>Gravity-Fix</em> to tight muscle groups. Rest your limbs and stay hydrated. <em>VitaCore Plus</em> helps restore metabolic vitality.")
        matched_med_names.extend(["Gravity-Fix", "PainAway Pro", "VitaCore Plus"])
        rec_doctor_id = "DOC-203"
        follow_up_questions = ["Generalized fatigue with fever", "Muscle soreness after physical work", "Joint pain and morning stiffness"]

    if any(k in all_context_text for k in ["skin", "rash", "itching", "hives", "redness", "allergy", "khujli"]):
        possible_conditions.extend(["Allergic Urticaria", "Contact Dermatitis", "Skin Allergy"])
        advice_parts.append("🧴 <strong>Skin & Allergy Guidance:</strong> Avoid scratching or harsh chemical soaps. Apply cool compresses. <em>AllerShield</em> (Cetirizine 10mg) effectively controls itching and hives.")
        matched_med_names.extend(["AllerShield"])
        rec_doctor_id = "DOC-106"
        follow_up_questions = ["Red itchy patches on arms/legs", "Started after new soap/food", "Mild seasonal itching"]

    if any(k in all_context_text for k in ["anxiety", "stress", "panic", "sleep", "insomnia", "nervous", "tension"]):
        possible_conditions.extend(["Stress-Induced Tension", "Sleep Disruption / Insomnia", "Mild Anxiety"])
        advice_parts.append("🧘 <strong>Mental Wellness Guidance:</strong> Practice slow 4-7-8 breathing exercises and limit evening caffeine and screen blue light. <em>CalmWave</em> (Ashwagandha & L-Theanine) supports natural relaxation.")
        matched_med_names.extend(["CalmWave"])
        rec_doctor_id = "DOC-108"
        follow_up_questions = ["Trouble falling asleep at night", "Feeling anxious during work", "Waking up tired in morning"]

    if any(k in all_context_text for k in ["diabetes", "sugar", "glucose", "thirst", "polyuria"]):
        possible_conditions.extend(["Glycemic Fluctuation", "Pre-diabetes Care"])
        advice_parts.append("🩸 <strong>Metabolic & Blood Glucose Care:</strong> Track fasting and post-prandial glucose. Maintain low-glycemic fiber diet. Formulations like <em>GlucoBalance</em> support glycemic control under medical supervision.")
        matched_med_names.extend(["GlucoBalance"])
        rec_doctor_id = "DOC-109"
        follow_up_questions = ["Checking fasting sugar levels", "Excessive thirst and urination", "Routine sugar monitoring"]

    # Fallback for general unclassified query
    if not advice_parts:
        possible_conditions = ["General Health Inquiry", "Primary Health Assessment"]
        advice_parts.append(f"Thank you for sharing your query. Based on your statement (<em>\"{symptoms_text}\"</em>), we recommend monitoring your overall vitals (temperature, hydration, sleep). If you are experiencing discomfort, our certified General Physicians are available for instant video or chat consultation.")
        follow_up_questions = ["Fever and shivering", "Headache and eye strain", "Cold, cough and throat pain", "Stomach ache and indigestion"]
        rec_doctor_id = "DOC-201"
        matched_med_names.extend(["Dolo 650", "VitaCore Plus"])

    # Deduplicate lists
    possible_conditions = list(dict.fromkeys(possible_conditions))
    matched_med_names = list(dict.fromkeys(matched_med_names))

    # Fetch Doctor Details from DB
    cursor = db.cursor()
    cursor.execute("SELECT doctor_id, name, specialization, experience, rating, image, consultation_fee FROM doctors WHERE doctor_id = ?", (rec_doctor_id,))
    doc_row = cursor.fetchone()
    rec_doctor_obj = dict(doc_row) if doc_row else {
        "doctor_id": "DOC-201",
        "name": "Dr. Rajesh Kumar",
        "specialization": "General Physician",
        "experience": "15+ Years",
        "rating": 4.9,
        "image": "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&h=400&fit=crop",
        "consultation_fee": 0.0
    }

    # Fetch verified medicine details directly from database
    med_details = []
    if matched_med_names:
        placeholders = ",".join(["?"] * len(matched_med_names))
        cursor.execute(f"SELECT medicine_id, name, generic_name, category, price, stock, prescription_required, tag, image FROM medicines WHERE name IN ({placeholders}) AND stock > 0", matched_med_names)
        med_details = [dict(r) for r in cursor.fetchall()]

    formatted_advice = "<br><br>".join(advice_parts)
    formatted_advice += "<br><br>ℹ️ <small style='color:var(--text-mid);'><strong>Disclaimer:</strong> This AI guidance is for educational and preliminary assessment purposes only. It is not a formal clinical diagnosis. If symptoms persist or worsen, please connect with our certified doctors below.</small>"

    suggested_specialist = rec_doctor_obj.get("specialization", "General Physician")

    return {
        "advice": formatted_advice,
        "recommend_consultation": True,
        "is_emergency": False,
        "possible_conditions": possible_conditions,
        "suggested_specialist": suggested_specialist,
        "recommended_doctor": rec_doctor_obj,
        "follow_up_questions": follow_up_questions,
        "recommended_medicines": med_details
    }

# ── Serve Static Files ────────────────────────────────────
frontend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
images_path = os.path.join(frontend_path, "images")

app.mount("/static", StaticFiles(directory=frontend_path), name="static")
if os.path.exists(images_path):
    app.mount("/images", StaticFiles(directory=images_path), name="images")

@app.get("/")
async def read_index():
    return FileResponse(os.path.join(frontend_path, "index.html"))

@app.get("/{full_path:path}")
async def get_frontend_file(full_path: str):
    file_path = os.path.join(frontend_path, full_path)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(frontend_path, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

