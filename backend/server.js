import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// --- DATABASE MODELS ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['User', 'Admin'], default: 'User' }
});

const policySchema = new mongoose.Schema({
  category: { type: String, required: true, unique: true },
  enabled: { type: Boolean, default: true },
  confidenceThreshold: { type: Number, default: 70 },
  enforcementBehavior: { type: String, enum: ['Auto-Block', 'Flag for Review'], default: 'Flag for Review' }
});

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  outcome: { type: String, enum: ['Approved', 'Flagged for Review', 'Blocked'], default: 'Approved' },
  categoryBreakdown: { type: Map, of: Object },
  policySnapshot: { type: Array },
  createdAt: { type: Date, default: Date.now }
});

const appealSchema = new mongoose.Schema({
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
  adminResponse: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Policy = mongoose.model('Policy', policySchema);
const Submission = mongoose.model('Submission', submissionSchema);
const Appeal = mongoose.model('Appeal', appealSchema);

// --- SEED INITIALIZER ---
async function seedDatabase() {
  const categories = [
    'Graphic Violence', 'Hate Symbols', 'Self-Harm', 
    'Extremist Propaganda', 'Weapons & Contraband', 'Harassment & Humiliation'
  ];
  
  for (const cat of categories) {
    await Policy.findOneAndUpdate(
      { category: cat },
      { category: cat, enabled: true, confidenceThreshold: 75, enforcementBehavior: cat === 'Graphic Violence' ? 'Auto-Block' : 'Flag for Review' },
      { upsert: true }
    );
  }

  const salt = await bcrypt.genSalt(10);
  const hashedUserPwd = await bcrypt.hash('user123', salt);
  const hashedAdminPwd = await bcrypt.hash('admin123', salt);

  await User.findOneAndUpdate({ email: 'user@platform.com' }, { email: 'user@platform.com', password: hashedUserPwd, role: 'User' }, { upsert: true });
  await User.findOneAndUpdate({ email: 'admin@platform.com' }, { email: 'admin@platform.com', password: hashedAdminPwd, role: 'Admin' }, { upsert: true });
  console.log('Database seeded successfully.');
}

// --- AUTH MIDDLEWARE ---
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No authorization token supplied.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  next();
};

// --- AUTH API ROUTES ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json({ message: 'Invalid email credentials or password.' });
  }
  const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { email: user.email, role: user.role } });
});

// --- SUBMISSIONS ENGINE & PIECE DE RÉSISTANCE ---
app.post('/api/submissions', authenticate, async (req, res) => {
  const { imageUrls } = req.body; // Expects array of mock strings/URLs
  if (!Array.isArray(imageUrls) || imageUrls.length === 0) return res.status(400).json({ message: 'At least one image URL is required.' });

  const activePolicies = await Policy.find();
  const policyMap = activePolicies.reduce((acc, p) => ({ ...acc, [p.category]: p }), {});
  const savedSubmissions = [];

  for (const url of imageUrls) {
    let finalOutcome = 'Approved';
    const breakdown = {};

    // Simulation mapping based on keywords inside simulated asset text
    for (const p of activePolicies) {
      if (!p.enabled) continue;

      let detected = false;
      let score = 0;
      let reason = "All metrics within normal bounds.";

      if (url.toLowerCase().includes(p.category.toLowerCase().split(' ')[0])) {
        detected = true;
        score = 88; // Forces execution threshold breach
        reason = `High algorithmic correlation matched core indicator signature for ${p.category}.`;
      } else if (Math.random() > 0.85) {
        // Stochastic regular variance simulation
        detected = true;
        score = Math.floor(Math.random() * 40) + 50; 
        reason = `Ambiguous elements flagged for evaluation variance.`;
      }

      if (detected && score >= p.confidenceThreshold) {
        if (p.enforcementBehavior === 'Auto-Block') {
          finalOutcome = 'Blocked';
        } else if (p.enforcementBehavior === 'Flag for Review' && finalOutcome !== 'Blocked') {
          finalOutcome = 'Flagged for Review';
        }
      }

      breakdown[p.category] = { detected, score, reason };
    }

    const sub = new Submission({
      userId: req.user.id,
      imageUrl: url,
      outcome: finalOutcome,
      categoryBreakdown: breakdown,
      policySnapshot: activePolicies
    });
    await sub.save();
    savedSubmissions.push(sub);
  }

  res.status(201).json(savedSubmissions);
});

app.get('/api/submissions/my-history', authenticate, async (req, res) => {
  const history = await Submission.find({ userId: req.user.id }).sort({ createdAt: -1 });
  res.json(history);
});

// --- APPEALS LIFECYCLE ---
app.post('/api/appeals', authenticate, async (req, res) => {
  const { submissionId, reason } = req.body;
  const sub = await Submission.findById(submissionId);
  if (!sub || sub.outcome === 'Approved') return res.status(400).json({ message: 'Submission not eligible for appeal processing.' });

  const appeal = new Appeal({ submissionId, userId: req.user.id, reason });
  await appeal.save();
  res.status(201).json(appeal);
});

app.get('/api/appeals/my-appeals', authenticate, async (req, res) => {
  const appeals = await Appeal.find({ userId: req.user.id }).populate('submissionId');
  res.json(appeals);
});

app.get('/api/admin/appeals/pending', authenticate, requireAdmin, async (req, res) => {
  const pending = await Appeal.find({ status: 'Pending' }).populate('submissionId').populate('userId', 'email');
  res.json(pending);
});

app.post('/api/admin/appeals/:id/resolve', authenticate, requireAdmin, async (req, res) => {
  const { status, adminResponse } = req.body; // 'Accepted' or 'Rejected'
  const appeal = await Appeal.findById(req.params.id);
  if (!appeal) return res.status(404).json({ message: 'Appeal instance could not be found.' });

  appeal.status = status;
  appeal.adminResponse = adminResponse;
  await appeal.save();

  if (status === 'Accepted') {
    await Submission.findByIdAndUpdate(appeal.submissionId, { outcome: 'Approved' });
  }

  res.json({ message: 'Appeal status successfully adjudicated.', appeal });
});

// --- POLICY MANIPULATION ---
app.get('/api/policies', authenticate, async (req, res) => {
  const policies = await Policy.find();
  res.json(policies);
});

app.put('/api/admin/policies/:id', authenticate, requireAdmin, async (req, res) => {
  const { enabled, confidenceThreshold, enforcementBehavior } = req.body;
  const updatedPolicy = await Policy.findByIdAndUpdate(
    req.params.id,
    { enabled, confidenceThreshold, enforcementBehavior },
    { new: true }
  );
  res.json(updatedPolicy);
});

// --- ADMIN ANALYTICS ---
app.get('/api/admin/analytics', authenticate, requireAdmin, async (req, res) => {
  const totalSubmissions = await Submission.countDocuments();
  const totalAppeals = await Appeal.countDocuments();
  const resolvedAppeals = await Appeal.countDocuments({ status: { $ne: 'Pending' } });
  const acceptedAppeals = await Appeal.countDocuments({ status: 'Accepted' });

  const aggregationOutcome = await Submission.aggregate([
    { $group: { _id: "$outcome", count: { $sum: 1 } } }
  ]);

  res.json({
    totalSubmissions,
    appealMetrics: {
      total: totalAppeals,
      resolved: resolvedAppeals,
      resolutionRate: totalAppeals > 0 ? ((resolvedAppeals / totalAppeals) * 100).toFixed(1) : 0,
      accepted: acceptedAppeals
    },
    verdictDistribution: aggregationOutcome
  });
});

// --- BOOTSTRAP CONNECTION ---
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/moderation')
  .then(() => {
    console.log('MongoDB Engine Pipeline Online.');
    seedDatabase();
    app.listen(PORT, () => console.log(`Server executing operations on port ${PORT}`));
  })
  .catch(err => console.error(err));