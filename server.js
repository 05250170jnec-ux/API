// server.js — entry point
// Flow: request → routes → controllers → models → MySQL

require('dotenv').config();

const express = require('express');
const taskRoutes = require('./src/routes/taskRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Task API is ready!', version: 'MySQL + MVC' });
});

app.use('/tasks', taskRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('GET    /');
  console.log('GET    /tasks');
  console.log('POST   /tasks');
  console.log('GET    /tasks/:id');
  console.log('PUT    /tasks/:id');
  console.log('PATCH  /tasks/:id');
  console.log('DELETE /tasks/:id');
});
