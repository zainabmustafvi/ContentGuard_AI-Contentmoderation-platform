# ContentGuard AI – Enterprise Content Moderation Platform

[cite_start]ContentGuard AI is a full-stack, multi-role AI-powered Content Moderation Platform built using the MERN stack (MongoDB, Express, React, Node.js)[cite: 1, 6]. [cite_start]The platform provides automated policy compliance screening for inbound media assets, bridges operational gaps through a transparent, programmatic dispute/appeals pipeline, and equips platform administrators with granular system-enforcement switches and telemetry analytics dashboards[cite: 3, 4].

---

## 🚀 Core Features

### 1. User Submission Pipeline
* [cite_start]**Independent Asset Evaluation**: Supports single or multi-asset batch uploads where each image or payload is parsed independently through isolated containment loops to generate an individual compliance verdict[cite: 17, 18].
* [cite_start]**Clean State Validation**: A submission is programmatically marked as `Approved` if no enabled category match meets or surpasses the active algorithmic confidence threshold[cite: 19, 23].
* [cite_start]**Historical Audit Ledger**: Users can view their complete submission histories, complete with client-side filtering capabilities based on date, violation category matches, and compliance outcome status[cite: 20, 49].

### 2. Algorithmic Verdict Engine
[cite_start]Processes content against 6 core structural risk vectors[cite: 12, 14]:
* [cite_start]**Graphic Violence**: Physical harm, gore, or serious injury to humans/animals[cite: 14].
* [cite_start]**Hate Symbols**: Imagery associated with extremist ideologies or terrorist organizations[cite: 14].
* [cite_start]**Self-Harm**: Content depicting or glorifying acts of self-inflicted injury[cite: 14].
* [cite_start]**Extremist Propaganda**: Content promoting or recruiting for violent movements[cite: 14].
* [cite_start]**Weapons & Contraband**: Illegal weapons, drug manufacturing, or trafficking content[cite: 14].
* [cite_start]**Harassment & Humiliation**: Content intended to degrade or publicly threaten individuals[cite: 14].

[cite_start]*Each verdict logs a point-in-time confidence score percentage, a descriptive logical reasoning string, an immutable server timestamp, and an embedded snapshot of the rules active during runtime initialization[cite: 13, 24, 25].*

### 3. Dynamic Policy Management
[cite_start]Administrators can dictate system enforcement behaviors in real time per category[cite: 35, 36]:
* [cite_start]**Toggle Operation**: Enable or disable screening categories instantly; disabled vectors are bypassed during ingestion[cite: 37].
* [cite_start]**Confidence Tuning**: Alter percentage cutoffs (0-100%) below which detections are classified as inconclusive[cite: 38].
* [cite_start]**Enforcement Strategy Switching**[cite: 39]:
  * [cite_start]**Auto-Block**: Triggers an immediate `Blocked` outcome if an asset violates the rule[cite: 27].
  * [cite_start]**Flag for Review**: Marks the asset as `Flagged for Review` and routes it directly into the operational queue[cite: 28].

### 4. Remediation & Appeal Lifecycle
* [cite_start]**Dispute Mechanism**: Users can contest any `Flagged` or `Blocked` verdict by providing a mandatory text-based justification defending the asset[cite: 30, 31, 49].
* [cite_start]**Admin Adjudication Queue**: Holds pending disputes in an isolated queue. [cite_start]Admins review the user's defense, append a written response, and choose to **Accept** or **Reject** the appeal[cite: 33].
* [cite_start]**Programmatic State Overrides**: Accepting an appeal automatically overwrites the database verdict to `Approved` and updates user-facing history lists in real time.

### 5. Admin Telemetry & Analytics Dashboard
[cite_start]An executive operational panel giving administrators absolute visibility over platform health, tracking:
* [cite_start]**Volume Over Time**: Ingestion rates and platform-wide submission scale metrics[cite: 43].
* [cite_start]**Verdict Skewing**: Data distributions categorized by system outcomes and explicit infraction types[cite: 44].
* [cite_start]**Remediation Ratios**: Tracking total dispute queues, pending workloads, and acceptance vs. rejection balance ratios[cite: 45].
* [cite_start]**User Standings**: Ranked leaderboards identifying top active participants and high-frequency policy violators[cite: 46].

---

## 🏗️ Architecture Decisions & Rationales

### I. Document Snapshotting vs. Document Referencing
* [cite_start]**Decision**: Instead of referencing a live `Policy` collection document inside the `Submission` schema via a MongoDB Object ID, the application stores a hard copy point-in-time array (`policySnapshot`) directly inside the verdict record at the moment of code execution[cite: 25].
* [cite_start]**Rationale**: This strictly satisfies requirement **4.4 (Policy Configuration)**[cite: 35]. Policy thresholds evolve rapidly due to compliance shifts; embedding an immutable snapshot ensures historical auditing remains legally and structurally sound. [cite_start]Subsequent configuration changes never retroactively modify or invalidate past verdicts[cite: 40].

### II. State Matrix Mapping Over Hardcoded Conditionals
* [cite_start]**Decision**: The backend simulation screening engine dynamically reads active database objects rather than utilizing hardcoded `if-else` or `switch-case` constructs mapping to the 6 explicit names[cite: 12].
* **Rationale**: Decoupling the category logic from code constraints ensures high extensibility. New compliance classification rules can be introduced straight into the database configuration collections without modifying or redeploying code containers.

### III. OWASP-Hardened Stateless Authentication
* [cite_start]**Decision**: Leveraging stateless JSON Web Tokens (JWT) mapped into the request headers paired with cryptographically secure, unidirectional `bcryptjs` password hashing layers.
* [cite_start]**Rationale**: Ensures clear, non-overlapping authorization security walls between `User` and `Admin` components. [cite_start]Administrative workflows (like policy patching, analytics retrieval, and appeal resolution) are guarded behind middleware checks to protect systemic integrity.

---

## 💾 Documented Database Schema (MongoDB)

[cite_start]Below is the structure mapping out entities inside our MongoDB layer[cite: 8, 53]:

### 1. User Model
```javascript
{
  _id: ObjectId,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['User', 'Admin'], default: 'User' }
}

2. Policy Model
JavaScript
{
  _id: ObjectId,
  category: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  confidenceThreshold: { type: Number, default: 70 },
  enforcementBehavior: { type: String, enum: ['Auto-Block', 'Flag for Review'], default: 'Flag for Review' }
}


3. Submission Model
JavaScript
{
  _id: ObjectId,
  userId: { type: ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  outcome: { type: String, enum: ['Approved', 'Flagged for Review', 'Blocked'], default: 'Approved' },
  categoryBreakdown: { type: Map, of: Object }, // Stores { detected: Boolean, score: Number, reason: String }
  policySnapshot: { type: Array },             // Immutable point-in-time policy rules
  createdAt: { type: Date, default: Date.now }
}
4. Appeal Model
JavaScript
{
  _id: ObjectId,
  submissionId: { type: ObjectId, ref: 'Submission', required: true },
  userId: { type: ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  adminResponse: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
}
⚙️ Environment Variables
The services run safely out-of-the-box using the values mapped directly inside the orchestrated docker-compose blueprints:  
PDF

Variable Name	Context Location	Rationale / Core Purpose	Default Value
MONGO_URI	backend container	Targeted network pipeline connection string for MongoDB	mongodb://mongo:27017/moderation
JWT_SECRET	backend container	Secret string used to sign stateless authentication payloads	super_secret_owasp_hardened_key_123!
PORT	backend container	Inbound application port binding for REST API routing	5000
🛠️ Step-by-Step System Setup Guide
Ensure you have Docker Desktop running on your local machine before executing the initialization command.  


Step 1: Clone and Enter the Directory
Open your terminal window and navigate to the project root folder:

Bash
cd ContentGuard_AI-Contentmoderation-platform

Step 2: Fire Up Orchestration Core
Execute the single building instruction from the directory containing your docker-compose.yml configuration:

Bash
"docker-compose up --build"

Docker will automatically provision an isolated bridge network, pull down the official MongoDB engine image, install all frontend/backend dependencies, and compile the servers natively.  


Step 3: Access the Local Portals
Once your terminal logs stabilize, your application is live at the following network bindings:


Frontend Portal Client Interface: http://localhost:3000   
PDF


Backend REST API Entry Point: http://localhost:5000/api   
PDF

🧪 Simulation & Role-Verification Walkthrough
The platform includes automated database seeding logic that sets up two pre-configured profiles so you can immediately test the non-overlapping administrative features:  
PDF

👥 Test Credentials
A. Standard User Persona   
PDF

Email: user@platform.com

Password: user123


Workflow Focus: Submit validation content, check logs, view category confidence bars, and lodge dispute appeals.  

B. Platform Administrator Persona   

Email: admin@platform.com

Password: admin123


Workflow Focus: Modify live thresholds, accept/reject disputes, override statuses, and track system metrics.  
PDF

🔍 Verification Pipeline Steps
Simulating an AI Flag/Block Match: Log in as user@platform.com. Go to the Content Screening panel and paste a diagnostic payload string containing a category keyword (e.g., "Graphic Violence evaluation run" or "Hate Symbols signature found").

Reviewing the Result: Submit the asset. Navigate to the Audit Ledger tab. The simulation engine will catch the keyword and mock an algorithmic violation match above the threshold, resulting in a Blocked or Flagged for Review status.  
PDF


Filing a System Dispute: Click on Lodge System Dispute next to the flagged entry, write a justification reason defending the asset, and click submit.  
PDF

Adjudicating as an Admin: Log out and authenticate as admin@platform.com. Navigate to the Appeals Queue tab to see the user's pending dispute. Click Override & Pass Asset.  


Checking Real-Time Sync: Review the Analytics Telemetry dashboard to verify that platform-wide clearance stats have updated immediately. Log back in as the user to confirm the submission status has cleanly overridden to Approved.  
