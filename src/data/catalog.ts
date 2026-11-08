export interface CatalogSubject {
  code: string
  name: string
  department: string
  semester: number
}

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Electronics & Communication Engineering',
  'Mechanical Engineering',
] as const

export const DEPARTMENT_SHORT: Record<string, string> = {
  'Computer Science & Engineering': 'CSE',
  'Information Science & Engineering': 'ISE',
  'Electronics & Communication Engineering': 'ECE',
  'Mechanical Engineering': 'ME',
}

export const SUBJECTS: CatalogSubject[] = [
  { code: '21CS32', name: 'Data Structures and Algorithms', department: DEPARTMENTS[0], semester: 3 },
  { code: '21CS43', name: 'Design and Analysis of Algorithms', department: DEPARTMENTS[0], semester: 4 },
  { code: '21CS52', name: 'Operating Systems', department: DEPARTMENTS[0], semester: 5 },
  { code: '21CS62', name: 'Computer Networks', department: DEPARTMENTS[0], semester: 6 },
  { code: '21IS42', name: 'Database Management Systems', department: DEPARTMENTS[1], semester: 4 },
  { code: '21IS53', name: 'Software Engineering', department: DEPARTMENTS[1], semester: 5 },
  { code: '21IS63', name: 'Information Security', department: DEPARTMENTS[1], semester: 6 },
  { code: '21EC34', name: 'Analog Electronic Circuits', department: DEPARTMENTS[2], semester: 3 },
  { code: '21EC52', name: 'Digital Signal Processing', department: DEPARTMENTS[2], semester: 5 },
  { code: '21EC62', name: 'Microwave Engineering', department: DEPARTMENTS[2], semester: 6 },
  { code: '21ME33', name: 'Basic Thermodynamics', department: DEPARTMENTS[3], semester: 3 },
  { code: '21ME45', name: 'Fluid Mechanics', department: DEPARTMENTS[3], semester: 4 },
]

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]

export const CLASS_SECTIONS = SEMESTERS.flatMap((s) => ['A', 'B', 'C'].map((sec) => `${s}-${sec}`))

export const HOD_NAMES: Record<string, string> = {
  'Computer Science & Engineering': 'Dr. R. Meenakshi (HOD, CSE)',
  'Information Science & Engineering': 'Dr. S. Karthik (HOD, ISE)',
  'Electronics & Communication Engineering': 'Dr. P. Anand (HOD, ECE)',
  'Mechanical Engineering': 'Dr. V. Sundaram (HOD, ME)',
}

export const STUDENT_NAMES = [
  'Aarav Nair', 'Diya Menon', 'Rohan Iyer', 'Ananya Reddy', 'Karthik Subramanian', 'Meera Pillai',
  'Vihaan Shetty', 'Isha Kulkarni', 'Arjun Bhat', 'Sneha Hegde', 'Rahul Gowda', 'Priya Naik',
  'Aditya Rao', 'Kavya Shenoy', 'Nikhil Joshi', 'Pooja Desai', 'Siddharth Kamath', 'Tanvi Prabhu',
  'Harsh Patil', 'Ritika Das', 'Manoj Kumar', 'Lakshmi Narayan', 'Varun Acharya', 'Shreya Bhandary',
  'Deepak Murthy', 'Nandini Rao',
]
