const path = require('path');
const fs = require('fs');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
 
const errorController = require('./controllers/error');
const shopController = require('./controllers/shop');
const isAuth = require('./middleware/is-auth');
const User = require('./models/user');
 
const app = express();
 
const MONGODB_URI = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@nodejs.2g1go.mongodb.net/${process.env.MONGO_DEFAULT_DATABASE}?retryWrites=true&w=majority`;
 
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
 
store.on('error', function (error) {
  console.error('Session Store Error:', error);
});
 
const csrfProtection = csrf();
 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'images');
  },
  filename: function (req, file, cb) {
    cb(null, uuidv4());
  }
});
 
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
 
app.set('view engine', 'ejs');
app.set('views', 'views');
 
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
 
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });
 
app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));
 
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: storage, fileFilter: fileFilter }).single('image'));
 
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
 
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
 
app.use(flash());
 
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  next();
});
 
app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});
 
app.post('/create-order', isAuth, shopController.postOrder);
 
app.use(csrfProtection);
 
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
 
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
 
app.get('/500', errorController.get500);
app.use(errorController.get404);
 
// Global error handler
app.use((error, req, res, next) => {
  console.error('Unhandled Error:', error);
  res.status(500).render('500', {
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session ? req.session.isLoggedIn : false
  });
});
 
// Connect to DB and start server
mongoose
  .connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    ssl: true // Important for MongoDB Atlas on Render
  })
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
  })
  .catch(err => {
    console.error('DB connection failed:', err);
  });