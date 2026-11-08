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
  { code: '21MA11', name: 'Calculus and Differential Equations', department: DEPARTMENTS[0], semester: 1 },
  { code: '21PH22', name: 'Engineering Physics', department: DEPARTMENTS[1], semester: 2 },
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
  { code: '21IS71', name: 'Big Data Analytics', department: DEPARTMENTS[1], semester: 7 },
  { code: '21EC81', name: 'Wireless Communication', department: DEPARTMENTS[2], semester: 8 },
]

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8]

export const CLASS_SECTIONS = SEMESTERS.flatMap((s) => ['A', 'B', 'C'].map((sec) => `${s}-${sec}`))

export const HOD_NAMES: Record<string, string> = {
  'Computer Science & Engineering': 'Dr. R. Meenakshi (HOD, CSE)',
  'Information Science & Engineering': 'Dr. S. Karthik (HOD, ISE)',
  'Electronics & Communication Engineering': 'Dr. P. Anand (HOD, ECE)',
  'Mechanical Engineering': 'Dr. V. Sundaram (HOD, ME)',
}

/** Demo roster names — combined deterministically so large sections get varied, realistic names. */
export const FIRST_NAMES = [
  'Aarav', 'Diya', 'Rohan', 'Ananya', 'Karthik', 'Meera', 'Vihaan', 'Isha', 'Arjun', 'Sneha',
  'Rahul', 'Priya', 'Aditya', 'Kavya', 'Nikhil', 'Pooja', 'Siddharth', 'Tanvi', 'Harsh', 'Ritika',
  'Manoj', 'Lakshmi', 'Varun', 'Shreya', 'Deepak', 'Nandini', 'Pranav', 'Aditi', 'Kiran', 'Divya',
]
export const LAST_NAMES = [
  'Nair', 'Menon', 'Iyer', 'Reddy', 'Subramanian', 'Pillai', 'Shetty', 'Kulkarni', 'Bhat', 'Hegde',
  'Gowda', 'Naik', 'Rao', 'Shenoy', 'Joshi', 'Desai', 'Kamath', 'Prabhu', 'Patil', 'Das',
  'Kumar', 'Narayan', 'Acharya', 'Bhandary', 'Murthy', 'Hebbar', 'Poojary', 'Kini', 'Sharma', 'Varma',
]
