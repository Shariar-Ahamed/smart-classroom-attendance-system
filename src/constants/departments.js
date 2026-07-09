export const DEPARTMENTS = [
  "Business Administration",
  "Management",
  "Real Estate",
  "Tourism & Hospitality Management",
  "Innovation & Entrepreneurship",
  "Finance and Banking",
  "Accounting",
  "Marketing",
  "Computer Science & Engineering",
  "Computing & Information System (CIS)",
  "Software Engineering",
  "Environmental Science and Disaster Management",
  "Multimedia & Creative Technology (MCT)",
  "Information Technology and Management",
  "Physical Education & Sports Science (PESS)",
  "Information and Communication Engineering",
  "Textile Engineering",
  "Electrical & Electronic Engineering",
  "Architecture",
  "Civil Engineering",
  "Pharmacy",
  "Public Health",
  "Nutrition & Food Engineering",
  "Agricultural Science (AGS)",
  "Genetic Engineering and Biotechnology",
  "English",
  "Law",
  "Journalism & Mass Communication",
  "Development Studies",
  "Information Science and Library Management"
];

export const DEPARTMENT_SHORT_FORMS = {
  "Business Administration": "BA",
  "Management": "MGT",
  "Real Estate": "RE",
  "Tourism & Hospitality Management": "THM",
  "Innovation & Entrepreneurship": "IE",
  "Finance and Banking": "FB",
  "Accounting": "ACC",
  "Marketing": "MKT",
  "Computer Science & Engineering": "CSE",
  "Computing & Information System (CIS)": "CIS",
  "Software Engineering": "SWE",
  "Environmental Science and Disaster Management": "ESDM",
  "Multimedia & Creative Technology (MCT)": "MCT",
  "Information Technology and Management": "ITM",
  "Physical Education & Sports Science (PESS)": "PESS",
  "Information and Communication Engineering": "ICE",
  "Textile Engineering": "TE",
  "Electrical & Electronic Engineering": "EEE",
  "Architecture": "ARC",
  "Civil Engineering": "CE",
  "Pharmacy": "PHAR",
  "Public Health": "PH",
  "Nutrition & Food Engineering": "NFE",
  "Agricultural Science (AGS)": "AGS",
  "Genetic Engineering and Biotechnology": "GEB",
  "English": "ENG",
  "Law": "LAW",
  "Journalism & Mass Communication": "JMC",
  "Development Studies": "DS",
  "Information Science and Library Management": "ISLM"
};

export function getShortForm(dept) {
  return DEPARTMENT_SHORT_FORMS[dept] || "DEPT";
}

export function generateSemesters() {
  const startYear = 2015;
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-indexed

  // Determine current semester
  let currentSemType = "";
  if (currentMonth >= 0 && currentMonth <= 3) {
    currentSemType = "Spring";
  } else if (currentMonth >= 4 && currentMonth <= 7) {
    currentSemType = "Summer";
  } else {
    currentSemType = "Fall";
  }

  const semesters = [];
  const semTypes = ["Spring", "Summer", "Fall"];

  // Loop from currentYear down to startYear
  for (let year = currentYear; year >= startYear; year--) {
    const startSemIndex = (year === currentYear) 
      ? semTypes.indexOf(currentSemType) 
      : 2;

    for (let s = startSemIndex; s >= 0; s--) {
      semesters.push(`${semTypes[s]} ${year}`);
    }
  }

  return semesters;
}
