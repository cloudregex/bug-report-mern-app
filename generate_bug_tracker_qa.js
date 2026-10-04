const { generateQAWorkbook } = require('./generate_qa_sheets_engine.js');

// ─── SHEET 1: APP / CLIENT / EMPLOYEE TEST CASES ─────────────────────────────
const appModulesData = [
  {
    module: 'Authentication, Password Rules & Sessions',
    cases: [
      {
        screen: 'Login Screen',
        id: 'AUTH-01',
        title: 'Valid email/username and password login',
        steps: '1. Navigate to /login\n2. Enter valid email (or username) and password\n3. Click "Sign In"',
        expected: 'JWT token and session tokenId stored. User redirected to role-specific dashboard (Admin / Employee / Client).'
      },
      {
        screen: 'Login Screen',
        id: 'AUTH-02',
        title: 'Account lockout after 5 consecutive failed attempts',
        steps: '1. Navigate to /login\n2. Enter registered email with an invalid password 5 consecutive times\n3. Attempt 6th login',
        expected: 'Account temporarily locked for 30 minutes. Clear warning message displayed: "Account temporarily locked due to too many failed login attempts."'
      },
      {
        screen: 'Login Screen',
        id: 'AUTH-03',
        title: 'Disabled user account rejection',
        steps: '1. Navigate to /login\n2. Attempt login with an account set to DISABLED status\n3. Click "Sign In"',
        expected: 'Login rejected with 403 Forbidden: "Your account has been disabled. Contact your administrator."'
      },
      {
        screen: 'App Routes',
        id: 'AUTH-04',
        title: 'Protected route guard authentication check',
        steps: '1. Clear browser localStorage and cookies\n2. Attempt direct URL access to /dashboard, /tickets, or /projects',
        expected: 'User intercepted and redirected to /login with session prompt.'
      },
      {
        screen: 'User Profile & Navbar',
        id: 'AUTH-05',
        title: 'Logout and active session invalidation',
        steps: '1. Log in to the application\n2. Click user avatar in navbar > Click "Logout"\n3. Click browser Back button',
        expected: 'UserSession marked inactive on backend, JWT invalidated. Back button cannot load authenticated views.'
      }
    ]
  },
  {
    module: 'Client Portal & Issue Reporting',
    cases: [
      {
        screen: 'Client Portal Dashboard',
        id: 'CLI-01',
        title: 'Client logs into customized Client Dashboard',
        steps: '1. Log in with Client credentials\n2. Inspect dashboard overview',
        expected: 'Client sees dedicated portal with reported issues summary, approved tickets counter, and "Report Issue" action.'
      },
      {
        screen: 'Report Issue Modal',
        id: 'CLI-02',
        title: 'Submit new client issue with screenshot attachment',
        steps: '1. In Client Portal, click "+ Report New Issue"\n2. Select Project, enter Title, Description, and upload screenshot (PNG/JPG)\n3. Click Submit',
        expected: 'Issue created with status "PENDING". Success alert shown. File uploaded to /uploads. Issue appears in client list.'
      },
      {
        screen: 'Report Issue Modal',
        id: 'CLI-03',
        title: 'Mandatory field and file validation for client reports',
        steps: '1. Open "Report New Issue" modal\n2. Leave Title empty or Project unselected\n3. Click Submit',
        expected: 'Form submission blocked with validation messages: "Project ID is required" / "Title is required".'
      },
      {
        screen: 'Client Issues List',
        id: 'CLI-04',
        title: 'Client views status badge progression and rejection reason',
        steps: '1. Navigate to Client Issues view\n2. Inspect status badges for PENDING, CONVERTED, and REJECTED issues',
        expected: 'Issues display accurate colored badges. Converted issues show linked official ticket number; rejected issues show rejection note.'
      },
      {
        screen: 'Client Issues List',
        id: 'CLI-05',
        title: 'Cross-client isolation security check',
        steps: '1. Log in as Client A\n2. Attempt to view Client B\'s issue via direct API / URL /api/client-issues/:id',
        expected: 'Access blocked with 403 Forbidden: "Access denied: Cannot view another client\'s issue".'
      }
    ]
  },
  {
    module: 'Core Ticket Management & Sequencer',
    cases: [
      {
        screen: 'Create Ticket Modal',
        id: 'TCK-01',
        title: 'Create ticket with full metadata and automatic sequence numbering',
        steps: '1. Navigate to Project > Tickets\n2. Click "+ New Ticket"\n3. Enter Title, Description, Type (BUG/FEATURE/TASK), Priority, Assignee, Due Date, Story Points\n4. Submit',
        expected: 'Ticket created with project-prefixed sequence number (e.g. CIT-101), status defaults to "BACKLOG", activity logged.'
      },
      {
        screen: 'Create Ticket Modal',
        id: 'TCK-02',
        title: 'Estimated hours non-negative numeric validation',
        steps: '1. Open Create Ticket Modal\n2. Enter "-5" or "abc" in Estimated Hours field\n3. Submit form',
        expected: 'Validation error: "Estimated hours must be a valid non-negative number". Creation rejected.'
      },
      {
        screen: 'Create Ticket Modal',
        id: 'TCK-03',
        title: 'Project role permission check (Viewer role restriction)',
        steps: '1. Log in as a user assigned as "VIEWER" in the project\n2. Attempt to click "+ New Ticket" or call POST /api/projects/:id/tickets',
        expected: 'Button disabled or API returns 403: "Access denied: Viewers cannot create tickets".'
      },
      {
        screen: 'Ticket Details View',
        id: 'TCK-04',
        title: 'Inline Assignee reassignment with project member verification',
        steps: '1. Open ticket details\n2. Click Assignee dropdown\n3. Select a new project member',
        expected: 'Assignee updated, activity recorded ("ASSIGNEE_CHANGED"), new assignee receives real-time notification.'
      },
      {
        screen: 'Ticket Details View',
        id: 'TCK-05',
        title: 'Inline Priority update with audit trail',
        steps: '1. Open ticket details\n2. Change priority from MEDIUM to CRITICAL',
        expected: 'Priority updated immediately. Badge updates to red. Audit log and activity stream record old and new priority.'
      },
      {
        screen: 'Ticket Details View',
        id: 'TCK-06',
        title: 'Delete ticket with confirmation modal (Admin / Project Admin only)',
        steps: '1. Open ticket as Developer\n2. Verify Delete option\n3. Switch to Project Admin and click "Delete Ticket" > Confirm modal',
        expected: 'Developers denied deletion. Project Admin successfully soft-deletes ticket (isDeleted=true). Removed from active lists.'
      }
    ]
  },
  {
    module: 'Kanban Board & Workflow State Engine',
    cases: [
      {
        screen: 'Kanban Board View',
        id: 'KAN-01',
        title: 'Kanban board columns rendering and ticket card placement',
        steps: '1. Navigate to Project > Board view\n2. Verify presence of all columns: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, TESTING, DONE, CLOSED',
        expected: 'All 7 workflow columns render with correct ticket counts and cards positioned in matching status swimlanes.'
      },
      {
        screen: 'Kanban Board View',
        id: 'KAN-02',
        title: 'Drag-and-drop ticket status transition',
        steps: '1. Click and drag ticket card from "IN_PROGRESS" to "IN_REVIEW"\n2. Release card in target column',
        expected: 'Card snaps smoothly into new column. PATCH /api/tickets/:id/status called. Socket.IO broadcasts change to board viewers.'
      },
      {
        screen: 'Kanban Board View',
        id: 'KAN-03',
        title: 'Resolution timestamp automatic tracking on ticket completion',
        steps: '1. Move ticket to "DONE" or "CLOSED"\n2. Inspect ticket details\n3. Move ticket back to "REOPENED"',
        expected: 'Moving to DONE populates resolvedAt timestamp and triggers daily metrics calculation. Moving to REOPENED clears resolvedAt.'
      }
    ]
  },
  {
    module: 'Ticket Search, Multi-Filter & Saved Filters',
    cases: [
      {
        screen: 'Ticket List View',
        id: 'FLT-01',
        title: 'Global multi-attribute filtering (Status, Priority, Assignee, Overdue)',
        steps: '1. Navigate to Tickets list\n2. Apply filters: Priority = "HIGH", Status = "IN_PROGRESS", Overdue = "true"',
        expected: 'Table dynamically filters tickets meeting all criteria simultaneously without full page refresh.'
      },
      {
        screen: 'Ticket List View',
        id: 'FLT-02',
        title: 'Real-time keyword search across title and description',
        steps: '1. In search input box, type a specific keyword or ticket number (e.g. "auth" or "CIT-102")',
        expected: 'Ticket list debounces and displays only tickets containing the query string in title or description.'
      },
      {
        screen: 'Ticket List View',
        id: 'FLT-03',
        title: 'Custom priority enum sorting (Blocker to Low)',
        steps: '1. Click "Sort by Priority" dropdown',
        expected: 'Tickets ordered strictly by enterprise severity: BLOCKER > CRITICAL > HIGH > MEDIUM > LOW (via SQL CASE statement).'
      },
      {
        screen: 'Ticket List View',
        id: 'FLT-04',
        title: 'Client role dual-model virtual schema unification',
        steps: '1. Log in as Client\n2. Open Tickets view',
        expected: 'Client sees both converted Tickets and pending/rejected ClientIssues unified in a single seamless paginated table.'
      },
      {
        screen: 'Saved Filters Modal',
        id: 'FLT-05',
        title: 'Create, load, and delete custom saved filter',
        steps: '1. Configure custom filter combination\n2. Click "Save Filter" > Enter name "My Critical Bugs"\n3. Reload page and apply saved filter\n4. Delete saved filter',
        expected: 'Filter saves to user account, reapplies saved criteria on click, and deletes cleanly upon request.'
      }
    ]
  },
  {
    module: 'Comments, In-Band @Mentions & Activity Audit',
    cases: [
      {
        screen: 'Ticket Details Comments',
        id: 'COM-01',
        title: 'Post new comment on ticket',
        steps: '1. Open ticket details\n2. Type comment text in discussion box\n3. Click "Comment"',
        expected: 'Comment added to thread immediately, activity timeline records "COMMENT_ADDED", ticket room receives live update.'
      },
      {
        screen: 'Ticket Details Comments',
        id: 'COM-02',
        title: 'In-band @mention autocomplete and parsing',
        steps: '1. In comment textarea, type "@"\n2. Select a team member from autocomplete list\n3. Post comment',
        expected: 'Mention parsed and formatted. Mention record created in database. Mentioned user receives immediate push alert.'
      },
      {
        screen: 'Ticket Details Comments',
        id: 'COM-03',
        title: 'Mention project security boundary enforcement',
        steps: '1. Attempt to mention a user who is NOT a member of the current project\n2. Submit comment',
        expected: 'System verifies project membership in parseMentions. Non-project members are excluded from receiving alerts.'
      },
      {
        screen: 'Ticket Details Comments',
        id: 'COM-04',
        title: 'Edit comment with author permission guard',
        steps: '1. Click Edit on your own comment, change text, and save\n2. Attempt to edit another user\'s comment',
        expected: 'Own comment updates with "(edited)" timestamp badge. Other users\' comments cannot be edited (403 Forbidden).'
      }
    ]
  },
  {
    module: 'File Attachments & Asset Management',
    cases: [
      {
        screen: 'Ticket Details Attachments',
        id: 'ATT-01',
        title: 'Upload attachment with mime-type validation',
        steps: '1. Open ticket details\n2. Drag a PNG, JPG, or PDF file into the dropzone\n3. Confirm upload',
        expected: 'File saved in /uploads, Attachment record created, thumbnail appears in attachments gallery with file size.'
      },
      {
        screen: 'Ticket Details Attachments',
        id: 'ATT-02',
        title: 'Image attachment lightbox preview and download',
        steps: '1. Click on an uploaded image thumbnail in attachments section',
        expected: 'Modal lightbox opens with high-res image preview, filename, upload date, and direct download button.'
      },
      {
        screen: 'Ticket Details Attachments',
        id: 'ATT-03',
        title: 'Soft delete attachment with uploader/admin authorization',
        steps: '1. As regular employee, attempt to delete another employee\'s attachment\n2. Delete own attachment as uploader',
        expected: 'Unauthorized deletion blocked (403). Uploader or Admin deletion soft-deletes file and logs audit entry.'
      }
    ]
  },
  {
    module: 'Real-Time Notifications & WebSocket Push',
    cases: [
      {
        screen: 'App Header / Navbar',
        id: 'NOTIF-01',
        title: 'Real-time notification bell badge counter increment',
        steps: '1. User A has app open\n2. User B in another browser assigns a ticket to User A',
        expected: 'User A\'s notification bell increments badge counter by +1 instantly via authenticated WebSocket room.'
      },
      {
        screen: 'Notifications Popover',
        id: 'NOTIF-02',
        title: 'Notification popover display and click-through navigation',
        steps: '1. Click notification bell\n2. Click on a notification item (e.g. "Ticket assigned to you")',
        expected: 'Popover opens showing unread notifications. Clicking an item navigates directly to the referenced ticket.'
      },
      {
        screen: 'Notifications Popover',
        id: 'NOTIF-03',
        title: 'Mark single and mark all notifications as read',
        steps: '1. Open notifications popover\n2. Click "Mark all as read"',
        expected: 'Badge count clears to 0. Notification items update styling to read state. Persisted in database.'
      },
      {
        screen: 'Notification Engine',
        id: 'NOTIF-04',
        title: 'Self-action notification suppression',
        steps: '1. User updates ticket status or comments on a ticket where they are reporter/assignee',
        expected: 'Actor ID checked against targets. The user who performed the action does NOT receive an alert for their own action.'
      }
    ]
  },
  {
    module: 'Employee "My Work" Dashboard',
    cases: [
      {
        screen: 'Employee Dashboard',
        id: 'EMP-01',
        title: 'Personal workload summary metrics loading',
        steps: '1. Log in as an Employee\n2. Navigate to Dashboard (/dashboard)',
        expected: 'Dashboard displays "Assigned to Me", "Due Today", "Completed This Week", and "My Mentions" count accurately.'
      },
      {
        screen: 'Employee Dashboard',
        id: 'EMP-02',
        title: 'Personal status and priority distribution charts',
        steps: '1. Review distribution breakdown widgets on Employee Dashboard',
        expected: 'Visual graphs display active tickets broken down by status (In Progress, In Review) and priority level.'
      },
      {
        screen: 'Employee Dashboard',
        id: 'EMP-03',
        title: 'Recent personal activity timeline stream',
        steps: '1. Check the "Recent Activity" widget on Employee Dashboard',
        expected: 'Shows chronologically ordered feed of user\'s latest comments, status updates, and ticket assignments.'
      }
    ]
  }
];

// ─── SHEET 2: WEB ADMIN & SUPER ADMIN TEST CASES ─────────────────────────────
const adminModulesData = [
  {
    module: 'Company Multi-Tenancy & Onboarding',
    cases: [
      {
        screen: 'Register Company Page',
        id: 'ADM-TEN-01',
        title: 'Register new company tenant with automatic slug generation',
        steps: '1. Navigate to /register\n2. Enter Company Name ("Acme Corp"), Admin Name, Email, Password, Confirm Password\n3. Submit form',
        expected: 'Admin user created, company created with slug "acme-corp", default FREE subscription assigned, auto-logged in.'
      },
      {
        screen: 'Register Company Page',
        id: 'ADM-TEN-02',
        title: 'Duplicate email and slug collision handling',
        steps: '1. Attempt registration with an already existing email address\n2. Attempt registration with duplicate company name',
        expected: 'Duplicate email returns 400 "An account with this email already exists". Duplicate company slug auto-appends suffix (acme-corp-1).'
      },
      {
        screen: 'Register Company Page',
        id: 'ADM-TEN-03',
        title: 'Compensating transaction rollback on registration failure',
        steps: '1. Simulate database failure during company creation step of registration',
        expected: 'Backend catch block executes compensating cleanup: destroys partially created user/company records to prevent dirty state.'
      }
    ]
  },
  {
    module: 'Project Management & Access Control (RBAC)',
    cases: [
      {
        screen: 'Create Project Page',
        id: 'ADM-PRJ-01',
        title: 'Admin creates new project with subscription limit verification',
        steps: '1. Navigate to Projects > Click "+ New Project"\n2. Enter Name, Description\n3. Click "Create Project"',
        expected: 'checkProjectLimit called. If within quota, project created, creator added as PROJECT_ADMIN, usage counter synced.'
      },
      {
        screen: 'Create Project Page',
        id: 'ADM-PRJ-02',
        title: 'Project tier limit quota blocking (Free tier)',
        steps: '1. With Free Plan (Max 2 projects), attempt to create 3rd project',
        expected: 'Creation blocked with 403: "Project limit reached. Upgrade to create more projects" and Upgrade prompt.'
      },
      {
        screen: 'Project Members Tab',
        id: 'ADM-PRJ-03',
        title: 'Add team member and assign project-specific role',
        steps: '1. Open Project > Members tab\n2. Click "Add Member"\n3. Select User and Role (DEVELOPER / TESTER / VIEWER / PROJECT_ADMIN)\n4. Save',
        expected: 'ProjectMember record created. User receives notification. User can now access project tickets with assigned permissions.'
      },
      {
        screen: 'Project Members Tab',
        id: 'ADM-PRJ-04',
        title: 'Change member role and remove member from project',
        steps: '1. Change member role from DEVELOPER to VIEWER\n2. Remove another member from project',
        expected: 'Member permissions update immediately. Removed member loses access to project tickets and board views.'
      },
      {
        screen: 'Project Settings',
        id: 'ADM-PRJ-05',
        title: 'Archive and soft delete project with confirmation modal',
        steps: '1. Open Project Settings as Admin\n2. Click "Archive Project" > Confirm\n3. Click "Delete Project" > Confirm',
        expected: 'Archiving marks status as ARCHIVED. Soft delete sets isDeleted=true, logs audit trail, removes from active project lists.'
      }
    ]
  },
  {
    module: 'Client Issue Triage & Conversion Engine',
    cases: [
      {
        screen: 'Clients Management',
        id: 'ADM-CLI-01',
        title: 'Admin invites/adds client user assigned to project',
        steps: '1. Go to Admin > Clients\n2. Click "Add Client"\n3. Enter Client Name, Email, Password, and assign to Project\n4. Save',
        expected: 'Client created with role "CLIENT", assigned to selected project in ProjectMember table. Email format validated.'
      },
      {
        screen: 'Client Issues Inbox',
        id: 'ADM-CLI-02',
        title: 'Convert client issue into official backlog ticket with screenshot migration',
        steps: '1. Open Client Issues list\n2. Select a PENDING client report\n3. Click "Convert to Ticket"\n4. Select Type, Priority, Assignee\n5. Submit',
        expected: 'Ticket generated in project backlog. Client screenshot converted into Attachment. Client issue status becomes "CONVERTED".'
      },
      {
        screen: 'Client Issues Inbox',
        id: 'ADM-CLI-03',
        title: 'Reject invalid client issue with reason',
        steps: '1. Open a PENDING client issue\n2. Click "Reject Issue"\n3. Provide rejection feedback\n4. Confirm',
        expected: 'Client issue status updated to "REJECTED". Client notified. Issue not added to developer ticket backlog.'
      }
    ]
  },
  {
    module: 'Team Directory & Employee Administration',
    cases: [
      {
        screen: 'Employee Directory',
        id: 'ADM-USR-01',
        title: 'Create and provision employee with subscription quota check',
        steps: '1. Navigate to Admin > Employees\n2. Click "Add Employee"\n3. Fill Name, lowercase Email, Password\n4. Submit',
        expected: 'checkEmployeeLimit verified. Employee created with role EMPLOYEE, status ACTIVE. Password hashed and saved to history.'
      },
      {
        screen: 'Employee Directory',
        id: 'ADM-USR-02',
        title: 'Employee subscription quota limit block',
        steps: '1. On Free Plan (limit 5 employees), attempt to add 6th employee',
        expected: 'Creation blocked with 403: "Employee limit reached. Upgrade your subscription plan."'
      },
      {
        screen: 'Employee Details',
        id: 'ADM-USR-03',
        title: 'Deactivate user and revoke all active sessions immediately',
        steps: '1. Find user in directory\n2. Click "Deactivate User" > Confirm\n3. In separate browser, test deactivated user\'s active token',
        expected: 'User status becomes DISABLED. Token verification middleware rejects subsequent requests: "Account has been disabled".'
      },
      {
        screen: 'Employee Details',
        id: 'ADM-USR-04',
        title: 'Admin resets user password with password history check',
        steps: '1. Open Employee Details\n2. Click "Reset Password"\n3. Enter new strong password\n4. Attempt using previously used password',
        expected: 'Reusing recent password rejected. Setting new strong password hashes and updates user passwordHistory.'
      }
    ]
  },
  {
    module: 'Company Analytics & Project Health Engine',
    cases: [
      {
        screen: 'Company Dashboard',
        id: 'ADM-ANL-01',
        title: 'Company overview 12-metric parallel aggregation',
        steps: '1. Log in as Company Admin\n2. Open Company Dashboard (/dashboard)',
        expected: 'Dashboard loads open tickets, critical bugs, overdue tickets, closed today, workload, and resolution metrics in parallel.'
      },
      {
        screen: 'Company Dashboard',
        id: 'ADM-ANL-02',
        title: 'Continuous 7-day velocity chart with zero-fill date imputation',
        steps: '1. Inspect "Tickets Created Per Day" chart over the last 7 days',
        expected: 'fillDateSeries provides unbroken calendar days even when days have 0 tickets created, preventing chart warping.'
      },
      {
        screen: 'Project Dashboard',
        id: 'ADM-ANL-03',
        title: 'Project health score algorithmic calculation',
        steps: '1. Open Project > Analytics tab\n2. Inspect Project Health indicator (0 - 100%)',
        expected: 'Health calculated as 100 - (criticalBugs * 15) - (overdueTickets * 10). Clamped between 0 and 100.'
      },
      {
        screen: 'Company Dashboard',
        id: 'ADM-ANL-04',
        title: 'Average resolution time and reopen rate calculation',
        steps: '1. Review turnaround metrics widget on Company Dashboard',
        expected: 'Displays average resolution hours (via SQL TIMESTAMPDIFF) and reopen rate percentage based on resolved vs reopened counts.'
      }
    ]
  },
  {
    module: 'Subscription, Stripe Billing & Quota Enforcement',
    cases: [
      {
        screen: 'Billing Settings',
        id: 'ADM-BIL-01',
        title: 'View current plan details, renewal date, and usage meters',
        steps: '1. Navigate to Admin > Billing\n2. Inspect current plan cards and resource consumption meters',
        expected: 'Shows current plan name (FREE/PRO/GROWTH/ENTERPRISE), price, renewal date, and usage bars for Projects, Members, Tickets.'
      },
      {
        screen: 'Billing Settings',
        id: 'ADM-BIL-02',
        title: 'Monthly ticket creation quota enforcement',
        steps: '1. Company reaches maxTicketsPerMonth for current plan\n2. Attempt to create an additional ticket',
        expected: 'Creation blocked with 403: "Monthly ticket limit reached. Upgrade your subscription plan to continue filing tickets."'
      },
      {
        screen: 'Billing Settings',
        id: 'ADM-BIL-03',
        title: 'Stripe checkout session creation and redirection',
        steps: '1. In Billing page, click "Upgrade to Pro"\n2. Verify API response / redirection',
        expected: 'POST /api/payments/create-checkout-session called. Returns Stripe checkout URL with metadata (companyId, planId).'
      },
      {
        screen: 'Billing Settings',
        id: 'ADM-BIL-04',
        title: 'Stripe webhook payment processing and immediate plan activation',
        steps: '1. Simulate/trigger checkout.session.completed Stripe webhook with raw body verification',
        expected: 'Subscription plan updated to PRO, status set to ACTIVE, renewal date set +1 month, audit log created.'
      },
      {
        screen: 'Billing Settings',
        id: 'ADM-BIL-05',
        title: 'Development billing simulator mode when Stripe key is unset',
        steps: '1. In local dev environment without STRIPE_SECRET_KEY, click Upgrade Plan',
        expected: 'Simulator automatically upgrades company subscription to selected plan and redirects to success screen.'
      }
    ]
  },
  {
    module: 'Security Dashboard, Session Monitoring & Audit Trail',
    cases: [
      {
        screen: 'Security Dashboard',
        id: 'ADM-SEC-01',
        title: 'Active user sessions table with device & browser detection',
        steps: '1. Log in from different browsers/devices\n2. Navigate to Admin > Security Dashboard\n3. Review Active Sessions table',
        expected: 'Table shows all active sessions with IP address, parsed device/browser (e.g. Chrome · Windows), and last seen timestamp.'
      },
      {
        screen: 'Security Dashboard',
        id: 'ADM-SEC-02',
        title: 'Remote session revocation (kills stolen JWT immediately)',
        steps: '1. In Active Sessions table, click "Revoke" on a specific session\n2. In that session\'s browser, click any app link',
        expected: 'Session marked isActive=false. Next API call in revoked browser rejected with 401: "Session has been revoked. Please log in again."'
      },
      {
        screen: 'Security Dashboard',
        id: 'ADM-SEC-03',
        title: 'Failed login security analytics and IP trend monitoring',
        steps: '1. Trigger failed login attempts from test client\n2. Open Security Dashboard',
        expected: 'Failed logins chart shows recent failed attempts with IP breakdown and timestamp tracking.'
      },
      {
        screen: 'Audit Logs View',
        id: 'ADM-SEC-04',
        title: 'Immutable audit logging with JSON before/after state diffs',
        steps: '1. Perform sensitive actions (Change status, update user role, delete ticket, upgrade plan)\n2. Navigate to Audit Logs',
        expected: 'Audit entries display Actor, Action, Entity, Timestamp, IP Address, and expandable before/after state JSON.'
      }
    ]
  },
  {
    module: 'Super Admin Cross-Tenant Governance (SaaS Platform)',
    cases: [
      {
        screen: 'Super Admin SaaS Dashboard',
        id: 'SUP-ADM-01',
        title: 'Cross-tenant platform statistics (Total Companies, MRR, Health)',
        steps: '1. Log in with Super Admin credentials\n2. Navigate to /saas/dashboard',
        expected: 'Shows total platform companies count, active subscriptions, total storage used (GB), and calculated MRR.'
      },
      {
        screen: 'Super Admin SaaS Dashboard',
        id: 'SUP-ADM-02',
        title: 'Top companies ranking by resource consumption',
        steps: '1. Inspect "Top Companies" ranking table on SaaS Dashboard',
        expected: 'Ranks client companies by combined volume of employees, projects, tickets, and storage consumption.'
      },
      {
        screen: 'Super Admin Plans Master',
        id: 'SUP-ADM-03',
        title: 'Manage global SaaS plans (Free, Pro, Growth, Enterprise)',
        steps: '1. Super Admin navigates to Plans Management\n2. Create or adjust tier limits (maxProjects, maxEmployees, maxStorageGB, price)',
        expected: 'Plans created/updated in Plan table. New limits immediately govern limit check services across tenant companies.'
      },
      {
        screen: 'Super Admin Subscriptions',
        id: 'SUP-ADM-04',
        title: 'Administrative subscription override and tenant control',
        steps: '1. View all company subscriptions list\n2. Manually change a subscription status (ACTIVE / EXPIRED / TRIAL)',
        expected: 'Subscription state updated with confirmation modal. Audit trail logged. Company access updated accordingly.'
      }
    ]
  }
];

// ─── EXECUTE GENERATOR ───────────────────────────────────────────────────────
async function run() {
  const fileName = 'Bug_Tracking_System_QA_Test_Cases.xlsx';
  const projectTitle = 'Bug Tracking System (MERN)';

  const appCasesCount = appModulesData.reduce((acc, m) => acc + (m.cases ? m.cases.length : 0), 0);
  const adminCasesCount = adminModulesData.reduce((acc, m) => acc + (m.cases ? m.cases.length : 0), 0);
  const totalCases = appCasesCount + adminCasesCount;

  console.log(`🚀 Generating QA Excel sheet for ${projectTitle}...`);
  console.log(`📊 Total Modules: ${appModulesData.length + adminModulesData.length} (${appModulesData.length} App, ${adminModulesData.length} Admin)`);
  console.log(`📋 Total Test Cases: ${totalCases} (${appCasesCount} App, ${adminCasesCount} Admin)`);

  await generateQAWorkbook({
    fileName,
    projectTitle,
    appModulesData,
    adminModulesData
  });

  console.log(`🎉 Finished! File ready at: ${fileName}`);
}

run().catch(err => {
  console.error('❌ Error generating workbook:', err);
  process.exit(1);
});
