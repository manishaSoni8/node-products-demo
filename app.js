const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const MongoStore = require('connect-mongo');
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');


 
const errorController = require('./controllers/error');
const shopController = require('./controllers/shop');
const isAuth = require('./middleware/is-auth');
const User = require('./models/user');
 
 
const MONGODB_URI = 'mongodb+srv://sonimanisha2003:XR6QEHeRUUh75i5Z@ac-wp50ign.gnk6szj.mongodb.net/shop?retryWrites=true&w=majority';

const app = express();
const store = MongoStore.create({
  mongoUrl: MONGODB_URI,
  collectionName: 'sessions'
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
    useUnifiedTopology: true
  })
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log('MongoDB connection failed:', err);
  });