// State Management
let participants = [];
let teams = [];
let memberCount = 0;
let currentScannerMode = 'checkin';
let html5QrCode = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    updateStats();
    renderParticipants();
    renderTeams();
    populateFilters();
});

// Local Storage
function loadData() {
    participants = JSON.parse(localStorage.getItem('participants') || '[]');
    teams = JSON.parse(localStorage.getItem('teams') || '[]');
}

function saveParticipants() {
    localStorage.setItem('participants', JSON.stringify(participants));
}

function saveTeams() {
    localStorage.setItem('teams', JSON.stringify(teams));
}

// Navigation
function showLanding() {
    document.getElementById('landingPage').classList.add('active');
    document.getElementById('dashboardPage').classList.remove('active');
}

function showDashboard() {
    document.getElementById('landingPage').classList.remove('active');
    document.getElementById('dashboardPage').classList.add('active');
    updateStats();
    renderParticipants();
    renderTeams();
    populateFilters();
}

// Tab Switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    if (tabName === 'teams') {
        renderTeams();
        updateTeamAssignmentSelects();
    }
}

// Registration Modal
function openRegistrationModal() {
    document.getElementById('registrationModal').classList.add('active');
    resetRegistrationForm();
}

function closeRegistrationModal() {
    document.getElementById('registrationModal').classList.remove('active');
}

function resetRegistrationForm() {
    document.getElementById('registrationForm').reset();
    document.getElementById('membersContainer').innerHTML = '';
    memberCount = 0;
    updateMemberCount();
    clearErrors();
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
    });
}

function addMember() {
    if (memberCount >= 3) {
        showToast('Maximum 3 additional members allowed', 'error');
        return;
    }

    memberCount++;
    const memberIndex = memberCount - 1;

    const memberCard = document.createElement('div');
    memberCard.className = 'member-card';
    memberCard.innerHTML = `
        <button type="button" class="remove-member-icon" onclick="removeMember(${memberIndex})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        </button>
        <h4>Member ${memberCount}</h4>
        <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="member${memberIndex}Name" placeholder="Enter full name" required>
            <span class="error-message" id="member${memberIndex}NameError"></span>
        </div>
        <div class="form-group">
            <label>Email ID</label>
            <input type="email" id="member${memberIndex}Email" placeholder="john@nmit.ac.in" required>
            <span class="error-message" id="member${memberIndex}EmailError"></span>
        </div>
        <div class="form-group">
            <label>Primary Skill</label>
            <select id="member${memberIndex}Skill" required>
                <option value="">Select a skill</option>
                <option value="Frontend">Frontend</option>
                <option value="Backend">Backend</option>
                <option value="Full Stack">Full Stack</option>
                <option value="Mobile Development">Mobile Development</option>
                <option value="Other">Other</option>
            </select>
            <span class="error-message" id="member${memberIndex}SkillError"></span>
        </div>
    `;

    document.getElementById('membersContainer').appendChild(memberCard);
    updateMemberCount();
}

function removeMember(index) {
    const members = document.querySelectorAll('.member-card');
    members[index].remove();
    memberCount--;
    updateMemberCount();
    
    // Reindex remaining members
    document.querySelectorAll('.member-card').forEach((card, idx) => {
        card.querySelector('h4').textContent = `Member ${idx + 1}`;
    });
}

function updateMemberCount() {
    document.getElementById('memberCount').textContent = memberCount;
    const addBtn = document.getElementById('addMemberBtn');
    if (memberCount >= 3) {
        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
    } else {
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
    }
}

function validateEmail(email) {
    const regex = /^[^\s@]+@nmit\.ac\.in$/;
    return regex.test(email);
}

function checkDuplicateEmail(email, excludeIndex = -1) {
    // Check in existing participants
    if (participants.some(p => p.email.toLowerCase() === email.toLowerCase())) {
        return true;
    }

    // Check in current form
    const leaderEmail = document.getElementById('leaderEmail').value;
    if (leaderEmail.toLowerCase() === email.toLowerCase() && excludeIndex !== -1) {
        return true;
    }

    // Check in other members
    const memberCards = document.querySelectorAll('.member-card');
    for (let i = 0; i < memberCards.length; i++) {
        if (i !== excludeIndex) {
            const memberEmail = document.getElementById(`member${i}Email`)?.value;
            if (memberEmail && memberEmail.toLowerCase() === email.toLowerCase()) {
                return true;
            }
        }
    }

    return false;
}

function submitRegistration(event) {
    event.preventDefault();
    clearErrors();

    let hasError = false;
    const errors = {};

    // Validate team name
    const teamName = document.getElementById('teamName').value.trim();
    if (!teamName) {
        errors.teamName = 'Team name is required';
        hasError = true;
    } else if (teams.some(t => t.name.toLowerCase() === teamName.toLowerCase())) {
        errors.teamName = 'Team name already exists';
        hasError = true;
    }

    // Validate leader
    const leaderName = document.getElementById('leaderName').value.trim();
    const leaderEmail = document.getElementById('leaderEmail').value.trim();
    const leaderSkill = document.getElementById('leaderSkill').value;

    if (!leaderName) {
        errors.leaderName = 'Group leader name is required';
        hasError = true;
    }

    if (!leaderEmail) {
        errors.leaderEmail = 'Group leader email is required';
        hasError = true;
    } else if (!validateEmail(leaderEmail)) {
        errors.leaderEmail = 'Email must be from @nmit.ac.in domain';
        hasError = true;
    } else if (checkDuplicateEmail(leaderEmail, -1)) {
        errors.leaderEmail = 'This email is already registered';
        hasError = true;
    }

    if (!leaderSkill) {
        errors.leaderSkill = 'Please select a primary skill';
        hasError = true;
    }

    // Validate members
    const memberCards = document.querySelectorAll('.member-card');
    const members = [];

    memberCards.forEach((card, index) => {
        const name = document.getElementById(`member${index}Name`)?.value.trim();
        const email = document.getElementById(`member${index}Email`)?.value.trim();
        const skill = document.getElementById(`member${index}Skill`)?.value;

        if (!name) {
            errors[`member${index}Name`] = 'Member name is required';
            hasError = true;
        }

        if (!email) {
            errors[`member${index}Email`] = 'Member email is required';
            hasError = true;
        } else if (!validateEmail(email)) {
            errors[`member${index}Email`] = 'Email must be from @nmit.ac.in domain';
            hasError = true;
        } else if (checkDuplicateEmail(email, index)) {
            errors[`member${index}Email`] = 'This email is already registered or duplicated';
            hasError = true;
        }

        if (!skill) {
            errors[`member${index}Skill`] = 'Please select a primary skill';
            hasError = true;
        }

        if (name && email && skill) {
            members.push({ name, email, skill });
        }
    });

    // Display errors
    Object.keys(errors).forEach(key => {
        const errorEl = document.getElementById(`${key}Error`);
        if (errorEl) {
            errorEl.textContent = errors[key];
        }
    });

    if (hasError) {
        showToast('Please fix all errors before submitting', 'error');
        return;
    }

    // Create team and participants
    const teamId = `team_${Date.now()}`;
    const allMembers = [
        { name: leaderName, email: leaderEmail, skill: leaderSkill, isLeader: true },
        ...members.map(m => ({ ...m, isLeader: false }))
    ];

    const newParticipants = allMembers.map((member, index) => ({
        id: `participant_${Date.now()}_${index}`,
        name: member.name,
        email: member.email,
        college: 'NMIT',
        skill: member.skill,
        track: 'General',
        checkedIn: false,
        teamId: teamId,
        isLeader: member.isLeader
    }));

    const newTeam = {
        id: teamId,
        name: teamName,
        members: newParticipants.map(p => p.id),
        registeredAt: new Date().toISOString()
    };

    participants.push(...newParticipants);
    teams.push(newTeam);

    saveParticipants();
    saveTeams();

    showToast('Your details have been recorded', 'success');
    closeRegistrationModal();
    
    if (document.getElementById('dashboardPage').classList.contains('active')) {
        updateStats();
        renderParticipants();
        renderTeams();
        populateFilters();
    }
}

// Participants Table
function renderParticipants() {
    const tbody = document.getElementById('participantsTableBody');
    const noParticipants = document.getElementById('noParticipants');
    const table = document.getElementById('participantsTable');

    if (participants.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        noParticipants.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    noParticipants.style.display = 'none';

    const sortedParticipants = [...participants].sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = sortedParticipants.map(participant => {
        const team = teams.find(t => t.id === participant.teamId);
        const teamName = team ? team.name : 'Not Assigned';

        return `
            <tr>
                <td>
                    <div class="participant-name">
                        ${participant.name}
                        ${participant.isLeader ? `
                            <svg class="crown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 19h20"></path>
                                <path d="M6 19V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v13"></path>
                                <circle cx="12" cy="2" r="1"></circle>
                                <circle cx="6" cy="6" r="1"></circle>
                                <circle cx="18" cy="6" r="1"></circle>
                            </svg>
                        ` : ''}
                    </div>
                </td>
                <td>${participant.email}</td>
                <td><span class="badge badge-blue">${participant.skill}</span></td>
                <td>
                    ${participant.checkedIn ? `
                        <div class="status-indicator status-checkin">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            Checked In
                        </div>
                    ` : `
                        <div class="status-indicator status-checkout">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            Checked Out
                        </div>
                    `}
                </td>
                <td>
                    ${participant.teamId ? 
                        `<span class="badge badge-purple">${teamName}</span>` :
                        `<span class="badge badge-gray">Not Assigned</span>`
                    }
                </td>
                <td>
                    ${!participant.checkedIn ? `
                        <button class="btn btn-success btn-sm" onclick="checkIn('${participant.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Check In
                        </button>
                    ` : `
                        <button class="btn btn-danger btn-sm" onclick="checkOut('${participant.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Check Out
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

function filterParticipants() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const skillFilter = document.getElementById('skillFilter').value;

    const filteredParticipants = participants.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery) || 
                            p.email.toLowerCase().includes(searchQuery);
        const matchesSkill = !skillFilter || p.skill === skillFilter;
        return matchesSearch && matchesSkill;
    });

    const tbody = document.getElementById('participantsTableBody');
    const noParticipants = document.getElementById('noParticipants');
    const table = document.getElementById('participantsTable');

    if (filteredParticipants.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        noParticipants.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    noParticipants.style.display = 'none';

    const sortedParticipants = [...filteredParticipants].sort((a, b) => a.name.localeCompare(b.name));

    tbody.innerHTML = sortedParticipants.map(participant => {
        const team = teams.find(t => t.id === participant.teamId);
        const teamName = team ? team.name : 'Not Assigned';

        return `
            <tr>
                <td>
                    <div class="participant-name">
                        ${participant.name}
                        ${participant.isLeader ? `
                            <svg class="crown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 19h20"></path>
                                <path d="M6 19V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v13"></path>
                                <circle cx="12" cy="2" r="1"></circle>
                                <circle cx="6" cy="6" r="1"></circle>
                                <circle cx="18" cy="6" r="1"></circle>
                            </svg>
                        ` : ''}
                    </div>
                </td>
                <td>${participant.email}</td>
                <td><span class="badge badge-blue">${participant.skill}</span></td>
                <td>
                    ${participant.checkedIn ? `
                        <div class="status-indicator status-checkin">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            Checked In
                        </div>
                    ` : `
                        <div class="status-indicator status-checkout">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            Checked Out
                        </div>
                    `}
                </td>
                <td>
                    ${participant.teamId ? 
                        `<span class="badge badge-purple">${teamName}</span>` :
                        `<span class="badge badge-gray">Not Assigned</span>`
                    }
                </td>
                <td>
                    ${!participant.checkedIn ? `
                        <button class="btn btn-success btn-sm" onclick="checkIn('${participant.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Check In
                        </button>
                    ` : `
                        <button class="btn btn-danger btn-sm" onclick="checkOut('${participant.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            Check Out
                        </button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

function populateFilters() {
    const skills = [...new Set(participants.map(p => p.skill))].filter(Boolean);
    const select = document.getElementById('skillFilter');
    
    select.innerHTML = '<option value="">All Skills</option>' + 
        skills.map(skill => `<option value="${skill}">${skill}</option>`).join('');
}

// Check-in/Check-out
function checkIn(participantId) {
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
        participant.checkedIn = true;
        saveParticipants();
        showToast(`${participant.name} checked in successfully`, 'success');
        updateStats();
        renderParticipants();
    }
}

function checkOut(participantId) {
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
        participant.checkedIn = false;
        
        // Remove from team
        if (participant.teamId) {
            const team = teams.find(t => t.id === participant.teamId);
            if (team) {
                team.members = team.members.filter(id => id !== participantId);
                saveTeams();
            }
            participant.teamId = null;
        }
        
        saveParticipants();
        showToast(`${participant.name} checked out successfully`, 'success');
        updateStats();
        renderParticipants();
        renderTeams();
    }
}

// Team Management
function renderTeams() {
    const grid = document.getElementById('teamsGrid');
    const noTeams = document.getElementById('noTeams');

    if (teams.length === 0) {
        grid.innerHTML = '';
        grid.style.display = 'none';
        noTeams.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    noTeams.style.display = 'none';

    grid.innerHTML = teams.map(team => {
        const teamMembers = team.members
            .map(memberId => participants.find(p => p.id === memberId))
            .filter(p => p !== undefined);

        return `
            <div class="team-card">
                <div class="team-card-header">
                    <h4>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        ${team.name}
                    </h4>
                    <span class="team-member-count">${teamMembers.length} ${teamMembers.length === 1 ? 'member' : 'members'}</span>
                </div>
                <div class="team-card-body">
                    ${teamMembers.length === 0 ? `
                        <p class="team-empty">No members assigned yet</p>
                    ` : `
                        <ul class="team-members-list">
                            ${teamMembers.map(member => `
                                <li class="team-member-item">
                                    <div class="team-member-info">
                                        <h5>
                                            ${member.name}
                                            ${member.isLeader ? `
                                                <svg class="crown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <path d="M2 19h20"></path>
                                                    <path d="M6 19V6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v13"></path>
                                                    <circle cx="12" cy="2" r="1"></circle>
                                                    <circle cx="6" cy="6" r="1"></circle>
                                                    <circle cx="18" cy="6" r="1"></circle>
                                                </svg>
                                            ` : ''}
                                        </h5>
                                        <p>${member.email}</p>
                                        <div class="team-member-badges">
                                            <span class="badge badge-blue">${member.skill}</span>
                                            ${member.checkedIn ? 
                                                `<span class="badge badge-green">Checked In</span>` :
                                                `<span class="badge badge-red">Checked Out</span>`
                                            }
                                        </div>
                                    </div>
                                    <button class="remove-member-btn" onclick="removeFromTeam('${member.id}')" title="Remove from team">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </li>
                            `).join('')}
                        </ul>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function createTeam() {
    const teamName = document.getElementById('newTeamName').value.trim();

    if (!teamName) {
        showToast('Team name cannot be empty', 'error');
        return;
    }

    if (teams.some(t => t.name.toLowerCase() === teamName.toLowerCase())) {
        showToast('Team name already exists', 'error');
        return;
    }

    const newTeam = {
        id: `team_${Date.now()}`,
        name: teamName,
        members: [],
        registeredAt: new Date().toISOString()
    };

    teams.push(newTeam);
    saveTeams();

    document.getElementById('newTeamName').value = '';
    showToast('Team created successfully', 'success');
    renderTeams();
    updateTeamAssignmentSelects();
}

function updateTeamAssignmentSelects() {
    // Update participant select
    const availableParticipants = participants.filter(p => p.checkedIn && !p.teamId);
    const participantSelect = document.getElementById('assignParticipant');
    participantSelect.innerHTML = '<option value="">Select participant...</option>' +
        availableParticipants.map(p => 
            `<option value="${p.id}">${p.name} - ${p.email}</option>`
        ).join('');

    // Update team select
    const teamSelect = document.getElementById('assignTeam');
    teamSelect.innerHTML = '<option value="">Select team...</option>' +
        teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function assignToTeam() {
    const participantId = document.getElementById('assignParticipant').value;
    const teamId = document.getElementById('assignTeam').value;

    if (!participantId || !teamId) {
        showToast('Please select both a participant and a team', 'error');
        return;
    }

    const participant = participants.find(p => p.id === participantId);

    if (!participant.checkedIn) {
        showToast('Participant must be checked in before assignment', 'error');
        return;
    }

    if (participant.teamId) {
        showToast('Participant is already assigned to a team', 'error');
        return;
    }

    participant.teamId = teamId;
    const team = teams.find(t => t.id === teamId);
    team.members.push(participantId);

    saveParticipants();
    saveTeams();

    document.getElementById('assignParticipant').value = '';
    document.getElementById('assignTeam').value = '';

    showToast(`${participant.name} assigned to team`, 'success');
    updateStats();
    renderParticipants();
    renderTeams();
    updateTeamAssignmentSelects();
}

function removeFromTeam(participantId) {
    const participant = participants.find(p => p.id === participantId);
    if (!participant || !participant.teamId) return;

    const team = teams.find(t => t.id === participant.teamId);
    if (team) {
        team.members = team.members.filter(id => id !== participantId);
        saveTeams();
    }

    participant.teamId = null;
    saveParticipants();

    showToast(`${participant.name} removed from team`, 'success');
    updateStats();
    renderParticipants();
    renderTeams();
    updateTeamAssignmentSelects();
}

// Statistics
function updateStats() {
    document.getElementById('statTotal').textContent = participants.length;
    document.getElementById('statCheckedIn').textContent = participants.filter(p => p.checkedIn).length;
    document.getElementById('statAssigned').textContent = participants.filter(p => p.teamId).length;
    document.getElementById('statTeams').textContent = teams.length;
}

// QR Scanner
function openQRScanner(mode) {
    currentScannerMode = mode;
    document.getElementById('qrScannerModal').classList.add('active');
    document.getElementById('scannerTitle').textContent = mode === 'checkin' ? 'Check-In Scanner' : 'Check-Out Scanner';
    document.getElementById('manualEntryBtn').textContent = mode === 'checkin' ? 'Check In' : 'Check Out';
    document.getElementById('manualEmail').value = '';
    
    // Start QR scanner
    startQRScanner();
}

function closeQRScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode.clear();
            html5QrCode = null;
        }).catch(err => console.error(err));
    }
    document.getElementById('qrScannerModal').classList.remove('active');
}

function startQRScanner() {
    if (html5QrCode) return;

    html5QrCode = new Html5Qrcode("qrReader");
    
    html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
            html5QrCode.stop().then(() => {
                processQRCode(decodedText);
                closeQRScanner();
            }).catch(err => console.error(err));
        }
    ).catch(err => {
        console.error('QR Scanner error:', err);
        showToast('Unable to access camera. Please use manual entry.', 'error');
    });
}

function processManualEntry() {
    const email = document.getElementById('manualEmail').value.trim();
    if (email) {
        processQRCode(email);
        closeQRScanner();
    } else {
        showToast('Please enter an email address', 'error');
    }
}

function processQRCode(email) {
    const participant = participants.find(p => p.email.toLowerCase() === email.toLowerCase());

    if (!participant) {
        showToast('Participant not found with this email', 'error');
        return;
    }

    if (currentScannerMode === 'checkin') {
        if (participant.checkedIn) {
            showToast(`${participant.name} is already checked in`, 'warning');
        } else {
            checkIn(participant.id);
        }
    } else {
        if (!participant.checkedIn) {
            showToast(`${participant.name} is not checked in`, 'warning');
        } else {
            checkOut(participant.id);
        }
    }
}

// CSV Export
function exportParticipantsCSV() {
    if (participants.length === 0) {
        showToast('No participants to export', 'error');
        return;
    }

    const headers = ['Name', 'Email', 'College', 'Skill', 'Track', 'Checked In', 'Team', 'Role'];
    const rows = participants.map(p => {
        const team = teams.find(t => t.id === p.teamId);
        return [
            p.name,
            p.email,
            p.college,
            p.skill,
            p.track,
            p.checkedIn ? 'Yes' : 'No',
            team ? team.name : 'Not Assigned',
            p.isLeader ? 'Team Leader' : 'Member'
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    downloadCSV(csvContent, `participants_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Participants exported successfully', 'success');
}

function exportTeamsCSV() {
    if (teams.length === 0) {
        showToast('No teams to export', 'error');
        return;
    }

    const headers = ['Team Name', 'Members Count', 'Member Names', 'Member Emails', 'Registered At'];
    const rows = teams.map(team => {
        const teamMembers = team.members
            .map(memberId => participants.find(p => p.id === memberId))
            .filter(p => p !== undefined);
        
        return [
            team.name,
            teamMembers.length.toString(),
            teamMembers.map(m => m.name).join('; '),
            teamMembers.map(m => m.email).join('; '),
            new Date(team.registeredAt).toLocaleString()
        ];
    });

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    downloadCSV(csvContent, `teams_${new Date().toISOString().split('T')[0]}.csv`);
    showToast('Teams exported successfully', 'success');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Close modals on outside click
window.onclick = function(event) {
    const regModal = document.getElementById('registrationModal');
    const qrModal = document.getElementById('qrScannerModal');
    
    if (event.target === regModal) {
        closeRegistrationModal();
    }
    if (event.target === qrModal) {
        closeQRScanner();
    }
}
