import { nanoid } from 'nanoid';

// Centralized stage definitions to ensure consistency
export const STAGES = {
  APPLIED: 'applied',
  SCREEN: 'screen',
  TECH: 'tech',
  OFFER: 'offer',
  HIRED: 'hired',
  REJECTED: 'rejected'
};

// Export as array for iteration
export const stagesList = [
  STAGES.APPLIED,
  STAGES.SCREEN,
  STAGES.TECH, 
  STAGES.OFFER,
  STAGES.HIRED,
  STAGES.REJECTED
];

// Job status constants
export const JOB_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  DRAFT: 'draft',
  ARCHIVED: 'archived'
};

const jobTitles = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'DevOps Engineer',
  'Data Scientist',
  'Product Manager',
  'UX Designer',
  'UI Designer',
  'QA Engineer',
  'Mobile Developer',
  'Machine Learning Engineer',
  'Security Engineer',
  'Technical Writer',
  'Sales Engineer',
  'Customer Success Manager',
  'Marketing Manager',
  'HR Specialist',
  'Financial Analyst',
  'Operations Manager',
  'Business Analyst',
  'Project Manager',
  'Scrum Master',
  'Solutions Architect',
  'Database Administrator',
  'System Administrator'
];

const techTags = [
  'React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java', 'TypeScript',
  'JavaScript', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB',
  'GraphQL', 'REST', 'Git', 'Agile', 'Remote', 'Senior', 'Junior'
];

const skillsList = [
  'JavaScript', 'TypeScript', 'React', 'Vue.js', 'Angular', 'Node.js', 
  'Express', 'Next.js', 'Python', 'Django', 'Flask', 'Ruby', 'Rails',
  'Java', 'Spring Boot', 'C#', '.NET', 'PHP', 'Laravel', 'Go', 'Rust',
  'Swift', 'Kotlin', 'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
  'CI/CD', 'GraphQL', 'REST API', 'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL',
  'MySQL', 'Redis', 'Kafka', 'RabbitMQ', 'Microservices', 'TDD', 'Agile',
  'Scrum', 'UI/UX', 'CSS', 'SASS', 'LESS', 'Tailwind', 'Bootstrap'
];

// Use our consistent stage definitions
const stages = stagesList;

const firstNames = [
  'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Chris', 'Jessica',
  'Daniel', 'Ashley', 'Matthew', 'Amanda', 'James', 'Lisa', 'Robert', 'Mary',
  'William', 'Jennifer', 'Richard', 'Linda', 'Thomas', 'Patricia', 'Charles',
  'Barbara', 'Joseph', 'Elizabeth', 'Christopher', 'Susan', 'Andrew', 'Karen'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson'
];

// Generate jobs
const jobs = jobTitles.map((title, index) => {
  // Assign a random status with appropriate distribution
  // 60% open, 20% closed, 10% draft, 10% archived
  let status;
  const rand = Math.random();
  if (rand < 0.6) {
    status = JOB_STATUS.OPEN;
  } else if (rand < 0.8) {
    status = JOB_STATUS.CLOSED;
  } else if (rand < 0.9) {
    status = JOB_STATUS.DRAFT;
  } else {
    status = JOB_STATUS.ARCHIVED;
  }

  // Generate job ID (e.g., JOB-2025-001, JOB-2025-002, etc.)
  const jobId = `JOB-2025-${String(index + 1).padStart(3, '0')}`;
  
  // Generate CTC (Cost to Company) between $50K and $250K
  const minSalary = 50000 + Math.floor(Math.random() * 100000); // $50K to $150K
  const maxSalary = minSalary + Math.floor(Math.random() * 100000); // up to +$100K from min
  const ctc = {
    currency: 'USD',
    min: minSalary,
    max: maxSalary,
    period: 'yearly'
  };

  return {
    id: index + 1,
    jobId: jobId,
    title,
    slug: title.toLowerCase().replace(/\s+/g, '-'),
    status,
    order: index + 1,
    ctc: ctc,
    tags: Array.from(
      { length: Math.floor(Math.random() * 4) + 2 },
      () => techTags[Math.floor(Math.random() * techTags.length)]
    ).filter((tag, i, arr) => arr.indexOf(tag) === i),
    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    description: `We are looking for a talented ${title} to join our growing team. This role offers excellent growth opportunities and the chance to work with cutting-edge technologies.`,
    requirements: [
      'Bachelor\'s degree in Computer Science or related field',
      '3+ years of relevant experience',
      'Strong problem-solving skills',
      'Excellent communication skills'
    ]
  };
});// Generate candidates
const candidates = [];
for (let i = 1; i <= 1000; i++) {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const jobId = Math.floor(Math.random() * jobs.length) + 1;
  
  // Generate 2-5 random skills for each candidate
  const numSkills = Math.floor(Math.random() * 4) + 2; // 2 to 5 skills
  const candidateSkills = [];
  
  for (let j = 0; j < numSkills; j++) {
    const skill = skillsList[Math.floor(Math.random() * skillsList.length)];
    if (!candidateSkills.includes(skill)) {
      candidateSkills.push(skill);
    }
  }
  
  candidates.push({
    id: i,
    name: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
    stage: stages[Math.floor(Math.random() * stages.length)],
    jobId,
    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
    phone: `+1 (555) ${Math.random().toString().slice(2, 5)}-${Math.random().toString().slice(2, 6)}`,
    location: 'Remote',
    experience: Math.floor(Math.random() * 10) + 1,
    skills: candidateSkills
  });
}

// Generate timeline entries for candidates
const timeline = [];
candidates.forEach(candidate => {
  const stageIndex = stages.indexOf(candidate.stage);
  for (let i = 0; i <= stageIndex; i++) {
    timeline.push({
      id: nanoid(),
      candidateId: candidate.id,
      stage: stages[i],
      timestamp: new Date(
        new Date(candidate.createdAt).getTime() + i * 24 * 60 * 60 * 1000
      ).toISOString(),
      notes: `Moved to ${stages[i]} stage`
    });
  }
});

const questionTypes = [
  'single-choice',
  'multi-choice',
  'short-text',
  'long-text',
  'numeric',
  'file-upload'
];

const sampleQuestions = {
  'single-choice': [
    {
      question: 'How many years of experience do you have with React?',
      options: ['0-1 years', '2-3 years', '4-5 years', '5+ years'],
      required: true
    },
    {
      question: 'What is your preferred development environment?',
      options: ['VS Code', 'IntelliJ', 'Vim/Neovim', 'Other'],
      required: false
    }
  ],
  'multi-choice': [
    {
      question: 'Which technologies have you worked with? (Select all that apply)',
      options: ['React', 'Vue', 'Angular', 'Node.js', 'Python', 'Java'],
      required: true
    }
  ],
  'short-text': [
    {
      question: 'What is your current job title?',
      maxLength: 100,
      required: true
    },
    {
      question: 'Which city are you located in?',
      maxLength: 50,
      required: false
    }
  ],
  'long-text': [
    {
      question: 'Describe your most challenging project and how you solved it.',
      maxLength: 1000,
      required: true
    },
    {
      question: 'What are your career goals for the next 5 years?',
      maxLength: 500,
      required: false
    }
  ],
  'numeric': [
    {
      question: 'What is your expected salary range (in thousands)?',
      min: 50,
      max: 300,
      required: true
    }
  ],
  'file-upload': [
    {
      question: 'Please upload your resume',
      acceptedTypes: ['.pdf', '.doc', '.docx'],
      required: true
    }
  ]
};

const assessments = jobs.slice(0, 3).map((job, index) => ({
  id: index + 1,
  jobId: job.id,
  title: `${job.title} Assessment`,
  sections: [
    {
      id: nanoid(),
      title: 'Background Information',
      questions: [
        {
          id: nanoid(),
          type: 'single-choice',
          ...sampleQuestions['single-choice'][0]
        },
        {
          id: nanoid(),
          type: 'short-text',
          ...sampleQuestions['short-text'][0]
        },
        {
          id: nanoid(),
          type: 'multi-choice',
          ...sampleQuestions['multi-choice'][0]
        }
      ]
    },
    {
      id: nanoid(),
      title: 'Technical Questions',
      questions: [
        {
          id: nanoid(),
          type: 'long-text',
          ...sampleQuestions['long-text'][0]
        },
        {
          id: nanoid(),
          type: 'numeric',
          ...sampleQuestions['numeric'][0]
        },
        {
          id: nanoid(),
          type: 'file-upload',
          ...sampleQuestions['file-upload'][0]
        }
      ]
    }
  ],
  createdAt: new Date().toISOString()
}));

// Export seed jobs
export const seedJobs = [
  {
    title: "Frontend Developer",
    company: "TechCorp",
    location: "San Francisco, CA",
    description: "We're looking for a Frontend Developer with React experience.",
    requirements: "3+ years of experience with React, JavaScript, HTML, CSS",
    salary: "$120,000 - $150,000",
    status: "open"
  },
  {
    title: "Backend Engineer",
    company: "DataSystems",
    location: "Remote",
    description: "Backend Engineer position focused on building scalable APIs.",
    requirements: "Experience with Node.js, Express, and MongoDB",
    salary: "$130,000 - $160,000",
    status: "open"
  },
  {
    title: "UX Designer",
    company: "CreativeLabs",
    location: "New York, NY",
    description: "UX Designer with a passion for creating intuitive user experiences.",
    requirements: "Portfolio demonstrating UX design skills and experience",
    salary: "$110,000 - $140,000",
    status: "closed"
  },
  {
    title: "DevOps Engineer",
    company: "CloudTech",
    location: "Remote",
    description: "DevOps Engineer to help automate and optimize our infrastructure.",
    requirements: "Experience with AWS, Docker, and CI/CD pipelines",
    salary: "$140,000 - $170,000",
    status: "open"
  },
  {
    title: "Product Manager",
    company: "InnovateCo",
    location: "Austin, TX",
    description: "Product Manager to lead our flagship product development.",
    requirements: "5+ years of product management experience in tech",
    salary: "$150,000 - $180,000",
    status: "draft"
  }
];

// Export seed candidates
export const seedCandidates = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "555-123-4567",
    location: "San Francisco, CA",
    status: "active",
    stage: "applied",
    jobId: 1,
    resume: "John_Doe_Resume.pdf",
    coverLetter: "I'm excited to apply for the Frontend Developer position.",
    skills: ["React", "JavaScript", "HTML", "CSS", "TypeScript"]
  },
  {
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "555-987-6543",
    location: "New York, NY",
    status: "active",
    stage: "screen",
    jobId: 1,
    resume: "Jane_Smith_Resume.pdf",
    coverLetter: "I believe I'm a great fit for this role.",
    skills: ["React", "Redux", "JavaScript", "Node.js", "MongoDB"]
  },
  {
    name: "Bob Johnson",
    email: "bob.johnson@example.com",
    phone: "555-456-7890",
    location: "Chicago, IL",
    status: "active",
    stage: "tech",
    jobId: 2,
    resume: "Bob_Johnson_Resume.pdf",
    coverLetter: "I have extensive experience in backend development.",
    skills: ["Node.js", "Express", "MongoDB", "AWS", "Docker"]
  },
  {
    name: "Alice Lee",
    email: "alice.lee@example.com",
    phone: "555-789-0123",
    location: "Seattle, WA",
    status: "active",
    stage: "offer",
    jobId: 3,
    resume: "Alice_Lee_Resume.pdf",
    coverLetter: "I'm passionate about creating intuitive user experiences.",
    skills: ["Figma", "Sketch", "Adobe XD", "User Research", "Prototyping"]
  },
  {
    name: "Carlos Rodriguez",
    email: "carlos.rodriguez@example.com",
    phone: "555-234-5678",
    location: "Remote",
    status: "active",
    stage: "rejected",
    jobId: 4,
    resume: "Carlos_Rodriguez_Resume.pdf",
    coverLetter: "I'm a DevOps engineer with 5 years of experience.",
    skills: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"]
  },
  {
    name: "Sarah Kim",
    email: "sarah.kim@example.com",
    phone: "555-345-6789",
    location: "Austin, TX",
    status: "active",
    stage: "applied",
    jobId: 5,
    resume: "Sarah_Kim_Resume.pdf",
    coverLetter: "I have a track record of successful product launches.",
    skills: ["Product Strategy", "User Stories", "Agile", "Market Research"]
  }
];

// Add seedAssessments
export const seedAssessments = [
  {
    title: "Frontend Developer Assessment",
    description: "Technical assessment for frontend developer candidates",
    candidateId: 1,
    questions: [
      {
        id: 1,
        type: "multiple_choice",
        text: "Which of the following is NOT a JavaScript framework or library?",
        options: ["React", "Vue", "Angular", "Jakarta"],
        correctAnswer: "Jakarta"
      },
      {
        id: 2,
        type: "text",
        text: "Explain the concept of closures in JavaScript.",
        sampleAnswer: "A closure is the combination of a function bundled together with references to its surrounding state (the lexical environment)."
      }
    ]
  },
  {
    title: "Backend Developer Assessment",
    description: "Technical assessment for backend developer candidates",
    candidateId: 2,
    questions: [
      {
        id: 1,
        type: "multiple_choice",
        text: "Which of these is NOT a common database system?",
        options: ["MongoDB", "PostgreSQL", "MySQL", "WebSQL"],
        correctAnswer: "WebSQL"
      },
      {
        id: 2,
        type: "text",
        text: "Explain the difference between SQL and NoSQL databases.",
        sampleAnswer: "SQL databases are relational, table-based databases with predefined schemas, while NoSQL databases are non-relational, document-oriented with dynamic schemas."
      }
    ]
  }
];

// Export as a single object for database.js
export const seedData = {
  jobs,
  candidates,
  timeline,
  assessments
};