// MainOperations/auth.js
// Handles user authentication, logout, and current user data

let currentUser = null;
let userGroupRank = '';
let currentUserLabels = [];

const LEADERSHIP_RANKS = [
  'Chairman', 'Vice Chairman', 'Chief Administrative Officer', 'Leadership Overseer',
  'Chief of Operations', 'Chief of Human Resources', 'Chief Of Public Relations'
];

const EXECUTIVE_RANKS = ['Chairman', 'Vice Chairman'];

const DIRECTOR_PLUS = [
  'Chairman', 'Vice Chairman', 'Chief Administrative Officer', 'Leadership Overseer',
  'Chief of Operations', 'Chief of Human Resources', 'Chief Of Public Relations',
  'Head Corporate', 'Senior Corporate', 'Junior Corporate', 'Corporate Intern',
  'Lead Mochi Director', 'Senior Mochi Director', 'Mochi Director'
];

const SUPERVISION_PLUS = [
  'Chairman', 'Vice Chairman', 'Chief Administrative Officer', 'Leadership Overseer',
  'Chief of Operations', 'Chief of Human Resources', 'Chief Of Public Relations',
  'Head Corporate', 'Senior Corporate', 'Junior Corporate', 'Corporate Intern',
  'Lead Mochi Director', 'Senior Mochi Director', 'Mochi Director', 'Mochi Manager',
  'Assistant Mochi Director', 'Supervisor', 'Mochi Leader'
];

const RANK_HIERARCHY = {
  'Chairman': 100,
  'Vice Chairman': 90,
  'Chief Administrative Officer': 85,
  'Leadership Overseer': 84,
  'Chief of Operations': 80,
  'Chief of Human Resources': 79,
  'Chief Of Public Relations': 78,
  'Head Corporate': 70,
  'Senior Corporate': 60,
  'Junior Corporate': 50,
  'Corporate Intern': 40,
  'Lead Mochi Director': 35,
  'Senior Mochi Director': 30,
  'Mochi Director': 25,
  'Mochi Manager': 20,
  'Assistant Mochi Director': 15,
  'Supervisor': 14,
  'Mochi Leader': 13,
  'Senior Mochi': 12,
  'Mochi': 11,
  'Junior Mochi': 10,
  'Intern': 5,
  'Trainee': 1
};

async function loadCurrentUser() {
  try {
    const response = await fetch('/dashboard/current-user');
    if (!response.ok) throw new Error('Failed to fetch user');
    currentUser = await response.json();
    userGroupRank = currentUser.group_rank || '';
    
    const viewProfileLink = document.getElementById('viewProfileLink');
    viewProfileLink.href = `/dashboard/player/${currentUser.username}`;
    
    updateTabAccess();
    renderMyAccount();
    loa
