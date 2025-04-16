const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const path = require('path');
 
const app = express();
 
// Load environment variables
require('dotenv').config();
 
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@nodejs.2g1go.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`;
 
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
 
const csrfProtection = csrf();
 
app.set('view engine', 'ejs');
app.set('views', 'views');
 
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
 
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'mysecret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
 
app.use(csrfProtection);
 
// Example routes (replace with your actual routes)
app.get('/', (req, res) => {
  res.render('index', { csrfToken: req.csrfToken() });
});
 
// Error handling, etc...
 
mongoose
  .connect(MONGODB_URI)
  .then(result => {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch(err => {
    console.error('DB connection failed:', err);
  });
 
