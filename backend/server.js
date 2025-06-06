require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({origin: true, credentials: true}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

const defaultRoute = {
  GET: (req, res) => {
    res.json({ message: 'Welcome to the Sudoku API' });
  },
};
app.get('/', defaultRoute.GET);

const sudokuRoutes = require('./routes/sudoku');
app.use('/api/sudoku', sudokuRoutes);
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);
const matchRoutes = require('./routes/match');
app.use('/api/match', matchRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});